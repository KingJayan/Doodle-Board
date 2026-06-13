import { Injectable, signal, computed, inject } from '@angular/core';
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(s: string) { return UUID_RE.test(s); }
import { Card, Board, CARD_COLORS, CARD_DEFAULTS, CARD_PALETTE } from '../models/card.model';
import { db, DbBoard, DbCard } from '../db/local-db';
import { AuthService } from './auth.service';
import { ThemeService } from './theme.service';

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
    x: c.x ?? undefined,
    y: c.y ?? undefined,
    width: c.width ?? undefined,
    height: c.height ?? undefined,
    updatedAt: c.updatedAt
  };
}

function dbToBoard(b: DbBoard): Board {
  return {
    id: b.id, name: b.name, position: b.position, parentId: b.parentId ?? null,
    cameraX: b.cameraX ?? null, cameraY: b.cameraY ?? null, cameraZoom: b.cameraZoom ?? null
  };
}

export const MAX_CARDS_PER_BOARD = 20;
export type SyncStatus = 'Saved locally' | 'Syncing…' | 'Backed up' | 'Offline' | 'Sync error';

@Injectable({ providedIn: 'root' })
export class BoardService {
  readonly cards = signal<Card[]>([]);
  readonly boards = signal<Board[]>([]);
  readonly topLevelBoards = computed(() => this.boards().filter(b => !b.parentId));
  readonly trashedCards = signal<Card[]>([]);
  readonly syncStatus = signal<SyncStatus>('Saved locally');
  readonly isHydrating = signal(true);

  private themeService = inject(ThemeService);

  constructor(private auth: AuthService) {
    this.init();
  }

  async rehydrate() {
    const [dbBoards, dbCards, dbTrashed] = await Promise.all([
      db.boards.where('_deleted').equals(0).toArray(),
      db.cards.where('_deleted').equals(0).toArray(),
      db.cards.where('_deleted').equals(1).toArray()
    ]);
    this.boards.set(dbBoards.sort((a, b) => a.position < b.position ? -1 : a.position > b.position ? 1 : 0).map(dbToBoard));
    this.cards.set(dbCards.sort((a, b) => a.position < b.position ? -1 : a.position > b.position ? 1 : 0).map(dbToCard));
    this.trashedCards.set(dbTrashed.sort((a, b) => b.updatedAt - a.updatedAt).map(dbToCard));
  }

  private async init() {
    const migrated = await db.meta.get('migratedFromLocalStorage');
    if (!migrated?.value) await this.migrateFromLocalStorage();
    await this.migrateDefaultBoardId();

    const [dbBoards, dbTrashed] = await Promise.all([
      db.boards.where('_deleted').equals(0).toArray(),
      db.cards.where('_deleted').equals(1).toArray()
    ]);
    const sorted = dbBoards.sort((a, b) => a.position < b.position ? -1 : a.position > b.position ? 1 : 0);
    this.boards.set(sorted.map(dbToBoard));
    this.trashedCards.set(dbTrashed.sort((a, b) => b.updatedAt - a.updatedAt).map(dbToCard));

    const firstId = sorted[0]?.id;
    if (firstId) {
      const activeCards = await db.cards.where('boardId').equals(firstId).filter(c => c._deleted === 0).toArray();
      this.cards.set(activeCards.sort((a, b) => a.position < b.position ? -1 : a.position > b.position ? 1 : 0).map(dbToCard));
    }
    this.isHydrating.set(false);

    if (sorted.length > 1) {
      const loadRest = async () => {
        const otherIds = sorted.slice(1).map(b => b.id);
        const rest = await db.cards.where('boardId').anyOf(otherIds).filter(c => c._deleted === 0).toArray();
        if (rest.length) {
          this.cards.update(current => {
            const seen = new Set(current.map(c => c.id));
            const incoming = rest.filter(c => !seen.has(c.id)).map(dbToCard);
            return incoming.length ? [...current, ...incoming] : current;
          });
        }
      };
      'requestIdleCallback' in window
        ? (window as any).requestIdleCallback(loadRest)
        : setTimeout(loadRest, 0);
    }
  }

