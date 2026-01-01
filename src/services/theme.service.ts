
import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'paper' | 'chalkboard' | 'blueprint';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  currentTheme = signal<Theme>('paper');
  reduceMotion = signal<boolean>(false);

  constructor() {
    const savedTheme = localStorage.getItem('doodle_theme') as Theme;
    if (savedTheme) this.currentTheme.set(savedTheme);
    
    const savedMotion = localStorage.getItem('doodle_motion');
    if (savedMotion) this.reduceMotion.set(JSON.parse(savedMotion));

    effect(() => {
      this.applyTheme(this.currentTheme());
      localStorage.setItem('doodle_theme', this.currentTheme());
    });
    
    effect(() => {
       localStorage.setItem('doodle_motion', JSON.stringify(this.reduceMotion()));
    });
  }

  setTheme(theme: Theme) {
    this.currentTheme.set(theme);
  }

  toggleMotion() {
    this.reduceMotion.update(v => !v);
  }

  private applyTheme(theme: Theme) {
    const root = document.documentElement;
    
    if (theme === 'paper') {
      root.style.setProperty('--paper-color', '#fdfbf7');
      root.style.setProperty('--ink-color', '#2d2d2d');
      root.style.setProperty('--pencil-gray', '#555');
      root.style.setProperty('--grid-color', '#e5e5e5');
    } else if (theme === 'chalkboard') {
      root.style.setProperty('--paper-color', '#2b3035');
      root.style.setProperty('--ink-color', '#f0f0f0');
      root.style.setProperty('--pencil-gray', '#a0a0a0');
      root.style.setProperty('--grid-color', '#444');
    } else if (theme === 'blueprint') {
      root.style.setProperty('--paper-color', '#1e408a');
      root.style.setProperty('--ink-color', '#ffffff');
      root.style.setProperty('--pencil-gray', '#bfdbfe');
      root.style.setProperty('--grid-color', '#3b82f6');
    }
  }
}
