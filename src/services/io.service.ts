import { Injectable } from '@angular/core';
import JSZip from 'jszip';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml';
import { Card } from '../models/card.model';

@Injectable({ providedIn: 'root' })
export class IoService {

  createMarkdownContent(card: Card): string {
    const frontmatter: Record<string, unknown> = {
      id: card.id,
      title: card.title,
      boardId: card.boardId,
      tags: card.tags,
      color: card.color,
      rotation: card.rotation,
      stickers: card.stickers,
      isPinned: card.isPinned,
      updatedAt: card.updatedAt
    };
    if (card.x != null) frontmatter['x'] = card.x;
    if (card.y != null) frontmatter['y'] = card.y;
    if (card.width != null) frontmatter['width'] = card.width;
    if (card.height != null) frontmatter['height'] = card.height;
    return `---\n${yamlDump(frontmatter)}---\n\n${card.content}`;
  }

  parseMarkdownContent(text: string): Partial<Card> & { content: string } {
    if (text.startsWith('---')) {
      const end = text.indexOf('\n---', 3);
      if (end !== -1) {
        const yaml = text.substring(3, end);
        const content = text.substring(end + 4).trim();
        try {
          const raw = yamlLoad(yaml) as Record<string, unknown>;
          const safe: Partial<Card> = {};
          if (typeof raw['id'] === 'string') safe.id = raw['id'];
          if (typeof raw['title'] === 'string') safe.title = raw['title'];
          if (typeof raw['boardId'] === 'string') safe.boardId = raw['boardId'];
          if (typeof raw['color'] === 'string') safe.color = raw['color'];
          if (typeof raw['rotation'] === 'number') safe.rotation = raw['rotation'];
          if (typeof raw['isPinned'] === 'boolean') safe.isPinned = raw['isPinned'];
          if (typeof raw['updatedAt'] === 'number') safe.updatedAt = raw['updatedAt'];
          if (typeof raw['x'] === 'number') safe.x = raw['x'];
          if (typeof raw['y'] === 'number') safe.y = raw['y'];
          if (typeof raw['width'] === 'number') safe.width = raw['width'];
          if (typeof raw['height'] === 'number') safe.height = raw['height'];
          if (Array.isArray(raw['tags']) && raw['tags'].every(t => typeof t === 'string')) safe.tags = raw['tags'];
          if (Array.isArray(raw['stickers']) && raw['stickers'].every(s => typeof s === 'string')) safe.stickers = raw['stickers'];
          return { ...safe, content };
        } catch {
        }
      }
    }
    return { title: 'Imported Note', content: text, tags: [] };
  }

  exportBoardAsSingleMd(cards: Card[], boardName: string): void {
    const sections = cards.map(c => `## ${c.title}\n\n${c.content}`).join('\n\n---\n\n');
    const content = `# ${boardName}\n\n${sections}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    this.triggerDownload(blob, `${boardName.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().slice(0, 10)}.md`);
  }

  async exportBoardAsZip(cards: Card[], boardName: string): Promise<void> {
    const zip = new JSZip();
    cards.forEach(card => {
      const filename = `${card.title.replace(/[^a-z0-9]/gi, '_') || 'untitled'}-${card.id.substring(0, 4)}.md`;
      zip.file(filename, this.createMarkdownContent(card));
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    this.triggerDownload(blob, `doodleboard-${boardName}-${new Date().toISOString().slice(0, 10)}.zip`);
  }

  async importZip(file: File): Promise<Array<Partial<Card> & { content: string }>> {
    const zip = await JSZip.loadAsync(file);
    const results: Array<Partial<Card> & { content: string }> = [];
    const promises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir && (relativePath.endsWith('.md') || relativePath.endsWith('.txt'))) {
        promises.push(
          zipEntry.async('string').then(text => {
            results.push(this.parseMarkdownContent(text));
          })
        );
      }
    });

    await Promise.all(promises);
    return results;
  }

  readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  downloadMarkdown(card: Card): void {
    const content = this.createMarkdownContent(card);
    const blob = new Blob([content], { type: 'text/markdown' });
    const filename = (card.title || 'scribble').replace(/[^a-z0-9]/gi, '_') + '.md';
    this.triggerDownload(blob, filename);
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