  private async migrateDefaultBoardId() {
    const already = await db.meta.get('migratedDefaultBoardId');
    if (already?.value) return;
    const defaultBoard = await db.boards.get('default');
    if (!defaultBoard) {
      await db.meta.put({ key: 'migratedDefaultBoardId', value: true });
      return;
    }
    const newId = crypto.randomUUID();
    const [cardsToUpdate, boardOutbox] = await Promise.all([
      db.cards.where('boardId').equals('default').toArray(),
      db.outbox.where('[entity+entityId]').equals(['board', 'default']).toArray()
    ]);
    await db.transaction('rw', db.boards, db.cards, db.outbox, db.meta, async () => {
      await db.boards.delete('default');
      await db.boards.put({ ...defaultBoard, id: newId });
      await db.cards.bulkPut(cardsToUpdate.map(c => ({ ...c, boardId: newId })));
      for (const e of boardOutbox) await db.outbox.update(e.seq!, { entityId: newId });
      await db.meta.put({ key: 'migratedDefaultBoardId', value: true });
    });
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

    const idMap = new Map(oldBoards.map(b => [b.id, isUUID(b.id) ? b.id : crypto.randomUUID()]));
    const boardPositions = generateNKeysBetween(null, null, oldBoards.length || 1);
    const dbBoards: DbBoard[] = oldBoards.map((f, i) => ({
      id: idMap.get(f.id)!,
      name: f.name,
      position: boardPositions[i],
      parentId: null,
      cameraX: null, cameraY: null, cameraZoom: null,
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
      id: (c.id === '1' || c.id === '2' || !isUUID(c.id)) ? crypto.randomUUID() : c.id,
      boardId: idMap.get(c.boardId ?? c.folderId ?? 'default') ?? idMap.values().next().value!,
      title: c.title ?? '',
      content: c.content ?? '',
      tags: c.tags ?? [],
      color: c.color ?? CARD_PALETTE[0],
      rotation: c.rotation ?? 0,
      stickers: c.stickers ?? [],
      isPinned: (c.isPinned ? 1 : 0) as 0 | 1,
      isMinimized: (c.isMinimized ? 1 : 0) as 0 | 1,
      position: cardPositions[i],
      x: c.x ?? null,
      y: c.y ?? null,
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
    await db.transaction('rw', db.cards, db.outbox, async () => {
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
        x: card.x ?? null,
        y: card.y ?? null,
        width: card.width ?? null,
        height: card.height ?? null,
        createdAt: existing?.createdAt ?? card.updatedAt,
        updatedAt: card.updatedAt,
        ownerId: existing?.ownerId ?? this.auth.authState().userId ?? null,
        _rev: rev,
        _dirty: 1,
        _deleted: 0,
        _serverUpdatedAt: existing?._serverUpdatedAt ?? null
      });
      await db.outbox.add({ entity: 'card', entityId: card.id, op: 'upsert', payloadRev: rev, enqueuedAt: now, attempts: 0, nextAttemptAt: now, lastError: null });
    });
  }

  private async writeBoard(board: Board) {
    const now = Date.now();
    await db.transaction('rw', db.boards, db.outbox, async () => {
      const existing = await db.boards.get(board.id);
      const rev = (existing?._rev ?? 0) + 1;
      await db.boards.put({
        id: board.id,
        name: board.name,
        position: board.position,
        parentId: board.parentId ?? null,
        cameraX: board.cameraX ?? existing?.cameraX ?? null,
        cameraY: board.cameraY ?? existing?.cameraY ?? null,
        cameraZoom: board.cameraZoom ?? existing?.cameraZoom ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        ownerId: existing?.ownerId ?? this.auth.authState().userId ?? null,
        _rev: rev,
        _dirty: 1,
        _deleted: 0,
        _serverUpdatedAt: existing?._serverUpdatedAt ?? null
      });
      await db.outbox.add({ entity: 'board', entityId: board.id, op: 'upsert', payloadRev: rev, enqueuedAt: now, attempts: 0, nextAttemptAt: now, lastError: null });
    });
  }

  async saveCameraForBoard(boardId: string, x: number, y: number, zoom: number) {
    const now = Date.now();
    await db.transaction('rw', db.boards, db.outbox, async () => {
      const existing = await db.boards.get(boardId);
      if (!existing) return;
      const rev = existing._rev + 1;
      await db.boards.update(boardId, { cameraX: x, cameraY: y, cameraZoom: zoom, _dirty: 1, _rev: rev, updatedAt: now });
      await db.outbox.add({ entity: 'board', entityId: boardId, op: 'upsert', payloadRev: rev, enqueuedAt: now, attempts: 0, nextAttemptAt: now, lastError: null });
    });
  }

  private nextFrontPosition(boardId: string): string {
    const sorted = this.cards()
      .filter(c => c.boardId === boardId && c.position)
      .sort((a, b) => (a.position ?? '') < (b.position ?? '') ? -1 : (a.position ?? '') > (b.position ?? '') ? 1 : 0);
    return generateKeyBetween(null, sorted[0]?.position ?? null);
  }

  addBoard(name: string, parentId?: string | null): string {
    const id = crypto.randomUUID();
    const siblings = parentId
      ? this.boards().filter(b => b.parentId === parentId)
      : this.boards().filter(b => !b.parentId);
    const sorted = [...siblings].sort((a, b) => a.position < b.position ? -1 : a.position > b.position ? 1 : 0);
    const lastPos = sorted.length > 0 ? sorted[sorted.length - 1].position : null;
    const pos = generateKeyBetween(lastPos, null);
    const newBoard: Board = { id, name, position: pos, parentId: parentId ?? null };
    this.boards.update(b => [...b, newBoard]);
    this.writeBoard(newBoard);
    return id;
  }

  moveBoardToParent(boardId: string, parentId: string | null) {
    this.boards.update(b => b.map(x => x.id === boardId ? { ...x, parentId } : x));
    const board = this.boards().find(b => b.id === boardId);
    if (board) this.writeBoard(board);
  }

  async deleteBoard(boardId: string) {
    const fallback = this.boards().find(b => b.id !== boardId);
    if (!fallback) return;
    const now = Date.now();
    const children = this.boards().filter(b => b.parentId === boardId);
    if (children.length) {
      this.boards.update(b => b.map(x => x.parentId === boardId ? { ...x, parentId: null } : x));
      children.forEach(child => this.writeBoard({ ...child, parentId: null }));
    }
    const toMove = this.cards().filter(c => c.boardId === boardId).map(c => ({ ...c, boardId: fallback.id, updatedAt: now }));
    this.cards.update(cards =>
      cards.map(c => c.boardId === boardId ? { ...c, boardId: fallback.id, updatedAt: now } : c)
    );
    this.boards.update(b => b.filter(x => x.id !== boardId));
    toMove.forEach(c => this.writeCard(c));
    await db.transaction('rw', db.boards, db.outbox, async () => {
      const existing = await db.boards.get(boardId);
      if (!existing) return;
      const rev = existing._rev + 1;
      await db.boards.put({ ...existing, _deleted: 1, _dirty: 1, _rev: rev, updatedAt: now });
      await db.outbox.add({ entity: 'board', entityId: boardId, op: 'delete', payloadRev: rev, enqueuedAt: now, attempts: 0, nextAttemptAt: now, lastError: null });
    });
  }

  renameBoard(id: string, name: string) {
    this.boards.update(b => b.map(x => x.id === id ? { ...x, name } : x));
    const board = this.boards().find(b => b.id === id);
    if (board) this.writeBoard(board);
  }

  private scatterPos(boardId: string): { x: number; y: number } {
    const boardCards = this.cards().filter(c => c.boardId === boardId);
    const cols = Math.ceil(Math.sqrt(boardCards.length + 1));
    const idx = boardCards.length;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      x: 32 + col * (CARD_DEFAULTS.width + 32) + Math.round(Math.random() * 16 - 8),
      y: 32 + row * (CARD_DEFAULTS.height + 32) + Math.round(Math.random() * 16 - 8)
    };
  }

