import Dexie, { type Table } from 'dexie';

export interface DbBoard {
  id: string;
  name: string;
  position: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  ownerId: string | null;
  _rev: number;
  _dirty: 0 | 1;
  _deleted: 0 | 1;
  _serverUpdatedAt: number | null;
}

export interface DbCard {
  id: string;
  boardId: string;
  title: string;
  content: string;
  tags: string[];
  color: string;
  rotation: number;
  stickers: string[];
  isPinned: 0 | 1;
  isMinimized: 0 | 1;
  position: string;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  createdAt: number;
  updatedAt: number;
  ownerId: string | null;
  _rev: number;
  _dirty: 0 | 1;
  _deleted: 0 | 1;
  _serverUpdatedAt: number | null;
}

export interface DbOutboxEntry {
  seq?: number;
  entity: 'board' | 'card';
  entityId: string;
  op: 'upsert' | 'delete';
  payloadRev: number;
  enqueuedAt: number;
  attempts: number;
  nextAttemptAt: number;
  lastError: string | null;
}

export interface DbMeta {
  key: string;
  value: unknown;
}

class LocalDb extends Dexie {
  boards!: Table<DbBoard>;
  cards!: Table<DbCard>;
  outbox!: Table<DbOutboxEntry>;
  meta!: Table<DbMeta>;

  constructor() {
    super('DoodleBoardDB');
    this.version(1).stores({
      boards: '&id, position, updatedAt, _dirty, _deleted, ownerId',
      cards: '&id, boardId, updatedAt, _dirty, _deleted, isPinned, position, [boardId+position], *tags, ownerId',
      outbox: '++seq, entityId, nextAttemptAt, [entity+entityId]',
      meta: '&key'
    });
    this.version(2).stores({
      boards: '&id, position, updatedAt, _dirty, _deleted, ownerId, parentId'
    });
    this.version(3).stores({});
  }
}

export const db = new LocalDb();
