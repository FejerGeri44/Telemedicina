import { Component } from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import { Router, RouterLinkActive, RouterModule } from '@angular/router';
import {LogoutModalComponent} from '../../../../shared/logout-modal/logout-modal.component';

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

  constructor(private router: Router, private modalCtrl: ModalController) {}

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

  async confirmLogout() {
    const modal = await this.modalCtrl.create({
      component: LogoutModalComponent,
      cssClass: 'custom-logout-modal',
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data === true) {
      localStorage.clear();
      void this.router.navigate(['/regist-login'], { queryParams: { tab: 'login' } });
    }
  }

  navigateTo(route: string) {
    void this.router.navigate([route]);
  }

  isActiveRoute(route: string): boolean {
    return location.pathname === route;
  }
}
