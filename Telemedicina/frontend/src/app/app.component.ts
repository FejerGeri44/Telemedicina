import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `<ion-app><router-outlet></router-outlet></ion-app>`,
  imports: [IonicModule, RouterOutlet]
})
export class AppComponent {

}
