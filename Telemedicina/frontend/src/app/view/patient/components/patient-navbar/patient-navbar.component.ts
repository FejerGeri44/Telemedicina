import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { NgIf } from '@angular/common';
import { Router, RouterLinkActive, RouterModule } from '@angular/router';

@Component({
  selector: 'app-patient-navbar',
  imports: [
    IonicModule,
    NgIf,
    RouterLinkActive,
    RouterModule
  ],
  templateUrl: './patient-navbar.component.html',
  standalone: true,
  styleUrl: './patient-navbar.component.css'
})
export class PatientNavbarComponent {
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
