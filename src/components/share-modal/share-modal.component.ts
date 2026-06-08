import { Component, Output, EventEmitter, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardService } from '../../services/board.service';
import { IoService } from '../../services/io.service';
import { ToastService } from '../../services/toast.service';
import { Card, CARD_PALETTE } from '../../models/card.model';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="fixed inset-0 z-overlay flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="close.emit()">
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" class="bg-[var(--paper-color)] p-8 rounded-lg max-w-lg w-full m-4 shadow-xl doodle-border relative text-[var(--ink-color)]" (click)="$event.stopPropagation()">
        <button (click)="close.emit()" class="absolute top-4 right-4 text-2xl hover:text-red-500" aria-label="Close">×</button>
        <h2 id="share-title" class="text-3xl marker-font mb-6 text-center">Backup & Export</h2>
        <div class="text-center text-sm text-muted mb-4">Current Folder: {{ folderName() }}</div>

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
          <div class="bg-[var(--tint-yellow)] p-4 rounded-lg border border-soft">
            <h3 class="font-bold mb-2"><app-icon name="package"></app-icon> Export Folder</h3>
            <p class="text-xs text-muted mb-3">Download {{ folderName() }} (.zip).</p>
            <button (click)="exportFolder()" class="doodle-btn w-full bg-[var(--accent)] text-[var(--paper-color)] text-sm font-bold">Download .zip</button>
          </div>
          <div class="bg-[var(--tint-blue)] p-4 rounded-lg border border-soft">
            <h3 class="font-bold mb-2"><app-icon name="folder-open"></app-icon> Import to Folder</h3>
            <p class="text-xs text-muted mb-3">Add zip content to current folder.</p>
            <input
              type="file" accept=".zip"
              (change)="importZip($event)"
              class="block w-full text-xs text-muted file:mr-2 file:py-2 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[var(--surface-2)] file:text-[var(--ink-color)] hover:file:bg-[var(--surface-hover)]"
            />
          </div>
        </div>
      </div>
    </div>
  `
})
export class ShareModalComponent {
  private boardService = inject(BoardService);
  private ioService = inject(IoService);
  private toastService = inject(ToastService);

  folderId = input.required<string>();
  folderName = input.required<string>();
  cards = input.required<Card[]>();

  @Output() close = new EventEmitter<void>();

  async exportFolder() {
    try {
      await this.ioService.exportFolderAsZip(this.cards(), this.folderName());
      this.toastService.show('Folder packed up!', 'success');
    } catch {
      this.toastService.show('Failed to pack board', 'error');
    }
  }

  async importZip(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const parsed = await this.ioService.importZip(file);
      const newCards: Card[] = parsed.map(p => ({
        id: crypto.randomUUID(),
        folderId: this.folderId(),
        title: p.title || 'Untitled',
        content: p.content || '',
        tags: p.tags || [],
        color: p.color || CARD_PALETTE[0],
        rotation: p.rotation ?? (Math.random() * 6 - 3),
        stickers: p.stickers || [],
        isPinned: p.isPinned || false,
        updatedAt: p.updatedAt || Date.now()
      }));
      this.boardService.importCardsIntoFolder(newCards, this.folderId());
      this.close.emit();
      this.toastService.show(`${newCards.length} notes added to folder!`, 'success');
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
        folderId: this.folderId()
      });
      this.close.emit();
      this.toastService.show('Sketch added to the pile', 'success');
    } catch {
      this.toastService.show("Couldn't read that file", 'error');
    }
  }
}
