import { Injectable } from '@angular/core';
import { supabase } from './supabase.provider';
import { AuthService } from './auth.service';
import { Card } from '../models/card.model';

export interface ShareInfo {
  token: string;
  createdAt: string;
}

export interface SharedPayload {
  boardName: string;
  cards: Card[];
}

const SHARE_TTL_DAYS = 30;

@Injectable({ providedIn: 'root' })
export class ShareService {
  constructor(private auth: AuthService) {}

  async createShare(boardId: string, boardName: string, cards: Card[]): Promise<string | null> {
    if (!supabase) return null;
    const { userId } = this.auth.authState();
    if (!userId) return null;

    const payload: SharedPayload = { boardName, cards };
    const expiresAt = new Date(Date.now() + SHARE_TTL_DAYS * 86_400_000).toISOString();

    const { data: snapshot, error: snapshotErr } = await supabase
      .from('board_snapshots')
      .insert({ board_id: boardId, owner_id: userId, payload })
      .select('id').single();
    if (snapshotErr || !snapshot) return null;

    const { data: share, error: shareErr } = await supabase
      .from('shares')
      .insert({ board_id: boardId, owner_id: userId, snapshot_id: snapshot.id, expires_at: expiresAt })
      .select('token').single();
    if (shareErr || !share) return null;

    return `${window.location.origin}/s/${share.token}`;
  }

  async revokeShare(token: string): Promise<void> {
    if (!supabase) return;
    const userId = this.auth.authState().userId;
    if (!userId) return;

    const { data: share } = await supabase
      .from('shares').select('snapshot_id')
      .eq('token', token).eq('owner_id', userId)
      .single();

    if (share?.snapshot_id) {
      await supabase.from('board_snapshots').delete()
        .eq('id', share.snapshot_id).eq('owner_id', userId);
    } else {
      await supabase.from('shares')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token', token).eq('owner_id', userId);
    }
  }

  async listShares(boardId: string): Promise<ShareInfo[]> {
    if (!supabase) return [];
    const { userId } = this.auth.authState();
    if (!userId) return [];
    const { data } = await supabase.from('shares')
      .select('token, created_at')
      .eq('board_id', boardId).eq('owner_id', userId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });
    return (data ?? []).map((s: any) => ({ token: s.token, createdAt: s.created_at }));
  }

  async getSharedBoard(token: string): Promise<SharedPayload | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc('get_shared_board', { p_token: token });
    if (error || !data) return null;
    return data as SharedPayload;
  }
}
