import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent) },
  { path: 'board', loadComponent: () => import('./pages/board/board.component').then(m => m.BoardComponent) },
  { path: 's/:token', loadComponent: () => import('./pages/shared-board/shared-board.component').then(m => m.SharedBoardComponent) },
  { path: '**', redirectTo: '' }
];