  private boardCardCount(boardId: string): number {
    return this.cards().filter(c => c.boardId === boardId).length;
  }

  addCard(cardData: Partial<Card> & { title: string; content: string; tags: string[] }): string | false {
    const boardId = cardData.boardId ?? this.boards()[0]?.id;
    if (!boardId || this.boardCardCount(boardId) >= MAX_CARDS_PER_BOARD) return false;
    const pos = this.nextFrontPosition(boardId);
    const { x, y } = cardData.x !== undefined && cardData.y !== undefined
      ? { x: cardData.x, y: cardData.y }
      : this.scatterPos(boardId);
    const newCard: Card = {
      id: cardData.id ?? crypto.randomUUID(),
      boardId,
      title: cardData.title,
      content: cardData.content,
      tags: cardData.tags,
      color: cardData.color ?? CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
      rotation: cardData.rotation !== undefined ? cardData.rotation : (() => {
        const { min, max } = this.themeService.effectiveRotRange();
        return Math.random() * (max - min) + min;
      })(),
      stickers: cardData.stickers ?? [],
      isPinned: cardData.isPinned ?? false,
      position: pos,
      x,
      y,
      updatedAt: cardData.updatedAt ?? Date.now(),
      width: cardData.width ?? CARD_DEFAULTS.width,
      height: cardData.height ?? CARD_DEFAULTS.height
    };
    this.cards.update(cards => [newCard, ...cards]);
    this.writeCard(newCard);
    this.auth.triggerAnonymousSignIn();
    return newCard.id;
  }

