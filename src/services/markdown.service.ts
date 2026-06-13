import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MarkdownService {
  private ready: Promise<void> | null = null;
  private parseFn: ((md: string) => Promise<string>) | null = null;
  private sanitizeFn: ((html: string) => string) | null = null;
  private cache = new Map<string, string>();
  private readonly CACHE_MAX = 500;

  private load(): Promise<void> {
    if (!this.ready) {
      this.ready = Promise.all([
        import('marked'),
        import('dompurify'),
      ]).then(([markedMod, purifyMod]) => {
        const { marked, use } = markedMod;
        use({ gfm: true, breaks: true });
        this.parseFn = (md: string) => Promise.resolve(marked(md) as string);

        const DOMPurify = purifyMod.default ?? purifyMod;
        DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
          if (node.tagName === 'A') {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
          }
        });
        this.sanitizeFn = (html: string) => DOMPurify.sanitize(html, {
          ALLOWED_TAGS: [
            'p', 'br', 'strong', 'em', 'del', 's',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'blockquote', 'pre', 'code',
            'a', 'hr',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'input', 'span',
          ],
          ALLOWED_ATTR: ['href', 'class', 'type', 'checked', 'disabled', 'start', 'target', 'rel'],
          FORBID_ATTR: ['style'],
        });
      });
    }
    return this.ready;
  }

  async render(md: string): Promise<string> {
    if (!md) return '';
    const cached = this.cache.get(md);
    if (cached !== undefined) return cached;

    await this.load();
    const raw = await this.parseFn!(md);
    const clean = this.sanitizeFn!(raw);

    if (this.cache.size >= this.CACHE_MAX) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(md, clean);
    return clean;
  }

  invalidate(md: string) {
    this.cache.delete(md);
  }

  preWarm() {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => this.load());
    } else {
      setTimeout(() => this.load(), 500);
    }
  }
}
