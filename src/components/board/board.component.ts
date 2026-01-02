import { Component, inject, signal, computed, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BoardService, Card, Folder } from '../../services/board.service';
import { CardComponent } from '../card/card.component';
import { AiService } from '../../services/ai.service';
import { ToastService } from '../../services/toast.service';
import { ThemeService } from '../../services/theme.service';
import JSZip from 'jszip';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  template: `
    <div class="min-h-screen flex flex-col relative overflow-hidden">
      
      <!-- bg effects -->
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

      <!-- hero + toolbar -->
      <header class="sticky top-0 z-40 bg-[var(--paper-color)]/95 backdrop-blur-sm border-b-2 border-[var(--ink-color)] shadow-sm p-4 transition-all">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
          
          <div class="flex items-center gap-2 cursor-pointer group" (click)="goHome.emit()">
             <!-- sidebar toggle for mobile -->
             <button class="md:hidden text-2xl mr-2" (click)="sidebarOpen.set(!sidebarOpen())">☰</button>

            <span class="text-3xl marker-font text-[#ff6b6b] -rotate-2 group-hover:rotate-0 transition-transform">DoodleBoard</span>
            <span class="text-sm bg-black text-white px-2 rounded-full transform rotate-3">Beta</span>
          </div>

          <!--controls -->
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

            <!-- status for saving -->
            <div class="text-xs font-mono opacity-60 w-16 text-center hidden md:block">
              {{ boardService.saveStatus() }}
            </div>

            <!-- tag filtering -->
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

          <!-- actions -->
          <div class="flex gap-2">
             <button (click)="helpPanelOpen.set(true)" class="doodle-btn px-3 text-lg" title="Help">❓</button>
             <button (click)="settingsPanelOpen.set(true)" class="doodle-btn px-2 text-xl" title="Settings">
              ⚙️
            </button>
             <button (click)="sharePanelOpen.set(true)" class="doodle-btn text-base" title="Backup & Share">
              📤 Share
            </button>
            <button (click)="aiPanelOpen.set(!aiPanelOpen())" class="doodle-btn bg-[#e1f5fe] text-black text-base" title="Ask the Genie">
              ✨ Genie
            </button>
            <button (click)="createNewCard()" class="doodle-btn bg-[#c8e6c9] text-black font-bold text-base">
              + New Note
            </button>
          </div>
        </div>
      </header>

      <div class="flex flex-grow relative max-w-7xl mx-auto w-full">
        
        <!--sidebar (Folders) -->
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
        <!--sidebar overlayu -->
        @if (sidebarOpen()) {
          <div class="fixed inset-0 bg-black/20 z-20 md:hidden" (click)="sidebarOpen.set(false)"></div>
        }

        <!-- ai genie -->
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
                >
                  {{ isGenerating() ? '...' : 'Go!' }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- main grid -->
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
                  (update)="handleUpdateCard($event)"
                  (delete)="handleDeleteCard($event)"
                  (expand)="openEditor($event)"
                  (tagClick)="activeTag.set($event)"
                  (stickerToggle)="handleSticker($event, card)"
                  (pinToggle)="handlePin(card)"
                ></app-card>
              </div>
            }
          </div>
        </main>

      </div>

      <!--editor -->
      @if (editingCard()) {
        <div class="fixed inset-0 z-[100] flex items-start justify-center p-0 md:p-8 bg-gray-900/50 backdrop-blur-sm animate-fadeIn overflow-y-auto" (click)="closeEditor()">
          <div 
            class="bg-white w-full md:max-w-4xl min-h-[90vh] md:min-h-[1100px] shadow-2xl flex flex-col relative animate-slideUp border border-gray-300 mt-0 md:mt-4 mb-20" 
            (click)="$event.stopPropagation()"
          >
            <!--file menu Bar -->
            <div class="bg-gray-100 p-2 border-b border-gray-300 flex items-center gap-4 text-sm text-gray-700 select-none">
              <span class="font-bold text-gray-900 px-2">File</span>
              <button (click)="saveEditor()" class="hover:bg-gray-200 px-2 rounded">Save</button>
              <button (click)="downloadMd()" class="hover:bg-gray-200 px-2 rounded">Download .md</button>
              <button (click)="closeEditor()" class="hover:bg-red-100 text-red-600 px-2 rounded ml-auto">Close ✕</button>
            </div>

            <!--toolbar -->
            <div class="p-3 bg-white border-b border-gray-200 flex gap-2 flex-wrap items-center shadow-sm sticky top-0 z-10 text-gray-800">
               <div class="flex gap-1 border-r pr-2 border-gray-300">
                 <button (click)="applyFormat('h1')" class="w-8 h-8 rounded hover:bg-gray-100 font-bold text-lg" title="Title">H1</button>
                 <button (click)="applyFormat('h2')" class="w-8 h-8 rounded hover:bg-gray-100 font-bold" title="Subtitle">H2</button>
               </div>
               
               <div class="flex gap-1 border-r pr-2 border-gray-300">
                 <button (click)="applyFormat('bold')" class="w-8 h-8 rounded hover:bg-gray-100 font-bold" title="Bold">B</button>
                 <button (click)="applyFormat('italic')" class="w-8 h-8 rounded hover:bg-gray-100 italic" title="Italic">I</button>
                 <button (click)="applyFormat('code')" class="w-8 h-8 rounded hover:bg-gray-100 font-mono text-xs" title="Code"><></button>
               </div>

               <div class="flex gap-1 border-r pr-2 border-gray-300">
                 <button (click)="applyFormat('list')" class="w-8 h-8 rounded hover:bg-gray-100" title="Bullet List">• List</button>
                 <button (click)="applyFormat('quote')" class="w-8 h-8 rounded hover:bg-gray-100" title="Quote">“</button>
                 <button (click)="applyFormat('hr')" class="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center" title="Divider">
                   <div class="h-px w-4 bg-gray-500"></div>
                 </button>
               </div>
               
               <!--ai polishing -->
               <div class="flex gap-1 items-center">
                 <button 
                  (click)="polishContent('fix')" 
                  class="flex items-center gap-1 px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold"
                  [disabled]="isPolishing()"
                 >
                   ✨ Fix Grammar
                 </button>
                 <button 
                  (click)="polishContent('expand')" 
                  class="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold"
                  [disabled]="isPolishing()"
                 >
                   📝 Expand
                 </button>
               </div>

               <div class="ml-auto text-xs text-gray-400 hidden sm:block">
                  Markdown Enabled
               </div>
            </div>

            <!--doc content -->
            <div class="flex-grow p-8 md:p-16 flex flex-col gap-6 relative">
              @if (isPolishing()) {
                <div class="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center flex-col">
                  <div class="text-4xl animate-bounce">✏️</div>
                  <div class="font-bold text-gray-500 mt-2">Genie is polishing your draft...</div>
                </div>
              }

              <input 
                [(ngModel)]="editorForm.title" 
                class="text-4xl md:text-5xl font-bold bg-transparent outline-none w-full marker-font placeholder-gray-300 border-none p-0 text-gray-900" 
                placeholder="Untitled Scribble"
              >
              <textarea 
                #editorTextarea
                [(ngModel)]="editorForm.content"
                class="w-full flex-grow bg-transparent resize-none outline-none text-lg md:text-xl leading-relaxed font-hand text-gray-800"
                placeholder="Start writing..."
                style="min-height: 600px;"
              ></textarea>
            </div>

            <!-- tags footer -->
            <div class="p-8 border-t border-gray-100 bg-gray-50 text-sm text-gray-600">
               <div class="flex items-center gap-2">
                 <span>🏷️ Tags:</span>
                 <input 
                   [(ngModel)]="editorForm.tags" 
                   class="bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none w-full max-w-sm px-2 py-1 text-gray-800"
                   placeholder="Add tags separated by commas..."
                 >
               </div>
            </div>
          </div>
        </div>
      }

      <!-- settings modal -->
      @if (settingsPanelOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="settingsPanelOpen.set(false)">
           <div class="bg-[var(--paper-color)] p-8 rounded-lg max-w-md w-full m-4 shadow-xl doodle-border relative text-[var(--ink-color)]" (click)="$event.stopPropagation()">
              <button (click)="settingsPanelOpen.set(false)" class="absolute top-4 right-4 text-2xl hover:text-red-500">×</button>
              
              <h2 class="text-3xl marker-font mb-6 text-center">Settings</h2>
              
              <div class="flex flex-col gap-6">
                <!-- theme section -->
                <div>
                  <h3 class="font-bold mb-3 text-lg border-b border-[var(--ink-color)] pb-1">Theme</h3>
                  <div class="flex flex-col gap-2">
                    <button 
                      (click)="themeService.setTheme('paper')" 
                      class="flex items-center gap-3 p-3 rounded border border-gray-300 hover:bg-gray-100 transition-colors bg-[#fdfbf7] text-gray-900"
                    >
                      <div class="w-6 h-6 rounded-full border border-black bg-[#fdfbf7]"></div>
                      <span>Classic Paper</span>
                      @if(themeService.currentTheme() === 'paper') { <span class="ml-auto">✅</span> }
                    </button>
                    
                    <button 
                      (click)="themeService.setTheme('chalkboard')" 
                      class="flex items-center gap-3 p-3 rounded border border-gray-600 hover:bg-gray-700 transition-colors bg-[#2b3035] text-white"
                    >
                      <div class="w-6 h-6 rounded-full border border-white bg-[#2b3035]"></div>
                      <span>Chalkboard (Dark)</span>
                      @if(themeService.currentTheme() === 'chalkboard') { <span class="ml-auto">✅</span> }
                    </button>

                    <button 
                      (click)="themeService.setTheme('blueprint')" 
                      class="flex items-center gap-3 p-3 rounded border border-blue-300 hover:bg-blue-800 transition-colors bg-[#1e408a] text-white"
                    >
                      <div class="w-6 h-6 rounded-full border border-white bg-[#1e408a]"></div>
                      <span>Blueprint</span>
                      @if(themeService.currentTheme() === 'blueprint') { <span class="ml-auto">✅</span> }
                    </button>
                  </div>
                </div>

                <!--access section -->
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

      <!--help m,odal -->
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
                    <p>Use the sidebar to create folders. Drag notes between folders (feature coming soon) or just keep them organized here.</p>
                  </div>
                </div>

                <div class="flex gap-4 items-start">
                  <div class="text-4xl">✨</div>
                  <div>
                    <h3 class="font-bold text-xl">Genie Powers</h3>
                    <p>Use the <strong>Genie</strong> button to brainstorm topics. Inside the editor, use the <strong>Magic Pencil</strong> to fix grammar!</p>
                  </div>
                </div>
              </div>

              <div class="mt-8 text-center">
                <button (click)="helpPanelOpen.set(false)" class="doodle-btn bg-yellow-200 text-black font-bold">Got it!</button>
              </div>
           </div>
        </div>
      }

      <!--share / import modal -->
      @if (sharePanelOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="sharePanelOpen.set(false)">
           <div class="bg-white p-8 rounded-lg max-w-lg w-full m-4 shadow-xl doodle-border relative text-gray-900" (click)="$event.stopPropagation()">
              <button (click)="sharePanelOpen.set(false)" class="absolute top-4 right-4 text-2xl hover:text-red-500">×</button>
              
              <h2 class="text-3xl marker-font mb-6 text-center text-black">Share & Backup</h2>
              <div class="text-center text-sm text-gray-500 mb-4">Current Folder: {{ getCurrentFolderName() }}</div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!--import not (single) -->
                <div class="bg-green-50 p-4 rounded-lg border border-green-200 md:col-span-2">
                  <h3 class="font-bold mb-2 text-black">📄 Import Sketch</h3>
                  <p class="text-xs text-gray-600 mb-2">Upload a single <code>.md</code> file.</p>
                  <input 
                    type="file" 
                    accept=".md,.txt" 
                    (change)="importSingleFile($event)" 
                    class="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                  />
                </div>

                <!-- export folder (ZIP) -->
                <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h3 class="font-bold mb-2 text-black">📦 Export Folder</h3>
                  <p class="text-xs text-gray-600 mb-3">Download {{ getCurrentFolderName() }} (.zip).</p>
                  <button (click)="exportBoard()" class="doodle-btn w-full bg-yellow-200 text-black text-sm font-bold hover:bg-yellow-300">
                    Download .zip
                  </button>
                </div>

                <!-- import folder (ZIP) -->
                <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 class="font-bold mb-2 text-black">📂 Import to Folder</h3>
                  <p class="text-xs text-gray-600 mb-3">Add zip content to current folder.</p>
                  <input 
                    type="file" 
                    accept=".zip" 
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
    .font-hand {
      font-family: 'Patrick Hand', cursive;
    }
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
    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animate-slideUp {
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class BoardComponent implements OnInit {
  boardService = inject(BoardService);
  aiService = inject(AiService);
  toastService = inject(ToastService);
  themeService = inject(ThemeService);
  
  @Output() goHome = new EventEmitter<void>();

  searchQuery = signal('');
  activeTag = signal<string | null>(null);
  activeFolderId = signal<string>('default');
  
  // panels
  aiPanelOpen = signal(false);
  sharePanelOpen = signal(false);
  settingsPanelOpen = signal(false);
  helpPanelOpen = signal(false);
  sidebarOpen = signal(true);
  
  isGenerating = signal(false);
  isPolishing = signal(false);

  editingCard = signal<Card | null>(null);
  editorForm = { title: '', content: '', tags: '' };
  
  doodles: { x: number, y: number, rot: number, scale: number, path: string }[] = [];

  draggedCardId: string | null = null;

  ngOnInit() {
    this.generateBackgroundDoodles();
    if (window.innerWidth < 768) {
      this.sidebarOpen.set(false);
    }
  }

  generateBackgroundDoodles() {
    const paths = [
      'M10 10 Q 50 90 90 10', //smile
      'M10 50 Q 50 10 90 50 T 170 50', //squiggle
      'M50 10 L 60 40 L 90 50 L 60 60 L 50 90 L 40 60 L 10 50 L 40 40 Z', //star
      'M20 20 L 80 80 M 80 20 L 20 80', //X
      'M50 50 m -40 0 a 40 40 0 1 0 80 0 a 40 40 0 1 0 -80 0', //circle
      'M10 90 L 50 10 L 90 90 Z', //tri
      'M10 50 C 20 20, 80 20, 90 50' //arc
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
    const cards = this.boardService.cards();
    const query = this.searchQuery().toLowerCase();
    const tag = this.activeTag();
    const folder = this.activeFolderId();

    const filtered = cards.filter(card => {
      if (card.folderId !== folder) return false;

      const matchesSearch = 
        card.title.toLowerCase().includes(query) || 
        card.content.toLowerCase().includes(query) ||
        card.tags.some(t => t.toLowerCase().includes(query));
      
      const matchesTag = tag ? card.tags.includes(tag) : true;

      return matchesSearch && matchesTag;
    });

    return filtered.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
    });
  });

  getCurrentFolderName() {
    return this.boardService.folders().find(f => f.id === this.activeFolderId())?.name || 'Folder';
  }

  createFolder(name: string) {
    if (!name.trim()) return;
    const id = this.boardService.addFolder(name);
    this.activeFolderId.set(id);
    this.toastService.show(`Created folder "${name}"`, 'success');
  }

  deleteFolder(id: string, event: Event) {
    event.stopPropagation();
    if(confirm('Delete folder? Notes will move to General.')) {
      this.boardService.deleteFolder(id);
      if (this.activeFolderId() === id) this.activeFolderId.set('default');
      this.toastService.show('Folder deleted', 'info');
    }
  }

  createNewCard() {
    const colors = ['#fff9c4', '#e1bee7', '#c8e6c9', '#bbdefb', '#ffccbc'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    this.boardService.addCard({
      title: '',
      content: '',
      tags: [],
      color: randomColor,
      folderId: this.activeFolderId()
    });
    this.toastService.show('Fresh paper extracted!', 'success');
  }

  async generateCard(topic: string) {
    if (this.isGenerating()) return;
    this.isGenerating.set(true);

    try {
      const result = await this.aiService.brainstormCard(topic);
      const colors = ['#e1bee7', '#b2dfdb', '#ffecb3']; 
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      await this.boardService.addCard({
        title: result.title,
        content: result.content,
        tags: result.tags,
        color: randomColor,
        folderId: this.activeFolderId()
      });
      this.aiPanelOpen.set(false);
      this.toastService.show('Genie granted your wish! ✨', 'success');
    } catch (e) {
      this.toastService.show('Genie is confused...', 'error');
    } finally {
      this.isGenerating.set(false);
    }
  }

  handleUpdateCard(card: Card) {
    this.boardService.updateCard(card);
  }

  handleDeleteCard(id: string) {
    this.boardService.deleteCard(id);
    this.toastService.show('Crumpled and tossed!', 'info');
  }

  handleSticker(sticker: string, card: Card) {
    this.boardService.toggleSticker(card.id, sticker);
  }

  handlePin(card: Card) {
    this.boardService.togglePin(card.id);
  }

  // drag + drop
  handleDragStart(cardId: string, event: DragEvent) {
    const target = event.target as HTMLElement;
    const path = event.composedPath();
    const isHandle = path.some((el: any) => el.classList && el.classList.contains('drag-handle'));
    
    if (!isHandle) {
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
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  handleDrop(targetCardId: string, event: DragEvent) {
    event.preventDefault();
    const movedId = this.draggedCardId;
    if (movedId && movedId !== targetCardId) {
      this.boardService.reorderCard(movedId, targetCardId);
    }
    this.draggedCardId = null;
  }

//io share logic
  private createMarkdownContent(card: Card): string {
    const frontmatter = {
      id: card.id,
      title: card.title,
      tags: card.tags,
      color: card.color,
      rotation: card.rotation,
      stickers: card.stickers,
      isPinned: card.isPinned,
      updatedAt: card.updatedAt
    };
    const yaml = yamlDump(frontmatter);
    return `---\n${yaml}---\n\n${card.content}`;
  }

  private parseMarkdownContent(text: string): Partial<Card> & { content: string } {
    if (text.startsWith('---')) {
      const end = text.indexOf('---', 3);
      if (end !== -1) {
        const yaml = text.substring(3, end);
        const content = text.substring(end + 3).trim();
        try {
          const frontmatter = yamlLoad(yaml) as Partial<Card>;
          return { ...frontmatter, content };
        } catch (e) {
          console.warn('Failed to parse frontmatter', e);
        }
      }
    }
    return { title: 'Imported Note', content: text, tags: [] };
  }

  async exportBoard() {
    try {
      const zip = new JSZip();
      const cards = this.filteredCards();

      cards.forEach(card => {
        const filename = `${card.title.replace(/[^a-z0-9]/gi, '_') || 'untitled'}-${card.id.substring(0,4)}.md`;
        const content = this.createMarkdownContent(card);
        zip.file(filename, content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doodleboard-${this.getCurrentFolderName()}-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.toastService.show('Folder packed up! 📦', 'success');
    } catch (e) {
      this.toastService.show('Failed to pack board', 'error');
    }
  }

  async importBoard(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    
    try {
      const zip = await JSZip.loadAsync(file);
      const newCards: Card[] = [];

      const promises: Promise<void>[] = [];
      zip.forEach((relativePath: string, zipEntry: any) => {
          if (!zipEntry.dir && (relativePath.endsWith('.md') || relativePath.endsWith('.txt'))) {
            promises.push(zipEntry.async("string").then((text: string) => {
              const parsed = this.parseMarkdownContent(text);
              newCards.push({
                  id: Math.random().toString(36).substring(2,9),
                  folderId: this.activeFolderId(),
                  title: parsed.title || 'Untitled',
                  content: parsed.content || '',
                  tags: parsed.tags || [],
                  color: parsed.color || '#fff9c4',
                  rotation: parsed.rotation || (Math.random() * 6 - 3),
                  stickers: parsed.stickers || [],
                  isPinned: parsed.isPinned || false,
                  updatedAt: parsed.updatedAt || Date.now()
              });
            }));
          }
      });

      await Promise.all(promises);
      this.boardService.importCardsIntoFolder(newCards, this.activeFolderId());
      this.sharePanelOpen.set(false);
      this.toastService.show(`${newCards.length} notes added to folder!`, 'success');
    } catch (err) {
      this.toastService.show('That ZIP looks torn...', 'error');
      console.error(err);
    }
  }

  async importSingleFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = this.parseMarkdownContent(text);
      
      if (!parsed.title || parsed.title === 'Imported Note') {
        parsed.title = file.name.replace(/\.[^/.]+$/, "");
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
    };
    reader.onerror = () => {
      this.toastService.show('Couldn\'t read that file', 'error');
    };
    reader.readAsText(file);
  }

  //editor logic
  openEditor(card: Card) {
    this.editingCard.set(card);
    this.editorForm = {
      title: card.title,
      content: card.content,
      tags: card.tags.join(', ')
    };
  }

  hasUnsavedChanges(): boolean {
    const card = this.editingCard();
    if (!card) return false;

    // Normalize tags for comparison
    const formTags = this.editorForm.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .join(',');
      
    const originalTags = card.tags.join(',');

    return (
      this.editorForm.title !== card.title ||
      this.editorForm.content !== card.content ||
      formTags !== originalTags
    );
  }

  closeEditor() {
    if (this.hasUnsavedChanges()) {
      if (!confirm('Wait! You have unsaved scribbles. Close anyway?')) {
        return;
      }
    }
    this.editingCard.set(null);
  }

  saveEditor() {
    if (this.editingCard()) {
      const updatedTags = this.editorForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const updatedCard = {
        ...this.editingCard()!,
        title: this.editorForm.title,
        content: this.editorForm.content,
        tags: updatedTags
      };

      this.boardService.updateCard(updatedCard);
      this.editingCard.set(updatedCard);

      this.boardService.saveStatus.set('Saved!');
      this.toastService.show('Saved successfully', 'success');
      setTimeout(() => this.boardService.saveStatus.set('Saved'), 2000);
    }
  }

  async polishContent(mode: 'fix' | 'expand' | 'tone') {
    if (this.isPolishing()) return;
    if (!this.editorForm.content) {
      this.toastService.show('Write something first!', 'info');
      return;
    }

    this.isPolishing.set(true);
    try {
      const result = await this.aiService.polishText(this.editorForm.content, mode);
      this.editorForm.content = result;
      this.toastService.show('Pencil magic complete! ✨', 'success');
    } catch (e) {
      this.toastService.show('Genie broke the pencil...', 'error');
    } finally {
      this.isPolishing.set(false);
    }
  }

  downloadMd() {
    if (!this.editingCard()) return;
    
    const tempCard: Card = {
      ...this.editingCard()!,
      title: this.editorForm.title,
      content: this.editorForm.content,
      tags: this.editorForm.tags.split(',').map(t => t.trim()).filter(t => t)
    };

    const content = this.createMarkdownContent(tempCard);
    const blob = new Blob([content], {type: 'text/markdown'});
    const url = URL.createObjectURL(blob);
    
    const element = document.createElement('a');
    element.href = url;
    element.download = (this.editorForm.title || 'scribble').replace(/[^a-z0-9]/gi, '_') + '.md';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
    this.toastService.show('Downloaded file', 'info');
  }

  applyFormat(type: string) {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    let before = text.substring(0, start);
    let after = text.substring(end);
    let newText = text;

    if (type === 'bold') newText = `${before}**${selected || 'bold'}**${after}`;
    else if (type === 'italic') newText = `${before}*${selected || 'italic'}*${after}`;
    else if (type === 'code') newText = `${before}\`${selected || 'code'}\`${after}`;
    else if (type === 'quote') newText = `${before}> ${selected || 'Quote'}${after}`;
    else if (type === 'h1') newText = `${before}# ${selected || 'Heading'}${after}`;
    else if (type === 'h2') newText = `${before}## ${selected || 'Heading'}${after}`;
    else if (type === 'hr') newText = `${before}\n---\n${after}`;
    else if (type === 'list') {
       const prefix = before.endsWith('\n') || before === '' ? '- ' : '\n- ';
       newText = `${before}${prefix}${selected}${after}`;
    }

    this.editorForm.content = newText;
    setTimeout(() => textarea.focus(), 0);
  }
}
