import { Component, inject, signal, computed, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/board.service';
import { IoService } from '../../services/io.service';
import { CardComponent } from '../card/card.component';
import { EditorComponent } from '../editor/editor.component';
import { AiService } from '../../services/ai.service';
import { ToastService } from '../../services/toast.service';
import { ThemeService } from '../../services/theme.service';
import { Card, Folder, CARD_COLORS, CARD_COLORS_AI } from '../../models/card.model';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, EditorComponent],
  template: `
    <div class="min-h-screen flex flex-col relative overflow-hidden">

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

          <div class="flex items-center gap-2 cursor-pointer group" (click)="goHome.emit()">
            <button class="md:hidden text-2xl mr-2" (click)="sidebarOpen.set(!sidebarOpen()); $event.stopPropagation()">☰</button>
            <span class="text-3xl marker-font text-[#ff6b6b] -rotate-2 group-hover:rotate-0 transition-transform">DoodleBoard</span>
            <span class="text-sm bg-black text-white px-2 rounded-full transform rotate-3">Beta</span>
          </div>

          <div class="flex flex-wrap gap-3 items-center justify-center">
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
              {{ boardService.saveStatus() }}
            </div>

            @if (activeTag()) {
              <div
                class="bg-[#ffeb3b] px-3 py-1 rounded-full border border-black flex items-center gap-2 cursor-pointer hover:bg-red-200 transition-colors"
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
            <button (click)="sharePanelOpen.set(true)" class="doodle-btn text-base" title="Backup & Share">📤 Share</button>
            @if (aiAvailable) {
              <button (click)="aiPanelOpen.set(!aiPanelOpen())" class="doodle-btn bg-[#e1f5fe] text-black text-base" title="Ask the Genie">✨ Genie</button>
            }
            <button (click)="createNewCard()" class="doodle-btn bg-[#c8e6c9] text-black font-bold text-base">+ New Note</button>
          </div>
        </div>
      </header>

      <div class="flex flex-grow relative max-w-7xl mx-auto w-full">

        <!-- sidebar -->
        <aside
          class="absolute md:static top-0 left-0 bottom-0 z-30 w-64 bg-[var(--paper-color)] border-r-2 border-[var(--ink-color)] transform transition-transform duration-300 md:translate-x-0 p-4 flex flex-col gap-4 shadow-xl md:shadow-none h-full"
          [class.-translate-x-full]="!sidebarOpen()"
        >
          <h3 class="marker-font text-xl border-b-2 border-dashed border-gray-400 pb-2 mb-2">📂 Folders</h3>

          <div class="flex-grow overflow-y-auto flex flex-col gap-2">
            @for (folder of boardService.folders(); track folder.id) {
              <div
                class="flex items-center gap-2 p-2 rounded cursor-pointer transition-colors group relative"
                [class.bg-yellow-100]="activeFolderId() === folder.id"
                [class.font-bold]="activeFolderId() === folder.id"
                [class.hover:bg-gray-100]="activeFolderId() !== folder.id"
                (click)="activeFolderId.set(folder.id); sidebarOpen.set(false)"
              >
                <span class="text-xl">📁</span>
                <span class="truncate flex-grow">{{ folder.name }}</span>
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
        <main class="p-4 md:p-8 flex-grow w-full z-10 overflow-y-auto h-[calc(100vh-80px)]" (dragover)="handleDragOver($event)">
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
                  (update)="boardService.updateCard($event)"
                  (delete)="handleDeleteCard($event)"
                  (expand)="editingCard.set($event)"
                  (tagClick)="activeTag.set($event)"
                  (stickerToggle)="boardService.toggleSticker(card.id, $event)"
                  (pinToggle)="boardService.togglePin(card.id)"
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

      <!-- settings modal -->
      @if (settingsPanelOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="settingsPanelOpen.set(false)">
          <div class="bg-[var(--paper-color)] p-8 rounded-lg max-w-md w-full m-4 shadow-xl doodle-border relative text-[var(--ink-color)]" (click)="$event.stopPropagation()">
            <button (click)="settingsPanelOpen.set(false)" class="absolute top-4 right-4 text-2xl hover:text-red-500">×</button>
            <h2 class="text-3xl marker-font mb-6 text-center">Settings</h2>

            <div class="flex flex-col gap-6">
              <div>
                <h3 class="font-bold mb-3 text-lg border-b border-[var(--ink-color)] pb-1">Theme</h3>
                <div class="flex flex-col gap-2">
                  <button (click)="themeService.setTheme('paper')" class="flex items-center gap-3 p-3 rounded border border-gray-300 hover:bg-gray-100 transition-colors bg-[#fdfbf7] text-gray-900">
                    <div class="w-6 h-6 rounded-full border border-black bg-[#fdfbf7]"></div>
                    <span>Classic Paper</span>
                    @if (themeService.currentTheme() === 'paper') { <span class="ml-auto">✅</span> }
                  </button>
                  <button (click)="themeService.setTheme('chalkboard')" class="flex items-center gap-3 p-3 rounded border border-gray-600 hover:bg-gray-700 transition-colors bg-[#2b3035] text-white">
                    <div class="w-6 h-6 rounded-full border border-white bg-[#2b3035]"></div>
                    <span>Chalkboard (Dark)</span>
                    @if (themeService.currentTheme() === 'chalkboard') { <span class="ml-auto">✅</span> }
                  </button>
                  <button (click)="themeService.setTheme('blueprint')" class="flex items-center gap-3 p-3 rounded border border-blue-300 hover:bg-blue-800 transition-colors bg-[#1e408a] text-white">
                    <div class="w-6 h-6 rounded-full border border-white bg-[#1e408a]"></div>
                    <span>Blueprint</span>
                    @if (themeService.currentTheme() === 'blueprint') { <span class="ml-auto">✅</span> }
                  </button>
                </div>
              </div>

              <div>
                <h3 class="font-bold mb-3 text-lg border-b border-[var(--ink-color)] pb-1">Accessibility</h3>
                <label class="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    [checked]="themeService.reduceMotion()"
                    (change)="themeService.toggleMotion()"
                    class="w-5 h-5 accent-[var(--ink-color)]"
                  >
                  <span>Reduce Motion (No wiggles)</span>
                </label>
              </div>

              <div class="text-center text-xs opacity-60 mt-4 flex flex-col gap-1">
                <span>DoodleBoard v1.1.0</span>
                <div class="flex items-center justify-center gap-2">
                  <span>By Jayan Patel</span>
                  <a href="https://jayanpatel.vercel.app" target="_blank" class="text-sm hover:scale-110 transition-transform no-underline" title="Portfolio">🌐</a>
                  <a href="https://github.com/KingJayan" target="_blank" class="text-sm hover:scale-110 transition-transform no-underline" title="GitHub">🐙</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- help modal -->
      @if (helpPanelOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="helpPanelOpen.set(false)">
          <div class="bg-[var(--paper-color)] p-8 rounded-lg max-w-2xl w-full m-4 shadow-xl doodle-border relative text-[var(--ink-color)] overflow-y-auto max-h-[90vh]" (click)="$event.stopPropagation()">
            <button (click)="helpPanelOpen.set(false)" class="absolute top-4 right-4 text-2xl hover:text-red-500">×</button>
            <h2 class="text-3xl marker-font mb-6 text-center">How to Doodle</h2>
            <div class="space-y-6">
              <div class="flex gap-4 items-start">
                <div class="text-4xl">📝</div>
                <div>
                  <h3 class="font-bold text-xl">Creating & Editing</h3>
                  <p>Click <strong>+ New Note</strong> to start. Drag notes to reorder them.</p>
                </div>
              </div>
              <div class="flex gap-4 items-start">
                <div class="text-4xl">📂</div>
                <div>
                  <h3 class="font-bold text-xl">Folders</h3>
                  <p>Use the sidebar to create folders and keep your notes organized.</p>
                </div>
              </div>
              <div class="flex gap-4 items-start">
                <div class="text-4xl">✨</div>
                @if (aiAvailable) {
                  <div>
                    <h3 class="font-bold text-xl">Genie Powers</h3>
                    <p>Use the <strong>Genie</strong> button to brainstorm topics. Inside the editor, use the <strong>Magic Pencil</strong> to fix grammar!</p>
                  </div>
                } @else {
                  <div>
                    <h3 class="font-bold text-xl">AI Features Disabled</h3>
                    <p>Set an <strong>API_KEY</strong> environment variable to enable Genie brainstorm and Magic Pencil polish.</p>
                  </div>
                }
              </div>
            </div>
            <div class="mt-8 text-center">
              <button (click)="helpPanelOpen.set(false)" class="doodle-btn bg-yellow-200 text-black font-bold">Got it!</button>
            </div>
          </div>
        </div>
      }

      <!-- share / backup modal -->
      @if (sharePanelOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="sharePanelOpen.set(false)">
          <div class="bg-white p-8 rounded-lg max-w-lg w-full m-4 shadow-xl doodle-border relative text-gray-900" (click)="$event.stopPropagation()">
            <button (click)="sharePanelOpen.set(false)" class="absolute top-4 right-4 text-2xl hover:text-red-500">×</button>
            <h2 class="text-3xl marker-font mb-6 text-center text-black">Share & Backup</h2>
            <div class="text-center text-sm text-gray-500 mb-4">Current Folder: {{ currentFolderName() }}</div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-green-50 p-4 rounded-lg border border-green-200 md:col-span-2">
                <h3 class="font-bold mb-2 text-black">📄 Import Sketch</h3>
                <p class="text-xs text-gray-600 mb-2">Upload a single <code>.md</code> file.</p>
                <input
                  type="file" accept=".md,.txt"
                  (change)="importSingleFile($event)"
                  class="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                />
              </div>
              <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 class="font-bold mb-2 text-black">📦 Export Folder</h3>
                <p class="text-xs text-gray-600 mb-3">Download {{ currentFolderName() }} (.zip).</p>
                <button (click)="exportBoard()" class="doodle-btn w-full bg-yellow-200 text-black text-sm font-bold hover:bg-yellow-300">Download .zip</button>
              </div>
              <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 class="font-bold mb-2 text-black">📂 Import to Folder</h3>
                <p class="text-xs text-gray-600 mb-3">Add zip content to current folder.</p>
                <input
                  type="file" accept=".zip"
                  (change)="importBoard($event)"
                  class="block w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                />
              </div>
            </div>
          </div>
        </div>
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
      animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.8) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `]
})
export class BoardComponent implements OnInit {
  boardService = inject(BoardService);
  themeService = inject(ThemeService);
  private aiService = inject(AiService);
  aiAvailable = this.aiService.isAvailable;
  private toastService = inject(ToastService);
  private ioService = inject(IoService);

