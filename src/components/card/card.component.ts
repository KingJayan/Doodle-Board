import { Component, input, Output, EventEmitter, computed, signal, ChangeDetectionStrategy, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card, BoardService } from '../../services/board.service';
import { ToastService } from '../../services/toast.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <!--rot wrapper -->
    <div 
      class="transition-transform duration-300 relative select-none" 
      [style.transform]="rotationStyle()"
      [style.width.px]="card().isMinimized ? 260 : (card().width || 280)"
      [style.height.px]="card().isMinimized ? 'auto' : (card().height || 320)"
      [style.z-index]="isResizing ? 100 : 'auto'"
    >
      
      <!-- resize previeww -->
      @if (isResizing) {
        <div 
          class="absolute top-0 left-0 border-4 border-dashed border-gray-400/50 bg-gray-100/30 rounded-lg z-[100] pointer-events-none flex items-center justify-center"
          [style.width.px]="previewWidth()"
          [style.height.px]="previewHeight()"
        >
          <div class="text-3xl font-bold text-gray-700 bg-white/90 px-6 py-3 rounded-xl shadow-lg marker-font backdrop-blur-sm border-2 border-gray-200">
            {{ previewWidth() | number:'1.0-0' }} x {{ previewHeight() | number:'1.0-0' }}
          </div>
        </div>
      }

      <!--card inner -->
      <div 
        class="group relative p-5 flex flex-col gap-2 h-full min-h-[100px] transition-all duration-300 card-shadow bg-card rounded-sm"
        [class.hover:scale-[1.02]]="!isEditing && !isResizing"
        [class.hover:z-50]="!isEditing && !isResizing"
        [class.animate-scribbleOut]="isDeleting()"
        [style.background-color]="card().color"
      >
        <!--drag handle-->
        <div class="drag-handle absolute top-2 left-2 cursor-grab active:cursor-grabbing z-40 opacity-30 group-hover:opacity-100 transition-opacity p-2 hover:bg-black/5 rounded-full" title="Drag to reorder">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none">
             <circle cx="9" cy="12" r="1"></circle>
             <circle cx="9" cy="5" r="1"></circle>
             <circle cx="9" cy="19" r="1"></circle>
             <circle cx="15" cy="12" r="1"></circle>
             <circle cx="15" cy="5" r="1"></circle>
             <circle cx="15" cy="19" r="1"></circle>
           </svg>
        </div>

        <!-- pin/tape visual -->
        @if (card().isPinned) {
          <div class="absolute -top-5 left-1/2 -translate-x-1/2 text-4xl drop-shadow-md z-30 pointer-events-none">📌</div>
        } @else {
          <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-8 bg-white/40 rotate-1 backdrop-blur-sm shadow-sm pointer-events-none" style="clip-path: polygon(2% 0%, 98% 0%, 100% 100%, 0% 100%)"></div>
        }

        <!-- sttttttttttickerssssssssss -->
        <div class="absolute inset-0 pointer-events-none overflow-hidden z-20">
          @for (sticker of card().stickers; track $index) {
             <div 
              class="absolute text-5xl opacity-90 drop-shadow-md animate-stamp"
              [style.top.px]="($index * 30 + 10) % 150"
              [style.right.px]="($index * 25 + 10) % 150"
              [style.transform]="'rotate(' + (($index * 45) - 20) + 'deg)'"
             >
               {{sticker}}
             </div>
          }
        </div>

        <!-- action controls -->
        <div class="absolute -top-10 -right-6 flex flex-col gap-2 z-[60] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto p-2 hover:opacity-100">
           
           <!--pin, minimize, move -->
           <div class="flex gap-2">
             <button 
              (click)="handlePin($event)"
              class="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center shadow-md hover:bg-yellow-50 hover:scale-110 transition-transform doodle-border text-sm cursor-pointer"
              [title]="card().isPinned ? 'Unpin' : 'Pin'"
            >
              {{ card().isPinned ? '📍' : '📌' }}
            </button>

             <button 
              (click)="toggleMinimize($event)"
              class="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 hover:scale-110 transition-transform doodle-border text-sm cursor-pointer font-bold"
              [title]="card().isMinimized ? 'Expand' : 'Minimize'"
            >
              {{ card().isMinimized ? '⬜' : '_' }}
            </button>

            <div class="relative">
              <button 
                (click)="toggleMoveMenu($event)"
                class="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center shadow-md hover:bg-blue-50 hover:scale-110 transition-transform doodle-border text-sm cursor-pointer"
                title="Move Folder"
              >
                📂
              </button>
              
              @if(showMoveMenu) {
                <div class="absolute top-full right-0 mt-2 bg-white border-2 border-black rounded-lg shadow-xl p-2 w-48 z-[100] flex flex-col gap-1" (click)="$event.stopPropagation()">
                  <div class="text-xs text-gray-500 font-bold px-2 uppercase tracking-wide mb-1">Move to...</div>
                  @for(folder of boardService.folders(); track folder.id) {
                     <button 
                       class="text-left text-sm px-3 py-2 hover:bg-gray-100 rounded-md truncate font-hand font-bold transition-colors"
                       (click)="moveToFolder(folder.id)"
                       [class.bg-blue-50]="folder.id === card().folderId"
                       [class.text-blue-700]="folder.id === card().folderId"
                     >
                       {{ folder.name }}
                     </button>
                  }
                </div>
              }
            </div>
           </div>

           <!--expand, delete -->
           <div class="flex gap-2 justify-end">
             <button 
              (click)="handleExpand($event)"
              class="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center shadow-md hover:bg-blue-50 hover:scale-110 transition-transform doodle-border text-sm cursor-pointer"
              title="Open Editor"
            >
              ↗
            </button>

            <button 
              (click)="handleDelete($event)"
              class="w-9 h-9 bg-white text-red-500 rounded-full flex items-center justify-center shadow-md hover:bg-red-50 hover:scale-110 transition-transform doodle-border cursor-pointer font-bold text-sm"
              title="Delete Note"
            >
              ✕
            </button>
           </div>
        </div>

        <!-- bopttom hover tools -->
        <div class="absolute -bottom-8 left-0 right-0 flex justify-center z-[60] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto" [class.hidden]="card().isMinimized">
           <div class="bg-white/95 backdrop-blur px-3 py-2 rounded-full shadow-lg doodle-border flex gap-4 items-center transform">
              
              <!--colorsssss -->
              <div class="relative group/colors">
                 <button class="w-8 h-8 rounded-full border-2 border-gray-400 shadow-inner hover:scale-110 transition-transform" [style.background-color]="card().color" title="Change Color"></button>
                 
                 <div class="absolute bottom-full left-0 mb-3 p-3 bg-white rounded-xl shadow-xl border-2 border-gray-200 hidden group-hover/colors:flex gap-2 animate-slideUp">
                    @for(c of palette; track c) {
                      <button 
                        (click)="changeColor(c, $event)" 
                        class="w-8 h-8 rounded-full border border-gray-300 hover:scale-125 transition-transform" 
                        [style.background-color]="c"
                      ></button>
                    }
                 </div>
              </div>
              <div class="w-px h-6 bg-gray-300"></div>
              <div class="flex gap-2 text-xl">
                 <button (click)="toggleSticker('⭐', $event)" class="hover:scale-125 transition-transform" title="Star">⭐</button>
                 <button (click)="toggleSticker('✅', $event)" class="hover:scale-125 transition-transform" title="Check">✅</button>
                 <button (click)="toggleSticker('🔥', $event)" class="hover:scale-125 transition-transform" title="Fire">🔥</button>
                 <button (click)="toggleSticker('❓', $event)" class="hover:scale-125 transition-transform" title="Question">❓</button>
              </div>
           </div>
        </div>

        @if (isEditing) {
           <div class="flex flex-col gap-2 h-full z-30 relative" (click)="$event.stopPropagation()">
            <input 
              type="text" 
              [(ngModel)]="editForm.title" 
              class="doodle-input font-bold text-2xl bg-transparent"
              placeholder="Title..."
              autofocus
            />
            <textarea 
              [(ngModel)]="editForm.content" 
              class="doodle-input flex-grow bg-transparent resize-none focus:outline-none custom-scroll text-lg"
              rows="4"
              placeholder="Write something..."
            ></textarea>
            
            <div class="flex justify-end gap-2 mt-2">
              <button (click)="cancelEdit()" class="text-base underline opacity-70 hover:opacity-100 p-2">Cancel</button>
              <button (click)="saveEdit()" class="doodle-btn text-base py-1 px-4 bg-white/50">Done</button>
            </div>
          </div>
        } @else {
          <div (click)="startEdit()" class="cursor-pointer h-full flex flex-col w-full relative z-10">
            <!--title -->
             <div class="flex items-start justify-between gap-2 pr-4">
              <h3 
                class="font-bold text-2xl mb-2 marker-font leading-tight break-words ml-6" 
                [innerHTML]="highlightText(card().title)"
              ></h3>
             </div>

             @if(card().isMinimized) {
               <div class="text-base italic opacity-60 mt-1">Minimized</div>
             } @else {
                <div 
                  class="whitespace-pre-wrap flex-grow leading-relaxed text-lg break-words markdown-content overflow-y-auto pr-2 custom-scroll"
                  [innerHTML]="parsedContent()"
                ></div>
             }
            
            @if (card().tags.length > 0) {
              <div class="mt-auto pt-3 flex flex-wrap gap-2">
                @for (tag of card().tags; track tag) {
                  <span 
                    class="text-xs font-bold px-2 py-1 border border-black/20 rounded-full bg-white/30 hover:bg-white/50 transition-colors"
                    (click)="handleTagClick(tag, $event)"
                  >
                    #{{ tag }}
                  </span>
                }
              </div>
            }
          </div>
        }

        <!-- resize handle -->
        @if (!card().isMinimized && !isEditing) {
          <!--wrapper for largeer click-box -->
          <div 
            class="absolute -bottom-3 -right-3 w-12 h-12 cursor-se-resize z-50 flex items-center justify-center group/resize"
            (mousedown)="startResize($event)"
          >
             <svg viewBox="0 0 10 10" class="w-5 h-5 fill-black/20 group-hover/resize:fill-black/80 transition-colors transform -translate-x-2 -translate-y-2">
               <path d="M 6 10 L 10 10 L 10 6 Z" />
               <path d="M 2 10 L 4 10 L 10 4 L 10 2 Z" />
             </svg>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .card-shadow {
      box-shadow: 2px 4px 6px rgba(0,0,0,0.15);
    }
    :host {
      display: block;
    }
    /* Markdown Styles */
    :host ::ng-deep .markdown-content strong { font-weight: 800; }
    :host ::ng-deep .markdown-content em { font-style: italic; }
    :host ::ng-deep .markdown-content ul { list-style-type: disc; padding-left: 1em; }
    :host ::ng-deep .markdown-content blockquote { 
      border-left: 4px solid rgba(0,0,0,0.2); 
      padding-left: 0.5em; 
      margin-left: 0;
      font-style: italic;
      opacity: 0.8;
    }
    :host ::ng-deep mark { background-color: #fef08a; padding: 0 2px; border-radius: 2px; }
    
    .custom-scroll::-webkit-scrollbar { width: 6px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 4px; }
    
    .animate-scribbleOut {
      animation: scribbleOut 0.5s ease-in-out forwards;
      pointer-events: none;
    }

    .animate-stamp {
      animation: stampIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    @keyframes stampIn {
      from { transform: scale(2); opacity: 0; }
      to { transform: scale(1); opacity: 0.9; }
    }
    
    @keyframes scribbleOut {
      0% { transform: scale(1); }
      20% { transform: scale(1.1) rotate(5deg); }
      40% { transform: scale(0.9) rotate(-5deg); opacity: 0.8; }
      60% { transform: scale(1.05) rotate(2deg); opacity: 0.6; }
      80% { transform: scale(0.5) rotate(-2deg); opacity: 0.3; }
      100% { transform: scale(0) rotate(0); opacity: 0; }
    }
    
    @keyframes slideUp {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-slideUp { animation: slideUp 0.2s ease-out; }
  `]
})
export class CardComponent implements OnDestroy {
  boardService = inject(BoardService);
  toastService = inject(ToastService);

  card = input.required<Card>();
  searchQuery = input<string>('');

  @Output() update = new EventEmitter<Card>();
  @Output() delete = new EventEmitter<string>();
  @Output() expand = new EventEmitter<Card>();
  @Output() tagClick = new EventEmitter<string>();
  @Output() stickerToggle = new EventEmitter<string>(); 
  @Output() pinToggle = new EventEmitter<void>();

  isDeleting = signal(false);
  isEditing = false;
  isResizing = false;
  showMoveMenu = false;
  editForm = { title: '', content: '' };
  
  palette = ['#fff9c4', '#e1bee7', '#c8e6c9', '#bbdefb', '#ffccbc', '#ffffff', '#ffab91'];

  //resize State
  private startX = 0;
  private startY = 0;
  private startWidth = 0;
  private startHeight = 0;
  private resizeListener: any;
  private stopResizeListener: any;
  
  previewWidth = signal(0);
  previewHeight = signal(0);
  rotationStyle = computed(() => `rotate(${this.card().rotation}deg)`);

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  highlightText(text: string): string {
    let safeText = this.escapeHtml(text || '');
    const query = this.searchQuery();
    if (!query) return safeText;
    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return safeText.replace(regex, '<mark>$1</mark>');
    } catch {
      return safeText;
    }
  }

  parsedContent = computed(() => {
    let text = this.card().content || '';
    text = this.escapeHtml(text);
    //md parsing
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/^-\s+(.*)$/gm, '<ul><li>$1</li></ul>');
    text = text.replace(/<\/ul>\s*<ul>/g, '');
    text = text.replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>');
    
    const query = this.searchQuery();
    if (query) {
       try {
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![^<]*>)`, 'gi');
        text = text.replace(regex, '<mark>$1</mark>');
       } catch {}
    }
    return text;
  });

  startEdit() {
    if (this.card().isMinimized) return; 
    this.editForm = {
      title: this.card().title,
      content: this.card().content
    };
    this.isEditing = true;
  }

  saveEdit() {
    const updatedCard: Card = {
      ...this.card(),
      title: this.editForm.title || 'Untitled',
      content: this.editForm.content
    };
    this.update.emit(updatedCard);
    this.isEditing = false;
  }

  cancelEdit() {
    this.isEditing = false;
  }

  handleDelete(event: Event) {
    event.stopPropagation();
    this.toastService.show(
      'Are you sure you want to delete this note?',
      'warning',
      {
        label: 'Yes, Delete',
        callback: () => {
          this.isDeleting.set(true);
          setTimeout(() => {
            this.delete.emit(this.card().id);
          }, 500);
        }
      }
    );
  }

  handleExpand(event: Event) {
    event.stopPropagation();
    this.expand.emit(this.card());
  }

  handleTagClick(tag: string, event: Event) {
    event.stopPropagation();
    this.tagClick.emit(tag);
  }

  changeColor(color: string, event: Event) {
    event.stopPropagation();
    const updated = { ...this.card(), color };
    this.update.emit(updated);
  }

  toggleSticker(emoji: string, event: Event) {
    event.stopPropagation();
    this.stickerToggle.emit(emoji);
  }

  handlePin(event: Event) {
    event.stopPropagation();
    this.pinToggle.emit();
  }

  toggleMinimize(event: Event) {
    event.stopPropagation();
    this.update.emit({ ...this.card(), isMinimized: !this.card().isMinimized });
  }

  toggleMoveMenu(event: Event) {
    event.stopPropagation();
    this.showMoveMenu = !this.showMoveMenu;
  }

  moveToFolder(folderId: string) {
    this.update.emit({ ...this.card(), folderId });
    this.showMoveMenu = false;
    this.toastService.show('Moved note to folder!', 'success');
  }

  // --- Resizing Logic ---
  startResize(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isResizing = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
    
    const currentW = this.card().width || 280;
    const currentH = this.card().height || 320;
    
    this.startWidth = currentW;
    this.startHeight = currentH;
    
    //init preview
    this.previewWidth.set(currentW);
    this.previewHeight.set(currentH);

    this.resizeListener = this.onResize.bind(this);
    this.stopResizeListener = this.stopResize.bind(this);
    window.addEventListener('mousemove', this.resizeListener);
    window.addEventListener('mouseup', this.stopResizeListener);
  }

  onResize(event: MouseEvent) {
    if (!this.isResizing) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    
    const newWidth = Math.max(200, this.startWidth + dx);
    const newHeight = Math.max(150, this.startHeight + dy);

    this.previewWidth.set(newWidth);
    this.previewHeight.set(newHeight);
  }
  
  stopResize(event: MouseEvent) {
    this.isResizing = false;
    window.removeEventListener('mousemove', this.resizeListener);
    window.removeEventListener('mouseup', this.stopResizeListener);

    //commit size
    this.update.emit({
      ...this.card(),
      width: this.previewWidth(),
      height: this.previewHeight()
    });
  }

  ngOnDestroy() {
    if (this.isResizing) {
       window.removeEventListener('mousemove', this.resizeListener);
       window.removeEventListener('mouseup', this.stopResizeListener);
    }
  }
}
