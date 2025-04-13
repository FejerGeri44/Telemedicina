import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterOutlet } from '@angular/router';
import {RegistLoginComponent} from './view/guest/pages/regist-login/regist-login.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  imports: [
    IonicModule,
    RouterOutlet,
    RegistLoginComponent
  ]
})
export class AppComponent {}
