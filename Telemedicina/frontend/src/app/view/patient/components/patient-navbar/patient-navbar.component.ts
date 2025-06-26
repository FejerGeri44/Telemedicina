import { Component } from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import { Router, RouterLinkActive, RouterModule } from '@angular/router';
import {LogoutModalComponent} from '../../../../shared/logout-modal/logout-modal.component';

@Component({
  selector: 'app-patient-navbar',
  imports: [
    IonicModule,
    NgIf,
    RouterLinkActive,
    RouterModule,
    NgClass,
    NgForOf
  ],
  templateUrl: './patient-navbar.component.html',
  standalone: true,
  styleUrl: './patient-navbar.component.css'
})
export class PatientNavbarComponent {
  user: any;
  isCollapsed = true;

  constructor(private router: Router, private modalCtrl: ModalController) {}

  menuItems = [
    { icon: 'home', label: 'Profil', route: '/dashboard/patient' },
    { icon: 'fitness', label: 'Egészségügyi napló', route: '/naplo' },
    { icon: 'search', label: 'Orvos kereső', route: '/doctor-search' },
    { icon: 'calendar', label: 'Időpontjaim', route: '/idopontok' },
    { icon: 'notifications', label: 'Értesítések', route: '/ertesitesek' },
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
