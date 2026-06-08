
import { Injectable, signal, computed, effect } from '@angular/core';
import type { IconName } from '../components/icon/icon.component';

/*
 theme system
 append to ThemeSpec in the specs array to add a new one
*/

export type ThemeName = string;
export type ThemeMode = 'system' | ThemeName;
export type ThemeCategory = 'light' | 'dark';

export interface ThemeDef {
  name: ThemeName;
  label: string;
  emoji: string;
  icon: IconName;
  dark: boolean;
  category: ThemeCategory;
  palette: string[];
  vars: Record<string, string>;
  motifs: string[];
  tilt: number;
}

interface ThemeSpec {
  name: string;
  label: string;
  emoji: string;
  icon: IconName;
  dark: boolean;

  paper: string;
  ink: string;
  accent: string;
  grid: string;
  bg?: 'dots' | 'grid' | 'none';
  bgSize?: string;
  motifOpacity?: number;
  motifs: string[];

  /* ---- uniqueness (all optional; sensible defaults derived) ---- *

  /** heading/marker typeface */
  fontDisplay?: string;
  /** body */
  fontBody?: string;
  /** border-rad */
  radius?: string;
  /** note rot factor*/
  tilt?: number;
  /** color of the tape thingy */
  tape?: string;
  /** secondary */
  accent2?: string;
  /**  */
  displayShadow?: string;
  /**  */
  cardShadow?: string;
  /**  */
  vars?: Record<string, string>;
}

const DOTS = 'radial-gradient(var(--grid-color) 1px, transparent 1px)';
const GRID =
  'linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)';

const WHITE = '#ffffff';
const BLACK = '#000000';

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => clamp(x).toString(16).padStart(2, '0')).join('');
}
/** blend `t` (0..1) of `b` into `a`. */
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

function defineTheme(s: ThemeSpec): ThemeDef {
  const { paper, ink, accent, grid, dark } = s;

  const surface = dark ? mix(paper, ink, 0.07) : mix(paper, WHITE, 0.55);
  const surface2 = dark ? mix(paper, BLACK, 0.18) : mix(paper, BLACK, 0.05);
  const surfaceHover = dark ? mix(paper, ink, 0.15) : mix(paper, BLACK, 0.08);
  const muted = mix(ink, paper, 0.42);
  const borderSoft = dark ? mix(paper, ink, 0.22) : mix(paper, BLACK, 0.14);
  const scrollThumb = dark ? mix(paper, ink, 0.25) : mix(paper, BLACK, 0.18);
  const bgImage = { dots: DOTS, grid: GRID, none: 'none' }[s.bg ?? 'dots'];

  const tint = (light: string, hue: string) => (dark ? mix(hue, paper, 0.66) : light);
  const tints = {
    '--tint-yellow': tint('#fff1c2', '#f2c233'),
    '--tint-green': tint('#d8efd9', '#4f9a55'),
    '--tint-blue': tint('#d7ecfb', '#4f8fe0'),
    '--tint-pink': tint('#fbdbe8', '#ec6fa0'),
    '--tint-purple': tint('#ebdcf7', '#9a63d4'),
    '--note-ink': dark ? ink : '#2d2d2d',
  };

  const uniqueness = {
    '--font-display': s.fontDisplay ?? "'Permanent Marker', cursive",
    '--font-body': s.fontBody ?? "'Patrick Hand', cursive",
    '--doodle-radius': s.radius ?? '255px 15px 225px 15px / 15px 225px 15px 255px',
    '--tape-color': s.tape ?? (dark ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.45)'),
    '--accent-2': s.accent2 ?? accent,
    '--display-shadow': s.displayShadow ?? 'none',
    '--card-shadow':
      s.cardShadow ?? (dark ? '2px 4px 12px rgba(0,0,0,0.5)' : '2px 4px 6px rgba(0,0,0,0.15)'),
  };

  const vars: Record<string, string> = {
    '--paper-color': paper,
    '--ink-color': ink,
    '--pencil-gray': mix(ink, paper, 0.25),
    '--grid-color': grid,
    '--surface': surface,
    '--surface-2': surface2,
    '--surface-hover': surfaceHover,
    '--muted': muted,
    '--border-soft': borderSoft,
    '--accent': accent,
    '--scroll-thumb': scrollThumb,
    '--bg-image': bgImage,
    '--bg-size': s.bgSize ?? '22px 22px',
    '--motif-opacity': String(s.motifOpacity ?? 0.12),
    ...tints,
    ...uniqueness,
    ...s.vars,
  };

  return {
    name: s.name,
    label: s.label,
    emoji: s.emoji,
    icon: s.icon,
    dark: s.dark,
    category: s.dark ? 'dark' : 'light',
    palette: [paper, surface, accent, ink],
    vars,
    motifs: s.motifs,
    tilt: s.tilt ?? 1,
  };
}

