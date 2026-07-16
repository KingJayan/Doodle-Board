import { Component, Output, EventEmitter, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-help-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="fixed inset-0 z-overlay flex items-center justify-center bg-[var(--scrim)] backdrop-blur-sm" [class.animate-modalOut]="isClosing()" (click)="startClose()">
      <div role="dialog" aria-modal="true" aria-labelledby="help-title" class="bg-[var(--paper-color)] p-8 rounded-lg max-w-2xl w-full m-4 shadow-xl doodle-border relative text-[var(--ink-color)] overflow-y-auto max-h-[90vh]" (click)="$event.stopPropagation()">
        <button (click)="startClose()" class="absolute top-4 right-4 text-2xl hover:text-[var(--danger)]" aria-label="Close"><app-icon name="close"></app-icon></button>
        <h2 id="help-title" class="text-3xl marker-font mb-6 text-center">How to Doodle</h2>
        <div class="space-y-6">
          <div class="flex gap-4 items-start">
            <div class="text-4xl"><app-icon name="memo"></app-icon></div>
            <div>
              <h3 class="font-bold text-xl">Creating & Editing</h3>
              <p>Click <strong>+ New Note</strong> to start. Drag notes to reorder them.</p>
            </div>
          </div>
          <div class="flex gap-4 items-start">
            <div class="text-4xl"><app-icon name="folder-open"></app-icon></div>
            <div>
              <h3 class="font-bold text-xl">Boards</h3>
              <p>Use the sidebar to create boards and keep your notes organized.</p>
            </div>
          </div>
          <div class="flex gap-4 items-start">
            <div class="text-4xl"><app-icon name="sparkles"></app-icon></div>
            @if (aiAvailable()) {
              <div>
                <h3 class="font-bold text-xl">Genie Powers</h3>
                <p>Use the <strong>Genie</strong> button to brainstorm topics. Inside the editor, use the <strong>Magic Pencil</strong> to fix grammar!</p>
              </div>
            } @else {
              <div>
                <h3 class="font-bold text-xl">AI Features Disabled</h3>
                <p>Set the <strong>GEMINI_API_KEY</strong> Supabase secret to enable Genie brainstorm and Magic Pencil polish.</p>
              </div>
            }
          </div>
        </div>
        <div class="mt-8 text-center">
          <button (click)="startClose()" class="doodle-btn bg-[var(--accent)] text-[var(--paper-color)] font-bold">Got it!</button>
        </div>
      </div>
    </div>
  `
})
export class HelpModalComponent {
  aiAvailable = input.required<boolean>();
  @Output() close = new EventEmitter<void>();
  isClosing = signal(false);

  startClose() {
    this.isClosing.set(true);
    setTimeout(() => this.close.emit(), 150);
  }
}
