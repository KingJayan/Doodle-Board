import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app.component';
import './styles.css';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimationsAsync(),
    provideZonelessChangeDetection()
  ]
}).catch((err) => console.error(err));
