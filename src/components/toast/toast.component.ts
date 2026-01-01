
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-6 right-6 z-[150] flex flex-col gap-3 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="pointer-events-auto bg-white min-w-[280px] max-w-sm p-4 relative shadow-lg transform transition-all duration-300 animate-slideIn doodle-border flex flex-col gap-2"
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
              @if (toast.type === 'success') { ✅ }
              @if (toast.type === 'error') { ❌ }
              @if (toast.type === 'info') { 📌 }
              @if (toast.type === 'warning') { ⚠️ }
            </div>
            <div class="pt-1 text-black font-hand text-xl leading-snug flex-grow">
              {{ toast.message }}
            </div>
            <button (click)="toastService.dismiss(toast.id)" class="text-gray-400 hover:text-black self-start text-xl">×</button>
          </div>

          <!--action btn -->
          @if (toast.action) {
            <div class="flex justify-end mt-2">
              <button 
                (click)="handleAction(toast)" 
                class="bg-black text-white px-4 py-2 rounded text-base font-bold font-hand hover:scale-105 transition-transform"
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
      font-family: 'Patrick Hand', cursive;
    }
    .animate-slideIn {
      animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
