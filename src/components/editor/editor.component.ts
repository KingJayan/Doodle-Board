import { Component, inject, signal, Output, EventEmitter, ViewChild, ElementRef, input, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Card } from '../../models/card.model';
import { BoardService } from '../../services/board.service';
import { AiService } from '../../services/ai.service';
import { ToastService } from '../../services/toast.service';
import { IoService } from '../../services/io.service';
import { IconComponent } from '../icon/icon.component';

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
            <button (click)="applyFormat('h1')" class="w-8 h-8 rounded hover-surface font-bold text-lg" title="Title">H1</button>
            <button (click)="applyFormat('h2')" class="w-8 h-8 rounded hover-surface font-bold" title="Subtitle">H2</button>
          </div>

          <div class="flex gap-1 border-r pr-2 border-soft">
            <button (click)="applyFormat('bold')" class="w-8 h-8 rounded hover-surface font-bold" title="Bold">B</button>
            <button (click)="applyFormat('italic')" class="w-8 h-8 rounded hover-surface italic" title="Italic">I</button>
            <button (click)="applyFormat('code')" class="w-8 h-8 rounded hover-surface font-mono text-xs" title="Code"><></button>
          </div>

          <div class="flex gap-1 border-r pr-2 border-soft">
            <button (click)="applyFormat('list')" class="w-8 h-8 rounded hover-surface" title="Bullet List">• List</button>
            <button (click)="applyFormat('quote')" class="w-8 h-8 rounded hover-surface" title="Quote">"</button>
            <button (click)="applyFormat('hr')" class="w-8 h-8 rounded hover-surface flex items-center justify-center" title="Divider">
              <div class="h-px w-4 bg-[var(--muted)]"></div>
            </button>
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

          <div class="ml-auto text-xs text-muted hidden sm:block">Markdown Enabled</div>
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
          <textarea
            #editorTextarea
            [(ngModel)]="form.content"
            class="w-full flex-grow bg-transparent resize-none outline-none text-lg md:text-xl leading-relaxed font-hand text-[var(--ink-color)] min-h-[400px]"
            placeholder="Start writing..."
          ></textarea>
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

  card = input.required<Card>();

  @Output() close = new EventEmitter<void>();
  @ViewChild('editorTextarea') editorTextarea!: ElementRef<HTMLTextAreaElement>;

  isPolishing = signal(false);
  isClosing = signal(false);
  form = { title: '', content: '', tags: '' };

  constructor() {
    effect(() => {
      const c = this.card();
      this.form = { title: c.title, content: c.content, tags: c.tags.join(', ') };
    });
  }

  private parseTags(): string[] {
    return this.form.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }

  private hasUnsavedChanges(): boolean {
    const c = this.card();
    return (
      this.form.title !== c.title ||
      this.form.content !== c.content ||
      this.parseTags().join(',') !== c.tags.join(',')
    );
  }

  save() {
    const updated: Card = {
      ...this.card(),
      title: this.form.title,
      content: this.form.content,
      tags: this.parseTags()
    };
    this.boardService.updateCard(updated);
    this.toastService.show('Saved successfully', 'success');
  }

  startClose() {
    this.isClosing.set(true);
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

  applyFormat(type: string) {
    const textarea = this.editorTextarea.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    const formats: Record<string, string> = {
      bold: `${before}**${selected || 'bold'}**${after}`,
      italic: `${before}*${selected || 'italic'}*${after}`,
      code: `${before}\`${selected || 'code'}\`${after}`,
      quote: `${before}> ${selected || 'Quote'}${after}`,
      h1: `${before}# ${selected || 'Heading'}${after}`,
      h2: `${before}## ${selected || 'Heading'}${after}`,
      hr: `${before}\n---\n${after}`,
      list: `${before}${before.endsWith('\n') || before === '' ? '- ' : '\n- '}${selected}${after}`
    };

    if (formats[type]) {
      this.form.content = formats[type];
      setTimeout(() => textarea.focus(), 0);
    }
  }
}