  moveCard(id: string, x: number, y: number) {
    const card = this.cards().find(c => c.id === id);
    if (!card) return;
    const updated = { ...card, x, y, updatedAt: Date.now() };
    this.cards.update(cards => cards.map(c => c.id === id ? updated : c));
    this.writeCard(updated);
  }

  updateCard(updatedCard: Card) {
    const now = Date.now();
    const card = { ...updatedCard, updatedAt: now };
    this.cards.update(cards => cards.map(c => c.id === card.id ? card : c));
    this.writeCard(card);
  }

  async deleteCard(id: string) {
    const card = this.cards().find(c => c.id === id);
    if (!card) return;
    const now = Date.now();
    this.cards.update(cards => cards.filter(c => c.id !== id));
    this.trashedCards.update(t => [{ ...card, updatedAt: now }, ...t]);
    await db.transaction('rw', db.cards, db.outbox, async () => {
      const existing = await db.cards.get(id);
      if (!existing) return;
      const rev = existing._rev + 1;
      await db.cards.put({ ...existing, _deleted: 1, _dirty: 1, _rev: rev, updatedAt: now });
      await db.outbox.add({ entity: 'card', entityId: id, op: 'delete', payloadRev: rev, enqueuedAt: now, attempts: 0, nextAttemptAt: now, lastError: null });
    });
  }

  restoreCard(id: string) {
    const card = this.trashedCards().find(c => c.id === id);
    if (!card) return;
    const boards = this.boards();
    const targetBoardId = boards.find(b => b.id === card.boardId)?.id ?? boards[0]?.id;
    if (!targetBoardId) return;
    const now = Date.now();
    const restored = { ...card, boardId: targetBoardId, updatedAt: now };
    this.trashedCards.update(t => t.filter(c => c.id !== id));
    this.cards.update(cards => [restored, ...cards]);
    this.writeCard(restored);
  }

  permanentlyDeleteCard(id: string) {
    this.trashedCards.update(t => t.filter(c => c.id !== id));
    db.cards.delete(id);
  }

