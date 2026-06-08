import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, ThemeDef } from '../../services/theme.service';
import { IconComponent } from '../icon/icon.component';
const version = '0.16.0';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="fixed inset-0 z-overlay flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" (click)="close.emit()">
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title" class="bg-[var(--paper-color)] p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl doodle-border relative text-[var(--ink-color)]" (click)="$event.stopPropagation()">
        <button (click)="close.emit()" class="absolute top-4 right-4 text-2xl hover:text-red-500" aria-label="Close settings">×</button>
        <h2 id="settings-title" class="text-3xl marker-font mb-6 text-center">Settings</h2>

        <div class="flex flex-col gap-6">
          <!-- THEME LIBRARY -->
          <div>
            <div class="flex items-baseline justify-between mb-3 border-b border-[var(--ink-color)] pb-1">
              <h3 class="font-bold text-lg">Theme</h3>
              <span class="text-muted text-xs">{{ themeService.themeList.length }} themes</span>
            </div>

            <!-- follow OS -->
            <button
              (click)="themeService.setTheme('system')"
              class="w-full flex items-center gap-3 p-3 mb-4 rounded-lg border hover-surface transition-all text-left"
              [class.border-soft]="!isSelected('system')"
              [style.border-color]="isSelected('system') ? 'var(--accent)' : null"
              [style.box-shadow]="isSelected('system') ? '0 0 0 1px var(--accent)' : null"
            >
              <div class="w-9 h-9 rounded-full border border-[var(--ink-color)] overflow-hidden flex shrink-0">
                <div class="w-1/2 h-full" style="background:#fdfbf7"></div>
                <div class="w-1/2 h-full" style="background:#2b3833"></div>
              </div>
              <div class="flex-1">
                <div class="font-bold">System</div>
                <div class="text-muted text-xs">Follows your OS light / dark setting</div>
              </div>
              @if (isSelected('system')) { <span class="text-xl"><app-icon name="check"></app-icon></span> }
            </button>

            @for (group of groups; track group.label) {
              <div class="mb-4">
                <div class="text-muted text-xs uppercase tracking-wide font-bold mb-2">{{ group.label }}</div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  @for (t of group.themes; track t.name) {
                    <button
                      (click)="themeService.setTheme(t.name)"
                      class="theme-card group rounded-lg border overflow-hidden text-left transition-all"
                      [class.border-soft]="!isSelected(t.name)"
                      [style.border-color]="isSelected(t.name) ? 'var(--accent)' : null"
                      [style.box-shadow]="isSelected(t.name) ? '0 0 0 2px var(--accent)' : null"
                      [attr.aria-pressed]="isSelected(t.name)"
                      [attr.title]="t.label"
                    >
                      <!-- live mini-board preview -->
                      <div
                        class="preview-canvas"
                        [style.background-color]="t.vars['--paper-color']"
                        [style.background-image]="t.vars['--bg-image']"
                        [style.background-size]="t.vars['--bg-size']"
                        [style.--grid-color]="t.vars['--grid-color']"
                      >
                        <svg class="preview-motifs" viewBox="0 0 300 100" preserveAspectRatio="xMidYMid slice"
                          [style.color]="t.vars['--ink-color']" [style.opacity]="motifPreviewOpacity(t)">
                          <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <path [attr.d]="t.motifs[0]" transform="translate(6 22) scale(0.62)" />
                            <path [attr.d]="t.motifs[1 % t.motifs.length]" transform="translate(118 -4) scale(0.55)" />
                            <path [attr.d]="t.motifs[2 % t.motifs.length]" transform="translate(214 30) scale(0.5)" />
                          </g>
                        </svg>
                        <!-- sample note -->
                        <div class="mini-note"
                          [style.background-color]="t.vars['--surface']"
                          [style.border-color]="t.vars['--accent']"
                          [style.transform]="'rotate(' + (-4 * t.tilt) + 'deg)'">
                          <span class="mini-line" [style.background-color]="t.vars['--ink-color']"></span>
                          <span class="mini-line short" [style.background-color]="t.vars['--ink-color']"></span>
                        </div>
                        @if (isSelected(t.name)) {
                          <div class="check-badge" [style.background-color]="t.vars['--accent']">✓</div>
                        }
                      </div>
                      <!-- meta -->
                      <div class="flex items-center gap-2 px-2 py-1.5 bg-surface">
                        <span class="text-[var(--ink-color)]"><app-icon [name]="t.icon"></app-icon></span>
                        <span class="text-sm font-bold truncate text-[var(--ink-color)]" [style.font-family]="t.vars['--font-display']">{{ t.label }}</span>
                      </div>
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          <!-- ACCESSIBILITY -->
          <div>
            <h3 class="font-bold mb-3 text-lg border-b border-[var(--ink-color)] pb-1">Accessibility</h3>
            <label class="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                [checked]="themeService.reduceMotion()"
                (change)="themeService.toggleMotion()"
                class="w-5 h-5 accent-[var(--ink-color)]"
              >
              <span>Reduce Motion (No wiggles)</span>
            </label>
          </div>

          <div class="text-center text-xs opacity-60 mt-2 flex flex-col gap-1">
            <span>DoodleBoard v{{ version }}</span>
            <div class="flex items-center justify-center gap-2">
              <span>By Jayan Patel</span>
              <a href="https://jayanpatel.vercel.app" target="_blank" class="text-sm hover:scale-110 transition-transform no-underline" title="Portfolio"><app-icon name="globe"></app-icon></a>
              <a href="https://github.com/KingJayan" target="_blank" class="text-sm hover:scale-110 transition-transform no-underline" title="GitHub"><app-icon name="octopus"></app-icon></a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .theme-card { cursor: pointer; }
    .theme-card:hover { transform: translateY(-2px); }
    .preview-canvas {
      position: relative;
      height: 70px;
      overflow: hidden;
    }
    .preview-motifs {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .mini-note {
      position: absolute;
      left: 12px;
      bottom: 8px;
      width: 46px;
      height: 38px;
      border-radius: 3px;
      border: 1px solid;
      border-top-width: 4px;
      transform: rotate(-4deg);
      box-shadow: 1px 2px 4px rgba(0,0,0,0.18);
      padding: 6px 5px 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .mini-line { display: block; height: 3px; width: 100%; border-radius: 2px; opacity: 0.55; }
    .mini-line.short { width: 60%; }
    .check-badge {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 18px;
      height: 18px;
      border-radius: 999px;
      color: #fff;
      font-size: 11px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
  `]
})
export class SettingsModalComponent {
  themeService = inject(ThemeService);
  @Output() close = new EventEmitter<void>();
  protected readonly version = version;

  readonly groups = [
    { label: 'Light', themes: this.themeService.lightThemes },
    { label: 'Dark', themes: this.themeService.darkThemes },
  ];

  isSelected(name: string): boolean {
    return this.themeService.mode() === name;
  }

  /** Lift the preview opacity a touch so glyphs read at thumbnail size. */
  motifPreviewOpacity(t: ThemeDef): number {
    return Math.min(0.5, parseFloat(t.vars['--motif-opacity']) + 0.18);
  }
}
