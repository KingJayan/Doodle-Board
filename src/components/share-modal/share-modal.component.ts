import { Component, Output, EventEmitter, inject, input, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardService } from '../../services/board.service';
import { IoService } from '../../services/io.service';
import { ToastService } from '../../services/toast.service';
import { ShareService, ShareInfo } from '../../services/share.service';
import { AuthService } from '../../services/auth.service';
import { Card, CARD_PALETTE } from '../../models/card.model';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="fixed inset-0 z-overlay flex items-center justify-center bg-black/50 backdrop-blur-sm" [class.animate-modalOut]="isClosing()" (click)="startClose()">
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" class="bg-[var(--paper-color)] p-8 rounded-lg max-w-lg w-full m-4 shadow-xl doodle-border relative text-[var(--ink-color)] max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <button (click)="startClose()" class="absolute top-4 right-4 text-2xl hover:text-red-500" aria-label="Close">×</button>
        <h2 id="share-title" class="text-3xl marker-font mb-6 text-center">Backup & Share</h2>
        <div class="text-center text-sm text-muted mb-4">Current Board: {{ boardName() }}</div>

        <div class="flex flex-col gap-4">

          <!-- CLOUD SHARE (M6) — only when authenticated -->
          @if (authService.authState().mode !== 'none' && authService.supabaseAvailable) {
            <div class="bg-[var(--tint-purple)] p-4 rounded-lg border border-soft">
              <h3 class="font-bold mb-2"><app-icon name="star"></app-icon> Share Board Link</h3>
              <p class="text-xs text-muted mb-3">Creates a snapshot link — recipients see your board as it is right now.</p>

              @if (newShareUrl()) {
                <div class="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    [value]="newShareUrl()"
                    readonly
                    class="doodle-input text-xs flex-1 bg-[var(--surface)]"
                  >
                  <button (click)="copyShareUrl()" class="doodle-btn text-xs px-3">Copy</button>
                </div>
              }

              <button (click)="createShareLink()" [disabled]="creatingShare()" class="doodle-btn text-sm w-full mb-3">
                {{ creatingShare() ? 'Creating...' : '+ New Share Link' }}
              </button>

              @if (activeShares().length > 0) {
                <div class="border-t border-soft pt-3">
                  <p class="text-xs text-muted font-bold mb-2">Active links</p>
                  @for (share of activeShares(); track share.token) {
                    <div class="flex items-center gap-2 text-xs mb-1">
                      <span class="flex-1 font-mono truncate opacity-60">{{ share.token }}</span>
                      <span class="text-muted">{{ formatDate(share.createdAt) }}</span>
                      <button (click)="revoke(share.token)" class="text-red-500 hover:text-red-700 px-1">Revoke</button>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- IMPORT / EXPORT -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-[var(--tint-green)] p-4 rounded-lg border border-soft md:col-span-2">
              <h3 class="font-bold mb-2"><app-icon name="page"></app-icon> Import Sketch</h3>
              <p class="text-xs text-muted mb-2">Upload a single <code>.md</code> file.</p>
              <input
                type="file" accept=".md,.txt"
                (change)="importSingleFile($event)"
                class="block w-full text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[var(--surface-2)] file:text-[var(--ink-color)] hover:file:bg-[var(--surface-hover)]"
              />
            </div>
            <div class="bg-[var(--tint-yellow)] p-4 rounded-lg border border-soft flex flex-col gap-2">
              <h3 class="font-bold mb-1"><app-icon name="package"></app-icon> Export Board</h3>
              <p class="text-xs text-muted">Download {{ boardName() }} as a zip or single markdown file.</p>
              <button (click)="exportBoard()" class="doodle-btn w-full bg-[var(--accent)] text-[var(--paper-color)] text-sm font-bold">Download .zip</button>
              <button (click)="exportBoardMd()" class="doodle-btn w-full text-sm">Download .md</button>
            </div>
            <div class="bg-[var(--tint-blue)] p-4 rounded-lg border border-soft">
              <h3 class="font-bold mb-2"><app-icon name="folder-open"></app-icon> Import to Board</h3>
              <p class="text-xs text-muted mb-3">Add zip content to current board.</p>
              <input
                type="file" accept=".zip"
                (change)="importZip($event)"
                class="block w-full text-xs text-muted file:mr-2 file:py-2 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[var(--surface-2)] file:text-[var(--ink-color)] hover:file:bg-[var(--surface-hover)]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ShareModalComponent implements OnInit {
  private boardService = inject(BoardService);
  private ioService = inject(IoService);
  private toastService = inject(ToastService);
  readonly shareService = inject(ShareService);
  readonly authService = inject(AuthService);

  boardId = input.required<string>();
  boardName = input.required<string>();
  cards = input.required<Card[]>();

  @Output() close = new EventEmitter<void>();

  isClosing = signal(false);
  creatingShare = signal(false);
  newShareUrl = signal<string | null>(null);
  activeShares = signal<ShareInfo[]>([]);

  startClose() {
    this.isClosing.set(true);
    setTimeout(() => this.close.emit(), 150);
  }

  ngOnInit() {
    if (this.authService.authState().mode !== 'none' && this.authService.supabaseAvailable) {
      this.shareService.listShares(this.boardId()).then(shares => this.activeShares.set(shares));
    }
  }

  async createShareLink() {
    this.creatingShare.set(true);
    try {
      const url = await this.shareService.createShare(this.boardId(), this.boardName(), this.cards());
      if (url) {
        this.newShareUrl.set(url);
        const shares = await this.shareService.listShares(this.boardId());
        this.activeShares.set(shares);
        this.toastService.show('Share link created!', 'success');
      } else {
        this.toastService.show('Failed to create share link', 'error');
      }
    } finally {
      this.creatingShare.set(false);
    }
  }

  async copyShareUrl() {
    const url = this.newShareUrl();
    if (!url) return;
    await navigator.clipboard.writeText(url);
    this.toastService.show('Link copied!', 'success');
  }

  async revoke(token: string) {
    await this.shareService.revokeShare(token);
    this.activeShares.update(shares => shares.filter(s => s.token !== token));
    this.toastService.show('Share link revoked', 'info');
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  async exportBoard() {
    try {
      await this.ioService.exportBoardAsZip(this.cards(), this.boardName());
      this.toastService.show('Board packed up!', 'success');
    } catch {
      this.toastService.show('Failed to pack board', 'error');
    }
  }

  exportBoardMd() {
    this.ioService.exportBoardAsSingleMd(this.cards(), this.boardName());
    this.toastService.show('Board exported as markdown', 'info');
  }

  async importZip(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const parsed = await this.ioService.importZip(file);
      const newCards = parsed.map(p => ({
        id: crypto.randomUUID(),
        boardId: this.boardId(),
        title: p.title || 'Untitled',
        content: p.content || '',
        tags: p.tags || [],
        color: p.color || CARD_PALETTE[0],
        rotation: p.rotation ?? (Math.random() * 6 - 3),
        stickers: p.stickers || [],
        isPinned: p.isPinned || false,
        updatedAt: p.updatedAt || Date.now()
      }));
      this.boardService.importCardsIntoBoard(newCards, this.boardId());
      this.startClose();
      this.toastService.show(`${newCards.length} notes added to board!`, 'success');
    } catch {
      this.toastService.show('Failed to import ZIP — file may be invalid', 'error');
    }
  }

  async importSingleFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await this.ioService.readFileAsText(file);
      const parsed = this.ioService.parseMarkdownContent(text);
      if (!parsed.title || parsed.title === 'Imported Note') {
        parsed.title = file.name.replace(/\.[^/.]+$/, '');
      }
      this.boardService.addCard({
        title: parsed.title || 'Untitled',
        content: parsed.content || '',
        tags: parsed.tags || [],
        color: parsed.color,
        rotation: parsed.rotation,
        stickers: parsed.stickers,
        isPinned: parsed.isPinned,
        boardId: this.boardId()
      });
      this.startClose();
      this.toastService.show('Sketch added to the pile', 'success');
    } catch {
      this.toastService.show("Couldn't read that file", 'error');
    }
  }
}
