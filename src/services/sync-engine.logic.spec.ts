import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LocalDb, DbOutboxEntry, DbBoard, DbCard } from '../db/local-db';
import { dedupeOutbox, fetchAll, upload, pull } from './sync-engine.logic';

const ISO = '2024-01-01T00:00:00.000Z';
const TS = +new Date(ISO);

function makeBoard(overrides: Partial<DbBoard> = {}): DbBoard {
  return { id: 'b1', name: 'Board', position: 'a', parentId: null,
    cameraX: null, cameraY: null, cameraZoom: null,
    createdAt: TS, updatedAt: TS, ownerId: 'u1',
    _rev: 1, _dirty: 0, _deleted: 0, _serverUpdatedAt: TS, ...overrides };
}

function makeCard(overrides: Partial<DbCard> = {}): DbCard {
  return { id: 'c1', boardId: 'b1', title: '', content: '', tags: [], color: '#fff',
    rotation: 0, stickers: [], isPinned: 0, isMinimized: 0, position: 'a',
    x: null, y: null, width: null, height: null,
    createdAt: TS, updatedAt: TS, ownerId: 'u1',
    _rev: 1, _dirty: 0, _deleted: 0, _serverUpdatedAt: TS, ...overrides };
}

function makeEntry(overrides: Partial<DbOutboxEntry> = {}): DbOutboxEntry {
  return { entity: 'board', entityId: 'b1', op: 'upsert', payloadRev: 1,
    enqueuedAt: TS, attempts: 0, nextAttemptAt: 0, lastError: null, ...overrides };
}

function makeServerBoard(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 'b1', name: 'Board', position: 'a', parent_id: null,
    created_at: ISO, updated_at: ISO, owner_id: 'u1', deleted: false, ...overrides };
}

function makeServerCard(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 'c1', board_id: 'b1', title: '', content: '', tags: [], color: '#fff',
    rotation: 0, stickers: [], is_pinned: false, is_minimized: false, position: 'a',
    x: null, y: null, width: null, height: null,
    created_at: ISO, updated_at: ISO, owner_id: 'u1', deleted: false, ...overrides };
}

function makeQueryClient(pages: Record<string, unknown>[][]): SupabaseClient {
  let idx = 0;
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gt', 'or', 'order']) b[m] = () => b;
  b['limit'] = async () => ({ data: pages[idx++] ?? [], error: null });
  return { from: () => b } as unknown as SupabaseClient;
}

function makeUpsertClient(updatedAt = ISO): SupabaseClient {
  const upsertResult = { data: { updated_at: updatedAt }, error: null };
  const selectChain = { single: async () => upsertResult };
  const upsertChain = { select: () => selectChain };
  const updateChain = { eq: async () => ({ data: null, error: null }) };
  return {
    from: () => ({
      upsert: () => upsertChain,
      update: () => updateChain,
    }),
  } as unknown as SupabaseClient;
}

function makeDb() {
  return new LocalDb('test-' + crypto.randomUUID());
}

// ─── dedupeOutbox ───────────────────────────────────────────────────────────

describe('dedupeOutbox', () => {
  it('keeps the entry with the highest payloadRev among upserts', () => {
    const entries = [
      makeEntry({ payloadRev: 1 }),
      makeEntry({ payloadRev: 3 }),
      makeEntry({ payloadRev: 2 }),
    ];
    const result = dedupeOutbox(entries);
    expect(result.get('board:b1')!.payloadRev).toBe(3);
  });

  it('delete wins over a higher-payloadRev upsert', () => {
    const entries = [
      makeEntry({ op: 'upsert', payloadRev: 10 }),
      makeEntry({ op: 'delete', payloadRev: 2 }),
    ];
    const result = dedupeOutbox(entries);
    expect(result.get('board:b1')!.op).toBe('delete');
  });

  it('delete does not get replaced by a later upsert', () => {
    const entries = [
      makeEntry({ op: 'delete', payloadRev: 2 }),
      makeEntry({ op: 'upsert', payloadRev: 10 }),
    ];
    const result = dedupeOutbox(entries);
    expect(result.get('board:b1')!.op).toBe('delete');
  });

  it('keeps separate entries for different entities', () => {
    const entries = [
      makeEntry({ entity: 'board', entityId: 'b1', payloadRev: 1 }),
      makeEntry({ entity: 'card', entityId: 'c1', payloadRev: 1 }),
    ];
    const result = dedupeOutbox(entries);
    expect(result.size).toBe(2);
  });
});

