import { Component, Output, EventEmitter, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardService } from '../../services/board.service';
import { ThemeService } from '../../services/theme.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-trash-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" [class.animate-modalOut]="isClosing()" (click)="startClose()">
      <div
        class="bg-[var(--paper-color)] border-2 border-[var(--ink-color)] rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-center justify-between p-4 border-b-2 border-dashed border-[var(--border-soft)]">
          <h2 class="marker-font text-2xl flex items-center gap-2 text-[var(--ink-color)]">
            <app-icon name="trash"></app-icon> Trash
            @if (boardService.trashedCards().length) {
              <span class="text-sm font-mono bg-[var(--tint-pink)] px-2 py-0.5 rounded-full">{{ boardService.trashedCards().length }}</span>
            }
          </h2>
          <div class="flex items-center gap-2">
            @if (boardService.trashedCards().length) {
              <button
                (click)="emptyTrash()"
                class="doodle-btn text-sm border-red-300 text-red-500 px-3 py-1"
              >Empty Trash</button>
            }
            <button (click)="startClose()" class="text-2xl hover:text-red-500 transition-colors leading-none px-1 text-[var(--ink-color)]" aria-label="Close"><app-icon name="close"></app-icon></button>
          </div>
        </div>

        <div class="flex-grow overflow-y-auto p-4 flex flex-col gap-2 custom-scroll">
          @if (!boardService.trashedCards().length) {
            <div class="text-center py-16 opacity-50 text-[var(--ink-color)]">
              <div class="text-5xl mb-3 flex justify-center"><app-icon name="trash"></app-icon></div>
              <p class="marker-font text-xl">Trash is empty</p>
            </div>
          } @else {
            @for (card of boardService.trashedCards(); track card.id) {
              <div class="flex items-center gap-3 p-3 bg-[var(--surface)] rounded-lg border border-[var(--border-soft)]">
                <div
                  class="w-4 h-4 rounded-full flex-shrink-0 border border-[var(--border-soft)]"
                  [style.background-color]="themeService.noteBg(card.color)"
                ></div>
                <div class="flex-grow min-w-0">
                  <div class="font-bold truncate text-[var(--ink-color)]">{{ card.title || 'Untitled' }}</div>
                  <div class="text-xs opacity-50 truncate text-[var(--ink-color)]">{{ boardName(card.boardId) }}</div>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <button
                    (click)="restore(card.id)"
                    class="doodle-btn text-xs px-2 py-1 bg-[var(--tint-green)] text-[var(--ink-color)]"
                  >↩ Restore</button>
                  <button
                    (click)="deleteForever(card.id)"
                    class="w-8 h-8 text-red-400 hover:text-red-600 rounded-full flex items-center justify-center transition-colors text-base"
                    title="Delete permanently"
                    aria-label="Delete permanently"
                  ><app-icon name="close"></app-icon></button>
                </div>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scroll::-webkit-scrollbar { width: 6px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 4px; }
  `]
})
export class TrashModalComponent {
  @Output() close = new EventEmitter<void>();
  boardService = inject(BoardService);
  themeService = inject(ThemeService);
  isClosing = signal(false);

  startClose() {
    this.isClosing.set(true);
    setTimeout(() => this.close.emit(), 150);
  }

  boardName(boardId: string) {
    return this.boardService.boards().find(b => b.id === boardId)?.name ?? 'Deleted Board';
  }

  restore(id: string) { this.boardService.restoreCard(id); }
  deleteForever(id: string) { this.boardService.permanentlyDeleteCard(id); }
  emptyTrash() { this.boardService.emptyTrash(); }
}
