
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="fixed bottom-6 right-6 z-toast flex flex-col gap-3 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto bg-[var(--surface)] text-[var(--ink-color)] min-w-[280px] max-w-sm p-4 relative shadow-lg transform transition-all duration-300 animate-slideIn doodle-border flex flex-col gap-2"
          [class.rotate-1]="toast.id % 2 === 0"
          [class.-rotate-1]="toast.id % 2 !== 0"
        >
          <div 
            class="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 opacity-80 shadow-sm"
            [class.bg-green-400]="toast.type === 'success'"
            [class.bg-red-400]="toast.type === 'error'"
            [class.bg-blue-400]="toast.type === 'info'"
            [class.bg-yellow-400]="toast.type === 'warning'"
            style="transform: rotate(-2deg);"
          ></div>

          <div class="flex items-start gap-3">
            <div class="text-3xl">
              @if (toast.type === 'success') { <app-icon name="check"></app-icon> }
              @if (toast.type === 'error') { <app-icon name="cross"></app-icon> }
              @if (toast.type === 'info') { <app-icon name="pin"></app-icon> }
              @if (toast.type === 'warning') { <app-icon name="warning"></app-icon> }
            </div>
            <div class="pt-1 text-[var(--ink-color)] font-hand text-xl leading-snug flex-grow">
              {{ toast.message }}
            </div>
            <button (click)="toastService.dismiss(toast.id)" class="text-muted hover:text-[var(--ink-color)] self-start text-xl">×</button>
          </div>

          <!--action btn -->
          @if (toast.action) {
            <div class="flex justify-end mt-2">
              <button 
                (click)="handleAction(toast)" 
                class="bg-[var(--ink-color)] text-[var(--paper-color)] px-4 py-2 rounded text-base font-bold font-hand hover:scale-105 transition-transform"
              >
                {{ toast.action.label }}
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .font-hand {
      font-family: var(--font-body);
    }
    .animate-slideIn {
      animation: slideIn 0.3s var(--ease-spring) forwards;
    }
    @keyframes slideIn {
      from { transform: translateY(100%) scale(0.8); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);

  handleAction(toast: any) {
    if (toast.action) {
      toast.action.callback();
      this.toastService.dismiss(toast.id);
    }
  }
}
