import { Injectable, signal } from '@angular/core';
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';
import { Card, Board, CARD_COLORS, CARD_DEFAULTS, CARD_PALETTE } from '../models/card.model';
import { db, DbBoard, DbCard } from '../db/local-db';
import { AuthService } from './auth.service';

function dbToCard(c: DbCard): Card {
  return {
    id: c.id,
    boardId: c.boardId,
    title: c.title,
    content: c.content,
    tags: c.tags,
    color: c.color,
    rotation: c.rotation,
    stickers: c.stickers,
    isPinned: c.isPinned === 1,
    isMinimized: c.isMinimized === 1,
    position: c.position,
    width: c.width ?? undefined,
    height: c.height ?? undefined,
    updatedAt: c.updatedAt
  };
}

function dbToBoard(b: DbBoard): Board {
  return { id: b.id, name: b.name, position: b.position };
}

@Injectable({ providedIn: 'root' })
export class BoardService {
  readonly cards = signal<Card[]>([]);
  readonly boards = signal<Board[]>([]);
  readonly syncStatus = signal<string>('Saved locally');

  constructor(private auth: AuthService) {
    this.init();
  }

  async rehydrate() {
    const [dbBoards, dbCards] = await Promise.all([
      db.boards.where('_deleted').equals(0).toArray(),
      db.cards.where('_deleted').equals(0).toArray()
    ]);
    this.boards.set(dbBoards.sort((a, b) => a.position.localeCompare(b.position)).map(dbToBoard));
    this.cards.set(dbCards.sort((a, b) => a.position.localeCompare(b.position)).map(dbToCard));
  }

  private async init() {
    const migrated = await db.meta.get('migratedFromLocalStorage');
    if (!migrated?.value) await this.migrateFromLocalStorage();
    const [dbBoards, dbCards] = await Promise.all([
      db.boards.where('_deleted').equals(0).toArray(),
      db.cards.where('_deleted').equals(0).toArray()
    ]);
    this.boards.set(dbBoards.sort((a, b) => a.position.localeCompare(b.position)).map(dbToBoard));
    this.cards.set(dbCards.sort((a, b) => a.position.localeCompare(b.position)).map(dbToCard));
  }

  private async migrateFromLocalStorage() {
    const now = Date.now();
    let oldBoards: { id: string; name: string }[];
    let oldCards: any[];
    try {
      oldBoards = JSON.parse(localStorage.getItem('doodle_board_folders') ?? 'null') ?? [{ id: 'default', name: 'General' }];
      if (!oldBoards.length) oldBoards = [{ id: 'default', name: 'General' }];
    } catch {
      oldBoards = [{ id: 'default', name: 'General' }];
    }
    try {
      oldCards = JSON.parse(localStorage.getItem('doodle_board_data') ?? 'null') ?? [];
    } catch {
      oldCards = [];
    }

    const boardPositions = generateNKeysBetween(null, null, oldBoards.length || 1);
    const dbBoards: DbBoard[] = oldBoards.map((f, i) => ({
      id: f.id,
      name: f.name,
      position: boardPositions[i],
      createdAt: now,
      updatedAt: now,
      ownerId: null,
      _rev: 1,
      _dirty: 1,
      _deleted: 0,
      _serverUpdatedAt: null
    }));

    if (oldCards.length === 0) {
      oldCards = [
        { id: crypto.randomUUID(), boardId: 'default', title: 'Welcome!', content: 'This is your new doodle board. Click me to edit!', tags: ['intro', 'welcome'], color: CARD_PALETTE[0], rotation: -2, stickers: ['⭐'], isPinned: true, updatedAt: now },
        { id: crypto.randomUUID(), boardId: 'default', title: 'Ideas', content: 'Use the expand button (↗) to open the full editor!', tags: ['ideas'], color: CARD_PALETTE[2], rotation: 1, stickers: [], isPinned: false, updatedAt: now }
      ];
    }

    const cardPositions = generateNKeysBetween(null, null, oldCards.length);
    const dbCards: DbCard[] = oldCards.map((c: any, i: number) => ({
      id: (c.id === '1' || c.id === '2') ? crypto.randomUUID() : c.id,
      boardId: c.boardId ?? c.folderId ?? 'default',
      title: c.title ?? '',
      content: c.content ?? '',
      tags: c.tags ?? [],
      color: c.color ?? CARD_PALETTE[0],
      rotation: c.rotation ?? 0,
      stickers: c.stickers ?? [],
      isPinned: (c.isPinned ? 1 : 0) as 0 | 1,
      isMinimized: (c.isMinimized ? 1 : 0) as 0 | 1,
      position: cardPositions[i],
      width: c.width ?? CARD_DEFAULTS.width,
      height: c.height ?? CARD_DEFAULTS.height,
      createdAt: c.updatedAt ?? now,
      updatedAt: c.updatedAt ?? now,
      ownerId: null,
      _rev: 1,
      _dirty: 1,
      _deleted: 0,
      _serverUpdatedAt: null
    }));

    await db.transaction('rw', db.boards, db.cards, db.meta, async () => {
      await db.boards.bulkPut(dbBoards);
      await db.cards.bulkPut(dbCards);
      await db.meta.put({ key: 'migratedFromLocalStorage', value: true });
    });
  }

