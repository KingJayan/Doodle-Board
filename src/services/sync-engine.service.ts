import { Injectable, effect } from '@angular/core';
import { db, DbBoard, DbCard, DbOutboxEntry } from '../db/local-db';
import { supabase } from './supabase.provider';
import { AuthService } from './auth.service';
import { BoardService } from './board.service';

function toSbBoard(b: DbBoard, uid: string) {
  return { id: b.id, name: b.name, position: b.position,
    created_at: new Date(b.createdAt).toISOString(), updated_at: new Date(b.updatedAt).toISOString(),
    owner_id: uid, deleted: b._deleted === 1 };
}

function toSbCard(c: DbCard, uid: string) {
  return { id: c.id, board_id: c.boardId, title: c.title, content: c.content,
    tags: c.tags, color: c.color, rotation: c.rotation, stickers: c.stickers,
    is_pinned: c.isPinned === 1, is_minimized: c.isMinimized === 1, position: c.position,
    width: c.width, height: c.height,
    created_at: new Date(c.createdAt).toISOString(), updated_at: new Date(c.updatedAt).toISOString(),
    owner_id: uid, deleted: c._deleted === 1 };
}

function fromSbBoard(r: Record<string, unknown>): DbBoard {
  return { id: r['id'] as string, name: r['name'] as string, position: r['position'] as string,
    createdAt: +new Date(r['created_at'] as string), updatedAt: +new Date(r['updated_at'] as string),
    ownerId: r['owner_id'] as string,
    _rev: 1, _dirty: 0, _deleted: r['deleted'] ? 1 : 0,
    _serverUpdatedAt: +new Date(r['updated_at'] as string) };
}

function fromSbCard(r: Record<string, unknown>): DbCard {
  return { id: r['id'] as string, boardId: r['board_id'] as string,
    title: r['title'] as string, content: r['content'] as string,
    tags: (r['tags'] as string[]) ?? [], color: r['color'] as string,
    rotation: r['rotation'] as number, stickers: (r['stickers'] as string[]) ?? [],
    isPinned: r['is_pinned'] ? 1 : 0, isMinimized: r['is_minimized'] ? 1 : 0,
    position: r['position'] as string, width: r['width'] as number | null,
    height: r['height'] as number | null,
    createdAt: +new Date(r['created_at'] as string), updatedAt: +new Date(r['updated_at'] as string),
    ownerId: r['owner_id'] as string,
    _rev: 1, _dirty: 0, _deleted: r['deleted'] ? 1 : 0,
    _serverUpdatedAt: +new Date(r['updated_at'] as string) };
}

@Injectable({ providedIn: 'root' })
export class SyncEngineService {
  private running = false;

  constructor(private auth: AuthService, private boardService: BoardService) {
    if (!supabase) return;
    effect(() => { if (this.auth.authState().userId) this.runCycle(); });
    window.addEventListener('online', () => this.runCycle());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.runCycle(); });
    setInterval(() => this.runCycle(), 60_000);
  }

  async runCycle() {
    const { userId } = this.auth.authState();
    if (!supabase || !userId || this.running) return;
    this.running = true;
    this.boardService.syncStatus.set('Syncing…');
    try {
      await this.upload(userId);
      await this.pull(userId);
      this.boardService.syncStatus.set('Backed up');
    } catch {
      this.boardService.syncStatus.set('Offline');
    } finally {
      this.running = false;
    }
  }

  private async upload(userId: string) {
    const entries = await db.outbox.orderBy('seq').toArray();
    const latest = new Map<string, DbOutboxEntry>();
    for (const e of entries) {
      const k = `${e.entity}:${e.entityId}`;
      if (!latest.has(k) || e.payloadRev > latest.get(k)!.payloadRev) latest.set(k, e);
    }
    for (const entry of latest.values()) await this.uploadEntry(entry, userId);
  }

  private async uploadEntry(entry: DbOutboxEntry, userId: string) {
    const now = Date.now();
    if ((entry.nextAttemptAt ?? 0) > now) return;
    try {
      if (entry.entity === 'board') {
        const row = await db.boards.get(entry.entityId);
        if (!row) { await db.outbox.where('entityId').equals(entry.entityId).delete(); return; }
        const { error } = await supabase!.from('boards').upsert(toSbBoard(row, userId));
        if (error) throw error;
        await db.transaction('rw', db.boards, db.outbox, async () => {
          await db.boards.update(entry.entityId, { _dirty: 0, _serverUpdatedAt: now });
          await db.outbox.where('entityId').equals(entry.entityId).delete();
        });
      } else {
        const row = await db.cards.get(entry.entityId);
        if (!row) { await db.outbox.where('entityId').equals(entry.entityId).delete(); return; }
        const { error } = await supabase!.from('cards').upsert(toSbCard(row, userId));
        if (error) throw error;
        await db.transaction('rw', db.cards, db.outbox, async () => {
          await db.cards.update(entry.entityId, { _dirty: 0, _serverUpdatedAt: now });
          await db.outbox.where('entityId').equals(entry.entityId).delete();
        });
      }
    } catch (e) {
      const attempts = (entry.attempts ?? 0) + 1;
      const backoff = Math.min(2 ** attempts * 1000, 300_000);
      await db.outbox.update(entry.seq!, { attempts, nextAttemptAt: now + backoff, lastError: String(e) });
    }
  }

  private async pull(userId: string) {
    const cursorRow = await db.meta.get('lastPullCursor');
    const cursor = (cursorRow?.value as number | null) ?? 0;
    const cursorIso = new Date(cursor).toISOString();

    const [{ data: sBoards, error: bErr }, { data: sCards, error: cErr }] = await Promise.all([
      supabase!.from('boards').select('*').eq('owner_id', userId).gt('updated_at', cursorIso).order('updated_at'),
      supabase!.from('cards').select('*').eq('owner_id', userId).gt('updated_at', cursorIso).order('updated_at')
    ]);
    if (bErr) throw bErr;
    if (cErr) throw cErr;

    let newCursor = cursor;
    let changed = false;

    for (const sb of (sBoards ?? []) as Record<string, unknown>[]) {
      const st = +new Date(sb['updated_at'] as string);
      const local = await db.boards.get(sb['id'] as string);
      if (!local) {
        if (!sb['deleted']) { await db.boards.put(fromSbBoard(sb)); changed = true; }
      } else if (local._dirty === 0 || st > local.updatedAt) {
        await db.boards.put({ ...fromSbBoard(sb), _rev: local._rev });
        changed = true;
      }
      newCursor = Math.max(newCursor, st);
    }

    for (const sc of (sCards ?? []) as Record<string, unknown>[]) {
      const st = +new Date(sc['updated_at'] as string);
      const local = await db.cards.get(sc['id'] as string);
      if (!local) {
        if (!sc['deleted']) { await db.cards.put(fromSbCard(sc)); changed = true; }
      } else if (local._dirty === 0 || st > local.updatedAt) {
        await db.cards.put({ ...fromSbCard(sc), _rev: local._rev });
        changed = true;
      }
      newCursor = Math.max(newCursor, st);
    }

    if (newCursor > cursor) await db.meta.put({ key: 'lastPullCursor', value: newCursor });
    if (changed) await this.boardService.rehydrate();
  }
}
