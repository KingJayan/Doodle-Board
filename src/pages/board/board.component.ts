import { Component, inject, signal, computed, effect, untracked, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BoardService } from '../../services/board.service';
import { CardComponent } from '../../components/card/card.component';
import { EditorComponent } from '../../components/editor/editor.component';
import { SettingsModalComponent } from '../../components/settings-modal/settings-modal.component';
import { HelpModalComponent } from '../../components/help-modal/help-modal.component';
import { ShareModalComponent } from '../../components/share-modal/share-modal.component';
import { TrashModalComponent } from '../../components/trash-modal/trash-modal.component';
import { IconComponent } from '../../components/icon/icon.component';
import { AiService } from '../../services/ai.service';
import { ToastService } from '../../services/toast.service';
import { ThemeService } from '../../services/theme.service';
import { Card, Board, CARD_COLORS, CARD_COLORS_AI } from '../../models/card.model';

@Component({
  selector: 'app-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CardComponent, EditorComponent, SettingsModalComponent, HelpModalComponent, ShareModalComponent, TrashModalComponent, IconComponent],
  template: `
    <div class="h-screen flex flex-col overflow-hidden">

      <!-- bg motifs per-theme -->
      <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        @for (doodle of doodles; track $index) {
          <svg
            class="absolute transition-colors duration-500"
            [style.left.%]="doodle.x"
            [style.top.%]="doodle.y"
            [style.opacity]="'var(--motif-opacity)'"
            [style.transform]="'rotate(' + doodle.rot + 'deg) scale(' + doodle.scale + ')'"
            [style.color]="'var(--ink-color)'"
            width="100" height="100" viewBox="0 0 100 100"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <path [attr.d]="motifs()[doodle.mi % motifs().length]" />
          </svg>
        }
      </div>

      <!-- header + toolbar -->
      <header class="sticky top-0 z-40 bg-[var(--paper-color)]/95 backdrop-blur-sm border-b-2 border-[var(--ink-color)] shadow-sm p-4 transition-all">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">

          <div class="flex items-center gap-2 cursor-pointer group" (click)="router.navigate(['/'])">
            <button class="md:hidden text-2xl mr-2" (click)="sidebarOpen.set(!sidebarOpen()); $event.stopPropagation()">☰</button>
            <span class="text-3xl marker-font text-brand -rotate-2 group-hover:rotate-0 transition-transform">DoodleBoard</span>
            <span class="text-sm bg-[var(--accent)] text-[var(--paper-color)] px-2 rounded-full transform rotate-3">Beta</span>
          </div>

          <div class="flex flex-wrap gap-4 items-center justify-center">
            <!-- search -->
            <div class="relative group">
              <input
                type="text"
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
                placeholder="Search notes..."
                class="doodle-input bg-[var(--surface)]/60 rounded-full px-4 py-1 w-48 focus:w-64 transition-all"
              />
              <span class="absolute right-3 top-2 opacity-50"><app-icon name="search"></app-icon></span>
            </div>

            <div class="hidden md:flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-full border border-[var(--ink-color)]/20 bg-[var(--surface)]/60 text-[var(--ink-color)] opacity-70">
              @if (saveStatus() === 'Syncing…') {
                <app-icon name="sparkles"></app-icon>
              } @else if (saveStatus() === 'Backed up') {
                <app-icon name="globe"></app-icon>
              } @else if (saveStatus() === 'Offline') {
                <app-icon name="warning"></app-icon>
              } @else {
                <app-icon name="check"></app-icon>
              }
              <span>{{ saveStatus() }}</span>
            </div>

            @if (activeTag()) {
              <div
                class="bg-[var(--tint-yellow)] text-[var(--ink-color)] px-3 py-1 rounded-full border border-soft flex items-center gap-2 cursor-pointer hover:bg-[var(--tint-pink)] transition-colors"
                (click)="activeTag.set(null)"
              >
                <span>#{{ activeTag() }}</span>
                <span class="font-bold">×</span>
              </div>
            }
          </div>

          <div class="flex gap-2">
            <button (click)="helpPanelOpen.set(true)" class="doodle-btn px-3 text-lg" title="Help"><app-icon name="question"></app-icon></button>
            <button (click)="settingsPanelOpen.set(true)" class="doodle-btn px-2 text-xl" title="Settings"><app-icon name="gear"></app-icon></button>
            <button (click)="sharePanelOpen.set(true)" class="doodle-btn text-base" title="Share & Export"><app-icon name="package"></app-icon> Share</button>
            @if (aiAvailable) {
              <button (click)="aiPanelOpen.set(!aiPanelOpen())" class="doodle-btn bg-[var(--tint-blue)] text-[var(--ink-color)] text-base" title="Brainstorm with AI"><app-icon name="sparkles"></app-icon> AI</button>
            }
            <button (click)="toggleBulkMode()" class="doodle-btn text-sm" [class.bg-surface-2]="isBulkMode()">{{ isBulkMode() ? 'Cancel' : 'Select' }}</button>
            <button (click)="createNewCard()" class="doodle-btn bg-[var(--tint-green)] text-[var(--ink-color)] font-bold text-base">+ New Note</button>
          </div>
        </div>
      </header>

      <div class="flex flex-grow relative max-w-7xl mx-auto w-full min-h-0 overflow-hidden">

        <!-- sidebar -->
        <aside
          class="absolute md:static top-0 left-0 bottom-0 z-30 w-64 bg-[var(--paper-color)] border-r-2 border-[var(--ink-color)] transform transition-transform duration-300 md:translate-x-0 p-4 flex flex-col gap-4 shadow-xl md:shadow-none h-full"
          [class.-translate-x-full]="!sidebarOpen()"
        >
          <h3 class="marker-font text-xl border-b-2 border-dashed border-soft pb-2 mb-2"><app-icon name="folder-open"></app-icon> Boards</h3>

          <div class="flex-grow overflow-y-auto flex flex-col gap-1">
            @for (board of topLevelBoards(); track board.id) {
              <div
                class="board-item flex items-center gap-2 p-2 rounded cursor-pointer transition-colors group relative"
                [class.active]="activeBoardId() === board.id"
                [class.drag-over]="dragTargetBoardId() === board.id && draggingBoardId() !== board.id"
                [class.animate-sidebarItemIn]="newBoardId() === board.id && !themeService.reduceMotion()"
                draggable="true"
                (dragstart)="handleBoardDragStart(board.id, $event)"
                (dragend)="handleBoardDragEnd()"
                (click)="activeBoardId.set(board.id); sidebarOpen.set(false)"
                (dragover)="handleDragOver($event)"
                (dragenter)="handleDragEnterBoard(board.id)"
                (dragleave)="handleDragLeaveBoard()"
                (drop)="handleDropOnBoard(board.id, $event)"
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
                    (click)="showAddSubBoard(board.id, $event)"
                    class="w-5 h-5 flex items-center justify-center rounded hover-surface text-sm font-bold"
                    title="Add sub-board"
                  >+</button>
                  @if (boards().length > 1) {
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
                    #subInput
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
                    [class.active]="activeBoardId() === child.id"
                    [class.drag-over]="dragTargetBoardId() === child.id"
                    [class.animate-sidebarItemIn]="newBoardId() === child.id && !themeService.reduceMotion()"
                    (click)="activeBoardId.set(child.id); sidebarOpen.set(false)"
                    (dragover)="handleDragOver($event)"
                    (dragenter)="handleDragEnterBoard(child.id)"
                    (dragleave)="handleDragLeaveBoard()"
                    (drop)="handleDropOnBoard(child.id, $event)"
                  >
                    <span class="text-base flex-none"><app-icon name="page"></app-icon></span>
                    @if (renamingBoardId() === child.id) {
                      <input
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
                    <button
                      class="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover-surface text-red-500"
                      (click)="deleteBoard(child.id, $event)"
                      title="Delete board"
                    >×</button>
                  </div>
                }
              }
            }
          </div>

          <div class="pt-2 border-t-2 border-dashed border-soft flex flex-col gap-2">
            <button
              (click)="trashPanelOpen.set(true)"
              class="flex items-center gap-2 p-2 rounded hover-surface text-[var(--ink-color)] opacity-60 hover:opacity-100 transition-opacity text-sm w-full"
            >
              <app-icon name="trash"></app-icon>
              <span>Trash</span>
              @if (trashedCards().length) {
                <span class="ml-auto text-xs bg-[var(--tint-pink)] px-2 rounded-full">{{ trashedCards().length }}</span>
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

        <!-- sidebar overlay (mobile) -->
        @if (sidebarOpen()) {
          <div class="fixed inset-0 bg-black/20 z-20 md:hidden" (click)="sidebarOpen.set(false)"></div>
        }

        <!-- ai genie panel -->
        @if (aiPanelOpen()) {
          <div class="absolute top-4 left-4 right-4 md:left-auto md:right-auto md:w-96 z-30">
            <div class="p-4 border-2 border-dashed border-[var(--accent-2)] rounded-lg bg-[var(--tint-blue)] text-[var(--ink-color)] relative animate-slideDown shadow-xl">
              <button (click)="aiPanelOpen.set(false)" class="absolute top-2 right-2 text-xl hover:text-red-500 text-[var(--ink-color)]">×</button>
              <h3 class="font-bold text-lg mb-2 text-[var(--ink-color)]"><app-icon name="sparkles"></app-icon> Brainstorm with AI</h3>
              <div class="flex gap-2">
                <input
                  #topicInput
                  type="text"
                  class="doodle-input bg-[var(--surface)] text-[var(--ink-color)]"
                  placeholder="e.g. Pizza toppings..."
                  (keyup.enter)="generateCard(topicInput.value); topicInput.value = ''"
                >
                <button
                  (click)="generateCard(topicInput.value); topicInput.value = ''"
                  class="doodle-btn bg-[var(--surface)] text-[var(--ink-color)] py-1 text-sm"
                  [disabled]="isGenerating()"
                >{{ isGenerating() ? '...' : 'Go!' }}</button>
              </div>
            </div>
          </div>
        }

        <!-- main card grid -->
        <main class="p-4 md:p-8 flex-grow w-full z-10 overflow-y-auto h-full" (dragover)="handleDragOver($event)">
          @if (isHydrating()) {
            <div class="flex flex-wrap gap-6 md:gap-8 pb-20 justify-center md:justify-start">
              @for (i of skeletonCards; track i) {
                <div class="flex-none rounded-sm animate-pulse bg-[var(--surface)] opacity-60" style="width:192px;height:140px"></div>
              }
            </div>
          } @else {
            @if (filteredCards().length === 0) {
              <div class="text-center py-20 opacity-50">
                <div class="text-6xl mb-4"><app-icon name="leaf"></app-icon></div>
                <p class="text-2xl marker-font">Empty Board...</p>
                <p>Drag notes here or create new ones!</p>
              </div>
            }
            <div class="flex flex-wrap gap-6 md:gap-8 pb-20 justify-center md:justify-start">
              @for (card of filteredCards(); track card.id) {
                <div
                  class="relative flex-none"
                  [class.animate-popIn]="!justSwitchedBoard() && !themeService.reduceMotion()"
                  [class.animate-cardEnter]="justSwitchedBoard() && !themeService.reduceMotion()"
                  [class.is-dragging]="draggingCardId() === card.id"
                  [style.animation-delay]="($index * 50) + 'ms'"
                  draggable="true"
                  (dragstart)="handleDragStart(card.id, $event)"
                  (dragend)="handleDragEnd()"
                  (drop)="handleDrop(card.id, $event)"
                  (dragover)="handleDragOver($event)"
                >
                  <app-card
                    [card]="card"
                    [searchQuery]="searchQuery()"
                    [bulkMode]="isBulkMode()"
                    [isSelected]="selectedCardIds().has(card.id)"
                    (update)="updateCard($event)"
                    (delete)="handleDeleteCard($event)"
                    (expand)="editingCard.set($event)"
                    (tagClick)="activeTag.set($event)"
                    (stickerToggle)="toggleSticker(card.id, $event)"
                    (pinToggle)="togglePin(card.id)"
                    (duplicate)="duplicateCard(card)"
                    (select)="toggleCardSelection(card.id)"
                  ></app-card>
                </div>
              }
            </div>
          }
        </main>
      </div>

      <!-- bulk action bar -->
      @if (selectedCardIds().size > 0) {
        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--paper-color)] border-2 border-[var(--ink-color)] rounded-full shadow-2xl px-6 py-3 flex items-center gap-4 animate-slideDown">
          <span class="font-bold text-sm">{{ selectedCardIds().size }} selected</span>
          <div class="relative">
            <button (click)="showBulkMoveMenu.set(!showBulkMoveMenu())" class="doodle-btn text-xs">Move to ▾</button>
            @if (showBulkMoveMenu()) {
              <div class="absolute bottom-full mb-2 left-0 bg-[var(--surface)] border-2 border-[var(--ink-color)] rounded-lg p-2 w-44 shadow-xl flex flex-col gap-1" (click)="$event.stopPropagation()">
                @for (board of boards(); track board.id) {
                  <button (click)="bulkMove(board.id)" class="text-left text-sm px-3 py-2 hover-surface rounded truncate">{{ board.name }}</button>
                }
              </div>
            }
          </div>
          <button (click)="bulkDelete()" class="doodle-btn text-xs border-red-300 text-red-500">Delete</button>
          <button (click)="clearSelection()" class="text-xl hover:text-red-500 leading-none">✕</button>
        </div>
      }

      @defer (when !!editingCard()) {
        @if (editingCard()) {
          <app-editor [card]="editingCard()!" (close)="editingCard.set(null)"></app-editor>
        }
      } @placeholder { <span></span> }

      @defer (when settingsPanelOpen()) {
        @if (settingsPanelOpen()) {
          <app-settings-modal (close)="settingsPanelOpen.set(false)"></app-settings-modal>
        }
      } @placeholder { <span></span> }

      @defer (when helpPanelOpen()) {
        @if (helpPanelOpen()) {
          <app-help-modal [aiAvailable]="!!aiAvailable" (close)="helpPanelOpen.set(false)"></app-help-modal>
        }
      } @placeholder { <span></span> }

      @defer (when sharePanelOpen()) {
        @if (sharePanelOpen()) {
          <app-share-modal
            [boardId]="activeBoardId()"
            [boardName]="currentBoardName()"
            [cards]="filteredCards()"
            (close)="sharePanelOpen.set(false)"
          ></app-share-modal>
        }
      } @placeholder { <span></span> }

      @defer (when trashPanelOpen()) {
        @if (trashPanelOpen()) {
          <app-trash-modal (close)="trashPanelOpen.set(false)"></app-trash-modal>
        }
      } @placeholder { <span></span> }
    </div>
  `,
  styles: [`
    .board-item:hover { background-color: var(--surface-hover); }
    .board-item.active {
      background-color: var(--surface-hover);
      font-weight: bold;
      box-shadow: inset 3px 0 0 var(--accent);
    }
    .board-item--child { border-left: 2px solid var(--border-soft); margin-left: 8px; }
    .animate-slideDown {
      animation: slideDown 0.3s ease-out forwards;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-popIn {
      opacity: 0;
      animation: popIn 0.5s var(--ease-pop) forwards;
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.8) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .animate-cardEnter {
      animation: cardEnter 0.25s var(--ease-spring) both;
    }
    @keyframes cardEnter {
      from { opacity: 0; transform: translateY(12px) scale(0.97); }
      to { opacity: 1; transform: none; }
    }
    .is-dragging {
      opacity: 0.6;
      transform: scale(1.03) rotate(2deg);
      box-shadow: 0 16px 40px rgba(0,0,0,0.25);
      z-index: 50;
    }
    .board-item.drag-over {
      border: 2px dashed var(--accent);
      background-color: var(--surface-hover);
    }
    @keyframes sidebarItemIn {
      from { opacity: 0; transform: translateX(-8px); }
      to { opacity: 1; transform: none; }
    }
    .animate-sidebarItemIn {
      animation: sidebarItemIn 0.3s var(--ease-spring) forwards;
    }
  `]
})
export class BoardComponent implements OnInit, OnDestroy {
  private boardService = inject(BoardService);
  themeService = inject(ThemeService);
  router = inject(Router);
  private aiService = inject(AiService);
  aiAvailable = this.aiService.isAvailable;
  private toastService = inject(ToastService);

