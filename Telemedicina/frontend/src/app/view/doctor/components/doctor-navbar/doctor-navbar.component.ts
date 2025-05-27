import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { NgIf } from '@angular/common';
import { Router, RouterLinkActive, RouterModule } from '@angular/router';

@Component({
  selector: 'app-doctor-navbar',
  imports: [
    IonicModule,
    NgIf,
    RouterLinkActive,
    RouterModule
  ],
  templateUrl: './doctor-navbar.component.html',
  standalone: true,
  styleUrl: './doctor-navbar.component.css'
})
export class DoctorNavbarComponent {
  user: any;
  isExpanded = false;
  showLogoutPopup = false;

  constructor(private router: Router) {}

  toggleSidebar() {
    this.isExpanded = !this.isExpanded;
  }

  toggleLogoutPopup() {
    this.showLogoutPopup = !this.showLogoutPopup;
  }

  confirmLogout() {
    localStorage.clear();
    this.user = null;
    this.showLogoutPopup = false;
    this.router.navigate(['/regist-login'], { queryParams: { tab: 'login' } });
  }
}
