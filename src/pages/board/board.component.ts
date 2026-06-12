import { Component, inject, signal, computed, effect, untracked, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BoardService, MAX_CARDS_PER_BOARD } from '../../services/board.service';
import { CardComponent } from '../../components/card/card.component';
import { EditorComponent } from '../../components/editor/editor.component';
import { SettingsModalComponent } from '../../components/settings-modal/settings-modal.component';
import { HelpModalComponent } from '../../components/help-modal/help-modal.component';
import { ShareModalComponent } from '../../components/share-modal/share-modal.component';
import { TrashModalComponent } from '../../components/trash-modal/trash-modal.component';
import { BoardSidebarComponent } from '../../components/board-sidebar/board-sidebar.component';
import { IconComponent } from '../../components/icon/icon.component';
import { AiService } from '../../services/ai.service';
import { ToastService } from '../../services/toast.service';
import { ThemeService } from '../../services/theme.service';
import { PreferencesService } from '../../services/preferences.service';
import { IoService } from '../../services/io.service';
import { MarkdownService } from '../../services/markdown.service';
import { Card, Board, CARD_COLORS, CARD_COLORS_AI, CARD_DEFAULTS } from '../../models/card.model';

@Component({
  selector: 'app-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CardComponent, EditorComponent, SettingsModalComponent, HelpModalComponent, ShareModalComponent, TrashModalComponent, BoardSidebarComponent, IconComponent],
  template: `
    <div class="h-screen flex flex-col overflow-hidden">

      <!-- bg motifs per-theme -->
      <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        @for (doodle of visibleDoodles(); track $index) {
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
                [ngModel]="searchRaw()"
                (ngModelChange)="onSearch($event)"
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

      <div class="flex flex-grow relative max-w-7xl mx-auto w-full min-h-0">

        <!-- sidebar -->
        <app-board-sidebar
          [activeBoardId]="activeBoardId()"
          [isOpen]="sidebarOpen()"
          [draggingCardId]="draggingCardId()"
          (activate)="activeBoardId.set($event)"
          (close)="sidebarOpen.set(false)"
          (openTrash)="trashPanelOpen.set(true)"
        ></app-board-sidebar>

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

        <!-- main canvas -->
        <main class="flex-grow w-full z-10 overflow-y-auto overflow-x-hidden h-full relative" (dragover)="handleDragOver($event)" (drop)="handleFileDrop($event)">
          @if (isHydrating()) {
            <div class="flex flex-wrap gap-6 p-8">
              @for (i of skeletonCards; track i) {
                <div class="flex-none rounded-sm animate-pulse bg-[var(--surface)] opacity-60" style="width:192px;height:140px"></div>
              }
            </div>
          } @else {
            @if (filteredCards().length === 0) {
              <div class="text-center py-20 opacity-50 pointer-events-none select-none">
                <div class="text-6xl mb-4"><app-icon name="leaf"></app-icon></div>
                <p class="text-2xl marker-font">Empty Board...</p>
                <p>Drag notes here or create new ones!</p>
              </div>
            }
            <div class="relative w-full" [style.height.px]="canvasSize().h">
              @for (card of filteredCards(); track card.id) {
                <div
                  class="absolute"
                  [class.animate-popIn]="!justSwitchedBoard() && prefs.motionEnabled()"
                  [class.animate-cardEnter]="justSwitchedBoard() && prefs.motionEnabled()"
                  [class.is-dragging]="draggingCardId() === card.id"
                  [class.drag-settle]="droppedCardId() === card.id"
                  [class.micro-anim]="droppedCardId() === card.id"
                  [style.left.px]="card.x ?? 32"
                  [style.top.px]="card.y ?? 32"
                  [style.z-index]="draggingCardId() === card.id ? 1000 : (card.isPinned ? 10 : 1)"
                  [style.animation-delay]="(Math.min($index, 12) * 50) + 'ms'"
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
                    (dragHandlePointerDown)="startCardDrag(card.id, $event)"
                  ></app-card>
                </div>
              }
              @for (preview of subBoardPreviews(); track preview.board.id) {
                <div
                  class="absolute cursor-pointer group"
                  [style.left.px]="preview.x"
                  [style.top.px]="preview.y"
                  [style.z-index]="5"
                  (click)="activeBoardId.set(preview.board.id)"
                >
                  <div class="w-[280px] rounded-sm border-2 border-dashed border-[var(--ink-color)]/30 bg-[var(--surface)]/80 p-3 hover:border-[var(--accent)] hover:shadow-xl transition-all">
                    <div class="flex items-center gap-2 mb-2">
                      <app-icon name="folder"></app-icon>
                      <span class="font-bold marker-font text-base truncate flex-grow">{{ preview.board.name }}</span>
                      <span class="text-xs opacity-50 flex-none bg-[var(--surface)] px-2 py-0.5 rounded-full">{{ preview.cards.length }} notes</span>
                    </div>
                    <div class="relative h-28 overflow-hidden rounded bg-[var(--paper-color)]/50 border border-[var(--border-soft)]">
                      @for (mc of preview.cards.slice(0, 8); track mc.id; let i = $index) {
                        <div
                          class="absolute rounded-sm shadow-sm"
                          [style.background-color]="mc.color"
                          [style.width.px]="72"
                          [style.height.px]="52"
                          [style.left.px]="(i % 3) * 76 + 4"
                          [style.top.px]="Math.floor(i / 3) * 56 + 4"
                          [style.transform]="'rotate(' + ((mc.rotation ?? 0) * 0.4) + 'deg)'"
                        >
                          <div class="px-1 pt-1 text-[7px] font-bold leading-tight truncate opacity-80">{{ mc.title || '…' }}</div>
                        </div>
                      }
                      @if (!preview.cards.length) {
                        <div class="flex items-center justify-center h-full text-xs opacity-30">Empty board</div>
                      }
                    </div>
                    <div class="mt-2 text-xs text-center opacity-40 group-hover:opacity-80 transition-opacity">Open board →</div>
                  </div>
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
      transform: rotate(calc(2deg * var(--motion-scale)));
      box-shadow: 0 16px 40px rgba(0,0,0,0.25);
      z-index: 50;
    }
  `]
})
export class BoardComponent implements OnInit, OnDestroy {
  private boardService = inject(BoardService);
  themeService = inject(ThemeService);
  private prefs = inject(PreferencesService);
  router = inject(Router);
  private aiService = inject(AiService);
  aiAvailable = this.aiService.isAvailable;
  private toastService = inject(ToastService);
  private ioService = inject(IoService);
  private markdownService = inject(MarkdownService);

