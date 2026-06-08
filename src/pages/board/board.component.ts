import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BoardService } from '../../services/board.service';
import { CardComponent } from '../../components/card/card.component';
import { EditorComponent } from '../../components/editor/editor.component';
import { SettingsModalComponent } from '../../components/settings-modal/settings-modal.component';
import { HelpModalComponent } from '../../components/help-modal/help-modal.component';
import { ShareModalComponent } from '../../components/share-modal/share-modal.component';
import { AiService } from '../../services/ai.service';
import { ToastService } from '../../services/toast.service';
import { ThemeService } from '../../services/theme.service';
import { Card, Folder, CARD_COLORS, CARD_COLORS_AI } from '../../models/card.model';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, EditorComponent, SettingsModalComponent, HelpModalComponent, ShareModalComponent],
  template: `
    <div class="h-screen flex flex-col overflow-hidden">

      <!-- bg doodles -->
      <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        @for (doodle of doodles; track $index) {
          <svg
            class="absolute opacity-10 transition-colors duration-500"
            [style.left.%]="doodle.x"
            [style.top.%]="doodle.y"
            [style.transform]="'rotate(' + doodle.rot + 'deg) scale(' + doodle.scale + ')'"
            [style.color]="'var(--ink-color)'"
            width="100" height="100" viewBox="0 0 100 100"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          >
            <path [attr.d]="doodle.path" />
          </svg>
        }
      </div>

      <!-- header + toolbar -->
      <header class="sticky top-0 z-40 bg-[var(--paper-color)]/95 backdrop-blur-sm border-b-2 border-[var(--ink-color)] shadow-sm p-4 transition-all">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">

          <div class="flex items-center gap-2 cursor-pointer group" (click)="router.navigate(['/'])">
            <button class="md:hidden text-2xl mr-2" (click)="sidebarOpen.set(!sidebarOpen()); $event.stopPropagation()">☰</button>
            <span class="text-3xl marker-font text-brand -rotate-2 group-hover:rotate-0 transition-transform">DoodleBoard</span>
            <span class="text-sm bg-black text-white px-2 rounded-full transform rotate-3">Beta</span>
          </div>

          <div class="flex flex-wrap gap-4 items-center justify-center">
            <!-- search -->
            <div class="relative group">
              <input
                type="text"
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
                placeholder="Search scribbles..."
                class="doodle-input bg-white/50 rounded-full px-4 py-1 w-48 focus:w-64 transition-all"
              />
              <span class="absolute right-3 top-2 opacity-50">🔍</span>
            </div>

            <div class="text-xs font-mono opacity-60 w-16 text-center hidden md:block">
              {{ saveStatus() }}
            </div>

            @if (activeTag()) {
              <div
                class="bg-note-yellow px-3 py-1 rounded-full border border-black flex items-center gap-2 cursor-pointer hover:bg-red-200 transition-colors"
                (click)="activeTag.set(null)"
              >
                <span class="text-black">#{{ activeTag() }}</span>
                <span class="font-bold text-black">×</span>
              </div>
            }
          </div>

          <div class="flex gap-2">
            <button (click)="helpPanelOpen.set(true)" class="doodle-btn px-3 text-lg" title="Help">❓</button>
            <button (click)="settingsPanelOpen.set(true)" class="doodle-btn px-2 text-xl" title="Settings">⚙️</button>
            <button (click)="sharePanelOpen.set(true)" class="doodle-btn text-base" title="Backup & Export">📦 Backup</button>
            @if (aiAvailable) {
              <button (click)="aiPanelOpen.set(!aiPanelOpen())" class="doodle-btn bg-note-blue text-black text-base" title="Ask the Genie">✨ Genie</button>
            }
            <button (click)="createNewCard()" class="doodle-btn bg-note-green text-black font-bold text-base">+ New Note</button>
          </div>
        </div>
      </header>

      <div class="flex flex-grow relative max-w-7xl mx-auto w-full min-h-0 overflow-hidden">

        <!-- sidebar -->
        <aside
          class="absolute md:static top-0 left-0 bottom-0 z-30 w-64 bg-[var(--paper-color)] border-r-2 border-[var(--ink-color)] transform transition-transform duration-300 md:translate-x-0 p-4 flex flex-col gap-4 shadow-xl md:shadow-none h-full"
          [class.-translate-x-full]="!sidebarOpen()"
        >
          <h3 class="marker-font text-xl border-b-2 border-dashed border-gray-400 pb-2 mb-2">📂 Folders</h3>

          <div class="flex-grow overflow-y-auto flex flex-col gap-2">
            @for (folder of folders(); track folder.id) {
              <div
                class="flex items-center gap-2 p-2 rounded cursor-pointer transition-colors group relative"
                [class.bg-yellow-100]="activeFolderId() === folder.id"
                [class.font-bold]="activeFolderId() === folder.id"
                [class.hover:bg-gray-100]="activeFolderId() !== folder.id"
                (click)="activeFolderId.set(folder.id); sidebarOpen.set(false)"
              >
                <span class="text-xl">📁</span>
                @if (renamingFolderId() === folder.id) {
                  <input
                    class="doodle-input text-sm flex-grow"
                    [value]="folder.name"
                    (keyup.enter)="commitRename($any($event.target).value, folder.id)"
                    (keyup.escape)="renamingFolderId.set(null)"
                    (blur)="commitRename($any($event.target).value, folder.id)"
                    (click)="$event.stopPropagation()"
                  >
                } @else {
                  <span class="truncate flex-grow" (dblclick)="renamingFolderId.set(folder.id); $event.stopPropagation()">{{ folder.name }}</span>
                }
                @if (folder.id !== 'default') {
                  <button
                    class="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 px-1"
                    (click)="deleteFolder(folder.id, $event)"
                    title="Delete Folder"
                  >×</button>
                }
              </div>
            }
          </div>

          <div class="pt-2 border-t-2 border-dashed border-gray-400">
            <div class="flex gap-2">
              <input
                #newFolderInput
                type="text"
                class="doodle-input text-sm"
                placeholder="New Folder..."
                (keyup.enter)="createFolder(newFolderInput.value); newFolderInput.value = ''"
              >
              <button
                (click)="createFolder(newFolderInput.value); newFolderInput.value = ''"
                class="doodle-btn px-2 py-0 text-lg bg-green-100"
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
            <div class="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 relative animate-slideDown shadow-xl">
              <button (click)="aiPanelOpen.set(false)" class="absolute top-2 right-2 text-xl hover:text-red-500 text-black">×</button>
              <h3 class="font-bold text-lg mb-2 text-black">✨ Brainstorm with Genie</h3>
              <div class="flex gap-2">
                <input
                  #topicInput
                  type="text"
                  class="doodle-input bg-white text-black"
                  placeholder="e.g. Pizza toppings..."
                  (keyup.enter)="generateCard(topicInput.value); topicInput.value = ''"
                >
                <button
                  (click)="generateCard(topicInput.value); topicInput.value = ''"
                  class="doodle-btn bg-white text-black py-1 text-sm"
                  [disabled]="isGenerating()"
                >{{ isGenerating() ? '...' : 'Go!' }}</button>
              </div>
            </div>
          </div>
        }

        <!-- main card grid -->
        <main class="p-4 md:p-8 flex-grow w-full z-10 overflow-y-auto h-full" (dragover)="handleDragOver($event)">
          @if (filteredCards().length === 0) {
            <div class="text-center py-20 opacity-50">
              <div class="text-6xl mb-4">🍃</div>
              <p class="text-2xl marker-font">Empty Folder...</p>
              <p>Drag notes here or create new ones!</p>
            </div>
          }

          <div class="flex flex-wrap gap-6 md:gap-8 pb-20 justify-center md:justify-start">
            @for (card of filteredCards(); track card.id) {
              <div
                class="relative flex-none"
                [class.animate-popIn]="!themeService.reduceMotion()"
                [style.animation-delay]="($index * 50) + 'ms'"
                draggable="true"
                (dragstart)="handleDragStart(card.id, $event)"
                (drop)="handleDrop(card.id, $event)"
                (dragover)="handleDragOver($event)"
              >
                <app-card
                  [card]="card"
                  [searchQuery]="searchQuery()"
                  (update)="updateCard($event)"
                  (delete)="handleDeleteCard($event)"
                  (expand)="editingCard.set($event)"
                  (tagClick)="activeTag.set($event)"
                  (stickerToggle)="toggleSticker(card.id, $event)"
                  (pinToggle)="togglePin(card.id)"
                ></app-card>
              </div>
            }
          </div>
        </main>
      </div>

      <!-- editor modal -->
      @if (editingCard()) {
        <app-editor [card]="editingCard()!" (close)="editingCard.set(null)"></app-editor>
      }

      @if (settingsPanelOpen()) {
        <app-settings-modal (close)="settingsPanelOpen.set(false)"></app-settings-modal>
      }
      @if (helpPanelOpen()) {
        <app-help-modal [aiAvailable]="!!aiAvailable" (close)="helpPanelOpen.set(false)"></app-help-modal>
      }
      @if (sharePanelOpen()) {
        <app-share-modal
          [folderId]="activeFolderId()"
          [folderName]="currentFolderName()"
          [cards]="filteredCards()"
          (close)="sharePanelOpen.set(false)"
        ></app-share-modal>
      }
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
  `]
})
export class BoardComponent implements OnInit {
  private boardService = inject(BoardService);
  themeService = inject(ThemeService);
  router = inject(Router);
  private aiService = inject(AiService);
  aiAvailable = this.aiService.isAvailable;
  private toastService = inject(ToastService);

