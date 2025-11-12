import {Component} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {Location} from '@angular/common';
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
  constructor(private location: Location) {}

  goBack() {
    this.location.back();
  }
}
