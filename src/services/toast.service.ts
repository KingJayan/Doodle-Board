import { Injectable, signal } from '@angular/core';

export interface ToastAction {
  label: string;
  callback: () => void;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  action?: ToastAction;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private counter = 0;

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', action?: ToastAction) {
    const id = this.counter++;
    this.toasts.update(current => {
      const next = [...current, { id, message, type, action }];
      return next.length > 5 ? next.slice(next.length - 5) : next;
    });
    if (type !== 'warning' || !action) setTimeout(() => this.dismiss(id), action ? 7000 : 3000);
  }

  dismiss(id: number) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}