  private async writeCard(card: Card, position?: string) {
    const now = Date.now();
    const existing = await db.cards.get(card.id);
    const pos = position ?? card.position ?? existing?.position ?? this.nextFrontPosition(card.boardId);
    const rev = (existing?._rev ?? 0) + 1;
    await db.cards.put({
      id: card.id,
      boardId: card.boardId,
      title: card.title,
      content: card.content,
      tags: card.tags,
      color: card.color,
      rotation: card.rotation,
      stickers: card.stickers,
      isPinned: card.isPinned ? 1 : 0,
      isMinimized: card.isMinimized ? 1 : 0,
      position: pos,
      width: card.width ?? null,
      height: card.height ?? null,
      createdAt: existing?.createdAt ?? card.updatedAt,
      updatedAt: card.updatedAt,
      ownerId: existing?.ownerId ?? null,
      _rev: rev,
      _dirty: 1,
      _deleted: 0,
      _serverUpdatedAt: existing?._serverUpdatedAt ?? null
    });
    await db.outbox.add({ entity: 'card', entityId: card.id, op: 'upsert', payloadRev: rev, enqueuedAt: now, attempts: 0, nextAttemptAt: now, lastError: null });
  }

  private async writeBoard(board: Board) {
    const now = Date.now();
    const existing = await db.boards.get(board.id);
    const rev = (existing?._rev ?? 0) + 1;
    await db.boards.put({
      id: board.id,
      name: board.name,
      position: board.position,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ownerId: existing?.ownerId ?? null,
      _rev: rev,
      _dirty: 1,
      _deleted: 0,
      _serverUpdatedAt: existing?._serverUpdatedAt ?? null
    });
    await db.outbox.add({ entity: 'board', entityId: board.id, op: 'upsert', payloadRev: rev, enqueuedAt: now, attempts: 0, nextAttemptAt: now, lastError: null });
  }

  private nextFrontPosition(boardId: string): string {
    const sorted = this.cards()
      .filter(c => c.boardId === boardId && c.position)
      .sort((a, b) => (a.position ?? '').localeCompare(b.position ?? ''));
    return generateKeyBetween(null, sorted[0]?.position ?? null);
  }

  addBoard(name: string): string {
    const id = crypto.randomUUID();
    const boards = this.boards();
    const lastPos = boards.length > 0 ? boards[boards.length - 1].position : null;
    const pos = generateKeyBetween(lastPos, null);
    const newBoard: Board = { id, name, position: pos };
    this.boards.update(b => [...b, newBoard]);
    this.writeBoard(newBoard);
    return id;
  }

  deleteBoard(boardId: string) {
    if (boardId === 'default') return;
    const now = Date.now();
    const toMove = this.cards().filter(c => c.boardId === boardId).map(c => ({ ...c, boardId: 'default', updatedAt: now }));
    this.cards.update(cards =>
      cards.map(c => c.boardId === boardId ? { ...c, boardId: 'default', updatedAt: now } : c)
    );
    this.boards.update(b => b.filter(x => x.id !== boardId));
    toMove.forEach(c => this.writeCard(c));
    db.boards.get(boardId).then(existing => {
      if (existing) {
        const rev = existing._rev + 1;
        db.boards.put({ ...existing, _deleted: 1, _dirty: 1, _rev: rev, updatedAt: now });
        db.outbox.add({ entity: 'board', entityId: boardId, op: 'delete', payloadRev: rev, enqueuedAt: now, attempts: 0, nextAttemptAt: now, lastError: null });
      }
    });
  }

