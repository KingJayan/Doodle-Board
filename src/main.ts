import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import './styles.css';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations()
  ]
}).catch((err) => console.error(err));