  emptyTrash() {
    const ids = this.trashedCards().map(c => c.id);
    this.trashedCards.set([]);
    if (ids.length) db.cards.bulkDelete(ids);
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
        ((a.position ?? '') < (b.position ?? '') ? -1 : (a.position ?? '') > (b.position ?? '') ? 1 : 0)
      );
    const withoutMoved = boardCards.filter(c => c.id !== movedId);
    const targetIdx = withoutMoved.findIndex(c => c.id === targetId);
    if (targetIdx === -1) return;
    const prev = withoutMoved[targetIdx - 1];
    const next = withoutMoved[targetIdx];
    const newPos = generateKeyBetween(prev?.position ?? null, next?.position ?? null);
    const targetPinned = withoutMoved[targetIdx]?.isPinned ?? prev?.isPinned ?? moved.isPinned;
    const updated = { ...moved, position: newPos, isPinned: targetPinned };
    this.cards.update(cards => cards.map(c => c.id === movedId ? updated : c));
    this.writeCard(updated);
  }

  duplicateCard(card: Card): boolean {
    if (this.boardCardCount(card.boardId) >= MAX_CARDS_PER_BOARD) return false;
    const boardCards = this.cards()
      .filter(c => c.boardId === card.boardId && c.position)
      .sort((a, b) => (a.position ?? '') < (b.position ?? '') ? -1 : (a.position ?? '') > (b.position ?? '') ? 1 : 0);
    const idx = boardCards.findIndex(c => c.id === card.id);
    const next = boardCards[idx + 1];
    const pos = generateKeyBetween(card.position ?? null, next?.position ?? null);
    const copy: Card = { ...card, id: crypto.randomUUID(), position: pos, x: (card.x ?? 32) + 24, y: (card.y ?? 32) + 24, isPinned: false, updatedAt: Date.now() };
    this.cards.update(cs => [...cs, copy]);
    this.writeCard(copy);
    return true;
  }

  bulkMoveCards(ids: Set<string>, boardId: string) {
    const now = Date.now();
    const updated: Card[] = [];
    this.cards.update(cards => cards.map(c => {
      if (!ids.has(c.id)) return c;
      const moved = { ...c, boardId, updatedAt: now };
      updated.push(moved);
      return moved;
    }));
    updated.forEach(c => this.writeCard(c));
  }

  importCardsIntoBoard(newCards: Omit<Card, 'position'>[], boardId: string) {
    const available = MAX_CARDS_PER_BOARD - this.boardCardCount(boardId);
    if (available <= 0) return;
    const toImport = newCards.slice(0, available);
    const now = Date.now();
    const boardCards = this.cards().filter(c => c.boardId === boardId);
    const lastPos = boardCards.length > 0
      ? [...boardCards].sort((a, b) => (a.position ?? '') < (b.position ?? '') ? -1 : (a.position ?? '') > (b.position ?? '') ? 1 : 0).pop()?.position ?? null
      : null;
    const positions = generateNKeysBetween(lastPos, null, toImport.length);
    const migrated: Card[] = toImport.map((c, i) => ({
      ...c,
      id: crypto.randomUUID(),
      boardId,
      position: positions[i],
      stickers: c.stickers ?? [],
      isPinned: c.isPinned ?? false,
      updatedAt: c.updatedAt ?? now,
      rotation: Math.max(-15, Math.min(15, c.rotation ?? 0)),
      width: c.width != null ? Math.max(CARD_DEFAULTS.minWidth, Math.min(800, c.width)) : undefined,
      height: c.height != null ? Math.max(CARD_DEFAULTS.minHeight, Math.min(800, c.height)) : undefined,
      x: undefined,
      y: undefined,
    }));
    this.cards.update(current => [...current, ...migrated]);
    migrated.forEach(c => this.writeCard(c));
    this.auth.triggerAnonymousSignIn();
  }
}
