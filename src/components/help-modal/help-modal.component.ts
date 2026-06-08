import { Component, Output, EventEmitter, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-help-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-overlay flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="close.emit()">
      <div role="dialog" aria-modal="true" aria-labelledby="help-title" class="bg-[var(--paper-color)] p-8 rounded-lg max-w-2xl w-full m-4 shadow-xl doodle-border relative text-[var(--ink-color)] overflow-y-auto max-h-[90vh]" (click)="$event.stopPropagation()">
        <button (click)="close.emit()" class="absolute top-4 right-4 text-2xl hover:text-red-500" aria-label="Close">×</button>
        <h2 id="help-title" class="text-3xl marker-font mb-6 text-center">How to Doodle</h2>
        <div class="space-y-6">
          <div class="flex gap-4 items-start">
            <div class="text-4xl">📝</div>
            <div>
              <h3 class="font-bold text-xl">Creating & Editing</h3>
              <p>Click <strong>+ New Note</strong> to start. Drag notes to reorder them.</p>
            </div>
          </div>
          <div class="flex gap-4 items-start">
            <div class="text-4xl">📂</div>
            <div>
              <h3 class="font-bold text-xl">Folders</h3>
              <p>Use the sidebar to create folders and keep your notes organized.</p>
            </div>
          </div>
          <div class="flex gap-4 items-start">
            <div class="text-4xl">✨</div>
            @if (aiAvailable()) {
              <div>
                <h3 class="font-bold text-xl">Genie Powers</h3>
                <p>Use the <strong>Genie</strong> button to brainstorm topics. Inside the editor, use the <strong>Magic Pencil</strong> to fix grammar!</p>
              </div>
            } @else {
              <div>
                <h3 class="font-bold text-xl">AI Features Disabled</h3>
                <p>Set a <strong>VITE_API_KEY</strong> environment variable to enable Genie brainstorm and Magic Pencil polish.</p>
              </div>
            }
          </div>
        </div>
        <div class="mt-8 text-center">
          <button (click)="close.emit()" class="doodle-btn bg-yellow-200 text-black font-bold">Got it!</button>
        </div>
      </div>
    </div>
  `
})
export class HelpModalComponent {
  aiAvailable = input.required<boolean>();
  @Output() close = new EventEmitter<void>();
}