  saveStatus = this.boardService.saveStatus;
  folders = this.boardService.folders;
  updateCard = (card: Card) => this.boardService.updateCard(card);
  toggleSticker = (id: string, sticker: string) => this.boardService.toggleSticker(id, sticker);
  togglePin = (id: string) => this.boardService.togglePin(id);

  searchQuery = signal('');
  activeTag = signal<string | null>(null);
  activeFolderId = signal<string>('default');

  aiPanelOpen = signal(false);
  sharePanelOpen = signal(false);
  settingsPanelOpen = signal(false);
  helpPanelOpen = signal(false);
  sidebarOpen = signal(true);
  isGenerating = signal(false);

  editingCard = signal<Card | null>(null);
  renamingFolderId = signal<string | null>(null);

  doodles: { x: number; y: number; rot: number; scale: number; path: string }[] = [];
  private draggedCardId: string | null = null;

  ngOnInit() {
    this.generateBackgroundDoodles();
    if (window.innerWidth < 768) this.sidebarOpen.set(false);
  }

  private generateBackgroundDoodles() {
    const paths = [
      'M10 10 Q 50 90 90 10',
      'M10 50 Q 50 10 90 50 T 170 50',
      'M50 10 L 60 40 L 90 50 L 60 60 L 50 90 L 40 60 L 10 50 L 40 40 Z',
      'M20 20 L 80 80 M 80 20 L 20 80',
      'M50 50 m -40 0 a 40 40 0 1 0 80 0 a 40 40 0 1 0 -80 0',
      'M10 90 L 50 10 L 90 90 Z',
      'M10 50 C 20 20, 80 20, 90 50'
    ];
    this.doodles = Array.from({ length: 12 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      rot: Math.random() * 360,
      scale: 0.5 + Math.random() * 1.5,
      path: paths[Math.floor(Math.random() * paths.length)]
    }));
  }

  filteredCards = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const tag = this.activeTag();
    const folder = this.activeFolderId();

    return this.boardService.cards()
      .filter((card: Card) => {
        if (card.folderId !== folder) return false;
        const matchesSearch =
          card.title.toLowerCase().includes(query) ||
          card.content.toLowerCase().includes(query) ||
          card.tags.some((t: string) => t.toLowerCase().includes(query));
        return matchesSearch && (tag ? card.tags.includes(tag) : true);
      });
  });

  currentFolderName = computed(() =>
    this.boardService.folders().find((f: Folder) => f.id === this.activeFolderId())?.name ?? 'Folder'
  );

  createFolder(name: string) {
    if (!name.trim()) return;
    const id = this.boardService.addFolder(name);
    this.activeFolderId.set(id);
    this.toastService.show(`Created folder "${name}"`, 'success');
  }

  commitRename(name: string, id: string) {
    if (name.trim()) this.boardService.renameFolder(id, name.trim());
    this.renamingFolderId.set(null);
  }

  deleteFolder(id: string, event: Event) {
    event.stopPropagation();
    this.toastService.show('Delete folder? Notes will move to General.', 'warning', {
      label: 'Yes, Delete',
      callback: () => {
        this.boardService.deleteFolder(id);
        if (this.activeFolderId() === id) this.activeFolderId.set('default');
        this.toastService.show('Folder deleted', 'info');
      }
    });
  }

  createNewCard() {
    const color = CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];
    this.boardService.addCard({ title: '', content: '', tags: [], color, folderId: this.activeFolderId() });
    this.toastService.show('Fresh paper extracted!', 'success');
  }

  async generateCard(topic: string) {
    if (this.isGenerating()) return;
    this.isGenerating.set(true);
    try {
      const result = await this.aiService.brainstormCard(topic);
      const color = CARD_COLORS_AI[Math.floor(Math.random() * CARD_COLORS_AI.length)];
      this.boardService.addCard({ ...result, color, folderId: this.activeFolderId() });
      this.aiPanelOpen.set(false);
      this.toastService.show('Genie granted your wish! ✨', 'success');
    } catch {
      this.toastService.show('AI brainstorm failed — check your API key', 'error');
    } finally {
      this.isGenerating.set(false);
    }
  }

  handleDeleteCard(id: string) {
    this.boardService.deleteCard(id);
    this.toastService.show('Crumpled and tossed!', 'info');
  }

  handleDragStart(cardId: string, event: DragEvent) {
    const isHandle = event.composedPath().some((el: any) => el.classList?.contains('drag-handle'));
    if (!isHandle) {
      const ghost = new Image(); ghost.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      event.dataTransfer?.setDragImage(ghost, 0, 0);
      event.preventDefault();
      return;
    }
    this.draggedCardId = cardId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', cardId);
    }
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