// THEME CATELOG
const SPECS: ThemeSpec[] = [
  {
    name: 'paper',
    label: 'Classic Paper',
    emoji: '📝',
    icon: 'memo',
    dark: false,
    paper: '#fdfbf7',
    ink: '#2d2d2d',
    accent: '#ff6b6b',
    grid: '#e3ddd0',
    bg: 'dots',
    bgSize: '20px 20px',
    motifOpacity: 0.1,
    motifs: [
      'M10 50 Q 30 20 50 50 T 90 50',
      'M50 8 L 61 39 L 92 39 L 67 59 L 77 90 L 50 71 L 23 90 L 33 59 L 8 39 L 39 39 Z',
      'M10 50 q 10 -22 20 0 t 20 0 t 20 0 t 20 0',
      'M50 78 C 18 52 30 18 50 40 C 70 18 82 52 50 78 Z',
      'M56 8 L 34 52 L 50 52 L 40 92 L 72 44 L 54 44 Z',
      'M10 50 H 82 M 64 33 L 88 50 L 64 67',
      'M24 64 a 16 16 0 0 1 5 -30 a 19 19 0 0 1 36 4 a 13 13 0 0 1 -4 26 Z',
      'M52 52 C 52 40 64 40 64 52 C 64 70 38 70 38 50 C 38 26 70 26 70 56',
    ],
  },

  {
    name: 'coffee',
    label: 'Café Kraft',
    emoji: '☕',
    icon: 'coffee',
    dark: false,
    paper: '#ece0c8',
    ink: '#433422',
    accent: '#b5651d',
    grid: '#d6c4a0',
    bg: 'dots',
    bgSize: '22px 22px',
    motifOpacity: 0.12,

    fontDisplay: "'Special Elite', 'Permanent Marker', cursive",
    radius: '6px',
    tape: 'rgba(120,72,32,0.2)',
    accent2: '#6f4a25',
    tilt: 0.85,
    motifs: [
      'M28 38 H 66 V 60 A 11 11 0 0 1 55 71 H 39 A 11 11 0 0 1 28 60 Z M 66 43 A 9 9 0 0 1 66 63',
      'M50 26 a 17 22 0 1 0 0.1 0 M 50 26 Q 40 50 50 70',
      'M50 50 m -23 0 a 23 23 0 1 0 46 0 a 23 23 0 1 0 -46 0',
      'M42 30 q 9 -8 0 -16 M 58 30 q 9 -8 0 -16',
      'M22 62 Q 50 18 78 62 Q 50 50 22 62 Z',
      'M50 30 a 8 13 0 1 0 0.1 0 M 50 43 V 74',
      'M22 64 a 28 10 0 1 0 56 0 a 28 10 0 1 0 -56 0',
      'M36 40 L 50 33 L 64 40 L 64 58 L 50 65 L 36 58 Z',
    ],
  },

  {
    name: 'sakura',
    label: 'Sakura',
    emoji: '🌸',
    icon: 'blossom',
    dark: false,
    paper: '#ffeef3',
    ink: '#6a2f44',
    accent: '#ff7eb3',
    grid: '#f7d4e0',
    bg: 'dots',
    bgSize: '22px 22px',
    motifOpacity: 0.13,
    fontDisplay: "'Caveat', 'Permanent Marker', cursive",
    radius: '22px',
    tape: 'rgba(255,126,179,0.24)',
    accent2: '#c45b8c',
    tilt: 1.35,
    motifs: [
      // single petal
      'M50 26 C 38 40 38 58 50 74 C 62 58 62 40 50 26 Z',
      // five-dot blossom
      'M50 36 a6 6 0 1 0 0.1 0 M 65 47 a6 6 0 1 0 0.1 0 M 59 65 a6 6 0 1 0 0.1 0 M 41 65 a6 6 0 1 0 0.1 0 M 35 47 a6 6 0 1 0 0.1 0',
      // branch with buds
      'M20 72 Q 50 56 80 30 M 44 60 a4 4 0 1 0 0.1 0 M 62 44 a4 4 0 1 0 0.1 0',
      // drifting petal pair
      'M30 36 C 24 44 24 54 32 60 C 40 54 40 44 30 36 Z M 62 52 C 56 60 56 70 64 76 C 72 70 72 60 62 52 Z',
      // wind swirl
      'M18 44 q 22 -12 44 0 t 20 8 M 70 60 q 8 -2 10 -8',
      // four-petal flower
      'M50 30 C 42 42 42 48 50 50 C 58 48 58 42 50 30 Z M 70 50 C 58 42 52 42 50 50 C 52 58 58 58 70 50 Z M 50 70 C 58 58 58 52 50 50 C 42 52 42 58 50 70 Z M 30 50 C 42 58 48 58 50 50 C 48 42 42 42 30 50 Z',
      // leaf
      'M34 66 C 40 44 60 36 70 34 C 64 56 48 64 34 66 Z M 70 34 L 34 66',
      // bud sprig
      'M50 76 V 40 M 50 50 C 40 48 34 40 36 30 C 46 32 50 40 50 50 M 50 46 C 60 44 66 36 64 26 C 54 28 50 36 50 46',
    ],
  },

  {
    name: 'forest',
    label: 'Forest Sage',
    emoji: '🌿',
    icon: 'herb',
    dark: false,
    paper: '#e7efe0',
    ink: '#2f3d2a',
    accent: '#4a8f4f',
    grid: '#cfe0c2',
    bg: 'dots',
    bgSize: '22px 22px',
    motifOpacity: 0.12,
    radius: '16px',
    tape: 'rgba(74,143,79,0.2)',
    accent2: '#7a5a32',
    tilt: 1.1,
    motifs: [
      // pine tree
      'M50 22 L 38 46 H 46 L 34 66 H 66 L 54 46 H 62 Z M 50 66 V 80',
      // leaf with vein
      'M50 26 C 32 38 32 64 50 76 C 68 64 68 38 50 26 Z M 50 26 V 76',
      // fern frond
      'M50 80 V 28 M 50 38 Q 64 34 68 22 M 50 38 Q 36 34 32 22 M 50 52 Q 62 48 66 38 M 50 52 Q 38 48 34 38',
      // mushroom
      'M30 50 A 20 14 0 0 1 70 50 Z M 44 50 V 70 A 6 6 0 0 0 56 70 V 50',
      // mountains
      'M14 72 L 38 36 L 54 56 L 66 40 L 86 72 Z',
      // acorn
      'M40 46 A 10 14 0 0 0 60 46 Z M 38 46 H 62 M 50 60 V 70',
      // sprout
      'M50 78 V 44 M 50 54 C 36 52 30 42 32 30 C 46 32 50 42 50 54 M 50 48 C 64 46 70 36 68 24 C 54 26 50 36 50 48',
      // three-leaf clover-ish
      'M50 56 C 40 44 56 40 50 56 M 50 56 C 62 46 64 62 50 56 M 50 56 C 50 68 36 66 50 56 M 50 56 V 74',
    ],
  },

  {
    name: 'chalkboard',
    label: 'Chalkboard',
    emoji: '🧮',
    icon: 'abacus',
    dark: true,
    paper: '#16181a',
    ink: '#eef3ee',
    accent: '#ffd93d',
    grid: '#262a2d',
    bg: 'dots',
    bgSize: '26px 26px',
    motifOpacity: 0.14,

    tape: 'rgba(255,255,255,0.16)',
    accent2: '#ff8fa3',
    displayShadow: '0 0 1px rgba(255,255,255,0.55), 0 1px 2px rgba(0,0,0,0.35)',
    tilt: 1.1,
    motifs: [
      'M28 36 H 74 M 44 36 V 72 M 64 36 V 72',
      'M66 30 H 30 L 50 50 L 30 72 H 66',
      'M56 22 C 45 22 51 40 51 52 C 51 64 57 80 46 80',
      'M22 56 L 33 50 L 45 78 L 62 24 H 82',
      'M30 44 H 70 M 30 60 H 70',
      'M20 76 Q 50 6 80 76',
      'M50 28 a 17 23 0 1 0 0.1 0 M 34 50 H 66',
      'M34 38 L 66 66 M 66 38 L 34 66',
    ],
  },

  {
    name: 'midnight',
    label: 'Midnight Neon',
    emoji: '🌌',
    icon: 'galaxy',
    dark: true,
    paper: '#0e1020',
    ink: '#eef0ff',
    accent: '#ff5fae',
    grid: '#262a52',
    bg: 'grid',
    bgSize: '34px 34px',
    motifOpacity: 0.16,

    accent2: '#5fe0ff',
    tape: 'rgba(255,95,174,0.26)',
    displayShadow: '0 0 14px rgba(255,95,174,0.6), 0 0 4px rgba(95,224,255,0.5)',
    cardShadow: '0 0 0 1px rgba(255,95,174,0.12), 2px 6px 18px rgba(255,95,174,0.22)',
    motifs: [
      'M25 62 A 25 25 0 0 1 75 62 M 30 52 H 70 M 27 57 H 73 M 25 62 H 75',
      'M50 24 L 76 72 L 24 72 Z',
      'M50 28 V 72 M 28 50 H 72 M 35 35 L 65 65 M 65 35 L 35 65',
      'M14 50 L 30 50 L 36 28 L 46 72 L 56 38 L 66 60 L 72 50 L 86 50',
      'M50 24 L 72 50 L 50 76 L 28 50 Z',
      'M50 50 m -18 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0 M 24 58 Q 50 72 76 40',
      'M18 50 H 40 M 40 50 V 34 H 60 M 60 34 V 66 H 82',
      'M56 14 L 34 52 L 50 52 L 40 86 L 70 42 L 52 42 Z',
    ],
  },

  {
    name: 'terminal',
    label: 'Terminal',
    emoji: '💻',
    icon: 'laptop',
    dark: true,
    paper: '#0b130e',
    ink: '#9ff7c0',
    accent: '#56e39f',
    grid: '#16271d',
    bg: 'grid',
    bgSize: '30px 30px',
    motifOpacity: 0.15,

    fontDisplay: "'Space Mono', ui-monospace, monospace",
    fontBody: "'Space Mono', ui-monospace, monospace",
    radius: '3px',
    tilt: 0,
    tape: 'rgba(86,227,159,0.18)',
    accent2: '#9ff7c0',
    displayShadow: '0 0 8px rgba(86,227,159,0.45)',
    cardShadow: '2px 3px 0 rgba(86,227,159,0.18), 2px 5px 12px rgba(0,0,0,0.5)',
    motifs: [
      // curly braces { }
      'M44 28 Q 34 28 34 38 Q 34 46 26 50 Q 34 54 34 62 Q 34 72 44 72 M 56 28 Q 66 28 66 38 Q 66 46 74 50 Q 66 54 66 62 Q 66 72 56 72',
      // tags </>
      'M40 34 L 24 50 L 40 66 M 60 34 L 76 50 L 60 66 M 54 30 L 46 70',
      // prompt >_
      'M28 38 L 46 50 L 28 62 M 52 64 H 74',
      // hash #
      'M40 28 L 34 72 M 62 28 L 56 72 M 28 44 H 72 M 26 58 H 70',
      // semicolon ;
      'M50 38 a4 4 0 1 0 0.1 0 M 50 58 a4 4 0 1 0 0.1 0 Q 50 70 42 74',
      // dollar $
      'M62 34 Q 38 28 38 42 Q 38 52 50 52 Q 62 52 62 62 Q 62 76 38 70 M 50 26 V 78',
      // brackets [ ]
      'M46 30 H 38 V 70 H 46 M 54 30 H 62 V 70 H 54',
      // parentheses ( )
      'M46 30 Q 32 50 46 70 M 54 30 Q 68 50 54 70',
    ],
  },

  {
    name: 'blueprint',
    label: 'Blueprint',
    emoji: '📐',
    icon: 'ruler',
    dark: true,
    paper: '#10336b',
    ink: '#eaf2ff',
    accent: '#ffd93d',
    grid: '#2a558f',
    bg: 'grid',
    bgSize: '28px 28px',
    motifOpacity: 0.18,

    fontDisplay: "'Space Mono', 'Permanent Marker', cursive",
    radius: '3px',
    tilt: 0,
    tape: 'rgba(127,176,255,0.22)',
    accent2: '#7fb0ff',
    cardShadow: '2px 3px 0 rgba(127,176,255,0.2), 2px 5px 12px rgba(0,0,0,0.45)',
    motifs: [
      'M10 50 H 90 M 20 45 V 55 M 30 47 V 53 M 40 47 V 53 M 50 44 V 56 M 60 47 V 53 M 70 47 V 53 M 80 45 V 55',
      'M50 50 m -26 0 a 26 26 0 1 0 52 0 a 26 26 0 1 0 -52 0 M 50 18 V 82 M 18 50 H 82',
      'M26 24 V 76 H 78 M 26 60 H 42 V 76',
      'M20 76 L 50 24 L 80 76 Z',
      'M20 50 H 80 M 20 44 V 56 M 80 44 V 56',
      'M50 22 L 74 36 L 74 64 L 50 78 L 26 64 L 26 36 Z',
      'M22 80 L 80 22 M 38 80 L 80 38 M 54 80 L 80 54',
      'M28 72 A 38 38 0 0 1 72 72 M 50 72 L 72 72',
    ],
  },
];

