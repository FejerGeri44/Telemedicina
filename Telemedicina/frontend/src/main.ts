import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { initializeApp } from 'firebase/app';
import { environment } from '../../backend/config/enviroment';
bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
initializeApp(environment.firebaseConfig);