  renameBoard(id: string, name: string) {
    this.boards.update(b => b.map(x => x.id === id ? { ...x, name } : x));
    const board = this.boards().find(b => b.id === id);
    if (board) this.writeBoard(board);
  }

  addCard(cardData: Partial<Card> & { title: string; content: string; tags: string[] }) {
    const boardId = cardData.boardId ?? 'default';
    const pos = this.nextFrontPosition(boardId);
    const newCard: Card = {
      id: cardData.id ?? crypto.randomUUID(),
      boardId,
      title: cardData.title,
      content: cardData.content,
      tags: cardData.tags,
      color: cardData.color ?? CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
      rotation: cardData.rotation !== undefined ? cardData.rotation : Math.random() * 6 - 3,
      stickers: cardData.stickers ?? [],
      isPinned: cardData.isPinned ?? false,
      position: pos,
      updatedAt: cardData.updatedAt ?? Date.now(),
      width: cardData.width ?? CARD_DEFAULTS.width,
      height: cardData.height ?? CARD_DEFAULTS.height
    };
    this.cards.update(cards => [newCard, ...cards]);
    this.writeCard(newCard);
    this.auth.triggerAnonymousSignIn();
  }

  updateCard(updatedCard: Card) {
    const now = Date.now();
    const card = { ...updatedCard, updatedAt: now };
    this.cards.update(cards => cards.map(c => c.id === card.id ? card : c));
    this.writeCard(card);
  }

  deleteCard(id: string) {
    const now = Date.now();
    this.cards.update(cards => cards.filter(c => c.id !== id));
    db.cards.get(id).then(existing => {
      if (!existing) return;
      const rev = existing._rev + 1;
      db.cards.put({ ...existing, _deleted: 1, _dirty: 1, _rev: rev, updatedAt: now });
      db.outbox.add({ entity: 'card', entityId: id, op: 'delete', payloadRev: rev, enqueuedAt: now, attempts: 0, nextAttemptAt: now, lastError: null });
    });
  }

  toggleSticker(cardId: string, sticker: string) {
    const card = this.cards().find(c => c.id === cardId);
    if (!card) return;
    const stickers = card.stickers.includes(sticker)
      ? card.stickers.filter(s => s !== sticker)
      : [...card.stickers, sticker];
    const updated = { ...card, stickers, updatedAt: Date.now() };
    this.cards.update(cards => cards.map(c => c.id === cardId ? updated : c));
    this.writeCard(updated);
  }

  togglePin(cardId: string) {
    const card = this.cards().find(c => c.id === cardId);
    if (!card) return;
    const updated = { ...card, isPinned: !card.isPinned, updatedAt: Date.now() };
    this.cards.update(cards => cards.map(c => c.id === cardId ? updated : c));
    this.writeCard(updated);
  }

  reorderCard(movedId: string, targetId: string) {
    const moved = this.cards().find(c => c.id === movedId);
    if (!moved) return;
    const boardCards = this.cards()
      .filter(c => c.boardId === moved.boardId)
      .sort((a, b) =>
        (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) ||
        (a.position ?? '').localeCompare(b.position ?? '')
      );
    const withoutMoved = boardCards.filter(c => c.id !== movedId);
    const targetIdx = withoutMoved.findIndex(c => c.id === targetId);
    if (targetIdx === -1) return;
    const prev = withoutMoved[targetIdx - 1];
    const next = withoutMoved[targetIdx];
    const newPos = generateKeyBetween(prev?.position ?? null, next?.position ?? null);
    const updated = { ...moved, position: newPos };
    this.cards.update(cards => cards.map(c => c.id === movedId ? updated : c));
    this.writeCard(updated);
  }

  importCardsIntoBoard(newCards: Omit<Card, 'position'>[], boardId: string) {
    const now = Date.now();
    const boardCards = this.cards().filter(c => c.boardId === boardId);
    const lastPos = boardCards.length > 0
      ? [...boardCards].sort((a, b) => (a.position ?? '').localeCompare(b.position ?? '')).pop()?.position ?? null
      : null;
    const positions = generateNKeysBetween(lastPos, null, newCards.length);
    const migrated: Card[] = newCards.map((c, i) => ({
      ...c,
      boardId,
      position: positions[i],
      stickers: c.stickers ?? [],
      isPinned: c.isPinned ?? false,
      updatedAt: c.updatedAt ?? now
    }));
    this.cards.update(current => [...current, ...migrated]);
    migrated.forEach(c => this.writeCard(c));
  }
}