// ─── fetchAll ───────────────────────────────────────────────────────────────

describe('fetchAll', () => {
  it('returns all rows from a single page', async () => {
    const rows = [makeServerBoard(), makeServerBoard({ id: 'b2' })];
    const client = makeQueryClient([rows]);
    const result = await fetchAll(client, 'boards', 'u1', ISO);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no rows match', async () => {
    const client = makeQueryClient([[]]);
    const result = await fetchAll(client, 'boards', 'u1', ISO);
    expect(result).toHaveLength(0);
  });

  it('uses seek cursor on page boundary instead of offset', async () => {
    const PAGE = 1000;
    const firstPage = Array.from({ length: PAGE }, (_, i) => makeServerBoard({ id: `id-${i}` }));
    const secondPage = [makeServerBoard({ id: 'id-1000' })];

    const orSpy = vi.fn().mockReturnThis();
    const gtSpy = vi.fn().mockReturnThis();
    let pageIdx = 0;
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order']) b[m] = () => b;
    b['gt'] = (...args: unknown[]) => { gtSpy(...args); return b; };
    b['or'] = (f: string) => { orSpy(f); return b; };
    b['limit'] = async () => ({ data: pageIdx++ === 0 ? firstPage : secondPage, error: null });
    const client = { from: () => b } as unknown as SupabaseClient;

    const result = await fetchAll(client, 'boards', 'u1', '2020-01-01T00:00:00.000Z');

    expect(result).toHaveLength(PAGE + 1);
    expect(gtSpy).toHaveBeenCalledTimes(1);
    expect(orSpy).toHaveBeenCalledTimes(1);
    const orFilter = orSpy.mock.calls[0][0] as string;
    expect(orFilter).toContain(`id.gt.id-${PAGE - 1}`);
  });

  it('propagates supabase errors', async () => {
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gt', 'order']) b[m] = () => b;
    b['limit'] = async () => ({ data: null, error: { message: 'DB error' } });
    const client = { from: () => b } as unknown as SupabaseClient;
    await expect(fetchAll(client, 'boards', 'u1', ISO)).rejects.toThrow();
  });
});

// ─── pull ───────────────────────────────────────────────────────────────────

describe('pull', () => {
  let localDb: LocalDb;

  beforeEach(() => { localDb = makeDb(); });

  it('inserts new non-deleted server rows into local db', async () => {
    const client = makeQueryClient([[makeServerBoard()], []]);
    await pull(localDb, client, 'u1', vi.fn().mockResolvedValue(undefined));
    expect(await localDb.boards.get('b1')).toBeDefined();
  });

  it('skips inserting server rows that are deleted', async () => {
    const client = makeQueryClient([[makeServerBoard({ deleted: true })], []]);
    await pull(localDb, client, 'u1', vi.fn().mockResolvedValue(undefined));
    expect(await localDb.boards.get('b1')).toBeUndefined();
  });

  it('overwrites a clean local row with server update', async () => {
    await localDb.boards.put(makeBoard({ name: 'Old', _dirty: 0, _deleted: 0 }));
    const client = makeQueryClient([[makeServerBoard({ name: 'New' })], []]);
    await pull(localDb, client, 'u1', vi.fn().mockResolvedValue(undefined));
    const local = await localDb.boards.get('b1');
    expect(local!.name).toBe('New');
  });

  it('does not overwrite a dirty local row', async () => {
    await localDb.boards.put(makeBoard({ name: 'LocalEdit', _dirty: 1, _deleted: 0 }));
    const client = makeQueryClient([[makeServerBoard({ name: 'ServerEdit' })], []]);
    await pull(localDb, client, 'u1', vi.fn().mockResolvedValue(undefined));
    const local = await localDb.boards.get('b1');
    expect(local!.name).toBe('LocalEdit');
  });

  it('does not resurrect a soft-deleted local row when server returns it as non-deleted', async () => {
    await localDb.boards.put(makeBoard({ _deleted: 1, _dirty: 0 }));
    const client = makeQueryClient([[makeServerBoard({ deleted: false })], []]);
    await pull(localDb, client, 'u1', vi.fn().mockResolvedValue(undefined));
    const local = await localDb.boards.get('b1');
    expect(local!._deleted).toBe(1);
  });

  it('applies server delete to a clean non-deleted local row', async () => {
    await localDb.boards.put(makeBoard({ _deleted: 0, _dirty: 0 }));
    const client = makeQueryClient([[makeServerBoard({ deleted: true })], []]);
    await pull(localDb, client, 'u1', vi.fn().mockResolvedValue(undefined));
    const local = await localDb.boards.get('b1');
    expect(local!._deleted).toBe(1);
  });

  it('calls onChanged when rows are updated', async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);
    const client = makeQueryClient([[makeServerBoard()], []]);
    await pull(localDb, client, 'u1', onChanged);
    expect(onChanged).toHaveBeenCalledOnce();
  });

  it('does not call onChanged when nothing changes', async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);
    const client = makeQueryClient([[], []]);
    await pull(localDb, client, 'u1', onChanged);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('advances the pull cursor to the max updated_at seen', async () => {
    const later = '2025-06-01T00:00:00.000Z';
    const client = makeQueryClient([[makeServerBoard({ updated_at: later })], []]);
    await pull(localDb, client, 'u1', vi.fn().mockResolvedValue(undefined));
    const cursor = await localDb.meta.get('lastPullCursor');
    expect(cursor!.value).toBe(+new Date(later));
  });

  it('handles cards the same way as boards', async () => {
    await localDb.cards.put(makeCard({ _deleted: 1, _dirty: 0 }));
    const client = makeQueryClient([[], [makeServerCard({ deleted: false })]]);
    await pull(localDb, client, 'u1', vi.fn().mockResolvedValue(undefined));
    const local = await localDb.cards.get('c1');
    expect(local!._deleted).toBe(1);
  });
});

