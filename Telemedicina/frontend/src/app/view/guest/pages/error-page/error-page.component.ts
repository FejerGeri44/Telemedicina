import { Component } from '@angular/core';
import {Router} from '@angular/router';
import {IonicModule} from '@ionic/angular';
import {GuestFooterComponent} from '../../components/guest-footer/guest-footer.component';
import {GuestNavbarComponent} from '../../components/guest-navbar/guest-navbar.component';

@Component({
  selector: 'app-error-page',
  imports: [
    IonicModule,
    GuestNavbarComponent,
    GuestFooterComponent
  ],
  templateUrl: './error-page.component.html',
  standalone: true,
  styleUrl: './error-page.component.scss'
})
export class ErrorPageComponent {
  constructor(private router: Router) {}

  goToHome() {
    void this.router.navigate(['/']);
  }
}