export const THEMES: Record<string, ThemeDef> = Object.fromEntries(
  SPECS.map((s) => [s.name, defineTheme(s)])
);

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  mode = signal<ThemeMode>('system');
  reduceMotion = signal<boolean>(false);

  private systemDark = signal<boolean>(false);
  private mql = window.matchMedia('(prefers-color-scheme: dark)');

  resolvedTheme = computed<ThemeName>(() => {
    const m = this.mode();
    if (m === 'system') return this.systemDark() ? 'chalkboard' : 'paper';
    return m in THEMES ? m : 'paper';
  });

  motifs = computed(() => THEMES[this.resolvedTheme()].motifs);
  isDark = computed(() => THEMES[this.resolvedTheme()].dark);

  tilt = computed(() => THEMES[this.resolvedTheme()].tilt);

  readonly themes = THEMES;
  readonly themeList: ThemeDef[] = Object.values(THEMES);
  readonly lightThemes: ThemeDef[] = this.themeList.filter((t) => !t.dark);
  readonly darkThemes: ThemeDef[] = this.themeList.filter((t) => t.dark);

  constructor() {
    const saved = localStorage.getItem('doodle_theme') as ThemeMode | null;
    if (saved && (saved === 'system' || saved in THEMES)) this.mode.set(saved);

    this.systemDark.set(this.mql.matches);
    this.mql.addEventListener('change', (e) => this.systemDark.set(e.matches));

    const savedMotion = localStorage.getItem('doodle_motion');
    this.reduceMotion.set(
      savedMotion !== null
        ? JSON.parse(savedMotion)
        : window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    effect(() => {
      this.applyTheme(this.resolvedTheme());
      localStorage.setItem('doodle_theme', this.mode());
    });

    effect(() => {
      const rm = this.reduceMotion();
      localStorage.setItem('doodle_motion', JSON.stringify(rm));
      document.body.classList.toggle('reduce-motion', rm);
    });
  }

  setTheme(mode: ThemeMode) {
    this.mode.set(mode);
  }


  noteBg(hex: string): string {
    const t = THEMES[this.resolvedTheme()];
    return t.dark ? mix(hex, t.vars['--paper-color'], 0.72) : hex;
  }

  toggleMotion() {
    this.reduceMotion.update((v) => !v);
  }

  private applyTheme(theme: ThemeName) {
    const root = document.documentElement;
    const def = THEMES[theme];
    for (const [key, value] of Object.entries(def.vars)) {
      root.style.setProperty(key, value);
    }
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = def.dark ? 'dark' : 'light';

    // keep the mobile browser chrome in sync
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', def.vars['--paper-color']);
  }
}