  saveStatus = this.boardService.syncStatus;
  boards = this.boardService.boards;
  topLevelBoards = this.boardService.topLevelBoards;
  updateCard = (card: Card) => this.boardService.updateCard(card);
  toggleSticker = (id: string, sticker: string) => this.boardService.toggleSticker(id, sticker);
  togglePin = (id: string) => this.boardService.togglePin(id);

  searchQuery = signal('');
  activeTag = signal<string | null>(null);
  activeBoardId = signal<string>('default');

  constructor() {
    effect(() => {
      const boards = this.boardService.boards();
      if (boards.length > 0 && !boards.find(b => b.id === this.activeBoardId())) {
        untracked(() => this.activeBoardId.set(boards[0].id));
      }
    });

    let prevBoardId = '';
    effect(() => {
      const id = this.activeBoardId();
      untracked(() => {
        if (prevBoardId && prevBoardId !== id && !this.themeService.reduceMotion()) {
          this.justSwitchedBoard.set(true);
          setTimeout(() => this.justSwitchedBoard.set(false), 350);
        }
        prevBoardId = id;
      });
    });

    effect(() => {
      const id = this.activeBoardId();
      const board = this.boardService.boards().find(b => b.id === id);
      if (board?.parentId) {
        untracked(() => {
          this.expandedFolders.update(set => {
            if (set.has(board.parentId!)) return set;
            const next = new Set(set);
            next.add(board.parentId!);
            localStorage.setItem('doodle_expanded_folders', JSON.stringify([...next]));
            return next;
          });
        });
      }
    });
  }

