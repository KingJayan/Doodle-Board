import { Component, input, Output, EventEmitter, computed, signal, ChangeDetectionStrategy, inject, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Card, CARD_PALETTE, CARD_DEFAULTS } from '../../models/card.model';
import { BoardService } from '../../services/board.service';
import { ToastService } from '../../services/toast.service';
import { ThemeService } from '../../services/theme.service';
import { MarkdownService } from '../../services/markdown.service';
import { IconComponent, iconFor } from '../icon/icon.component';

@Component({
  selector: 'app-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <!-- rotation wrapper -->
    <div
      class="transition-transform duration-300 relative select-none"
      [style.transform]="rotationStyle()"
      [style.width.px]="isResizing() ? previewWidth() : (card().isMinimized ? D.minimizedWidth : (card().width || D.width))"
      [class.z-overlay]="isResizing()"
    >

      <!-- card inner -->
      <div
        class="group relative p-4 flex flex-col gap-2 h-full min-h-[100px] transition-all duration-300 card-shadow card-ink rounded-sm"
        [class.hover:scale-[1.02]]="!isEditing() && !isResizing()"
        [class.hover:z-card-float]="!isEditing() && !isResizing()"
        [class.animate-scribbleOut]="isDeleting()"
        [class.card-animated]="isDeleting()"
        [class.animate-pinPulse]="isPinning()"
        [class.card-minimizing]="isMinimizing()"
        [class.card-save]="isSaving()"
        [class.micro-anim]="isSaving()"
        [class.card-selected]="isSelected()"
        [style.background-color]="noteBg(card().color)"
        [style.height.px]="card().isMinimized ? null : (isResizing() ? previewHeight() : (card().height || D.height))"
      >
        @if (isResizing()) {
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div class="text-2xl font-bold text-gray-700 bg-white/90 px-5 py-2 rounded-xl shadow-lg marker-font backdrop-blur-sm border-2 border-gray-200">
              {{ previewWidth() | number:'1.0-0' }} x {{ previewHeight() | number:'1.0-0' }}
            </div>
          </div>
        }
        <!-- bulk-select badge -->
        @if (isSelected()) {
          <div class="absolute top-2 right-2 z-50 w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-md pointer-events-none">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,6 5,9 10,3"/></svg>
          </div>
        }

        <!-- drag handle -->
        <div class="drag-handle absolute top-2 left-2 cursor-grab active:cursor-grabbing z-40 opacity-30 group-hover:opacity-100 transition-opacity p-2 hover:bg-black/5 rounded-full" aria-label="Drag to move" role="button" (pointerdown)="dragHandlePointerDown.emit($event)">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none">
            <circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle>
            <circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle>
          </svg>
        </div>

        <!-- pin / tape visual -->
        @if (card().isPinned) {
          <div class="absolute -top-5 left-1/2 -translate-x-1/2 text-4xl drop-shadow-md z-30 pointer-events-none"><app-icon name="pin"></app-icon></div>
        } @else {
          <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-8 rotate-1 backdrop-blur-sm shadow-sm pointer-events-none" style="clip-path: polygon(2% 0%, 98% 0%, 100% 100%, 0% 100%); background-color: var(--tape-color)"></div>
        }

        <!-- stickers -->
        <div class="absolute inset-0 pointer-events-none overflow-hidden z-20">
          @for (sticker of card().stickers; track $index) {
            <div
              class="absolute text-5xl opacity-90 drop-shadow-md animate-stamp"
              [style.top.px]="stickerTop($index)"
              [style.right.px]="stickerRight($index)"
              [style.transform]="'rotate(' + (($index * 45) - 20) + 'deg)'"
            ><app-icon [name]="iconFor(sticker)"></app-icon></div>
          }
        </div>

        <!-- action controls -->
        <div class="absolute top-1 right-1 flex flex-col gap-1.5 z-card-float opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto bg-[var(--surface)]/85 backdrop-blur-sm rounded-xl p-1.5 shadow-md hover:opacity-100" [class.!hidden]="bulkMode() || isEditing()">
          <div class="flex gap-2">
            <button
              (click)="handlePin($event)"
              class="w-9 h-9 bg-[var(--surface)] text-[var(--ink-color)] rounded-full flex items-center justify-center shadow-md hover-surface hover:scale-110 transition-transform doodle-border text-sm cursor-pointer"
              [attr.aria-label]="card().isPinned ? 'Unpin' : 'Pin'"
            ><app-icon [name]="card().isPinned ? 'pin-active' : 'pin'"></app-icon></button>

            <button
              (click)="toggleMinimize($event)"
              class="w-9 h-9 bg-[var(--surface)] text-[var(--ink-color)] rounded-full flex items-center justify-center shadow-md hover-surface hover:scale-110 transition-transform doodle-border text-sm cursor-pointer font-bold"
              [attr.aria-label]="card().isMinimized ? 'Expand' : 'Minimize'"
            >@if (card().isMinimized) {<app-icon name="maximize"></app-icon>} @else {<app-icon name="minimize"></app-icon>}</button>

            <div class="relative">
              <button
                (click)="toggleMoveMenu($event)"
                class="w-9 h-9 bg-[var(--surface)] text-[var(--ink-color)] rounded-full flex items-center justify-center shadow-md hover-surface hover:scale-110 transition-transform doodle-border text-sm cursor-pointer"
                aria-label="Move to board"
              ><app-icon name="folder-open"></app-icon></button>

              @if (showMoveMenu()) {
                <div class="absolute top-full right-0 mt-2 bg-[var(--surface)] text-[var(--ink-color)] border-2 border-[var(--ink-color)] rounded-lg shadow-xl p-2 w-48 z-overlay flex flex-col gap-1" (click)="$event.stopPropagation()">
                  <div class="text-xs text-muted font-bold px-2 uppercase tracking-wide mb-1">Move to...</div>
                  @for (board of boardService.boards(); track board.id) {
                    <button
                      class="text-left text-sm px-3 py-2 hover-surface rounded-md truncate font-hand font-bold transition-colors"
                      (click)="moveToBoard(board.id)"
                      [style.background-color]="board.id === card().boardId ? 'var(--surface-hover)' : null"
                      [style.color]="board.id === card().boardId ? 'var(--accent)' : null"
                    >{{ board.name }}</button>
                  }
                </div>
              }
            </div>
          </div>

          <div class="flex gap-2 justify-end">
            <button
              (click)="handleDuplicate($event)"
              class="w-9 h-9 bg-[var(--surface)] text-[var(--ink-color)] rounded-full flex items-center justify-center shadow-md hover-surface hover:scale-110 transition-transform doodle-border text-sm cursor-pointer"
              aria-label="Duplicate note"
              title="Duplicate"
            ><app-icon name="page"></app-icon></button>
            <button
              (click)="handleExpand($event)"
              class="w-9 h-9 bg-[var(--surface)] text-[var(--ink-color)] rounded-full flex items-center justify-center shadow-md hover-surface hover:scale-110 transition-transform doodle-border text-sm cursor-pointer"
              aria-label="Open editor"
            >↗</button>
            <button
              (click)="handleDelete($event)"
              class="w-9 h-9 bg-[var(--surface)] text-red-500 rounded-full flex items-center justify-center shadow-md hover-surface hover:scale-110 transition-transform doodle-border cursor-pointer font-bold text-sm"
              aria-label="Delete note"
            >✕</button>
          </div>
        </div>

        <!-- bottom hover tools -->
        <div class="absolute bottom-1 left-0 right-0 flex justify-center z-card-float opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto" [class.hidden]="card().isMinimized || bulkMode() || isEditing()">
          <div class="bg-[var(--surface)]/95 text-[var(--ink-color)] backdrop-blur px-3 py-2 rounded-full shadow-lg doodle-border flex gap-4 items-center">
            <!-- color picker -->
            <div class="relative">
              <button (click)="toggleColorPicker($event)" class="w-8 h-8 rounded-full border-2 border-[var(--border-soft)] shadow-inner hover:scale-110 transition-transform" [style.background-color]="noteBg(card().color)" aria-label="Change color"></button>
              @if (showColorPicker()) {
                <div class="absolute bottom-full left-0 mb-1 p-3 bg-[var(--surface)] rounded-xl shadow-xl border-2 border-soft flex gap-2 animate-popupSlide" (click)="$event.stopPropagation()">
                  @for (c of palette; track c) {
                    <button
                      (click)="changeColor(c, $event)"
                      class="w-8 h-8 rounded-full border border-soft hover:scale-125 transition-transform"
                      [style.background-color]="noteBg(c)"
                    ></button>
                  }
                </div>
              }
            </div>
            <div class="w-px h-6 bg-[var(--border-soft)]"></div>
            <div class="flex gap-2 text-xl">
              <button (click)="toggleSticker('⭐', $event)" class="hover:scale-125 transition-transform" aria-label="Toggle star sticker"><app-icon name="star"></app-icon></button>
              <button (click)="toggleSticker('✅', $event)" class="hover:scale-125 transition-transform" aria-label="Toggle check sticker"><app-icon name="check"></app-icon></button>
              <button (click)="toggleSticker('🔥', $event)" class="hover:scale-125 transition-transform" aria-label="Toggle fire sticker"><app-icon name="fire"></app-icon></button>
              <button (click)="toggleSticker('❓', $event)" class="hover:scale-125 transition-transform" aria-label="Toggle question sticker"><app-icon name="question"></app-icon></button>
            </div>
          </div>
        </div>

        @if (isEditing()) {
          <div class="flex flex-col gap-2 h-full z-30 relative" (click)="$event.stopPropagation()">
            <input
              type="text"
              [(ngModel)]="editForm.title"
              class="doodle-input font-bold text-2xl bg-transparent"
              placeholder="Title..."
              autofocus
            />
            <textarea
              [(ngModel)]="editForm.content"
              class="doodle-input flex-grow bg-transparent resize-none focus:outline-none custom-scroll text-lg"
              rows="4"
              placeholder="Write something..."
            ></textarea>
            <div class="flex justify-end gap-2 mt-2">
              <button (click)="cancelEdit()" class="text-base underline opacity-70 hover:opacity-100 p-2">Cancel</button>
              <button (click)="saveEdit()" class="doodle-btn text-base py-1 px-4 bg-[var(--surface)]/70">Done</button>
            </div>
          </div>
        } @else {
          <div (click)="startEdit()" class="cursor-pointer h-full flex flex-col w-full relative z-10">
            <div class="flex items-start justify-between gap-2 pr-4">
              <h3
                class="font-bold text-2xl mb-2 marker-font leading-tight break-words ml-6"
                [innerHTML]="highlightText(card().title)"
              ></h3>
            </div>

            @if (card().isMinimized) {
              <div class="text-base italic opacity-60 mt-1">Minimized</div>
            } @else {
              <div
                class="flex-grow leading-relaxed text-lg break-words markdown-content overflow-y-auto pr-2 custom-scroll"
                [innerHTML]="parsedContent()"
                (click)="onCheckboxClick($event)"
              ></div>
            }

            @if (card().tags.length > 0) {
              <div class="mt-auto pt-3 flex flex-wrap gap-2">
                @for (tag of card().tags; track tag) {
                  <span
                    class="text-xs font-bold px-2 py-1 border border-[var(--note-ink)]/20 rounded-full bg-[var(--note-ink)]/5 hover:bg-[var(--note-ink)]/15 transition-colors"
                    (click)="handleTagClick(tag, $event)"
                  >#{{ tag }}</span>
                }
              </div>
            }
          </div>
        }

        <!-- resize handle -->
        @if (!card().isMinimized && !isEditing()) {
          <div
            class="absolute -bottom-3 -right-3 w-12 h-12 cursor-se-resize z-card-float flex items-center justify-center group/resize"
            (mousedown)="startResize($event)"
          >
            <svg viewBox="0 0 10 10" class="w-5 h-5 fill-black/20 group-hover/resize:fill-black/80 transition-colors transform -translate-x-2 -translate-y-2">
              <path d="M 6 10 L 10 10 L 10 6 Z" />
              <path d="M 2 10 L 4 10 L 10 4 L 10 2 Z" />
            </svg>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .card-shadow { box-shadow: var(--card-shadow); }
    :host { display: block; }
    .custom-scroll::-webkit-scrollbar { width: 6px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 4px; }
    .animate-pinPulse { animation: pinPulse 0.2s var(--ease-stamp); }
    @keyframes pinPulse { 0% { transform: scale(1); } 50% { transform: scale(1.06); } 100% { transform: scale(1); } }
    .card-minimizing { animation: minimizeCard 0.2s var(--ease-spring) forwards; overflow: hidden; transform-origin: top center; }
    @keyframes minimizeCard { to { transform: scaleY(0.25); opacity: 0.4; } }
    .animate-scribbleOut { animation: scribbleOut 0.5s ease-in-out forwards; pointer-events: none; }
    .animate-stamp { animation: stampIn 0.2s var(--ease-stamp) forwards; }
    @keyframes stampIn {
      from { transform: scale(2); opacity: 0; }
      to { transform: scale(1); opacity: 0.9; }
    }
    @keyframes scribbleOut {
      0% { transform: scale(1); }
      20% { transform: scale(1.1) rotate(5deg); }
      40% { transform: scale(0.9) rotate(-5deg); opacity: 0.8; }
      60% { transform: scale(1.05) rotate(2deg); opacity: 0.6; }
      80% { transform: scale(0.5) rotate(-2deg); opacity: 0.3; }
      100% { transform: scale(0) rotate(0); opacity: 0; }
    }
    @keyframes popupSlide {
      from { transform: translateY(8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-popupSlide { animation: popupSlide 0.18s ease-out; }
  `]
})
export class CardComponent implements OnDestroy {
  protected D = CARD_DEFAULTS;
  protected iconFor = iconFor;
  boardService = inject(BoardService);
  private toastService = inject(ToastService);
  private themeService = inject(ThemeService);
  private markdownService = inject(MarkdownService);

  /** Theme-aware sticky-note background (darkened on dark themes). */
  noteBg = (hex: string) => this.themeService.noteBg(hex);

  card = input.required<Card>();
  searchQuery = input<string>('');
  isSelected = input<boolean>(false);
  bulkMode = input<boolean>(false);

  @Output() update = new EventEmitter<Card>();
  @Output() delete = new EventEmitter<string>();
  @Output() expand = new EventEmitter<Card>();
  @Output() tagClick = new EventEmitter<string>();
  @Output() stickerToggle = new EventEmitter<string>();
  @Output() pinToggle = new EventEmitter<void>();
  @Output() duplicate = new EventEmitter<void>();
  @Output() select = new EventEmitter<void>();
  @Output() dragHandlePointerDown = new EventEmitter<PointerEvent>();

  isDeleting = signal(false);
  isEditing = signal(false);
  isResizing = signal(false);
  isPinning = signal(false);
  isMinimizing = signal(false);
  isSaving = signal(false);
  showMoveMenu = signal(false);
  showColorPicker = signal(false);
  editForm = { title: '', content: '' };
  renderedContent = signal<string>('');

  previewWidth = signal(0);
  previewHeight = signal(0);
  rotationStyle = computed(() => `rotate(${this.card().rotation * this.themeService.tilt()}deg)`);

  readonly palette = CARD_PALETTE;

  private renderSeq = 0;

  constructor() {
    effect(() => {
      const c = this.card();
      if (c.isMinimized) return;
      const content = c.content;
      const seq = ++this.renderSeq;
      this.markdownService.render(content).then(html => {
        if (seq === this.renderSeq) this.renderedContent.set(html);
      });
    });
  }

  stickerTop(i: number) { return (i % 3) * CARD_DEFAULTS.stickerColStep + CARD_DEFAULTS.stickerOffset; }
  stickerRight(i: number) { return Math.floor(i / 3) * CARD_DEFAULTS.stickerRowStep + CARD_DEFAULTS.stickerOffset; }

  private startX = 0;
  private startY = 0;
  private startWidth = 0;
  private startHeight = 0;
  private resizeListener?: (e: MouseEvent) => void;
  private stopResizeListener?: (e: MouseEvent) => void;

  private escapeHtml(text: string): string {
    return (text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  highlightText(text: string): string {
    const query = this.searchQuery();
    if (!query) return this.escapeHtml(text);
    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts: string[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        parts.push(this.escapeHtml(text.slice(last, m.index)));
        parts.push(`<mark>${this.escapeHtml(m[1])}</mark>`);
        last = m.index + m[0].length;
      }
      parts.push(this.escapeHtml(text.slice(last)));
      return parts.join('');
    } catch {
      return this.escapeHtml(text);
    }
  }

  parsedContent = computed(() => {
    let html = this.renderedContent();
    const query = this.searchQuery();
    if (query && html) {
      try {
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![^<]*>)`, 'gi');
        html = html.replace(regex, '<mark>$1</mark>');
      } catch {}
    }
    return html;
  });

  startEdit() {
    if (this.bulkMode()) { this.select.emit(); return; }
    if (this.card().isMinimized) return;
    this.editForm = { title: this.card().title, content: this.card().content };
    this.isEditing.set(true);
  }

  handleDuplicate(event: Event) {
    event.stopPropagation();
    this.duplicate.emit();
  }

  saveEdit() {
    this.markdownService.invalidate(this.card().content);
    this.update.emit({ ...this.card(), title: this.editForm.title || 'Untitled', content: this.editForm.content });
    this.isEditing.set(false);
    this.isSaving.set(true);
    setTimeout(() => this.isSaving.set(false), 220);
  }

  cancelEdit() {
    this.isEditing.set(false);
  }

  handleDelete(event: Event) {
    event.stopPropagation();
    if (this.themeService.reduceMotion()) {
      this.delete.emit(this.card().id);
    } else {
      this.isDeleting.set(true);
      setTimeout(() => this.delete.emit(this.card().id), 500);
    }
  }

  handleExpand(event: Event) {
    event.stopPropagation();
    this.expand.emit(this.card());
  }

  handleTagClick(tag: string, event: Event) {
    event.stopPropagation();
    this.tagClick.emit(tag);
  }

  onCheckboxClick(event: Event) {
    const target = event.target as HTMLElement;
    if (target.tagName !== 'INPUT' || (target as HTMLInputElement).type !== 'checkbox') return;
    event.stopPropagation();
    event.preventDefault();
    const allCheckboxes = (event.currentTarget as HTMLElement).querySelectorAll('input[type=checkbox]');
    const idx = Array.from(allCheckboxes).indexOf(target as HTMLInputElement);
    if (idx === -1) return;
    const content = this.card().content;
    let count = 0;
    const updated = content.replace(/^(\s*- \[)([xX ])(\])/gm, (match, pre, state, post) => {
      const result = count === idx ? `${pre}${state === ' ' ? 'x' : ' '}${post}` : match;
      count++;
      return result;
    });
    if (updated !== content) {
      this.markdownService.invalidate(content);
      this.update.emit({ ...this.card(), content: updated });
    }
  }

  toggleColorPicker(event: Event) {
    event.stopPropagation();
    this.showColorPicker.update(v => !v);
  }

  changeColor(color: string, event: Event) {
    event.stopPropagation();
    this.showColorPicker.set(false);
    this.update.emit({ ...this.card(), color });
  }

  toggleSticker(emoji: string, event: Event) {
    event.stopPropagation();
    this.stickerToggle.emit(emoji);
  }

  handlePin(event: Event) {
    event.stopPropagation();
    this.isPinning.set(true);
    setTimeout(() => this.isPinning.set(false), 200);
    this.pinToggle.emit();
  }

  toggleMinimize(event: Event) {
    event.stopPropagation();
    if (!this.card().isMinimized) {
      this.isMinimizing.set(true);
      setTimeout(() => {
        this.isMinimizing.set(false);
        this.update.emit({ ...this.card(), isMinimized: true });
      }, 200);
    } else {
      this.update.emit({ ...this.card(), isMinimized: false });
    }
  }

  toggleMoveMenu(event: Event) {
    event.stopPropagation();
    this.showMoveMenu.update(v => !v);
  }

  moveToBoard(boardId: string) {
    this.update.emit({ ...this.card(), boardId });
    this.showMoveMenu.set(false);
    this.toastService.show('Moved note to board!', 'success');
  }

  startResize(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isResizing.set(true);
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startWidth = this.card().width || CARD_DEFAULTS.width;
    this.startHeight = this.card().height || CARD_DEFAULTS.height;
    this.previewWidth.set(this.startWidth);
    this.previewHeight.set(this.startHeight);

    this.resizeListener = this.onResize.bind(this);
    this.stopResizeListener = this.stopResize.bind(this);
    window.addEventListener('mousemove', this.resizeListener);
    window.addEventListener('mouseup', this.stopResizeListener);
  }

  private onResize(event: MouseEvent) {
    if (!this.isResizing()) return;
    this.previewWidth.set(Math.max(CARD_DEFAULTS.minWidth, this.startWidth + event.clientX - this.startX));
    this.previewHeight.set(Math.max(CARD_DEFAULTS.minHeight, this.startHeight + event.clientY - this.startY));
  }

  private stopResize() {
    this.isResizing.set(false);
    window.removeEventListener('mousemove', this.resizeListener!);
    window.removeEventListener('mouseup', this.stopResizeListener!);
    this.update.emit({ ...this.card(), width: this.previewWidth(), height: this.previewHeight() });
  }

  ngOnDestroy() {
    if (this.isResizing() && this.resizeListener && this.stopResizeListener) {
      window.removeEventListener('mousemove', this.resizeListener);
      window.removeEventListener('mouseup', this.stopResizeListener);
    }
  }
}