  @Output() goHome = new EventEmitter<void>();

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
      })
      .sort((a: Card, b: Card) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
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

  deleteFolder(id: string, event: Event) {
    event.stopPropagation();
    if (confirm('Delete folder? Notes will move to General.')) {
      this.boardService.deleteFolder(id);
      if (this.activeFolderId() === id) this.activeFolderId.set('default');
      this.toastService.show('Folder deleted', 'info');
    }
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
      this.toastService.show('Genie is confused...', 'error');
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
    if (!isHandle) { event.preventDefault(); return; }
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

  async exportBoard() {
    try {
      await this.ioService.exportFolderAsZip(this.filteredCards(), this.currentFolderName());
      this.toastService.show('Folder packed up! 📦', 'success');
    } catch {
      this.toastService.show('Failed to pack board', 'error');
    }
  }

  async importBoard(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const parsed = await this.ioService.importZip(file);
      const newCards: Card[] = parsed.map(p => ({
        id: Math.random().toString(36).substring(2, 9),
        folderId: this.activeFolderId(),
        title: p.title || 'Untitled',
        content: p.content || '',
        tags: p.tags || [],
        color: p.color || '#fff9c4',
        rotation: p.rotation ?? (Math.random() * 6 - 3),
        stickers: p.stickers || [],
        isPinned: p.isPinned || false,
        updatedAt: p.updatedAt || Date.now()
      }));
      this.boardService.importCardsIntoFolder(newCards, this.activeFolderId());
      this.sharePanelOpen.set(false);
      this.toastService.show(`${newCards.length} notes added to folder!`, 'success');
    } catch {
      this.toastService.show('That ZIP looks torn...', 'error');
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
        folderId: this.activeFolderId()
      });
      this.sharePanelOpen.set(false);
      this.toastService.show('Sketch added to the pile', 'success');
    } catch {
      this.toastService.show("Couldn't read that file", 'error');
    }
  }
}
