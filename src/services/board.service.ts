import { Injectable, signal } from '@angular/core';
import { Card, Folder, CARD_COLORS } from '../models/card.model';

@Injectable({ providedIn: 'root' })
export class BoardService {
  private readonly STORAGE_KEY = 'doodle_board_data';
  private readonly FOLDERS_KEY = 'doodle_board_folders';

  readonly cards = signal<Card[]>([]);
  readonly folders = signal<Folder[]>([]);
  readonly saveStatus = signal<string>('Saved');
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData() {
    const storedFolders = localStorage.getItem(this.FOLDERS_KEY);
    if (storedFolders) {
      try {
        this.folders.set(JSON.parse(storedFolders));
      } catch {
        this.folders.set([{ id: 'default', name: 'General' }]);
      }
    } else {
      this.folders.set([{ id: 'default', name: 'General' }]);
    }

    const storedCards = localStorage.getItem(this.STORAGE_KEY);
    if (storedCards) {
      try {
        const parsed = JSON.parse(storedCards);
        this.cards.set(parsed.map((c: Card) => ({
          ...c,
          stickers: c.stickers ?? [],
          folderId: c.folderId ?? 'default',
          isPinned: c.isPinned ?? false
        })));
      } catch {
        this.seedData();
      }
    } else {
      this.seedData();
    }
  }

  private seedData() {
    this.cards.set([
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
    ]);
    this.saveToStorage();
  }

  private saveToStorage() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveStatus.set('Saving...');
    this.saveTimer = setTimeout(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cards()));
      localStorage.setItem(this.FOLDERS_KEY, JSON.stringify(this.folders()));
      this.saveStatus.set('Saved');
      this.saveTimer = null;
    }, 500);
  }

  // Folder actions

  addFolder(name: string): string {
    const newFolder: Folder = { id: crypto.randomUUID(), name };
    this.folders.update(f => [...f, newFolder]);
    this.saveToStorage();
    return newFolder.id;
  }

  deleteFolder(folderId: string) {
    if (folderId === 'default') return;
    this.cards.update(cards =>
      cards.map(c => c.folderId === folderId ? { ...c, folderId: 'default' } : c)
    );
    this.folders.update(f => f.filter(x => x.id !== folderId));
    this.saveToStorage();
  }

  renameFolder(id: string, name: string) {
    this.folders.update(f => f.map(x => x.id === id ? { ...x, name } : x));
    this.saveToStorage();
  }

  // Card actions

  addCard(cardData: Partial<Card> & { title: string; content: string; tags: string[] }) {
    const randomColor = CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];
    const newCard: Card = {
      id: cardData.id ?? crypto.randomUUID(),
      folderId: cardData.folderId ?? 'default',
      title: cardData.title,
      content: cardData.content,
      tags: cardData.tags,
      color: cardData.color ?? randomColor,
      rotation: cardData.rotation !== undefined ? cardData.rotation : Math.random() * 6 - 3,
      stickers: cardData.stickers ?? [],
      isPinned: cardData.isPinned ?? false,
      updatedAt: cardData.updatedAt ?? Date.now(),
      width: cardData.width ?? 280,
      height: cardData.height ?? 320
    };
    this.cards.update(cards => [newCard, ...cards]);
    this.saveToStorage();
  }

  updateCard(updatedCard: Card) {
    this.cards.update(cards =>
      cards.map(c => c.id === updatedCard.id ? { ...updatedCard, updatedAt: Date.now() } : c)
    );
    this.saveToStorage();
  }

  deleteCard(id: string) {
    this.cards.update(cards => cards.filter(c => c.id !== id));
    this.saveToStorage();
  }

  toggleSticker(cardId: string, sticker: string) {
    this.cards.update(cards =>
      cards.map(c => {
        if (c.id !== cardId) return c;
        const stickers = c.stickers.includes(sticker)
          ? c.stickers.filter(s => s !== sticker)
          : [...c.stickers, sticker];
        return { ...c, stickers, updatedAt: Date.now() };
      })
    );
    this.saveToStorage();
  }

  togglePin(cardId: string) {
    this.cards.update(cards =>
      cards.map(c => c.id === cardId ? { ...c, isPinned: !c.isPinned } : c)
    );
    this.saveToStorage();
  }

  reorderCard(movedId: string, targetId: string) {
    const all = [...this.cards()];
    const from = all.findIndex(c => c.id === movedId);
    const to = all.findIndex(c => c.id === targetId);
    if (from === -1 || to === -1 || from === to) return;
    const [card] = all.splice(from, 1);
    all.splice(to, 0, card);
    this.cards.set(all);
    this.saveToStorage();
  }

  importCardsIntoFolder(newCards: Card[], folderId: string) {
    const migrated = newCards.map(c => ({
      ...c,
      folderId,
      stickers: c.stickers ?? [],
      isPinned: c.isPinned ?? false
    }));
    this.cards.update(current => [...current, ...migrated]);
    this.saveToStorage();
  }
}
