import { Injectable } from '@angular/core';
import JSZip from 'jszip';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml';
import { Card } from '../models/card.model';

@Injectable({ providedIn: 'root' })
export class IoService {

  createMarkdownContent(card: Card): string {
    const frontmatter = {
      id: card.id,
      title: card.title,
      tags: card.tags,
      color: card.color,
      rotation: card.rotation,
      stickers: card.stickers,
      isPinned: card.isPinned,
      updatedAt: card.updatedAt
    };
    return `---\n${yamlDump(frontmatter)}---\n\n${card.content}`;
  }

  parseMarkdownContent(text: string): Partial<Card> & { content: string } {
    if (text.startsWith('---')) {
      const end = text.indexOf('\n---', 3);
      if (end !== -1) {
        const yaml = text.substring(3, end);
        const content = text.substring(end + 4).trim();
        try {
          const frontmatter = yamlLoad(yaml) as Partial<Card>;
          return { ...frontmatter, content };
        } catch (e) {
          console.warn('Failed to parse frontmatter', e);
        }
      }
    }
    return { title: 'Imported Note', content: text, tags: [] };
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
