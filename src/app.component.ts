import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingComponent } from './components/landing/landing.component';
import { BoardComponent } from './components/board/board.component';
import { ToastComponent } from './components/toast/toast.component';

type ViewState = 'landing' | 'board';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LandingComponent, BoardComponent, ToastComponent],
  template: `
    <app-toast></app-toast>
    @switch (view()) {
      @case ('landing') {
        <app-landing (enter)="view.set('board')"></app-landing>
      }
      @case ('board') {
        <app-board (goHome)="view.set('landing')"></app-board>
      }
    }
  `
})
export class AppComponent {
  view = signal<ViewState>('landing');
}