  saveStatus = this.boardService.syncStatus;
  boards = this.boardService.boards;
  updateCard = (card: Card) => this.boardService.updateCard(card);
  toggleSticker = (id: string, sticker: string) => this.boardService.toggleSticker(id, sticker);
  togglePin = (id: string) => this.boardService.togglePin(id);

  searchRaw = signal('');
  searchQuery = signal('');
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
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
        if (prevBoardId && prevBoardId !== id) {
          this.clearSelection();
          if (!this.themeService.reduceMotion()) {
            this.justSwitchedBoard.set(true);
            setTimeout(() => this.justSwitchedBoard.set(false), 350);
          }
        }
        prevBoardId = id;
      });
    });
  }

  aiPanelOpen = signal(false);
  sharePanelOpen = signal(false);
  settingsPanelOpen = signal(false);
  helpPanelOpen = signal(false);
  trashPanelOpen = signal(false);
  sidebarOpen = signal(true);
  isHydrating = this.boardService.isHydrating;
  readonly skeletonCards = [0, 1, 2, 3, 4];
  isGenerating = signal(false);
  justSwitchedBoard = signal(false);
  draggingCardId = signal<string | null>(null);
  droppedCardId = signal<string | null>(null);
  selectedCardIds = signal<Set<string>>(new Set());
  isBulkMode = signal(false);
  showBulkMoveMenu = signal(false);
  editingCard = signal<Card | null>(null);

  motifs = this.themeService.motifs;
  private allDoodles = signal<{ x: number; y: number; rot: number; scale: number; mi: number }[]>([]);
  visibleDoodles = computed(() => {
    const tier = this.prefs.effectiveTier();
    const all = this.allDoodles();
    if (tier === 'lite') return [];
    if (tier === 'balanced') return all.slice(0, Math.ceil(all.length / 2));
    return all;
  });
  readonly Math = Math;
  private pointerDrag: { cardId: string; startX: number; startY: number; origX: number; origY: number; moveHandler: (e: PointerEvent) => void; upHandler: (e: PointerEvent) => void } | null = null;

  subBoardPreviews = computed(() => {
    const activeId = this.activeBoardId();
    const children = this.boardService.boards().filter(b => b.parentId === activeId);
    if (!children.length) return [];
    const allCards = this.boardService.cards();
    const activeCards = this.filteredCards();
    const TW = CARD_DEFAULTS.width + 16;
    const TH = 212;
    const PAD = 32;
    const occupied = activeCards.map(c => ({
      x: (c.x ?? PAD) - 4, y: (c.y ?? PAD) - 4,
      w: (c.width ?? CARD_DEFAULTS.width) + 8, h: (c.height ?? CARD_DEFAULTS.height) + 8
    }));
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const hits = (cx: number, cy: number, rects: { x: number; y: number; w: number; h: number }[]) =>
      rects.some(o => cx < o.x + o.w && cx + TW > o.x && cy < o.y + o.h && cy + TH > o.y);
    const findPos = () => {
      for (let row = 0; row < 20; row++) {
        for (let col = 0; col < 20; col++) {
          const cx = PAD + col * TW;
          const cy = PAD + row * TH;
          if (!hits(cx, cy, [...occupied, ...placed])) return { x: cx, y: cy };
        }
      }
      return { x: PAD, y: PAD };
    };
    return children.map(board => {
      const boardCards = allCards.filter(c => c.boardId === board.id);
      const pos = findPos();
      placed.push({ x: pos.x, y: pos.y, w: TW, h: TH });
      return { board, cards: boardCards, x: pos.x, y: pos.y };
    });
  });

  canvasSize = computed(() => {
    const cards = this.filteredCards();
    const previews = this.subBoardPreviews();
    if (!cards.length && !previews.length) return { h: 1200 };
    let maxY = 0;
    for (const c of cards) maxY = Math.max(maxY, (c.y ?? 32) + (c.height ?? CARD_DEFAULTS.height) + 64);
    for (const p of previews) maxY = Math.max(maxY, p.y + 200 + 64);
    return { h: Math.max(maxY, 1200) };
  });

  private readonly keydownHandler = (e: KeyboardEvent) => {
    const el = document.activeElement as HTMLElement | null;
    if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable) return;
    const modalOpen = !!this.editingCard() || this.settingsPanelOpen() || this.helpPanelOpen() || this.sharePanelOpen();
    if (e.key === 'n' || e.key === 'N') {
      if (modalOpen) return;
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
    this.markdownService.preWarm();
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.keydownHandler);
  }

  private generateBackgroundDoodles() {
    this.allDoodles.set(Array.from({ length: 14 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      rot: Math.random() * 360,
      scale: 0.5 + Math.random() * 1.5,
      mi: i
    })));
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

  onSearch(val: string) {
    this.searchRaw.set(val);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.searchQuery.set(val), 150);
  }

  createNewCard() {
    const color = CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];
    if (!this.boardService.addCard({ title: '', content: '', tags: [], color, boardId: this.activeBoardId() })) {
      this.toastService.show(`Board is full — max ${MAX_CARDS_PER_BOARD} notes per board`, 'error');
      return;
    }
    this.toastService.show('Note created', 'success');
  }

  duplicateCard(card: Card) {
    if (!this.boardService.duplicateCard(card)) {
      this.toastService.show(`Board is full — max ${MAX_CARDS_PER_BOARD} notes per board`, 'error');
      return;
    }
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
      if (!this.boardService.addCard({ ...result, color, boardId: this.activeBoardId() })) {
        this.toastService.show(`Board is full — max ${MAX_CARDS_PER_BOARD} notes per board`, 'error');
        return;
      }
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

  startCardDrag(cardId: string, event: PointerEvent) {
    event.preventDefault();
    const card = this.boardService.cards().find(c => c.id === cardId);
    if (!card) return;
    const origX = card.x ?? 32;
    const origY = card.y ?? 32;
    this.draggingCardId.set(cardId);

    const moveHandler = (e: PointerEvent) => {
      if (!this.pointerDrag) return;
      const dx = e.clientX - this.pointerDrag.startX;
      const dy = e.clientY - this.pointerDrag.startY;
      const nx = Math.max(0, this.pointerDrag.origX + dx);
      const ny = Math.max(0, this.pointerDrag.origY + dy);
      this.boardService.cards.update(cards => cards.map(c => c.id === cardId ? { ...c, x: nx, y: ny } : c));
    };

    const upHandler = (e: PointerEvent) => {
      if (!this.pointerDrag) return;
      const dx = e.clientX - this.pointerDrag.startX;
      const dy = e.clientY - this.pointerDrag.startY;
      const { x: nx, y: ny } = this.alignSnap(cardId, this.pointerDrag.origX + dx, this.pointerDrag.origY + dy);
      this.boardService.moveCard(cardId, nx, ny);
      window.removeEventListener('pointermove', moveHandler);
      window.removeEventListener('pointerup', upHandler);
      this.pointerDrag = null;
      const dropped = cardId;
      this.draggingCardId.set(null);
      this.droppedCardId.set(dropped);
      setTimeout(() => this.droppedCardId.set(null), 350);
    };

    this.pointerDrag = { cardId, startX: event.clientX, startY: event.clientY, origX, origY, moveHandler, upHandler };
    window.addEventListener('pointermove', moveHandler);
    window.addEventListener('pointerup', upHandler);
  }

  private alignSnap(cardId: string, x: number, y: number): { x: number; y: number } {
    const THRESH = 10;
    const card = this.filteredCards().find(c => c.id === cardId);
    const w = card?.width ?? CARD_DEFAULTS.width;
    const h = card?.height ?? CARD_DEFAULTS.height;
    const others = this.filteredCards().filter(c => c.id !== cardId);
    let nx = x, ny = y, bestDx = THRESH + 1, bestDy = THRESH + 1;
    for (const o of others) {
      const ox = o.x ?? 32, oy = o.y ?? 32;
      const ow = o.width ?? CARD_DEFAULTS.width, oh = o.height ?? CARD_DEFAULTS.height;
      for (const drag of [x, x + w / 2, x + w]) {
        for (const other of [ox, ox + ow / 2, ox + ow]) {
          const d = Math.abs(drag - other);
          if (d < bestDx) { bestDx = d; nx = other - (drag - x); }
        }
      }
      for (const drag of [y, y + h / 2, y + h]) {
        for (const other of [oy, oy + oh / 2, oy + oh]) {
          const d = Math.abs(drag - other);
          if (d < bestDy) { bestDy = d; ny = other - (drag - y); }
        }
      }
    }
    return { x: Math.max(0, nx), y: Math.max(0, ny) };
  }

  handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  async handleFileDrop(event: DragEvent) {
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    const mdFiles = Array.from(files).filter(f => f.name.endsWith('.md') || f.name.endsWith('.txt'));
    if (!mdFiles.length) return;
    event.preventDefault();
    event.stopPropagation();
    let imported = 0;
    for (const file of mdFiles) {
      const text = await this.ioService.readFileAsText(file);
      const parsed = this.ioService.parseMarkdownContent(text);
      if (!parsed.title || parsed.title === 'Imported Note') parsed.title = file.name.replace(/\.[^/.]+$/, '');
      this.markdownService.invalidate(parsed.content);
      const added = this.boardService.addCard({
        title: parsed.title || 'Untitled',
        content: parsed.content || '',
        tags: parsed.tags || [],
        color: parsed.color,
        rotation: parsed.rotation,
        stickers: parsed.stickers,
        isPinned: parsed.isPinned,
        boardId: this.activeBoardId()
      });
      if (!added) break;
      imported++;
    }
    if (imported < mdFiles.length) {
      this.toastService.show(`Imported ${imported}/${mdFiles.length} notes — board full (max ${MAX_CARDS_PER_BOARD})`, 'error');
    } else {
      this.toastService.show(`${imported} note${imported > 1 ? 's' : ''} imported`, 'success');
    }
  }
}
