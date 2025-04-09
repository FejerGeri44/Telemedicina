import { bootstrapApplication } from '@angular/platform-browser';
import { mainPageConfig } from './app/shared/pages/main/mainPage.config';
import { MainPage } from './app/shared/pages/main/mainPage';

bootstrapApplication(MainPage, mainPageConfig)
  .catch((err) => console.error(err));
