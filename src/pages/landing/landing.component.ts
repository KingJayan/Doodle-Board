import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="min-h-screen flex flex-col md:flex-row items-center justify-center p-8 gap-12 bg-pattern overflow-hidden"
      [class.animate-fallOff]="isExiting() && !themeService.reduceMotion()"
    >

      <div class="flex-1 max-w-md text-center md:text-left">
        <h1 class="text-6xl md:text-8xl mb-4 text-brand drop-shadow-sm rotate-[-2deg]" [class.animate-wiggle]="!themeService.reduceMotion()">
          Doodle<br>Board
        </h1>
        <p class="text-2xl mb-8 font-light text-gray-700 leading-relaxed">
          A messy place for your ideas. <br>
          <span class="text-sm opacity-60 flex items-center justify-center md:justify-start gap-2 mt-2">
            Created by Jayan Patel
            <a href="https://jayanpatel.vercel.app" target="_blank" class="text-lg hover:scale-125 transition-transform no-underline" title="Portfolio">🌐</a>
            <a href="https://github.com/KingJayan" target="_blank" class="text-lg hover:scale-125 transition-transform no-underline" title="GitHub">🐙</a>
          </span>
        </p>

        <div class="flex flex-col gap-4 items-center md:items-start">
          <button (click)="startExit()" class="doodle-btn bg-accent-yellow text-2xl px-8 py-3 transform rotate-1 hover:rotate-2 hover:scale-105 transition-all">
            Start Brainstorming ->
          </button>

          <div class="text-sm text-gray-400 mt-8 max-w-xs border-l-2 border-gray-300 pl-4 italic">
            Local-only · No account · No sync
          </div>
        </div>
      </div>

      <div class="flex-1 max-w-md">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto drop-shadow-xl transform rotate-3 hover:rotate-6 transition-transform duration-500">
          <path fill="#ffffff" d="M43.6,-74.6C56.6,-68.1,67.6,-57.8,75.9,-46.2C84.2,-34.5,89.8,-21.5,88.7,-8.9C87.6,3.7,79.9,15.9,71.2,27.1C62.5,38.2,52.8,48.3,41.4,56.7C30,65.1,16.8,71.7,3.1,72.2C-10.6,72.7,-24.8,67,-37.2,59.3C-49.6,51.6,-60.2,41.9,-68.9,30.3C-77.6,18.7,-84.3,5.2,-83.4,-7.8C-82.5,-20.8,-73.9,-33.3,-63.3,-42.6C-52.7,-51.9,-40.1,-58,-27.9,-64.9C-15.7,-71.8,-3.9,-79.6,9.1,-81.2C22.1,-82.8,30.6,-81.1,43.6,-74.6Z" transform="translate(100 100)" stroke="#333" stroke-width="2" />

          <path d="M30 120 C 38 95, 70 95, 66 122 C 63 142, 40 140, 48 118 C 56 96, 88 100, 88 118"
                stroke="#5b8def" stroke-width="4" fill="none" stroke-linecap="round" />

          <g fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M58 64 C 54 56, 66 52, 68 60 C 70 70, 56 74, 50 64 C 44 50, 66 44, 78 56"
                  stroke="#ff6b6b" stroke-width="3.5" />
            <path d="M150 138 C 146 130, 134 134, 138 144 C 140 150, 150 156, 150 156 C 150 156, 160 150, 162 144 C 166 134, 154 130, 150 138 Z"
                  stroke="#4ecdc4" stroke-width="3.5" fill="#4ecdc4" />
            <g stroke="#ffcc00" stroke-width="3">
              <path d="M118 52 v10 M113 57 h10" />
              <path d="M55 150 v8 M51 154 h8" />
              <path d="M168 96 v8 M164 100 h8" />
            </g>
          </g>

          <g stroke="#333" stroke-width="2.5" stroke-linecap="round">
            <path d="M96 132 l 8 6" />
            <path d="M100 124 l 9 3" />
          </g>

          <g transform="rotate(-40 88 118)">
            <path d="M88 118 L106 109 L106 127 Z" fill="#333" />
            <rect x="106" y="109" width="48" height="18" fill="#ffcc00" stroke="#333" stroke-width="2.5" />
            <path d="M108 109 v18 M114 109 v18" stroke="#333" stroke-width="1.2" opacity="0.5" />
            <rect x="154" y="109" width="7" height="18" fill="#bbb" stroke="#333" stroke-width="2.5" />
            <rect x="161" y="109" width="11" height="18" rx="5" fill="#ff6b6b" stroke="#333" stroke-width="2.5" />
          </g>
        </svg>
      </div>
    </div>
  `,
  styles: [`
    .bg-pattern {
      background-image: radial-gradient(#e5e5e5 2px, transparent 2px);
      background-size: 30px 30px;
    }
    .animate-wiggle {
      animation: wiggle 3s ease-in-out infinite;
    }
    @keyframes wiggle {
      0%, 100% { transform: rotate(-2deg); }
      50% { transform: rotate(2deg); }
    }
    .animate-fallOff {
      animation: fallOff 0.8s ease-in forwards;
    }
    @keyframes fallOff {
      0% { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(100vh) rotate(10deg); opacity: 0; }
    }
  `]
})
export class LandingComponent {
  private router = inject(Router);
  themeService = inject(ThemeService);
  isExiting = signal(false);

  startExit() {
    if (this.themeService.reduceMotion()) {
      this.router.navigate(['/board']);
      return;
    }
    this.isExiting.set(true);
    setTimeout(() => this.router.navigate(['/board']), 700);
  }
}