// ─── upload ─────────────────────────────────────────────────────────────────

describe('upload', () => {
  let localDb: LocalDb;

  beforeEach(() => { localDb = makeDb(); });

  it('uploads a dirty board and clears the outbox entry', async () => {
    await localDb.boards.put(makeBoard({ _dirty: 1 }));
    await localDb.outbox.add(makeEntry({ entity: 'board', entityId: 'b1', op: 'upsert', payloadRev: 1 }));
    await upload(localDb, makeUpsertClient(), 'u1');
    expect(await localDb.outbox.count()).toBe(0);
    const board = await localDb.boards.get('b1');
    expect(board!._dirty).toBe(0);
  });

  it('skips entries whose nextAttemptAt is in the future', async () => {
    await localDb.boards.put(makeBoard({ _dirty: 1 }));
    const futureAt = Date.now() + 60_000;
    await localDb.outbox.add(makeEntry({ nextAttemptAt: futureAt }));
    await upload(localDb, makeUpsertClient(), 'u1');
    expect(await localDb.outbox.count()).toBe(1);
  });

  it('dedupes multiple outbox entries keeping highest payloadRev', async () => {
    await localDb.boards.put(makeBoard({ _dirty: 1 }));
    await localDb.outbox.add(makeEntry({ payloadRev: 1 }));
    await localDb.outbox.add(makeEntry({ payloadRev: 3 }));
    await localDb.outbox.add(makeEntry({ payloadRev: 2 }));
    const upsertSpy = vi.fn().mockReturnValue({ select: () => ({ single: async () => ({ data: { updated_at: ISO }, error: null }) }) });
    const client = { from: () => ({ upsert: upsertSpy }) } as unknown as SupabaseClient;
    await upload(localDb, client, 'u1');
    expect(upsertSpy).toHaveBeenCalledTimes(1);
  });

  it('records backoff on upload failure and leaves entry in outbox', async () => {
    await localDb.boards.put(makeBoard({ _dirty: 1 }));
    const entry = makeEntry({ seq: undefined });
    const seq = await localDb.outbox.add(entry);
    const failClient = {
      from: () => ({ upsert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'network error' } }) }) }) }),
    } as unknown as SupabaseClient;
    await upload(localDb, failClient, 'u1');
    const remaining = await localDb.outbox.get(seq as number);
    expect(remaining).toBeDefined();
    expect(remaining!.attempts).toBe(1);
    expect(remaining!.nextAttemptAt).toBeGreaterThan(Date.now());
  });
});
