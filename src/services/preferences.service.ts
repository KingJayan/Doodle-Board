import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { supabase } from './supabase.provider';

export type PerfPreset = 'auto' | 'full' | 'balanced' | 'lite';
export type PerfTier = 'full' | 'balanced' | 'lite';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private auth = inject(AuthService);

  perfPreset = signal<PerfPreset>(
    (localStorage.getItem('doodle_perf') as PerfPreset | null) ?? 'auto'
  );

  reduceMotion = signal<boolean>(
    localStorage.getItem('doodle_motion') !== null
      ? JSON.parse(localStorage.getItem('doodle_motion')!)
      : window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  readonly detectedTier = signal<PerfTier>(this.detectTier());

  effectiveTier = computed<PerfTier>(() => {
    const p = this.perfPreset();
    return p === 'auto' ? this.detectedTier() : p;
  });

  motionEnabled = computed(() => !this.reduceMotion() && this.effectiveTier() !== 'lite');

  private remotePrefs: { perf?: PerfPreset; motion?: boolean } | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      if (localStorage.getItem('doodle_motion') === null) this.reduceMotion.set(e.matches);
    });

    effect(() => {
      localStorage.setItem('doodle_perf', this.perfPreset());
    });

    effect(() => {
      const rm = this.reduceMotion();
      localStorage.setItem('doodle_motion', JSON.stringify(rm));
      document.body.classList.toggle('reduce-motion', rm);
    });

    effect(() => {
      document.documentElement.dataset['perf'] = this.effectiveTier();
    });

    effect(() => {
      if (this.auth.authState().mode === 'linked') this.fetchRemote();
    });

    effect(() => {
      const perf = this.perfPreset();
      const motion = this.reduceMotion();
      const mode = this.auth.authState().mode;
      if (this.syncTimer) clearTimeout(this.syncTimer);
      if (mode !== 'linked') return;
      this.syncTimer = setTimeout(() => this.pushRemote(perf, motion), 1000);
    });
  }

  private async fetchRemote() {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const prefs = data?.session?.user?.user_metadata?.['preferences'];
    if (!prefs) { this.remotePrefs = {}; return; }
    this.remotePrefs = {};
    if (typeof prefs['perf'] === 'string') { this.perfPreset.set(prefs['perf'] as PerfPreset); this.remotePrefs.perf = prefs['perf'] as PerfPreset; }
    if (typeof prefs['motion'] === 'boolean') { this.reduceMotion.set(prefs['motion']); this.remotePrefs.motion = prefs['motion']; }
  }

  private async pushRemote(perf: PerfPreset, motion: boolean) {
    if (!supabase || this.remotePrefs === null) return;
    if (this.remotePrefs.perf === perf && this.remotePrefs.motion === motion) return;
    await supabase.auth.updateUser({ data: { preferences: { perf, motion } } });
    this.remotePrefs = { perf, motion };
  }

  private detectTier(): PerfTier {
    const cores = navigator.hardwareConcurrency ?? 4;
    const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;
    if (cores <= 2 || mem <= 2) return 'lite';
    if (cores <= 4 || mem <= 4) return 'balanced';
    return 'full';
  }
}
