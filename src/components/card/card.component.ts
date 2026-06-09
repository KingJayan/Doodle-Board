import { Component, input, Output, EventEmitter, computed, signal, ChangeDetectionStrategy, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Card, CARD_PALETTE, CARD_DEFAULTS } from '../../models/card.model';
import { BoardService } from '../../services/board.service';
import { ToastService } from '../../services/toast.service';
import { ThemeService } from '../../services/theme.service';
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
      [style.width.px]="card().isMinimized ? D.minimizedWidth : (card().width || D.width)"
      [class.z-overlay]="isResizing()"
    >

      <!-- resize preview -->
      @if (isResizing()) {
        <div
          class="absolute top-0 left-0 border-4 border-dashed border-gray-400/50 bg-gray-100/30 rounded-lg z-overlay pointer-events-none flex items-center justify-center"
          [style.width.px]="previewWidth()"
          [style.height.px]="previewHeight()"
        >
          <div class="text-3xl font-bold text-gray-700 bg-white/90 px-6 py-3 rounded-xl shadow-lg marker-font backdrop-blur-sm border-2 border-gray-200">
            {{ previewWidth() | number:'1.0-0' }} x {{ previewHeight() | number:'1.0-0' }}
          </div>
        </div>
      }

      <!-- card inner -->
      <div
        class="group relative p-4 flex flex-col gap-2 h-full min-h-[100px] transition-all duration-300 card-shadow card-ink rounded-sm"
        [class.hover:scale-[1.02]]="!isEditing() && !isResizing()"
        [class.hover:z-card-float]="!isEditing() && !isResizing()"
        [class.animate-scribbleOut]="isDeleting()"
        [style.background-color]="noteBg(card().color)"
        [style.height.px]="card().isMinimized ? null : (card().height || D.height)"
      >
        <!-- drag handle -->
        <div class="drag-handle absolute top-2 left-2 cursor-grab active:cursor-grabbing z-40 opacity-30 group-hover:opacity-100 transition-opacity p-2 hover:bg-black/5 rounded-full" aria-label="Drag to reorder" role="button">
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
        <div class="absolute -top-10 -right-6 flex flex-col gap-2 z-card-float opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto p-2 hover:opacity-100">
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
        <div class="absolute -bottom-8 left-0 right-0 flex justify-center z-card-float opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto" [class.hidden]="card().isMinimized">
          <div class="bg-[var(--surface)]/95 text-[var(--ink-color)] backdrop-blur px-3 py-2 rounded-full shadow-lg doodle-border flex gap-4 items-center">
            <!-- color picker -->
            <div class="relative group/colors">
              <button class="w-8 h-8 rounded-full border-2 border-[var(--border-soft)] shadow-inner hover:scale-110 transition-transform" [style.background-color]="noteBg(card().color)" aria-label="Change color"></button>
              <div class="absolute bottom-full left-0 mb-3 p-3 bg-[var(--surface)] rounded-xl shadow-xl border-2 border-soft hidden group-hover/colors:flex gap-2 animate-slideUp">
                @for (c of palette; track c) {
                  <button
                    (click)="changeColor(c, $event)"
                    class="w-8 h-8 rounded-full border border-soft hover:scale-125 transition-transform"
                    [style.background-color]="noteBg(c)"
                  ></button>
                }
              </div>
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
                class="whitespace-pre-wrap flex-grow leading-relaxed text-lg break-words markdown-content overflow-y-auto pr-2 custom-scroll"
                [innerHTML]="parsedContent()"
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
    :host ::ng-deep .markdown-content strong { font-weight: 800; }
    :host ::ng-deep .markdown-content em { font-style: italic; }
    :host ::ng-deep .markdown-content ul { list-style-type: disc; padding-left: 1em; }
    :host ::ng-deep .markdown-content blockquote {
      border-left: 4px solid rgba(0,0,0,0.2);
      padding-left: 0.5em;
      margin-left: 0;
      font-style: italic;
      opacity: 0.8;
    }
    :host ::ng-deep .markdown-content code { font-family: monospace; background: rgba(0,0,0,0.08); padding: 0 3px; border-radius: 3px; font-size: 0.9em; }
    :host ::ng-deep .markdown-content h3 { font-weight: 800; font-size: 1.1em; margin: 0.3em 0; }
    :host ::ng-deep .markdown-content h4 { font-weight: 700; font-size: 1em; margin: 0.2em 0; }
    :host ::ng-deep .markdown-content hr { border: none; border-top: 1px solid rgba(0,0,0,0.2); margin: 0.5em 0; }
    :host ::ng-deep mark { background-color: #fef08a; padding: 0 2px; border-radius: 2px; }
    .custom-scroll::-webkit-scrollbar { width: 6px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 4px; }
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
    @keyframes slideUp {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-slideUp { animation: slideUp 0.2s ease-out; }
  `]
})
export class CardComponent implements OnDestroy {
  protected D = CARD_DEFAULTS;
  protected iconFor = iconFor;
  boardService = inject(BoardService);
  private toastService = inject(ToastService);
  private themeService = inject(ThemeService);

  /** Theme-aware sticky-note background (darkened on dark themes). */
  noteBg = (hex: string) => this.themeService.noteBg(hex);

  card = input.required<Card>();
  searchQuery = input<string>('');

  @Output() update = new EventEmitter<Card>();
  @Output() delete = new EventEmitter<string>();
  @Output() expand = new EventEmitter<Card>();
  @Output() tagClick = new EventEmitter<string>();
  @Output() stickerToggle = new EventEmitter<string>();
  @Output() pinToggle = new EventEmitter<void>();

  isDeleting = signal(false);
  isEditing = signal(false);
  isResizing = signal(false);
  showMoveMenu = signal(false);
  editForm = { title: '', content: '' };

  previewWidth = signal(0);
  previewHeight = signal(0);
  // Themes that lay notes on a grid (Blueprint, Terminal) zero out the tilt;
  // breezy themes (Sakura) amplify it. See ThemeService.tilt.
  rotationStyle = computed(() => `rotate(${this.card().rotation * this.themeService.tilt()}deg)`);

  readonly palette = CARD_PALETTE;

  stickerTop(i: number) { return (i % 3) * CARD_DEFAULTS.stickerColStep + CARD_DEFAULTS.stickerOffset; }
  stickerRight(i: number) { return Math.floor(i / 3) * CARD_DEFAULTS.stickerRowStep + CARD_DEFAULTS.stickerOffset; }

  private startX = 0;
  private startY = 0;
  private startWidth = 0;
  private startHeight = 0;
  private resizeListener?: (e: MouseEvent) => void;
  private stopResizeListener?: (e: MouseEvent) => void;

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  highlightText(text: string): string {
    const safe = this.escapeHtml(text || '');
    const query = this.searchQuery();
    if (!query) return safe;
    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return safe.replace(regex, '<mark>$1</mark>');
    } catch {
      return safe;
    }
  }

  parsedContent = computed(() => {
    const inlineFormat = (s: string) =>
      this.escapeHtml(s)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');

    const lines = (this.card().content || '').split('\n');
    const out: string[] = [];
    let inList = false;

    for (const line of lines) {
      const listMatch = line.match(/^-\s+(.*)/);
      if (listMatch) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push(`<li>${inlineFormat(listMatch[1])}</li>`);
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        if (/^---+$/.test(line.trim())) { out.push('<hr>'); continue; }
        const h1Match = line.match(/^#\s+(.*)/);
        if (h1Match) { out.push(`<h3>${inlineFormat(h1Match[1])}</h3>`); continue; }
        const h2Match = line.match(/^##\s+(.*)/);
        if (h2Match) { out.push(`<h4>${inlineFormat(h2Match[1])}</h4>`); continue; }
        const quoteMatch = line.match(/^>\s+(.*)/);
        out.push(quoteMatch ? `<blockquote>${inlineFormat(quoteMatch[1])}</blockquote>` : inlineFormat(line));
      }
    }
    if (inList) out.push('</ul>');

    let text = out.join('\n');
    const query = this.searchQuery();
    if (query) {
      try {
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![^<]*>)`, 'gi');
        text = text.replace(regex, '<mark>$1</mark>');
      } catch {}
    }
    return text;
  });

  startEdit() {
    if (this.card().isMinimized) return;
    this.editForm = { title: this.card().title, content: this.card().content };
    this.isEditing.set(true);
  }

  saveEdit() {
    this.update.emit({ ...this.card(), title: this.editForm.title || 'Untitled', content: this.editForm.content });
    this.isEditing.set(false);
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

  changeColor(color: string, event: Event) {
    event.stopPropagation();
    this.update.emit({ ...this.card(), color });
  }

  toggleSticker(emoji: string, event: Event) {
    event.stopPropagation();
    this.stickerToggle.emit(emoji);
  }

  handlePin(event: Event) {
    event.stopPropagation();
    this.pinToggle.emit();
  }

  toggleMinimize(event: Event) {
    event.stopPropagation();
    this.update.emit({ ...this.card(), isMinimized: !this.card().isMinimized });
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
