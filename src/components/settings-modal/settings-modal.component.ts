import { Component, Output, EventEmitter, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService, ThemeDef } from '../../services/theme.service';
import { PreferencesService, PerfPreset } from '../../services/preferences.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../icon/icon.component';
const version = '1.1.6';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IconComponent, TitleCasePipe],
  template: `
    <div class="fixed inset-0 z-overlay flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" [class.animate-modalOut]="isClosing()" (click)="startClose()">
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title" class="bg-[var(--paper-color)] p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl doodle-border relative text-[var(--ink-color)]" (click)="$event.stopPropagation()">
        <button (click)="startClose()" class="absolute top-4 right-4 text-2xl hover:text-red-500" aria-label="Close settings">×</button>
        <h2 id="settings-title" class="text-3xl marker-font mb-6 text-center">Settings</h2>

        <div class="flex flex-col gap-6">

          <!-- ACCOUNT -->
          <div>
            <h3 class="font-bold text-lg border-b border-[var(--ink-color)] pb-1 mb-3">Account & Sync</h3>

            @if (!authService.supabaseAvailable) {
              <div class="bg-[var(--surface)] p-3 rounded-lg text-sm flex flex-col gap-1 border border-[var(--border-soft)]">
                <p class="font-bold flex items-center gap-2"><app-icon name="check"></app-icon> Saved locally</p>
                <p class="opacity-60 text-xs leading-relaxed">Cloud sync is not configured. Add <code class="font-mono bg-[var(--surface-hover)] px-1 rounded">VITE_SUPABASE_URL</code> and <code class="font-mono bg-[var(--surface-hover)] px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to your <code class="font-mono bg-[var(--surface-hover)] px-1 rounded">.env</code> to enable syncing across devices.</p>
              </div>
            } @else if (authService.authState().mode === 'linked') {
              <div class="bg-[var(--tint-green)] p-3 rounded-lg text-sm flex flex-col gap-3">
                <div class="flex items-center gap-2">
                  <app-icon name="check"></app-icon>
                  <div>
                    <p class="font-bold">Permanent account linked</p>
                    <p class="text-muted text-xs">Your boards sync across all your devices.</p>
                  </div>
                </div>
                @if (confirmingAction()) {
                  <div class="flex items-center gap-2 bg-[var(--tint-pink)] p-2 rounded text-xs">
                    <app-icon name="warning"></app-icon>
                    <span class="flex-1">
                      @if (confirmingAction() === 'logout') { Sure you want to sign out? }
                      @else { Unlink {{ confirmingAction() === 'github' ? 'GitHub' : 'Google' }} from your account? }
                    </span>
                    <button (click)="executeConfirm()" [disabled]="linking()" class="doodle-btn text-xs">Yes</button>
                    <button (click)="cancelConfirm()" class="doodle-btn text-xs">Cancel</button>
                  </div>
                } @else {
                  <div class="flex flex-wrap gap-2">
                    @if (authService.linkedProviders().includes('github')) {
                      <button (click)="confirmUnlink('github')" [disabled]="linking()" class="doodle-btn text-xs"><app-icon name="octopus"></app-icon> Unlink GitHub</button>
                    }
                    @if (authService.linkedProviders().includes('google')) {
                      <button (click)="confirmUnlink('google')" [disabled]="linking()" class="doodle-btn text-xs"><app-icon name="globe"></app-icon> Unlink Google</button>
                    }
                    <button (click)="confirmLogout()" [disabled]="linking()" class="doodle-btn text-xs ml-auto"><app-icon name="warning"></app-icon> Sign Out</button>
                  </div>
                }
              </div>
            } @else if (authService.authState().mode === 'anonymous') {
              <div class="bg-[var(--tint-yellow)] p-3 rounded-lg text-sm">
                <p class="font-bold mb-1">Anonymous cloud account</p>
                <p class="text-muted text-xs mb-3">Link a permanent account to sign in from any device without losing your boards.</p>

                @if (linkError()) {
                  <p class="text-[var(--ink-color)] text-xs mb-2 p-2 bg-[var(--tint-pink)] rounded flex items-center gap-1"><app-icon name="warning"></app-icon> {{ linkError() }}</p>
                }
                @if (linkEmailSent()) {
                  <p class="text-[var(--ink-color)] text-xs mb-2 p-2 bg-[var(--tint-green)] rounded flex items-center gap-1"><app-icon name="check"></app-icon> Check your email for a verification link!</p>
                }

                <div class="flex flex-col gap-2">
                  <button (click)="linkProvider('github')" [disabled]="linking()" class="doodle-btn text-sm w-full">
                    <app-icon name="octopus"></app-icon> Link GitHub
                  </button>
                  <button (click)="linkProvider('google')" [disabled]="linking()" class="doodle-btn text-sm w-full">
                    <app-icon name="globe"></app-icon> Link Google
                  </button>
                  <div class="flex gap-2 mt-1">
                    <input type="email" [(ngModel)]="emailInput" class="doodle-input text-sm flex-1" placeholder="your@email.com">
                    <button (click)="linkEmail()" [disabled]="linking()" class="doodle-btn text-sm"><app-icon name="memo"></app-icon> Link Email</button>
                  </div>
                </div>
              </div>
            } @else {
              <div class="bg-[var(--tint-blue)] p-3 rounded-lg text-sm flex flex-col gap-2">
                <p class="text-muted text-xs flex items-center gap-1"><app-icon name="globe"></app-icon> Cloud sync activates automatically when you create your first note.</p>
                <button (click)="activateSync()" [disabled]="linking()" class="doodle-btn text-sm self-start"><app-icon name="sparkles"></app-icon> Activate Cloud Sync Now</button>
              </div>
            }
          </div>

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

          <!-- PERFORMANCE -->
          <div>
            <h3 class="font-bold mb-3 text-lg border-b border-[var(--ink-color)] pb-1">Performance</h3>
            <div class="flex flex-col gap-2">
              @for (opt of perfPresets; track opt.value) {
                <label
                  class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover-surface"
                  [class.border-soft]="prefs.perfPreset() !== opt.value"
                  [style.border-color]="prefs.perfPreset() === opt.value ? 'var(--accent)' : null"
                  [style.box-shadow]="prefs.perfPreset() === opt.value ? '0 0 0 1px var(--accent)' : null"
                >
                  <input type="radio" name="perfPreset" [value]="opt.value" [checked]="prefs.perfPreset() === opt.value" (change)="prefs.perfPreset.set(opt.value)" class="accent-[var(--accent)]">
                  <div class="flex-1">
                    <div class="font-bold text-sm">{{ opt.label }}</div>
                    <div class="text-muted text-xs">{{ opt.desc }}</div>
                    @if (opt.value === 'auto' && prefs.perfPreset() === 'auto') {
                      <div class="text-xs mt-0.5 opacity-60">Detected: {{ prefs.detectedTier() | titlecase }} on this device</div>
                    }
                  </div>
                </label>
              }
            </div>
          </div>

          <!-- ACCESSIBILITY -->
          <div>
            <h3 class="font-bold mb-3 text-lg border-b border-[var(--ink-color)] pb-1">Accessibility</h3>
            <label class="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                [checked]="prefs.reduceMotion()"
                (change)="prefs.reduceMotion.set(!prefs.reduceMotion())"
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
  prefs = inject(PreferencesService);
  authService = inject(AuthService);
  toastService = inject(ToastService);

  readonly perfPresets: { value: PerfPreset; label: string; desc: string }[] = [
    { value: 'auto', label: 'Auto (Recommended)', desc: 'Detects your device capabilities automatically.' },
    { value: 'full', label: 'Full', desc: 'All animations and effects enabled.' },
    { value: 'balanced', label: 'Balanced', desc: 'Reduced blur and capped stagger animations.' },
    { value: 'lite', label: 'Lite', desc: 'No animations, no blur, no background motifs.' },
  ];
  @Output() close = new EventEmitter<void>();
  protected readonly version = version;

  isClosing = signal(false);
  linking = signal(false);
  linkError = signal<string | null>(null);
  linkEmailSent = signal(false);
  confirmingAction = signal<'logout' | 'github' | 'google' | null>(null);
  emailInput = '';

  readonly groups = [
    { label: 'Light', themes: this.themeService.lightThemes },
    { label: 'Dark', themes: this.themeService.darkThemes },
  ];

  startClose() {
    this.isClosing.set(true);
    setTimeout(() => this.close.emit(), 150);
  }

  isSelected(name: string): boolean {
    const mode = this.themeService.mode();
    return mode === name || (mode === 'system' && this.themeService.resolvedTheme() === name);
  }

  motifPreviewOpacity(t: ThemeDef): number {
    return Math.min(0.5, parseFloat(t.vars['--motif-opacity']) + 0.18);
  }

  async activateSync() {
    this.linking.set(true);
    await this.authService.triggerAnonymousSignIn();
    this.linking.set(false);
  }

  async linkProvider(provider: 'github' | 'google') {
    this.linking.set(true);
    this.linkError.set(null);
    try {
      const err = await this.authService.linkWithProvider(provider);
      if (err) this.linkError.set(err);
    } finally {
      this.linking.set(false);
    }
  }

  confirmLogout() { this.confirmingAction.set('logout'); }
  confirmUnlink(provider: 'github' | 'google') { this.confirmingAction.set(provider); }
  cancelConfirm() { this.confirmingAction.set(null); }

  async executeConfirm() {
    const action = this.confirmingAction();
    if (!action) return;
    this.confirmingAction.set(null);
    this.linking.set(true);
    if (action === 'logout') {
      const err = await this.authService.logout();
      this.linking.set(false);
      if (err) { this.toastService.show(err, 'error'); }
      else { this.toastService.show('Signed out successfully', 'success'); this.startClose(); }
    } else {
      const label = action === 'github' ? 'GitHub' : 'Google';
      const err = await this.authService.unlinkIdentity(action);
      this.linking.set(false);
      if (err) { this.toastService.show(err, 'error'); }
      else { this.toastService.show(`${label} unlinked`, 'success'); }
    }
  }

  async linkEmail() {
    if (!this.emailInput.trim()) return;
    this.linking.set(true);
    this.linkError.set(null);
    this.linkEmailSent.set(false);
    const err = await this.authService.linkWithEmail(this.emailInput.trim());
    if (err) {
      this.linkError.set(err);
    } else {
      this.linkEmailSent.set(true);
      this.emailInput = '';
    }
    this.linking.set(false);
  }
}
