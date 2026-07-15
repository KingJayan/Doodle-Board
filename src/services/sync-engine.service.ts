import { Injectable, effect, untracked } from '@angular/core';
import { db } from '../db/local-db';
import { supabase } from './supabase.provider';
import { AuthService } from './auth.service';
import { BoardService } from './board.service';
import { upload, pull } from './sync-engine.logic';

@Injectable({ providedIn: 'root' })
export class SyncEngineService {
  private running = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private auth: AuthService, private boardService: BoardService) {
    if (!supabase) return;
    effect(() => {
      const { userId } = this.auth.authState();
      untracked(() => {
        if (userId) {
          this.runCycle();
          if (!this.intervalId) this.intervalId = setInterval(() => this.runCycle(), 60_000);
        } else if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
      });
    });
    window.addEventListener('online', () => this.runCycle());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.runCycle(); });
  }

  async runCycle() {
    const { userId } = this.auth.authState();
    if (!supabase || !userId || this.running) return;
    this.running = true;
    this.boardService.setSyncStatus('Syncing…');
    try {
      await upload(db, supabase, userId);
      await pull(db, supabase, userId, () => this.boardService.rehydrate());
      this.boardService.setSyncStatus('Backed up');
    } catch {
      this.boardService.setSyncStatus(navigator.onLine ? 'Sync error' : 'Offline');
    } finally {
      this.running = false;
    }
  }
}
