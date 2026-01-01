
import { Injectable, signal, computed } from '@angular/core';

export interface Folder {
  id: string;
  name: string;
}

export interface Card {
  id: string;
  folderId: string;
  title: string;
  content: string;
  tags: string[];
  color: string;
  rotation: number;
  stickers: string[];
  isPinned: boolean;
  updatedAt: number;
  width?: number;
  height?: number;
  isMinimized?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BoardService {
  private readonly STORAGE_KEY = 'doodle_board_data';
  private readonly FOLDERS_KEY = 'doodle_board_folders';
  
  private cardsSignal = signal<Card[]>([]);
  private foldersSignal = signal<Folder[]>([]);
  
  readonly cards = computed(() => this.cardsSignal());
  readonly folders = computed(() => this.foldersSignal());
  
  readonly saveStatus = signal<string>('Saved');
  
  constructor() {
    this.loadInitialData();
  }

  private loadInitialData() {
    const storedFolders = localStorage.getItem(this.FOLDERS_KEY);
    if (storedFolders) {
      try {
        this.foldersSignal.set(JSON.parse(storedFolders));
      } catch (e) {
        this.foldersSignal.set([{ id: 'default', name: 'General' }]);
      }
    } else {
      this.foldersSignal.set([{ id: 'default', name: 'General' }]);
    }

    const storedCards = localStorage.getItem(this.STORAGE_KEY);
    if (storedCards) {
      try {
        const parsed = JSON.parse(storedCards);
        const migrated = parsed.map((c: any) => ({ 
          ...c, 
          stickers: c.stickers || [],
          folderId: c.folderId || 'default',
          isPinned: c.isPinned || false,
          // Defaults for existing cards if needed, though optional properties work fine
        }));
        this.cardsSignal.set(migrated);
      } catch (e) {
        console.error('Failed to parse stored data', e);
        this.seedData();
      }
    } else {
      this.seedData();
    }
  }

  private seedData() {
    const seeds: Card[] = [
      {
        id: '1',
        folderId: 'default',
        title: 'Welcome!',
        content: 'This is your new doodle board. Click me to edit!',
        tags: ['intro', 'welcome'],
        color: '#ffeb3b',
        rotation: -2,
        stickers: ['⭐'],
        isPinned: true,
        updatedAt: Date.now()
      },
      {
        id: '2',
        folderId: 'default',
        title: 'Ideas 💡',
        content: 'Use the expand button (↗) to open the full editor!',
        tags: ['ideas'],
        color: '#b2dfdb',
        rotation: 1,
        stickers: [],
        isPinned: false,
        updatedAt: Date.now()
      }
    ];
    this.cardsSignal.set(seeds);
    this.saveToStorage();
  }

  private saveToStorage() {
    this.saveStatus.set('Saving...');
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cardsSignal()));
    localStorage.setItem(this.FOLDERS_KEY, JSON.stringify(this.foldersSignal()));
    setTimeout(() => this.saveStatus.set('Saved'), 800);
  }

//folder actions
  addFolder(name: string) {
    const newFolder: Folder = {
      id: Math.random().toString(36).substring(2, 9),
      name
    };
    this.foldersSignal.update(f => [...f, newFolder]);
    this.saveToStorage();
    return newFolder.id;
  }

  deleteFolder(folderId: string) {
    if (folderId === 'default') return;
    
    this.cardsSignal.update(cards => 
      cards.map(c => c.folderId === folderId ? { ...c, folderId: 'default' } : c)
    );
    
    this.foldersSignal.update(f => f.filter(x => x.id !== folderId));
    this.saveToStorage();
  }

  renameFolder(id: string, name: string) {
    this.foldersSignal.update(f => f.map(x => x.id === id ? { ...x, name } : x));
    this.saveToStorage();
  }

// card actions

  async addCard(cardData: Partial<Card> & { title: string, content: string, tags: string[] }): Promise<void> {
    const colors = ['#fff9c4', '#e1bee7', '#c8e6c9', '#bbdefb', '#ffccbc'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newCard: Card = {
      id: cardData.id || Math.random().toString(36).substring(2, 9),
      folderId: cardData.folderId || 'default',
      title: cardData.title,
      content: cardData.content,
      tags: cardData.tags,
      color: cardData.color || randomColor,
      rotation: cardData.rotation !== undefined ? cardData.rotation : (Math.random() * 6 - 3),
      stickers: cardData.stickers || [],
      isPinned: cardData.isPinned || false,
      updatedAt: cardData.updatedAt || Date.now(),
      width: 280, // Default width
      height: 320 // Default height
    };
    //add to top of list
    this.cardsSignal.update(cards => [newCard, ...cards]);
    this.saveToStorage();
  }

  async updateCard(updatedCard: Card): Promise<void> {
    this.cardsSignal.update(cards => 
      cards.map(c => c.id === updatedCard.id ? { ...updatedCard, updatedAt: Date.now() } : c)
    );
    this.saveToStorage();
  }

  async deleteCard(id: string): Promise<void> {
    this.cardsSignal.update(cards => cards.filter(c => c.id !== id));
    this.saveToStorage();
  }

  async toggleSticker(cardId: string, sticker: string): Promise<void> {
    this.cardsSignal.update(cards => 
      cards.map(c => {
        if (c.id === cardId) {
          const hasSticker = c.stickers.includes(sticker);
          const newStickers = hasSticker 
            ? c.stickers.filter(s => s !== sticker) 
            : [...c.stickers, sticker];
          return { ...c, stickers: newStickers, updatedAt: Date.now() };
        }
        return c;
      })
    );
    this.saveToStorage();
  }

  togglePin(cardId: string) {
    this.cardsSignal.update(cards => 
      cards.map(c => c.id === cardId ? { ...c, isPinned: !c.isPinned } : c)
    );
    this.saveToStorage();
  }

  reorderCard(movedCardId: string, targetCardId: string) {
    const allCards = this.cardsSignal();
    const movedIndex = allCards.findIndex(c => c.id === movedCardId);
    const targetIndex = allCards.findIndex(c => c.id === targetCardId);

    if (movedIndex === -1 || targetIndex === -1 || movedIndex === targetIndex) return;

    const [movedCard] = allCards.splice(movedIndex, 1);
    allCards.splice(targetIndex, 0, movedCard);

    this.cardsSignal.set([...allCards]);
    this.saveToStorage();
  }

  importData(cards: Card[]) {
    const migrated = cards.map(c => ({ 
      ...c, 
      stickers: c.stickers || [], 
      folderId: c.folderId || 'default',
      isPinned: c.isPinned || false
    }));

    this.cardsSignal.set(migrated);
    this.saveToStorage();
  }
  
  importCardsIntoFolder(newCards: Card[], folderId: string) {
      const migrated = newCards.map(c => ({
          ...c,
          folderId: folderId,
          stickers: c.stickers || [],
          isPinned: c.isPinned || false
      }));
      this.cardsSignal.update(current => [...current, ...migrated]);
      this.saveToStorage();
  }
}
