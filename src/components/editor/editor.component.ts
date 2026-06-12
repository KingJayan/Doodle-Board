import { Component, inject, signal, Output, EventEmitter, ViewChild, ElementRef, input, effect, untracked, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Card } from '../../models/card.model';
import { BoardService } from '../../services/board.service';
import { AiService } from '../../services/ai.service';
import { ToastService } from '../../services/toast.service';
import { IoService } from '../../services/io.service';
import { MarkdownService } from '../../services/markdown.service';
import { IconComponent } from '../icon/icon.component';

type ViewMode = 'write' | 'preview' | 'split';

@Component({
  selector: 'app-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div
      class="fixed inset-0 z-overlay flex items-start justify-center p-0 md:p-8 bg-gray-900/50 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      [class.animate-modalOut]="isClosing()"
      (click)="requestClose()"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        class="bg-[var(--surface)] text-[var(--ink-color)] w-full md:max-w-4xl min-h-[90vh] shadow-2xl flex flex-col relative animate-slideUp border border-soft mt-0 md:mt-4 mb-20"
        (click)="$event.stopPropagation()"
      >
        <!-- file menu bar -->
        <div class="bg-[var(--surface-2)] p-2 border-b border-soft flex items-center gap-4 text-sm text-muted select-none">
          <span class="font-bold text-[var(--ink-color)] px-2">File</span>
          <button (click)="save()" class="hover-surface px-2 rounded">Save</button>
          <button (click)="downloadMd()" class="hover-surface px-2 rounded">Download .md</button>
          <button (click)="requestClose()" class="hover:bg-red-500/15 text-red-500 px-2 rounded ml-auto" aria-label="Close editor">Close ✕</button>
        </div>

        <!-- toolbar -->
        <div class="p-3 bg-[var(--surface)] border-b border-soft flex gap-2 flex-wrap items-center shadow-sm sticky top-0 z-10 text-[var(--ink-color)]">
          <div class="flex gap-1 border-r pr-2 border-soft">
            <button (click)="applyFormat('h1')" class="w-8 h-8 rounded hover-surface font-bold text-lg" title="H1">H1</button>
            <button (click)="applyFormat('h2')" class="w-8 h-8 rounded hover-surface font-bold" title="H2">H2</button>
            <button (click)="applyFormat('h3')" class="w-8 h-8 rounded hover-surface font-bold text-sm" title="H3">H3</button>
          </div>

          <div class="flex gap-1 border-r pr-2 border-soft">
            <button (click)="applyFormat('bold')" class="w-8 h-8 rounded hover-surface font-bold" title="Bold (Ctrl+B)">B</button>
            <button (click)="applyFormat('italic')" class="w-8 h-8 rounded hover-surface italic" title="Italic (Ctrl+I)">I</button>
            <button (click)="applyFormat('strikethrough')" class="w-8 h-8 rounded hover-surface line-through" title="Strikethrough">S</button>
            <button (click)="applyFormat('code')" class="w-8 h-8 rounded hover-surface font-mono text-xs" title="Code"><></button>
          </div>

          <div class="flex gap-1 border-r pr-2 border-soft">
            <button (click)="applyFormat('list')" class="w-8 h-8 rounded hover-surface" title="Bullet list">• List</button>
            <button (click)="applyFormat('numlist')" class="w-8 h-8 rounded hover-surface text-xs" title="Numbered list">1.</button>
            <button (click)="applyFormat('tasklist')" class="w-8 h-8 rounded hover-surface text-xs" title="Task list">☐</button>
            <button (click)="applyFormat('quote')" class="w-8 h-8 rounded hover-surface" title="Quote">"</button>
            <button (click)="applyFormat('hr')" class="w-8 h-8 rounded hover-surface flex items-center justify-center" title="Divider">
              <div class="h-px w-4 bg-[var(--muted)]"></div>
            </button>
          </div>

          <div class="flex gap-1 border-r pr-2 border-soft">
            <button (click)="applyFormat('link')" class="w-8 h-8 rounded hover-surface text-xs font-bold" title="Link (Ctrl+K)">🔗</button>
            <button (click)="applyFormat('image')" class="w-8 h-8 rounded hover-surface text-xs" title="Image">🖼</button>
            <button (click)="applyFormat('table')" class="w-8 h-8 rounded hover-surface text-xs font-bold" title="Table">⊞</button>
          </div>

          <!-- view mode toggle -->
          <div class="flex gap-1 border-r pr-2 border-soft">
            <button (click)="viewMode.set('write')" class="px-2 h-8 rounded text-xs" [class.bg-surface-2]="viewMode() === 'write'" title="Write">Write</button>
            <button (click)="viewMode.set('split')" class="px-2 h-8 rounded text-xs hidden md:block" [class.bg-surface-2]="viewMode() === 'split'" title="Split">Split</button>
            <button (click)="viewMode.set('preview')" class="px-2 h-8 rounded text-xs" [class.bg-surface-2]="viewMode() === 'preview'" title="Preview">Preview</button>
          </div>

          <!-- ai polish -->
          @if (aiAvailable) {
            <div class="flex gap-1 items-center">
              <button
                (click)="polishContent('fix')"
                class="flex items-center gap-1 px-2 py-1 rounded bg-[var(--tint-purple)] text-[var(--note-ink)] border border-soft hover:brightness-105 transition text-xs font-bold"
                [disabled]="isPolishing()"
              >
                <app-icon name="sparkles"></app-icon> Fix Grammar
              </button>
              <button
                (click)="polishContent('expand')"
                class="flex items-center gap-1 px-2 py-1 rounded bg-[var(--tint-blue)] text-[var(--note-ink)] border border-soft hover:brightness-105 transition text-xs font-bold"
                [disabled]="isPolishing()"
              >
                <app-icon name="memo"></app-icon> Expand
              </button>
              <button
                (click)="polishContent('tone')"
                class="flex items-center gap-1 px-2 py-1 rounded bg-[var(--tint-green)] text-[var(--note-ink)] border border-soft hover:brightness-105 transition text-xs font-bold"
                [disabled]="isPolishing()"
              >
                <app-icon name="target"></app-icon> Tone
              </button>
            </div>
          }

          <div class="ml-auto text-xs text-muted hidden sm:block">Markdown</div>
        </div>

        <!-- doc content -->
        <div class="flex-grow p-8 md:p-16 flex flex-col gap-6 relative">
          @if (isPolishing()) {
            <div class="absolute inset-0 bg-[var(--surface)]/70 backdrop-blur-sm z-50 flex items-center justify-center flex-col">
              <div class="text-4xl animate-bounce"><app-icon name="pencil"></app-icon></div>
              <div class="font-bold text-muted mt-2">Genie is polishing your draft...</div>
            </div>
          }

          <input
            id="editor-title"
            [(ngModel)]="form.title"
            class="text-4xl md:text-5xl font-bold bg-transparent outline-none w-full marker-font placeholder:text-muted/50 border-none p-0 text-[var(--ink-color)]"
            placeholder="Untitled Scribble"
          >

          <div class="flex flex-grow gap-6 min-h-[400px]" [class.flex-col]="viewMode() !== 'split'">
            @if (viewMode() !== 'preview') {
              <textarea
                #editorTextarea
                [(ngModel)]="form.content"
                (keydown)="onKeyDown($event)"
                class="flex-1 bg-transparent resize-none outline-none text-lg md:text-xl leading-relaxed font-hand text-[var(--ink-color)] min-h-[400px]"
                placeholder="Start writing..."
              ></textarea>
            }
            @if (viewMode() !== 'write') {
              <div
                class="flex-1 markdown-content text-lg md:text-xl leading-relaxed overflow-y-auto prose-editor border-l border-soft pl-6"
                [class.border-l-0]="viewMode() === 'preview'"
                [class.pl-0]="viewMode() === 'preview'"
                [innerHTML]="previewHtml()"
              ></div>
            }
          </div>
        </div>

        <!-- tags footer -->
        <div class="p-8 border-t border-soft bg-[var(--surface-2)] text-sm text-muted">
          <div class="flex items-center gap-2">
            <span><app-icon name="tag"></app-icon> Tags:</span>
            <input
              [(ngModel)]="form.tags"
              class="bg-transparent border-b border-soft focus:border-[var(--accent)] outline-none w-full max-w-sm px-2 py-1 text-[var(--ink-color)]"
              placeholder="Add tags separated by commas..."
            >
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .font-hand { font-family: var(--font-body); }
  `]
})
export class EditorComponent {
  private boardService = inject(BoardService);
  private aiService = inject(AiService);
  aiAvailable = this.aiService.isAvailable;
  private toastService = inject(ToastService);
  private ioService = inject(IoService);
  private markdownService = inject(MarkdownService);

  card = input.required<Card>();

  @Output() close = new EventEmitter<void>();
  @ViewChild('editorTextarea') editorTextarea!: ElementRef<HTMLTextAreaElement>;

  isPolishing = signal(false);
  isClosing = signal(false);
  viewMode = signal<ViewMode>('write');
  previewHtml = signal<string>('');
  form = { title: '', content: '', tags: '' };
  private savedTitle = '';
  private savedContent = '';
  private savedTags = '';

  private previewTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const c = this.card();
      this.form = { title: c.title, content: c.content, tags: c.tags.join(', ') };
      this.savedTitle = c.title;
      this.savedContent = c.content;
      this.savedTags = c.tags.join(', ');
      untracked(() => this.schedulePreview());
    });

    effect(() => {
      if (this.viewMode() !== 'write') untracked(() => this.schedulePreview());
    });
  }

  private schedulePreview() {
    if (this.previewTimer) clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => {
      this.markdownService.render(this.form.content).then(html => this.previewHtml.set(html));
    }, 200);
  }

  private parseTags(): string[] {
    return this.form.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }

  private hasUnsavedChanges(): boolean {
    return (
      this.form.title !== this.savedTitle ||
      this.form.content !== this.savedContent ||
      this.form.tags !== this.savedTags
    );
  }

  save() {
    const updated: Card = {
      ...this.card(),
      title: this.form.title,
      content: this.form.content,
      tags: this.parseTags()
    };
    this.markdownService.invalidate(this.savedContent);
    this.boardService.updateCard(updated);
    this.savedTitle = this.form.title;
    this.savedContent = this.form.content;
    this.savedTags = this.form.tags;
    this.schedulePreview();
    this.toastService.show('Saved', 'success');
  }

  startClose() {
    this.isClosing.set(true);
    if (this.previewTimer) clearTimeout(this.previewTimer);
    setTimeout(() => this.close.emit(), 150);
  }

  requestClose() {
    if (!this.hasUnsavedChanges()) { this.startClose(); return; }
    this.toastService.show('Unsaved changes — close anyway?', 'warning', {
      label: 'Close',
      callback: () => this.startClose()
    });
  }

  async polishContent(mode: 'fix' | 'expand' | 'tone') {
    if (this.isPolishing()) return;
    if (!this.form.content) {
      this.toastService.show('Write something first!', 'info');
      return;
    }
    this.isPolishing.set(true);
    try {
      this.form.content = await this.aiService.polishText(this.form.content, mode);
      this.toastService.show('Pencil magic complete!', 'success');
      this.schedulePreview();
    } catch {
      this.toastService.show('AI polish failed — check your API key', 'error');
    } finally {
      this.isPolishing.set(false);
    }
  }

  downloadMd() {
    const tempCard: Card = {
      ...this.card(),
      title: this.form.title,
      content: this.form.content,
      tags: this.parseTags()
    };
    this.ioService.downloadMarkdown(tempCard);
    this.toastService.show('Downloaded file', 'info');
  }

  onKeyDown(event: KeyboardEvent) {
    const textarea = event.target as HTMLTextAreaElement;
    const ctrl = event.ctrlKey || event.metaKey;

    if (ctrl && event.key === 's') {
      event.preventDefault();
      this.save();
      return;
    }
    if (ctrl && event.key === 'b') { event.preventDefault(); this.applyFormat('bold'); return; }
    if (ctrl && event.key === 'i') { event.preventDefault(); this.applyFormat('italic'); return; }
    if (ctrl && event.key === 'k') { event.preventDefault(); this.applyFormat('link'); return; }

    if (event.key === 'Enter') {
      const { selectionStart } = textarea;
      const textBefore = textarea.value.substring(0, selectionStart);
      const currentLine = textBefore.split('\n').pop() ?? '';

      const bulletMatch = currentLine.match(/^(\s*)(- \[[ x]\] |- |[0-9]+\. )(.*)/);
      if (bulletMatch) {
        const [, indent, prefix, content] = bulletMatch;
        if (!content.trim()) {
          event.preventDefault();
          const lineStart = textBefore.lastIndexOf('\n') + 1;
          const after = textarea.value.substring(selectionStart);
          this.setContent(textarea.value.substring(0, lineStart) + '\n' + after, lineStart + 1);
          return;
        }
        event.preventDefault();
        let nextPrefix = prefix;
        const numMatch = prefix.match(/^([0-9]+)\. $/);
        if (numMatch) nextPrefix = `${parseInt(numMatch[1]) + 1}. `;
        const insertion = '\n' + indent + nextPrefix;
        this.insertAt(textarea, insertion, selectionStart + insertion.length);
        return;
      }

    }

    if (event.key === 'Tab') {
      event.preventDefault();
      this.insertAt(textarea, '  ', textarea.selectionStart + 2);
    }

    if (this.viewMode() !== 'write') this.schedulePreview();
  }

  private setContent(value: string, cursorPos: number) {
    this.form.content = value;
    requestAnimationFrame(() => {
      const ta = this.editorTextarea?.nativeElement;
      if (ta) { ta.selectionStart = ta.selectionEnd = cursorPos; }
    });
    if (this.viewMode() !== 'write') this.schedulePreview();
  }

  private insertAt(textarea: HTMLTextAreaElement, text: string, newCursor: number) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    this.form.content = textarea.value.substring(0, start) + text + textarea.value.substring(end);
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = newCursor;
    });
    if (this.viewMode() !== 'write') this.schedulePreview();
  }

  applyFormat(type: string) {
    const textarea = this.editorTextarea?.nativeElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);

    const wrap = (prefix: string, suffix: string, placeholder: string) => {
      this.form.content = `${before}${prefix}${selected || placeholder}${suffix}${after}`;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = start + prefix.length + (selected || placeholder).length;
      });
      if (this.viewMode() !== 'write') this.schedulePreview();
    };

    const linePrefix = (prefix: string, placeholder: string) => {
      const needsNewline = before !== '' && !before.endsWith('\n');
      const insertion = `${needsNewline ? '\n' : ''}${prefix}${selected || placeholder}`;
      this.form.content = `${before}${insertion}${after}`;
      requestAnimationFrame(() => {
        textarea.focus();
        const s = before.length + (needsNewline ? 1 : 0) + prefix.length;
        textarea.selectionStart = s;
        textarea.selectionEnd = s + (selected || placeholder).length;
      });
      if (this.viewMode() !== 'write') this.schedulePreview();
    };

    switch (type) {
      case 'bold': return wrap('**', '**', 'bold');
      case 'italic': return wrap('*', '*', 'italic');
      case 'strikethrough': return wrap('~~', '~~', 'strikethrough');
      case 'code': return wrap('`', '`', 'code');
      case 'link': return wrap('[', '](url)', selected || 'link text');
      case 'image': return wrap('![', '](url)', 'alt text');
      case 'h1': return linePrefix('# ', 'Heading');
      case 'h2': return linePrefix('## ', 'Heading');
      case 'h3': return linePrefix('### ', 'Heading');
      case 'quote': return linePrefix('> ', 'Quote');
      case 'list': return linePrefix('- ', '');
      case 'numlist': return linePrefix('1. ', '');
      case 'tasklist': return linePrefix('- [ ] ', '');
      case 'hr': {
        const insertion = `${before.endsWith('\n') || before === '' ? '' : '\n'}---\n`;
        this.form.content = `${before}${insertion}${after}`;
        requestAnimationFrame(() => textarea.focus());
        if (this.viewMode() !== 'write') this.schedulePreview();
        break;
      }
      case 'table': {
        const snippet = `\n| Header | Header |\n| --- | --- |\n| Cell | Cell |\n`;
        this.form.content = `${before}${snippet}${after}`;
        requestAnimationFrame(() => textarea.focus());
        if (this.viewMode() !== 'write') this.schedulePreview();
        break;
      }
    }
  }
}
