import { Injectable, signal, computed, effect } from '@angular/core';

export type PerfPreset = 'auto' | 'full' | 'balanced' | 'lite';
export type PerfTier = 'full' | 'balanced' | 'lite';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
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
  }

  private detectTier(): PerfTier {
    const cores = navigator.hardwareConcurrency ?? 4;
    const mem = (navigator as any).deviceMemory ?? 4;
    if (cores <= 2 || mem <= 2) return 'lite';
    if (cores <= 4 || mem <= 4) return 'balanced';
    return 'full';
  }
}
