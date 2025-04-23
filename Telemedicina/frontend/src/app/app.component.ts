import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterOutlet } from '@angular/router';
import { RegistLoginComponent } from './view/guest/pages/regist-login/regist-login.component';
import { NgStyle } from '@angular/common';


@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  imports: [
    IonicModule,
    RouterOutlet,
    RegistLoginComponent,
    NgStyle
  ]
})
export class AppComponent {}
