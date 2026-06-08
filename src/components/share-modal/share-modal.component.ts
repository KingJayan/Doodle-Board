import { Component, Output, EventEmitter, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardService } from '../../services/board.service';
import { IoService } from '../../services/io.service';
import { ToastService } from '../../services/toast.service';
import { Card, CARD_PALETTE } from '../../models/card.model';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="close.emit()">
      <div class="bg-[var(--paper-color)] p-8 rounded-lg max-w-lg w-full m-4 shadow-xl doodle-border relative text-[var(--ink-color)]" (click)="$event.stopPropagation()">
        <button (click)="close.emit()" class="absolute top-4 right-4 text-2xl hover:text-red-500">×</button>
        <h2 class="text-3xl marker-font mb-6 text-center">Share & Backup</h2>
        <div class="text-center text-sm text-gray-500 mb-4">Current Folder: {{ folderName() }}</div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-green-50 p-4 rounded-lg border border-green-200 md:col-span-2">
            <h3 class="font-bold mb-2">📄 Import Sketch</h3>
            <p class="text-xs text-gray-600 mb-2">Upload a single <code>.md</code> file.</p>
            <input
              type="file" accept=".md,.txt"
              (change)="importSingleFile($event)"
              class="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
            />
          </div>
          <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 class="font-bold mb-2">📦 Export Folder</h3>
            <p class="text-xs text-gray-600 mb-3">Download {{ folderName() }} (.zip).</p>
            <button (click)="exportFolder()" class="doodle-btn w-full bg-yellow-200 text-black text-sm font-bold hover:bg-yellow-300">Download .zip</button>
          </div>
          <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 class="font-bold mb-2">📂 Import to Folder</h3>
            <p class="text-xs text-gray-600 mb-3">Add zip content to current folder.</p>
            <input
              type="file" accept=".zip"
              (change)="importZip($event)"
              class="block w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
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
      this.toastService.show('Folder packed up! 📦', 'success');
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
