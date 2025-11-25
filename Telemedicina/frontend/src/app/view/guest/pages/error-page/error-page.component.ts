import { Component } from '@angular/core';
import { Location, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GuestFooterComponent } from '../../components/guest-footer/guest-footer.component';
import { GuestNavbarComponent } from '../../components/guest-navbar/guest-navbar.component';
import { IONIC_COMPONENTS } from '../../../../shared/ionic-imports';
import {UserService} from '../../../../services/user/user.service';

@Component({
  selector: 'app-error-page',
  imports: [
    ...IONIC_COMPONENTS,
    GuestNavbarComponent,
    GuestFooterComponent,
    CommonModule
  ],
  templateUrl: './error-page.component.html',
  standalone: true,
  styleUrl: './error-page.component.scss'
})
export class ErrorPageComponent {
  isAuthenticated = false;

  constructor(
    private location: Location,
    private router: Router,
    private userService: UserService
  ) {
    this.userService.user$().subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      void this.router.navigate(['/']);
    }
  }

  goToHome() {
    void this.router.navigate(['/']);
  }
}
