import { SupabaseClient } from '@supabase/supabase-js';
import { DbBoard, DbCard, DbOutboxEntry, LocalDb, txRun } from '../db/local-db';

export function toSbBoard(b: DbBoard, uid: string) {
  const base = { id: b.id, name: b.name, position: b.position, parent_id: b.parentId ?? null,
    created_at: new Date(b.createdAt).toISOString(), updated_at: new Date(b.updatedAt).toISOString(),
    owner_id: uid, deleted: b._deleted === 1 };
  if (b.cameraX != null || b.cameraY != null || b.cameraZoom != null) {
    return { ...base, camera_x: b.cameraX ?? null, camera_y: b.cameraY ?? null, camera_zoom: b.cameraZoom ?? null };
  }
  return base;
}

export function toSbCard(c: DbCard, uid: string) {
  return { id: c.id, board_id: c.boardId, title: c.title, content: c.content,
    tags: c.tags, color: c.color, rotation: c.rotation, stickers: c.stickers,
    is_pinned: c.isPinned === 1, is_minimized: c.isMinimized === 1, position: c.position,
    x: c.x, y: c.y, width: c.width, height: c.height,
    created_at: new Date(c.createdAt).toISOString(), updated_at: new Date(c.updatedAt).toISOString(),
    owner_id: uid, deleted: c._deleted === 1 };
}

export function fromSbBoard(r: Record<string, unknown>): DbBoard {
  return { id: r['id'] as string, name: r['name'] as string, position: r['position'] as string,
    parentId: (r['parent_id'] as string | null) ?? null,
    cameraX: (r['camera_x'] as number | null) ?? null,
    cameraY: (r['camera_y'] as number | null) ?? null,
    cameraZoom: (r['camera_zoom'] as number | null) ?? null,
    createdAt: +new Date(r['created_at'] as string), updatedAt: +new Date(r['updated_at'] as string),
    ownerId: r['owner_id'] as string,
    _rev: 1, _dirty: 0, _deleted: r['deleted'] ? 1 : 0,
    _serverUpdatedAt: +new Date(r['updated_at'] as string) };
}

export function fromSbCard(r: Record<string, unknown>): DbCard {
  return { id: r['id'] as string, boardId: r['board_id'] as string,
    title: r['title'] as string, content: r['content'] as string,
    tags: (r['tags'] as string[]) ?? [], color: r['color'] as string,
    rotation: r['rotation'] as number, stickers: (r['stickers'] as string[]) ?? [],
    isPinned: r['is_pinned'] ? 1 : 0, isMinimized: r['is_minimized'] ? 1 : 0,
    position: r['position'] as string,
    x: (r['x'] as number | null) ?? null, y: (r['y'] as number | null) ?? null,
    width: r['width'] as number | null, height: r['height'] as number | null,
    createdAt: +new Date(r['created_at'] as string), updatedAt: +new Date(r['updated_at'] as string),
    ownerId: r['owner_id'] as string,
    _rev: 1, _dirty: 0, _deleted: r['deleted'] ? 1 : 0,
    _serverUpdatedAt: +new Date(r['updated_at'] as string) };
}

export function dedupeOutbox(entries: DbOutboxEntry[]): Map<string, DbOutboxEntry> {
  const latest = new Map<string, DbOutboxEntry>();
  for (const e of entries) {
    const k = `${e.entity}:${e.entityId}`;
    const prev = latest.get(k);
    if (!prev || (e.op === 'delete' && prev.op !== 'delete') || (e.op === prev.op && e.payloadRev > prev.payloadRev)) {
      latest.set(k, e);
    }
  }
  return latest;
}

export async function fetchAll(
  client: SupabaseClient, table: 'boards' | 'cards', userId: string, cursorIso: string
): Promise<Record<string, unknown>[]> {
  const PAGE = 1000;
  const rows: Record<string, unknown>[] = [];
  let afterTs: string | null = null;
  let afterId = '';
  for (;;) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = client.from(table).select('*').eq('owner_id', userId);
    q = afterTs === null
      ? q.gt('updated_at', cursorIso)
      : q.or(`updated_at.gt.${afterTs},and(updated_at.eq.${afterTs},id.gt.${afterId})`);
    const { data, error } = await q.order('updated_at').order('id').limit(PAGE);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE) break;
    const last = data[data.length - 1];
    afterTs = last['updated_at'] as string;
    afterId = last['id'] as string;
  }
  return rows;
}

