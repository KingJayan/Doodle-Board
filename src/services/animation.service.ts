import { Injectable, inject } from '@angular/core';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { PreferencesService } from './preferences.service';

gsap.registerPlugin(CustomEase);

function bezier(name: string, x1: number, y1: number, x2: number, y2: number): string {
  CustomEase.create(name, `M0,0 C${x1},${y1} ${x2},${y2} 1,1`);
  return name;
}

export const EASE = {
  spring: bezier('db-spring', 0.16, 1, 0.3, 1),
  stamp: bezier('db-stamp', 0.175, 0.885, 0.32, 1.275),
  pop: bezier('db-pop', 0.34, 1.56, 0.64, 1),
} as const;

export type AnimPreset =
  | 'fade'
  | 'pop'
  | 'scale-in'
  | 'slide-up'
  | 'slide-down'
  | 'slide-in';

interface PresetDef {
  from: gsap.TweenVars;
  duration: number;
  ease: string;
}

const PRESETS: Record<AnimPreset, PresetDef> = {
  fade: { from: { opacity: 0 }, duration: 0.18, ease: EASE.spring },
  pop: { from: { opacity: 0, scale: 0.9 }, duration: 0.28, ease: EASE.pop },
  'scale-in': { from: { opacity: 0, scale: 0.97 }, duration: 0.2, ease: EASE.stamp },
  'slide-up': { from: { opacity: 0, y: 40 }, duration: 0.4, ease: EASE.spring },
  'slide-down': { from: { opacity: 0, y: -14 }, duration: 0.28, ease: EASE.spring },
  'slide-in': { from: { opacity: 0, x: '80%', scale: 0.9 }, duration: 0.3, ease: EASE.pop },
};

export interface AnimOptions {
  delay?: number;
  stagger?: number;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class AnimationService {
  private prefs = inject(PreferencesService);

  get enabled(): boolean {
    return this.prefs.motionEnabled();
  }

  enter(
    target: gsap.TweenTarget,
    preset: AnimPreset,
    opts: AnimOptions = {}
  ): gsap.core.Tween | null {
    const def = PRESETS[preset];
    if (!this.enabled) {
      gsap.set(target, { clearProps: 'all' });
      return null;
    }
    return gsap.from(target, {
      ...def.from,
      duration: opts.duration ?? def.duration,
      ease: def.ease,
      delay: opts.delay ?? 0,
      stagger: opts.stagger ?? 0,
      clearProps: 'transform,opacity',
      overwrite: 'auto',
    });
  }

  settle(target: gsap.TweenTarget, tiltScale = 1): gsap.core.Tween | null {
    if (!this.enabled) return null;
    return gsap.fromTo(
      target,
      { rotation: 1 * tiltScale },
      { rotation: 0, duration: 0.3, ease: EASE.spring, overwrite: 'auto' }
    );
  }

  timeline(vars?: gsap.TimelineVars): gsap.core.Timeline | null {
    return this.enabled ? gsap.timeline(vars) : null;
  }
}