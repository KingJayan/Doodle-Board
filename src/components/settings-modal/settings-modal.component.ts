import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { version } from '../../../package.json';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="close.emit()" aria-hidden="true">
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title" class="bg-[var(--paper-color)] p-6 rounded-lg max-w-md w-full m-4 shadow-xl doodle-border relative text-[var(--ink-color)]" (click)="$event.stopPropagation()">
        <button (click)="close.emit()" class="absolute top-4 right-4 text-2xl hover:text-red-500" aria-label="Close settings">×</button>
        <h2 id="settings-title" class="text-3xl marker-font mb-6 text-center">Settings</h2>

        <div class="flex flex-col gap-6">
          <div>
            <h3 class="font-bold mb-3 text-lg border-b border-[var(--ink-color)] pb-1">Theme</h3>
            <div class="flex flex-col gap-2">
              <button (click)="themeService.setTheme('paper')" class="flex items-center gap-3 p-3 rounded border border-gray-300 hover:bg-gray-100 transition-colors bg-theme-paper text-gray-900">
                <div class="w-6 h-6 rounded-full border border-black bg-theme-paper"></div>
                <span>Classic Paper</span>
                @if (themeService.currentTheme() === 'paper') { <span class="ml-auto">✅</span> }
              </button>
              <button (click)="themeService.setTheme('chalkboard')" class="flex items-center gap-3 p-3 rounded border border-gray-600 hover:bg-gray-700 transition-colors bg-theme-dark text-white">
                <div class="w-6 h-6 rounded-full border border-white bg-theme-dark"></div>
                <span>Chalkboard (Dark)</span>
                @if (themeService.currentTheme() === 'chalkboard') { <span class="ml-auto">✅</span> }
              </button>
              <button (click)="themeService.setTheme('blueprint')" class="flex items-center gap-3 p-3 rounded border border-blue-300 hover:bg-blue-800 transition-colors bg-theme-blueprint text-white">
                <div class="w-6 h-6 rounded-full border border-white bg-theme-blueprint"></div>
                <span>Blueprint</span>
                @if (themeService.currentTheme() === 'blueprint') { <span class="ml-auto">✅</span> }
              </button>
            </div>
          </div>

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

          <div class="text-center text-xs opacity-60 mt-4 flex flex-col gap-1">
            <span>DoodleBoard v{{ version }}</span>
            <div class="flex items-center justify-center gap-2">
              <span>By Jayan Patel</span>
              <a href="https://jayanpatel.vercel.app" target="_blank" class="text-sm hover:scale-110 transition-transform no-underline" title="Portfolio">🌐</a>
              <a href="https://github.com/KingJayan" target="_blank" class="text-sm hover:scale-110 transition-transform no-underline" title="GitHub">🐙</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SettingsModalComponent {
  themeService = inject(ThemeService);
  @Output() close = new EventEmitter<void>();
  protected readonly version = version;
}
