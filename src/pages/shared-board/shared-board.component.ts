import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { ShareService, SharedPayload } from '../../services/share.service';
import { AuthService } from '../../services/auth.service';
import { BoardService } from '../../services/board.service';
import { ToastService } from '../../services/toast.service';
import { Card } from '../../models/card.model';

@Component({
  selector: 'app-shared-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[var(--paper-color)] text-[var(--ink-color)]">

      <!-- header -->
      <header class="sticky top-0 z-40 bg-[var(--paper-color)]/95 backdrop-blur-sm border-b-2 border-[var(--ink-color)] shadow-sm p-4">
        <div class="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div class="flex items-center gap-3">
            <span class="text-3xl marker-font text-brand">DoodleBoard</span>
            <span class="text-sm bg-[var(--accent)] text-[var(--paper-color)] px-2 rounded-full rotate-3 inline-block">Shared</span>
          </div>
          @if (payload()) {
            <div class="flex items-center gap-3">
              <span class="text-lg font-bold marker-font">{{ payload()!.boardName }}</span>
              <button
                (click)="duplicate()"
                [disabled]="duplicating()"
                class="doodle-btn bg-[var(--tint-green)] text-[var(--ink-color)] font-bold text-sm"
              >
                {{ duplicating() ? 'Copying...' : '⊕ Duplicate to my workspace' }}
              </button>
            </div>
          }
        </div>
      </header>

      <!-- content -->
      <main class="max-w-7xl mx-auto p-6">
        @if (loading()) {
          <div class="text-center py-32 text-muted text-xl opacity-60">Loading shared board...</div>
        } @else if (!payload()) {
          <div class="text-center py-32">
            <div class="text-6xl mb-4">🔗</div>
            <p class="text-2xl marker-font mb-2">Link not found</p>
            <p class="text-muted">This share link is invalid, expired, or has been revoked.</p>
            <button (click)="router.navigate(['/'])" class="doodle-btn mt-6">Go to DoodleBoard</button>
          </div>
        } @else {
          <div class="mb-6 p-3 bg-[var(--tint-blue)] rounded-lg border border-soft text-sm text-muted text-center">
            This is a read-only snapshot. Click "Duplicate to my workspace" to make an editable copy.
          </div>
          <div class="flex flex-wrap gap-6 justify-center md:justify-start">
            @for (card of payload()!.cards; track card.id) {
              <div
                class="rounded-lg border-2 border-[var(--ink-color)] shadow-md p-4 flex flex-col gap-2 select-none"
                [style.background]="card.color"
                [style.transform]="'rotate(' + card.rotation + 'deg)'"
                [style.width.px]="card.width ?? 280"
                [style.min-height.px]="120"
              >
                @if (card.stickers?.length) {
                  <div class="flex gap-1 text-lg flex-wrap">
                    @for (s of card.stickers; track s) { <span>{{ s }}</span> }
                  </div>
                }
                @if (card.isPinned) {
                  <span class="text-xs font-bold opacity-60">📌 Pinned</span>
                }
                <p class="font-bold text-base leading-tight break-words" style="font-family: var(--font-display)">
                  {{ card.title || 'Untitled' }}
                </p>
                @if (card.content) {
                  <p class="text-sm leading-relaxed opacity-80 whitespace-pre-wrap break-words line-clamp-6">{{ card.content }}</p>
                }
                @if (card.tags?.length) {
                  <div class="flex flex-wrap gap-1 mt-auto pt-1">
                    @for (tag of card.tags; track tag) {
                      <span class="text-xs bg-black/10 rounded-full px-2 py-0.5">#{{ tag }}</span>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      </main>
    </div>
  `
})
export class SharedBoardComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private shareService = inject(ShareService);
  private authService = inject(AuthService);
  private boardService = inject(BoardService);
  private toastService = inject(ToastService);
  private meta = inject(Meta);
  private referrerTag: HTMLMetaElement | null = null;
  router = inject(Router);

  loading = signal(true);
  payload = signal<SharedPayload | null>(null);
  duplicating = signal(false);

  ngOnInit() {
    this.referrerTag = this.meta.addTag({ name: 'referrer', content: 'no-referrer' });
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.shareService.getSharedBoard(token).then(data => {
      this.payload.set(data);
      this.loading.set(false);
    });
  }

  ngOnDestroy() {
    if (this.referrerTag) this.referrerTag.remove();
  }

  async duplicate() {
    const data = this.payload();
    if (!data || this.duplicating()) return;
    this.duplicating.set(true);
    try {
      await this.authService.triggerAnonymousSignIn();
      const newBoardId = this.boardService.addBoard(data.boardName + ' (copy)');
      const cardsWithoutPosition = data.cards.map(c => {
        const { position: _p, ...rest } = c as Card & { position?: string };
        return rest as Omit<Card, 'position'>;
      });
      this.boardService.importCardsIntoBoard(cardsWithoutPosition, newBoardId);
      this.toastService.show('Board duplicated to your workspace!', 'success');
      this.router.navigate(['/board']);
    } catch {
      this.toastService.show('Failed to duplicate board', 'error');
      this.duplicating.set(false);
    }
  }
}
