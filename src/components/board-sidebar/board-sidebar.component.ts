import { Component, Input, Output, EventEmitter, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/board.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../icon/icon.component';
import { Board } from '../../models/card.model';

@Component({
  selector: 'app-board-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <aside
      class="absolute md:static top-0 left-0 bottom-0 z-30 w-64 bg-[var(--paper-color)] border-r-2 border-[var(--ink-color)] transform transition-transform duration-300 md:translate-x-0 p-4 flex flex-col gap-4 shadow-xl md:shadow-none h-full"
      [class.-translate-x-full]="!isOpen"
    >
      <h3 class="marker-font text-xl border-b-2 border-dashed border-soft pb-2 mb-2">
        <app-icon name="folder-open"></app-icon> Boards
      </h3>

      <div class="flex-grow overflow-y-auto flex flex-col gap-1">
        @for (board of boardService.topLevelBoards(); track board.id) {
          <div
            class="board-item flex items-center gap-2 p-2 rounded cursor-pointer transition-colors group relative"
            [class.active]="activeBoardId === board.id"
            [class.drag-over]="dragTargetBoardId() === board.id && draggedBoardId !== board.id"
            [class.animate-sidebarItemIn]="newBoardId() === board.id && !themeService.reduceMotion()"
            [attr.data-board-id]="board.id"
            draggable="true"
            (dragstart)="onBoardDragStart(board.id, $event)"
            (dragend)="onBoardDragEnd()"
            (click)="selectBoard(board.id)"
            (dragover)="onDragOver($event)"
            (dragenter)="dragTargetBoardId.set(board.id)"
            (dragleave)="dragTargetBoardId.set(null)"
            (drop)="onDropOnBoard(board.id, $event)"
            (pointerenter)="onBoardPointerEnter(board.id)"
            (pointerleave)="onBoardPointerLeave()"
          >
            @if (hasChildren(board.id)) {
              <button
                (click)="toggleExpand(board.id); $event.stopPropagation()"
                class="text-sm opacity-50 hover:opacity-100 flex-none w-5 text-center"
              >{{ expandedFolders().has(board.id) ? '▾' : '▸' }}</button>
            } @else {
              <span class="text-xl flex-none"><app-icon name="folder"></app-icon></span>
            }
            @if (renamingBoardId() === board.id) {
              <input
                autofocus
                class="doodle-input text-sm flex-grow"
                [value]="board.name"
                (keyup.enter)="commitRename($any($event.target).value, board.id)"
                (keyup.escape)="renamingBoardId.set(null)"
                (blur)="commitRename($any($event.target).value, board.id)"
                (click)="$event.stopPropagation()"
              >
            } @else {
              <span class="truncate flex-grow text-sm" (dblclick)="renamingBoardId.set(board.id); $event.stopPropagation()">{{ board.name }}</span>
            }
            <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 flex-none ml-auto">
              <button
                (click)="startRename(board.id, $event)"
                class="w-5 h-5 flex items-center justify-center rounded hover-surface text-xs"
                title="Rename board"
                aria-label="Rename board"
              ><app-icon name="pencil"></app-icon></button>
              <button
                (click)="showAddSubBoard(board.id, $event)"
                class="w-5 h-5 flex items-center justify-center rounded hover-surface text-sm font-bold"
                title="Add sub-board"
              >+</button>
              @if (boardService.boards().length > 1) {
                <button
                  class="w-5 h-5 flex items-center justify-center rounded hover-surface text-red-500"
                  (click)="deleteBoard(board.id, $event)"
                  title="Delete board"
                >×</button>
              }
            </div>
          </div>

          @if (addingSubBoardId() === board.id) {
            <div class="pl-7 pr-2 pb-1 flex gap-1">
              <input
                class="doodle-input text-xs flex-grow"
                placeholder="Sub-board name..."
                (keyup.enter)="createSubBoard(board.id, $any($event.target).value); $any($event.target).value = ''"
                (keyup.escape)="addingSubBoardId.set(null)"
                (blur)="addingSubBoardId.set(null)"
              >
            </div>
          }

          @if (expandedFolders().has(board.id)) {
            @for (child of childBoards(board.id); track child.id) {
              <div
                class="board-item board-item--child flex items-center gap-2 pl-7 pr-2 py-2 rounded cursor-pointer transition-colors group relative"
                [class.active]="activeBoardId === child.id"
                [class.drag-over]="dragTargetBoardId() === child.id"
                [class.animate-sidebarItemIn]="newBoardId() === child.id && !themeService.reduceMotion()"
                [attr.data-board-id]="child.id"
                (click)="selectBoard(child.id)"
                (dragover)="onDragOver($event)"
                (dragenter)="dragTargetBoardId.set(child.id)"
                (dragleave)="dragTargetBoardId.set(null)"
                (drop)="onDropOnBoard(child.id, $event)"
                (pointerenter)="onBoardPointerEnter(child.id)"
                (pointerleave)="onBoardPointerLeave()"
              >
                <span class="text-base flex-none"><app-icon name="page"></app-icon></span>
                @if (renamingBoardId() === child.id) {
                  <input
                    autofocus
                    class="doodle-input text-xs flex-grow"
                    [value]="child.name"
                    (keyup.enter)="commitRename($any($event.target).value, child.id)"
                    (keyup.escape)="renamingBoardId.set(null)"
                    (blur)="commitRename($any($event.target).value, child.id)"
                    (click)="$event.stopPropagation()"
                  >
                } @else {
                  <span class="truncate flex-grow text-xs" (dblclick)="renamingBoardId.set(child.id); $event.stopPropagation()">{{ child.name }}</span>
                }
                <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 flex-none ml-auto">
                  <button
                    class="w-5 h-5 flex items-center justify-center rounded hover-surface text-xs"
                    (click)="startRename(child.id, $event)"
                    title="Rename board"
                    aria-label="Rename board"
                  ><app-icon name="pencil"></app-icon></button>
                  <button
                    class="w-5 h-5 flex items-center justify-center rounded hover-surface text-red-500"
                    (click)="deleteBoard(child.id, $event)"
                    title="Delete board"
                  >×</button>
                </div>
              </div>
            }
          }
        }
      </div>

      <div class="pt-2 border-t-2 border-dashed border-soft flex flex-col gap-2">
        <button
          (click)="openTrash.emit()"
          class="flex items-center gap-2 p-2 rounded hover-surface text-[var(--ink-color)] opacity-60 hover:opacity-100 transition-opacity text-sm w-full"
        >
          <app-icon name="trash"></app-icon>
          <span>Trash</span>
          @if (boardService.trashedCards().length) {
            <span class="ml-auto text-xs bg-[var(--tint-pink)] px-2 rounded-full">{{ boardService.trashedCards().length }}</span>
          }
        </button>
        <div class="flex gap-2">
          <input
            #newBoardInput
            type="text"
            class="doodle-input text-sm"
            placeholder="New Board..."
            (keyup.enter)="createBoard(newBoardInput.value); newBoardInput.value = ''"
          >
          <button
            (click)="createBoard(newBoardInput.value); newBoardInput.value = ''"
            class="doodle-btn px-2 py-0 text-lg bg-[var(--tint-green)] text-[var(--ink-color)]"
          >+</button>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .board-item:hover { background-color: var(--surface-hover); }
    .board-item.active {
      background-color: var(--surface-hover);
      font-weight: bold;
      box-shadow: inset 3px 0 0 var(--accent);
    }
    .board-item--child { border-left: 2px solid var(--border-soft); margin-left: 8px; }
    .board-item.drag-over {
      border: 2px dashed var(--accent);
      background-color: var(--surface-hover);
    }
    @keyframes sidebarItemIn {
      from { opacity: 0; transform: translateX(-8px); }
      to { opacity: 1; transform: none; }
    }
    .animate-sidebarItemIn {
      animation: sidebarItemIn 0.3s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1)) forwards;
    }
  `]
})
export class BoardSidebarComponent implements OnInit {
  @Input() activeBoardId!: string;
  @Input() isOpen!: boolean;
  @Input() draggingCardId: string | null = null;
  @Output() activate = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();
  @Output() openTrash = new EventEmitter<void>();

  boardService = inject(BoardService);
  themeService = inject(ThemeService);
  private toastService = inject(ToastService);

  expandedFolders = signal<Set<string>>(new Set<string>());
  renamingBoardId = signal<string | null>(null);
  addingSubBoardId = signal<string | null>(null);
  newBoardId = signal<string | null>(null);
  dragTargetBoardId = signal<string | null>(null);
  draggedBoardId: string | null = null;

  ngOnInit() {
    try {
      const saved = JSON.parse(localStorage.getItem('doodle_expanded_folders') ?? '[]') as string[];
      this.expandedFolders.set(new Set(saved));
    } catch {
      // ignore malformed persisted state
    }
  }

  selectBoard(id: string) {
    this.activate.emit(id);
    this.close.emit();
  }

  hasChildren(boardId: string): boolean {
    return this.boardService.boards().some(b => b.parentId === boardId);
  }

  childBoards(parentId: string): Board[] {
    return this.boardService.boards().filter(b => b.parentId === parentId);
  }

  toggleExpand(boardId: string) {
    this.expandedFolders.update(set => {
      const next = new Set(set);
      if (next.has(boardId)) next.delete(boardId); else next.add(boardId);
      localStorage.setItem('doodle_expanded_folders', JSON.stringify([...next]));
      return next;
    });
  }

  ensureExpanded(boardId: string) {
    if (!this.expandedFolders().has(boardId)) this.toggleExpand(boardId);
  }

  showAddSubBoard(parentId: string, event: Event) {
    event.stopPropagation();
    this.addingSubBoardId.set(parentId);
    this.ensureExpanded(parentId);
  }

  createSubBoard(parentId: string, name: string) {
    if (!name.trim()) { this.addingSubBoardId.set(null); return; }
    const id = this.boardService.addBoard(name.trim(), parentId);
    this.activate.emit(id);
    this.newBoardId.set(id);
    setTimeout(() => this.newBoardId.set(null), 400);
    this.addingSubBoardId.set(null);
    this.ensureExpanded(parentId);
    this.toastService.show(`Created sub-board "${name}"`, 'success');
  }

  createBoard(name: string) {
    if (!name.trim()) return;
    const id = this.boardService.addBoard(name);
    this.activate.emit(id);
    this.newBoardId.set(id);
    setTimeout(() => this.newBoardId.set(null), 400);
    this.toastService.show(`Created board "${name}"`, 'success');
  }

  startRename(id: string, event: Event) {
    event.stopPropagation();
    this.renamingBoardId.set(id);
  }

  commitRename(name: string, id: string) {
    if (name.trim()) this.boardService.renameBoard(id, name.trim());
    this.renamingBoardId.set(null);
  }

  deleteBoard(id: string, event: Event) {
    event.stopPropagation();
    const fallbackName = this.boardService.boards().find(b => b.id !== id)?.name ?? 'another board';
    this.toastService.show(`Delete board? Notes will move to "${fallbackName}".`, 'warning', {
      label: 'Yes, Delete',
      callback: () => {
        const wasActive = this.activeBoardId === id;
        this.boardService.deleteBoard(id);
        if (wasActive) {
          const first = this.boardService.boards()[0];
          if (first) this.activate.emit(first.id);
        }
        this.toastService.show('Board deleted', 'info');
      }
    });
  }

  onBoardPointerEnter(boardId: string) {
    if (this.draggingCardId) this.dragTargetBoardId.set(boardId);
  }

  onBoardPointerLeave() {
    if (this.draggingCardId) this.dragTargetBoardId.set(null);
  }

  onBoardDragStart(boardId: string, event: DragEvent) {
    this.draggedBoardId = boardId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `board:${boardId}`);
    }
  }

  onBoardDragEnd() {
    this.draggedBoardId = null;
    this.dragTargetBoardId.set(null);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onDropOnBoard(boardId: string, event: DragEvent) {
    event.preventDefault();

    if (this.draggedBoardId && this.draggedBoardId !== boardId) {
      const dragged = this.boardService.boards().find(b => b.id === this.draggedBoardId);
      const target = this.boardService.boards().find(b => b.id === boardId);
      if (dragged && target && !target.parentId && !dragged.parentId) {
        this.boardService.moveBoardToParent(this.draggedBoardId, boardId);
        this.ensureExpanded(boardId);
        this.toastService.show(`Moved "${dragged.name}" under "${target.name}"`, 'success');
      }
      this.draggedBoardId = null;
      this.dragTargetBoardId.set(null);
      return;
    }

    if (this.draggingCardId && boardId !== this.activeBoardId) {
      const card = this.boardService.cards().find(c => c.id === this.draggingCardId);
      if (card) {
        this.boardService.updateCard({ ...card, boardId });
        this.toastService.show('Moved note to board', 'success');
      }
    }
    this.dragTargetBoardId.set(null);
  }
}
