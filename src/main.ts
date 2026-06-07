import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import 'zone.js';
import './styles.css';

bootstrapApplication(AppComponent, {
  providers: []
}).catch((err) => console.error(err));