export async function uploadEntry(
  entry: DbOutboxEntry, localDb: LocalDb, client: SupabaseClient, userId: string
): Promise<void> {
  const now = Date.now();
  if ((entry.nextAttemptAt ?? 0) > now) return;
  try {
    if (entry.entity === 'board') {
      const row = await localDb.boards.get(entry.entityId);
      if (!row) {
        if (entry.op === 'delete') {
          const { error } = await client.from('boards').update({ deleted: true }).eq('id', entry.entityId);
          if (error) throw error;
        }
        await localDb.outbox.where('entityId').equals(entry.entityId).delete();
        return;
      }
      const { data: upserted, error } = await client.from('boards').upsert(toSbBoard(row, userId)).select('updated_at').single();
      if (error) throw error;
      const serverTs = upserted?.updated_at ? +new Date(upserted.updated_at) : now;
      await txRun(() => localDb.transaction('rw', localDb.boards, localDb.outbox, async () => {
        const staleSeqs = await localDb.outbox.where('entityId').equals(entry.entityId).primaryKeys();
        await Promise.all([
          localDb.boards.update(entry.entityId, { _dirty: 0, _serverUpdatedAt: serverTs }),
          localDb.outbox.bulkDelete(staleSeqs)
        ]);
      }));
    } else {
      const row = await localDb.cards.get(entry.entityId);
      if (!row) {
        if (entry.op === 'delete') {
          const { error } = await client.from('cards').update({ deleted: true }).eq('id', entry.entityId);
          if (error) throw error;
        }
        await localDb.outbox.where('entityId').equals(entry.entityId).delete();
        return;
      }
      const { data: upserted, error } = await client.from('cards').upsert(toSbCard(row, userId)).select('updated_at').single();
      if (error) throw error;
      const serverTs = upserted?.updated_at ? +new Date(upserted.updated_at) : now;
      await txRun(() => localDb.transaction('rw', localDb.cards, localDb.outbox, async () => {
        const staleCardSeqs = await localDb.outbox.where('entityId').equals(entry.entityId).primaryKeys();
        await Promise.all([
          localDb.cards.update(entry.entityId, { _dirty: 0, _serverUpdatedAt: serverTs }),
          localDb.outbox.bulkDelete(staleCardSeqs)
        ]);
      }));
    }
  } catch (e) {
    const attempts = (entry.attempts ?? 0) + 1;
    const backoff = Math.min(2 ** attempts * 1000, 300_000);
    await localDb.outbox.update(entry.seq!, { attempts, nextAttemptAt: now + backoff, lastError: String(e) });
  }
}

export async function upload(localDb: LocalDb, client: SupabaseClient, userId: string): Promise<void> {
  const entries = await localDb.outbox.orderBy('seq').toArray();
  const latest = dedupeOutbox(entries);
  for (const entry of latest.values()) await uploadEntry(entry, localDb, client, userId);
}

export async function pull(
  localDb: LocalDb, client: SupabaseClient, userId: string, onChanged: () => Promise<void>
): Promise<void> {
  const cursorRow = await localDb.meta.get('lastPullCursor');
  const cursor = (cursorRow?.value as number | null) ?? 0;
  const cursorIso = new Date(cursor).toISOString();

  const [serverBoards, serverCards] = await Promise.all([
    fetchAll(client, 'boards', userId, cursorIso),
    fetchAll(client, 'cards', userId, cursorIso),
  ]);

  let newCursor = cursor;
  let changed = false;

  for (const row of serverBoards) {
    const st = +new Date(row['updated_at'] as string);
    const local = await localDb.boards.get(row['id'] as string);
    if (!local) {
      if (!row['deleted']) { await localDb.boards.put(fromSbBoard(row)); changed = true; }
      newCursor = Math.max(newCursor, st);
    } else if (local._dirty === 0 && !local._deleted) {
      await localDb.boards.put({ ...fromSbBoard(row), _rev: local._rev, _dirty: 0 });
      changed = true;
      newCursor = Math.max(newCursor, st);
    }
  }

  for (const row of serverCards) {
    const st = +new Date(row['updated_at'] as string);
    const local = await localDb.cards.get(row['id'] as string);
    if (!local) {
      if (!row['deleted']) { await localDb.cards.put(fromSbCard(row)); changed = true; }
      newCursor = Math.max(newCursor, st);
    } else if (local._dirty === 0 && !local._deleted) {
      await localDb.cards.put({ ...fromSbCard(row), _rev: local._rev, _dirty: 0 });
      changed = true;
      newCursor = Math.max(newCursor, st);
    }
  }

  if (newCursor > cursor) await localDb.meta.put({ key: 'lastPullCursor', value: newCursor });
  if (changed) await onChanged();
}
