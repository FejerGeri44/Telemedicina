import { Component } from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import { Router, RouterLinkActive, RouterModule } from '@angular/router';
import {AlertService} from '../../../../shared/alert/alert.service.component';

@Component({
  selector: 'app-admin-navbar',
  imports: [
    IonicModule,
    NgIf,
    RouterLinkActive,
    RouterModule,
    NgClass,
    NgForOf
  ],
  templateUrl: './admin-navbar.component.html',
  standalone: true,
  styleUrl: './admin-navbar.component.css'
})
export class AdminNavbarComponent {
  user: any;
  isCollapsed = true;

  constructor(
    private router: Router,
    private alert: AlertService
  ) {}

  menuItems = [
    { icon: 'home', label: 'Profil', route: '/dashboard/admin' },
    { icon: 'people', label: 'Felhasználók', route: '/naplo' },
    { icon: 'reader', label: 'Orvosi jelentkezések', route: '/orvos-kereso' },
    { icon: 'paper-plane', label: 'Rendszerüzenetek', route: '/idopontok' },
    { icon: 'hardware-chip', label: 'MI asszisztens', route: '/ertesitesek' },
    { icon: 'settings-sharp', label: 'Beállítások', route: '/beallitasok' },
    { icon: 'log-out-outline', label: 'Kijelentkezés', route: '/logout' }
  ];

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  confirmLogout() {
    void this.alert.show(
      'Kijelentkezés',
      'Biztosan ki szeretnél jelentkezni?',
      () => this.logout()
    )
  }

  logout() {
    localStorage.removeItem('token');
    void this.router.navigate(
      ['/regist-login'],
      { queryParams: { tab: 'login' } }
    );
  }

  navigateTo(route: string) {
    void this.router.navigate([route]);
  }

  isActiveRoute(route: string): boolean {
    return location.pathname === route;
  }
}