  aiPanelOpen = signal(false);
  sharePanelOpen = signal(false);
  settingsPanelOpen = signal(false);
  helpPanelOpen = signal(false);
  trashPanelOpen = signal(false);
  sidebarOpen = signal(true);
  trashedCards = this.boardService.trashedCards;
  isHydrating = this.boardService.isHydrating;
  readonly skeletonCards = [0, 1, 2, 3, 4];
  isGenerating = signal(false);
  justSwitchedBoard = signal(false);
  newBoardId = signal<string | null>(null);
  draggingCardId = signal<string | null>(null);
  draggingBoardId = signal<string | null>(null);
  dragTargetBoardId = signal<string | null>(null);
  expandedFolders = signal<Set<string>>(
    new Set<string>(JSON.parse(localStorage.getItem('doodle_expanded_folders') ?? '[]') as string[])
  );
  addingSubBoardId = signal<string | null>(null);
  selectedCardIds = signal<Set<string>>(new Set());
  isBulkMode = signal(false);
  showBulkMoveMenu = signal(false);

  editingCard = signal<Card | null>(null);
  renamingBoardId = signal<string | null>(null);

  motifs = this.themeService.motifs;
  doodles: { x: number; y: number; rot: number; scale: number; mi: number }[] = [];
  private draggedCardId: string | null = null;
  private draggedBoardId: string | null = null;

