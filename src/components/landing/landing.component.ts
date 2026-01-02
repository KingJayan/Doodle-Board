import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="min-h-screen flex flex-col md:flex-row items-center justify-center p-8 gap-12 bg-pattern overflow-hidden"
      [class.animate-fallOff]="isExiting()"
    >
      
      <div class="flex-1 max-w-md text-center md:text-left">
        <h1 class="text-6xl md:text-8xl mb-4 text-[#ff6b6b] drop-shadow-sm rotate-[-2deg] animate-wiggle">
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
          <button (click)="startExit()" class="doodle-btn bg-[#ffd93d] text-2xl px-8 py-3 transform rotate-1 hover:rotate-2 hover:scale-105 transition-all">
            Start Brainstorming ->
          </button>
          
          <div class="text-sm text-gray-400 mt-8 max-w-xs border-l-2 border-gray-300 pl-4 italic">
            "It's like sticky notes, but online."
            <br>
            "A place where my ideas never get lost"
          </div>
        </div>
      </div>

      <div class="flex-1 max-w-md">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto drop-shadow-xl transform rotate-3 hover:rotate-6 transition-transform duration-500">
          <path fill="#ffffff" d="M43.6,-74.6C56.6,-68.1,67.6,-57.8,75.9,-46.2C84.2,-34.5,89.8,-21.5,88.7,-8.9C87.6,3.7,79.9,15.9,71.2,27.1C62.5,38.2,52.8,48.3,41.4,56.7C30,65.1,16.8,71.7,3.1,72.2C-10.6,72.7,-24.8,67,-37.2,59.3C-49.6,51.6,-60.2,41.9,-68.9,30.3C-77.6,18.7,-84.3,5.2,-83.4,-7.8C-82.5,-20.8,-73.9,-33.3,-63.3,-42.6C-52.7,-51.9,-40.1,-58,-27.9,-64.9C-15.7,-71.8,-3.9,-79.6,9.1,-81.2C22.1,-82.8,30.6,-81.1,43.6,-74.6Z" transform="translate(100 100)" stroke="#333" stroke-width="2" />
          
          <g stroke="#333" stroke-width="3" fill="none" stroke-linecap="round">
            <path d="M120 140 L160 100 L170 110 L130 150 Z" fill="#ffcc00" />
            <path d="M120 140 L110 150 L115 155 Z" fill="#333" />
            <path d="M50 80 Q 70 60, 90 80 T 130 80" stroke="#ff6b6b" />
            <path d="M60 110 Q 80 130, 100 110" stroke="#4ecdc4" />
            <circle cx="100" cy="100" r="5" fill="#333" />
            <circle cx="120" cy="80" r="3" fill="#333" />
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
  @Output() enter = new EventEmitter<void>();
  isExiting = signal(false);

  startExit() {
    this.isExiting.set(true);
    setTimeout(() => {
      this.enter.emit();
    }, 700);
  }
}
