import { Injectable, signal } from '@angular/core';
import { db } from '../db/local-db';
import { supabase } from './supabase.provider';

export type AuthMode = 'none' | 'anonymous' | 'linked';
export interface AuthState { mode: AuthMode; userId: string | null; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly authState = signal<AuthState>({ mode: 'none', userId: null });
  readonly supabaseAvailable = !!supabase;
  private signInPromise: Promise<void> | null = null;

  constructor() { this.init(); }

  private async init() {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) this.applyUser(session.user);
    supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) this.applyUser(session.user);
      else this.authState.set({ mode: 'none', userId: null });
    });
  }

  private applyUser(user: { id: string; is_anonymous?: boolean }) {
    const mode: AuthMode = user.is_anonymous ? 'anonymous' : 'linked';
    this.authState.set({ mode, userId: user.id });
    db.meta.put({ key: 'authMode', value: mode });
  }

  triggerAnonymousSignIn(): Promise<void> {
    if (!supabase || this.authState().mode !== 'none') return Promise.resolve();
    if (!this.signInPromise) {
      this.signInPromise = supabase.auth.signInAnonymously().then(async ({ data, error }) => {
        if (error || !data.user) return;
        this.applyUser(data.user);
        await this.backfillOwnerId(data.user.id);
      }).finally(() => { this.signInPromise = null; });
    }
    return this.signInPromise;
  }

  async linkWithProvider(provider: 'github' | 'google'): Promise<string | null> {
    if (!supabase) return 'Supabase not configured';
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo: window.location.origin + '/board' }
    });
    if (!error) return null;
    if (error.message?.includes('already') || (error as any).code === 'identity_already_exists') {
      return 'That account is already linked to another workspace. Sign in there instead, or export your data first.';
    }
    return error.message;
  }

  async linkWithEmail(email: string): Promise<string | null> {
    if (!supabase) return 'Supabase not configured';
    if (!email.trim()) return 'Enter a valid email address';
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    if (!error) return null;
    if (error.message?.includes('already') || (error as any).code === 'email_exists') {
      return 'That email belongs to another account. Sign in there instead, or export your data first.';
    }
    return error.message;
  }

  private async backfillOwnerId(userId: string) {
    const now = Date.now();
    await db.transaction('rw', db.boards, db.cards, db.outbox, async () => {
      const boards = await db.boards.filter(b => b.ownerId == null).toArray();
      const cards = await db.cards.filter(c => c.ownerId == null).toArray();
      for (const b of boards) {
        const rev = b._rev + 1;
        await db.boards.put({ ...b, ownerId: userId, _dirty: 1, _rev: rev });
        await db.outbox.add({ entity: 'board', entityId: b.id, op: 'upsert', payloadRev: rev, enqueuedAt: now, attempts: 0, nextAttemptAt: now, lastError: null });
      }
      for (const c of cards) {
        const rev = c._rev + 1;
        await db.cards.put({ ...c, ownerId: userId, _dirty: 1, _rev: rev });
        await db.outbox.add({ entity: 'card', entityId: c.id, op: 'upsert', payloadRev: rev, enqueuedAt: now, attempts: 0, nextAttemptAt: now, lastError: null });
      }
    });
  }
}