  private readonly keydownHandler = (e: KeyboardEvent) => {
    const el = document.activeElement as HTMLElement;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      this.createNewCard();
    }
    if (e.key === 'Escape' && this.selectedCardIds().size > 0) {
      this.clearSelection();
    }
  };

  ngOnInit() {
    this.generateBackgroundDoodles();
    if (window.innerWidth < 768) this.sidebarOpen.set(false);
    document.addEventListener('keydown', this.keydownHandler);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.keydownHandler);
  }

  private generateBackgroundDoodles() {
    this.doodles = Array.from({ length: 14 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      rot: Math.random() * 360,
      scale: 0.5 + Math.random() * 1.5,
      mi: i
    }));
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
      if (next.has(boardId)) next.delete(boardId);
      else next.add(boardId);
      localStorage.setItem('doodle_expanded_folders', JSON.stringify([...next]));
      return next;
    });
  }

  showAddSubBoard(parentId: string, event: Event) {
    event.stopPropagation();
    this.addingSubBoardId.set(parentId);
    if (!this.expandedFolders().has(parentId)) this.toggleExpand(parentId);
  }

  createSubBoard(parentId: string, name: string) {
    if (!name.trim()) { this.addingSubBoardId.set(null); return; }
    const id = this.boardService.addBoard(name.trim(), parentId);
    this.activeBoardId.set(id);
    this.newBoardId.set(id);
    setTimeout(() => this.newBoardId.set(null), 400);
    this.addingSubBoardId.set(null);
    if (!this.expandedFolders().has(parentId)) this.toggleExpand(parentId);
    this.toastService.show(`Created sub-board "${name}"`, 'success');
  }

  filteredCards = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const tag = this.activeTag();
    const board = this.activeBoardId();

    return this.boardService.cards()
      .filter((card: Card) => {
        if (card.boardId !== board) return false;
        const matchesSearch =
          card.title.toLowerCase().includes(query) ||
          card.content.toLowerCase().includes(query) ||
          card.tags.some((t: string) => t.toLowerCase().includes(query));
        return matchesSearch && (tag ? card.tags.includes(tag) : true);
      })
      .sort((a, b) =>
        (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) ||
        (a.position ?? '').localeCompare(b.position ?? '')
      );
  });

  currentBoardName = computed(() =>
    this.boardService.boards().find((b: Board) => b.id === this.activeBoardId())?.name ?? 'Board'
  );

  createBoard(name: string) {
    if (!name.trim()) return;
    const id = this.boardService.addBoard(name);
    this.activeBoardId.set(id);
    this.newBoardId.set(id);
    setTimeout(() => this.newBoardId.set(null), 400);
    this.toastService.show(`Created board "${name}"`, 'success');
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
        this.boardService.deleteBoard(id);
        if (this.activeBoardId() === id) {
          this.activeBoardId.set(this.boardService.boards()[0]?.id ?? '');
        }
        this.toastService.show('Board deleted', 'info');
      }
    });
  }

  createNewCard() {
    const color = CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];
    this.boardService.addCard({ title: '', content: '', tags: [], color, boardId: this.activeBoardId() });
    this.toastService.show('Note created', 'success');
  }

  duplicateCard(card: Card) {
    this.boardService.duplicateCard(card);
    this.toastService.show('Note duplicated', 'success');
  }

  toggleBulkMode() {
    if (this.isBulkMode()) {
      this.clearSelection();
    } else {
      this.isBulkMode.set(true);
    }
  }

  toggleCardSelection(cardId: string) {
    this.selectedCardIds.update(set => {
      const next = new Set(set);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  clearSelection() {
    this.selectedCardIds.set(new Set());
    this.isBulkMode.set(false);
    this.showBulkMoveMenu.set(false);
  }

  bulkDelete() {
    const ids = [...this.selectedCardIds()];
    ids.forEach(id => this.boardService.deleteCard(id));
    this.toastService.show(`${ids.length} notes moved to trash`, 'info', {
      label: 'Undo',
      callback: () => ids.forEach(id => this.boardService.restoreCard(id))
    });
    this.clearSelection();
  }

  bulkMove(boardId: string) {
    const ids = this.selectedCardIds();
    this.boardService.bulkMoveCards(ids, boardId);
    const boardName = this.boardService.boards().find(b => b.id === boardId)?.name ?? 'board';
    this.toastService.show(`${ids.size} notes moved to "${boardName}"`, 'success');
    this.clearSelection();
  }

  async generateCard(topic: string) {
    if (this.isGenerating()) return;
    this.isGenerating.set(true);
    try {
      const result = await this.aiService.brainstormCard(topic);
      const color = CARD_COLORS_AI[Math.floor(Math.random() * CARD_COLORS_AI.length)];
      this.boardService.addCard({ ...result, color, boardId: this.activeBoardId() });
      this.aiPanelOpen.set(false);
      this.toastService.show('Note generated', 'success');
    } catch {
      this.toastService.show('AI brainstorm failed — check your API key', 'error');
    } finally {
      this.isGenerating.set(false);
    }
  }

  handleDeleteCard(id: string) {
    this.boardService.deleteCard(id);
    this.toastService.show('Moved to trash', 'info', {
      label: 'Undo',
      callback: () => this.boardService.restoreCard(id)
    });
  }

  handleBoardDragStart(boardId: string, event: DragEvent) {
    this.draggedCardId = null;
    this.draggingCardId.set(null);
    this.draggedBoardId = boardId;
    this.draggingBoardId.set(boardId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `board:${boardId}`);
    }
  }

  handleBoardDragEnd() {
    this.draggedBoardId = null;
    this.draggingBoardId.set(null);
    this.dragTargetBoardId.set(null);
  }

  handleDragStart(cardId: string, event: DragEvent) {
    const isHandle = event.composedPath().some((el: any) => el.classList?.contains('drag-handle'));
    if (!isHandle) { event.preventDefault(); return; }
    this.draggedCardId = cardId;
    this.draggingCardId.set(cardId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', cardId);
    }
  }

  handleDragEnd() {
    this.draggingCardId.set(null);
    this.dragTargetBoardId.set(null);
  }

  handleDragEnterBoard(boardId: string) {
    if (this.draggedCardId || this.draggedBoardId) this.dragTargetBoardId.set(boardId);
  }

  handleDragLeaveBoard() {
    this.dragTargetBoardId.set(null);
  }

  handleDropOnBoard(boardId: string, event: DragEvent) {
    event.preventDefault();

    if (this.draggedBoardId && this.draggedBoardId !== boardId) {
      const dragged = this.boardService.boards().find(b => b.id === this.draggedBoardId);
      const target = this.boardService.boards().find(b => b.id === boardId);
      if (dragged && target && !target.parentId && !dragged.parentId) {
        this.boardService.moveBoardToParent(this.draggedBoardId, boardId);
        if (!this.expandedFolders().has(boardId)) this.toggleExpand(boardId);
        this.toastService.show(`Moved "${dragged.name}" under "${target.name}"`, 'success');
      }
      this.draggedBoardId = null;
      this.draggingBoardId.set(null);
      this.dragTargetBoardId.set(null);
      return;
    }

    if (this.draggedCardId && boardId !== this.activeBoardId()) {
      const card = this.boardService.cards().find(c => c.id === this.draggedCardId);
      if (card) {
        this.boardService.updateCard({ ...card, boardId });
        this.toastService.show('Moved note to board', 'success');
      }
    }
    this.dragTargetBoardId.set(null);
    this.draggedCardId = null;
    this.draggingCardId.set(null);
  }

  handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  handleDrop(targetCardId: string, event: DragEvent) {
    event.preventDefault();
    if (this.draggedCardId && this.draggedCardId !== targetCardId) {
      this.boardService.reorderCard(this.draggedCardId, targetCardId);
    }
    this.draggedCardId = null;
  }
}
