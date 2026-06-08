import { Component, inject, signal, Output, EventEmitter, ViewChild, ElementRef, input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Card } from '../../models/card.model';
import { BoardService } from '../../services/board.service';
import { AiService } from '../../services/ai.service';
import { ToastService } from '../../services/toast.service';
import { IoService } from '../../services/io.service';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 z-[100] flex items-start justify-center p-0 md:p-8 bg-gray-900/50 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      (click)="requestClose()"
    >
      <div
        class="bg-white w-full md:max-w-4xl min-h-[90vh] md:min-h-[1100px] shadow-2xl flex flex-col relative animate-slideUp border border-gray-300 mt-0 md:mt-4 mb-20"
        (click)="$event.stopPropagation()"
      >
        <!-- file menu bar -->
        <div class="bg-gray-100 p-2 border-b border-gray-300 flex items-center gap-4 text-sm text-gray-700 select-none">
          <span class="font-bold text-gray-900 px-2">File</span>
          <button (click)="save()" class="hover:bg-gray-200 px-2 rounded">Save</button>
          <button (click)="downloadMd()" class="hover:bg-gray-200 px-2 rounded">Download .md</button>
          <button (click)="requestClose()" class="hover:bg-red-100 text-red-600 px-2 rounded ml-auto">Close ✕</button>
        </div>

        <!-- toolbar -->
        <div class="p-3 bg-white border-b border-gray-200 flex gap-2 flex-wrap items-center shadow-sm sticky top-0 z-10 text-gray-800">
          <div class="flex gap-1 border-r pr-2 border-gray-300">
            <button (click)="applyFormat('h1')" class="w-8 h-8 rounded hover:bg-gray-100 font-bold text-lg" title="Title">H1</button>
            <button (click)="applyFormat('h2')" class="w-8 h-8 rounded hover:bg-gray-100 font-bold" title="Subtitle">H2</button>
          </div>

          <div class="flex gap-1 border-r pr-2 border-gray-300">
            <button (click)="applyFormat('bold')" class="w-8 h-8 rounded hover:bg-gray-100 font-bold" title="Bold">B</button>
            <button (click)="applyFormat('italic')" class="w-8 h-8 rounded hover:bg-gray-100 italic" title="Italic">I</button>
            <button (click)="applyFormat('code')" class="w-8 h-8 rounded hover:bg-gray-100 font-mono text-xs" title="Code"><></button>
          </div>

          <div class="flex gap-1 border-r pr-2 border-gray-300">
            <button (click)="applyFormat('list')" class="w-8 h-8 rounded hover:bg-gray-100" title="Bullet List">• List</button>
            <button (click)="applyFormat('quote')" class="w-8 h-8 rounded hover:bg-gray-100" title="Quote">"</button>
            <button (click)="applyFormat('hr')" class="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center" title="Divider">
              <div class="h-px w-4 bg-gray-500"></div>
            </button>
          </div>

          <!-- ai polish -->
          @if (aiAvailable) {
            <div class="flex gap-1 items-center">
              <button
                (click)="polishContent('fix')"
                class="flex items-center gap-1 px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold"
                [disabled]="isPolishing()"
              >
                ✨ Fix Grammar
              </button>
              <button
                (click)="polishContent('expand')"
                class="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold"
                [disabled]="isPolishing()"
              >
                📝 Expand
              </button>
            </div>
          }

          <div class="ml-auto text-xs text-gray-400 hidden sm:block">Markdown Enabled</div>
        </div>

        <!-- doc content -->
        <div class="flex-grow p-8 md:p-16 flex flex-col gap-6 relative">
          @if (isPolishing()) {
            <div class="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center flex-col">
              <div class="text-4xl animate-bounce">✏️</div>
              <div class="font-bold text-gray-500 mt-2">Genie is polishing your draft...</div>
            </div>
          }

          <input
            [(ngModel)]="form.title"
            class="text-4xl md:text-5xl font-bold bg-transparent outline-none w-full marker-font placeholder-gray-300 border-none p-0 text-gray-900"
            placeholder="Untitled Scribble"
          >
          <textarea
            #editorTextarea
            [(ngModel)]="form.content"
            class="w-full flex-grow bg-transparent resize-none outline-none text-lg md:text-xl leading-relaxed font-hand text-gray-800"
            placeholder="Start writing..."
            style="min-height: 600px;"
          ></textarea>
        </div>

        <!-- tags footer -->
        <div class="p-8 border-t border-gray-100 bg-gray-50 text-sm text-gray-600">
          <div class="flex items-center gap-2">
            <span>🏷️ Tags:</span>
            <input
              [(ngModel)]="form.tags"
              class="bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none w-full max-w-sm px-2 py-1 text-gray-800"
              placeholder="Add tags separated by commas..."
            >
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .font-hand { font-family: 'Patrick Hand', cursive; }
    .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class EditorComponent implements OnChanges {
  private boardService = inject(BoardService);
  private aiService = inject(AiService);
  aiAvailable = this.aiService.isAvailable;
  private toastService = inject(ToastService);
  private ioService = inject(IoService);

  card = input.required<Card>();

  @Output() close = new EventEmitter<void>();
  @ViewChild('editorTextarea') editorTextarea!: ElementRef<HTMLTextAreaElement>;

  isPolishing = signal(false);
  form = { title: '', content: '', tags: '' };

  ngOnChanges() {
    const c = this.card();
    this.form = { title: c.title, content: c.content, tags: c.tags.join(', ') };
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
    this.boardService.saveStatus.set('Saved!');
    this.toastService.show('Saved successfully', 'success');
    setTimeout(() => this.boardService.saveStatus.set('Saved'), 2000);
  }

  requestClose() {
    if (this.hasUnsavedChanges()) {
      if (!confirm('Wait! You have unsaved scribbles. Close anyway?')) return;
    }
    this.close.emit();
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
      this.toastService.show('Pencil magic complete! ✨', 'success');
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
