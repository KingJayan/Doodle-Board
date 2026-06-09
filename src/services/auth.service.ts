import { Injectable, signal } from '@angular/core';
import { db } from '../db/local-db';
import { supabase } from './supabase.provider';

export type AuthMode = 'none' | 'anonymous' | 'linked';
export interface AuthState { mode: AuthMode; userId: string | null; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly authState = signal<AuthState>({ mode: 'none', userId: null });
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

  private async backfillOwnerId(userId: string) {
    await db.transaction('rw', db.boards, db.cards, async () => {
      await db.boards.filter(b => b.ownerId == null).modify({ ownerId: userId, _dirty: 1 as 0 | 1 });
      await db.cards.filter(c => c.ownerId == null).modify({ ownerId: userId, _dirty: 1 as 0 | 1 });
    });
  }
}
