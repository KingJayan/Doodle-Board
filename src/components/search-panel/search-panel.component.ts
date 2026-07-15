import {
  Component, Input, Output, EventEmitter, signal, computed, OnInit,
  ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit, OnDestroy, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { BoardService } from '../../services/board.service';
import { Card, Board } from '../../models/card.model';
import { parseQuery, matchesQuery } from '../../utils/search';

interface SearchResult {
  card: Card;
  board: Board;
  flatIndex: number;
}

@Component({
  selector: 'app-search-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="fixed inset-0 z-50 flex flex-col" (mousedown)="onBackdropDown($event)">

      <div class="bg-[var(--paper-color)] border-b-2 border-[var(--ink-color)] shadow-2xl" (mousedown)="$event.stopPropagation()">

        <div class="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <span class="opacity-40 flex-none text-base"><app-icon name="search"></app-icon></span>
          <input
            #inp
            class="flex-grow bg-transparent text-[var(--ink-color)] text-sm outline-none placeholder:opacity-30"
            placeholder="Search all notes…"
            autocomplete="off"
            spellcheck="false"
            [value]="query()"
            (input)="onInput($any($event.target).value)"
            (keydown)="onKeydown($event)"
          />
          @if (query()) {
            <button class="opacity-40 hover:opacity-80 flex-none text-xl leading-none" (click)="clear()" aria-label="Clear search"><app-icon name="close"></app-icon></button>
          }
          <kbd
            class="text-[11px] px-2 py-0.5 rounded border border-[var(--ink-color)]/20 opacity-40 flex-none font-mono cursor-pointer select-none"
            (click)="close.emit()"
          >Esc</kbd>
        </div>

        <div class="border-t border-[var(--ink-color)]/10"></div>

        <div class="max-w-3xl mx-auto px-2 pb-3 overflow-y-auto" style="max-height:56vh">
          @if (!query().trim()) {
            <div class="px-2 pt-3">
              <p class="text-[11px] font-bold uppercase tracking-widest opacity-30 mb-2 px-1">Filter tips — click to try</p>
              <div class="grid grid-cols-2 gap-0.5">
                @for (tip of tips; track tip.cmd) {
                  <button
                    class="flex items-center gap-2.5 px-2 py-1.5 rounded text-left hover-surface transition-colors"
                    (click)="applyTip(tip.insert)"
                  >
                    <code class="text-[11px] font-mono bg-[var(--surface)] px-1.5 py-0.5 rounded shrink-0">{{ tip.cmd }}</code>
                    <span class="text-xs opacity-50 truncate">{{ tip.desc }}</span>
                  </button>
                }
              </div>
            </div>
          } @else if (!results().length) {
            <p class="text-sm opacity-40 text-center py-10">No notes found</p>
          } @else {
            @for (group of groupedResults(); track group.boardId) {
              <div class="mt-2">
                <div class="flex items-center gap-1.5 px-2 py-1 sticky top-0 bg-[var(--paper-color)] z-10">
                  <span class="opacity-30 text-xs"><app-icon name="folder"></app-icon></span>
                  <span class="text-[11px] font-bold uppercase tracking-widest opacity-40">{{ group.boardName }}</span>
                  <span class="text-[10px] opacity-25 ml-0.5">· {{ group.items.length }}</span>
                </div>
                @for (r of group.items; track r.card.id) {
                  <div
                    class="result-item flex items-start gap-2.5 px-2 py-2 rounded cursor-pointer"
                    [class.result-active]="activeIndex() === r.flatIndex"
                    (mouseenter)="activeIndex.set(r.flatIndex)"
                    (click)="select(r)"
                  >
                    <span class="w-3 h-3 rounded-sm flex-none mt-0.5 border border-black/10 shrink-0" [style.background]="r.card.color"></span>
                    <div class="flex-grow min-w-0">
                      <p class="text-sm font-semibold truncate leading-tight">{{ r.card.title || '(untitled)' }}</p>
                      @if (r.card.content) {
                        <p class="text-xs opacity-50 truncate mt-0.5">{{ snippet(r.card.content) }}</p>
                      }
                      @if (r.card.tags.length) {
                        <div class="flex gap-1 mt-1.5 flex-wrap">
                          @for (tag of r.card.tags.slice(0, 5); track tag) {
                            <span class="text-[10px] bg-[var(--tint-yellow)] px-1.5 rounded-full opacity-80">#{{ tag }}</span>
                          }
                        </div>
                      }
                    </div>
                    @if (r.card.isPinned) {
                      <span class="flex-none opacity-30 mt-0.5 text-sm"><app-icon name="pin"></app-icon></span>
                    }
                  </div>
                }
              </div>
            }
            <p class="text-[11px] opacity-25 text-center pt-2 pb-1">{{ results().length }} result{{ results().length !== 1 ? 's' : '' }}</p>
          }
        </div>
      </div>

      <div class="flex-grow" style="background:rgba(0,0,0,0.3);backdrop-filter:blur(2px)"></div>
    </div>
  `,
  styles: [`
    .result-item { transition: background-color 0.1s ease; }
    .result-item:hover, .result-active { background-color: var(--surface-hover); }
  `]
})
export class SearchPanelComponent implements OnInit, AfterViewInit, OnDestroy {
  private boardService = inject(BoardService);

  @Input() initialQuery = '';
  @Output() close = new EventEmitter<void>();
  @Output() queryChange = new EventEmitter<string>();
  @Output() navigateToCard = new EventEmitter<{ boardId: string; cardId: string }>();
  @ViewChild('inp') inputRef!: ElementRef<HTMLInputElement>;

  query = signal('');
  activeIndex = signal(0);
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly tips = [
    { cmd: 'board:name', desc: 'limit to a board', insert: 'board:' },
    { cmd: 'tag:name', desc: 'filter by tag', insert: 'tag:' },
    { cmd: '#tag', desc: 'shorthand tag filter', insert: '#' },
    { cmd: 'title:text', desc: 'search titles only', insert: 'title:' },
    { cmd: 'is:pinned', desc: 'show only pinned notes', insert: 'is:pinned ' },
    { cmd: 'color:blue', desc: 'filter by color', insert: 'color:' },
    { cmd: '-word', desc: 'exclude a word', insert: '-' },
    { cmd: 'board:x tag:y', desc: 'combine multiple filters', insert: 'board: tag:' },
  ];

  results = computed((): SearchResult[] => {
    const raw = this.query().trim();
    if (!raw) return [];
    const q = parseQuery(raw);
    if (!q.terms.length && !q.excludes.length && !q.boardFilter && !q.tagFilter && q.pinned === null && !q.colorFilter) return [];
    const boardMap = new Map<string, Board>(this.boardService.boards().map(b => [b.id, b]));
    const out: SearchResult[] = [];
    for (const card of this.boardService.cards()) {
      if (out.length >= 50) break;
      const board = boardMap.get(card.boardId);
      if (board && matchesQuery(card, board, q)) out.push({ card, board, flatIndex: out.length });
    }
    return out;
  });

  groupedResults = computed(() => {
    const groups = new Map<string, { boardId: string; boardName: string; items: SearchResult[] }>();
    for (const r of this.results()) {
      if (!groups.has(r.board.id)) groups.set(r.board.id, { boardId: r.board.id, boardName: r.board.name, items: [] });
      groups.get(r.board.id)!.items.push(r);
    }
    return Array.from(groups.values());
  });

  ngOnInit() {
    this.query.set(this.initialQuery);
  }

  ngAfterViewInit() {
    const el = this.inputRef.nativeElement;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }

  ngOnDestroy() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  onInput(val: string) {
    this.query.set(val);
    this.activeIndex.set(0);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.queryChange.emit(val), 200);
  }

  onKeydown(e: KeyboardEvent) {
    const count = this.results().length;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.activeIndex.update(i => Math.min(i + 1, count - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.activeIndex.update(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && count > 0) { const r = this.results()[this.activeIndex()]; if (r) this.select(r); }
    else if (e.key === 'Escape') this.close.emit();
  }

  onBackdropDown(e: MouseEvent) {
    if (e.target === e.currentTarget) this.close.emit();
  }

  select(r: SearchResult) {
    this.queryChange.emit(this.query());
    this.navigateToCard.emit({ boardId: r.card.boardId, cardId: r.card.id });
  }

  clear() {
    this.query.set('');
    this.queryChange.emit('');
    this.inputRef.nativeElement.focus();
  }

  applyTip(insert: string) {
    this.query.set(insert);
    const el = this.inputRef.nativeElement;
    el.value = insert;
    el.focus();
    el.setSelectionRange(insert.length, insert.length);
  }

  snippet(content: string): string {
    return content.replace(/[#*`>\[\]_]/g, '').slice(0, 80);
  }
}
