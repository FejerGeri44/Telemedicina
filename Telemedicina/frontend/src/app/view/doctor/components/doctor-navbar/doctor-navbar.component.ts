import {Component, OnInit} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {NavigationEnd, Router, RouterLinkActive, RouterModule} from '@angular/router';
import {LogoutModalComponent} from '../../../../shared/logout-modal/logout-modal.component';
import {filter} from 'rxjs';
import {HttpClient} from '@angular/common/http';

@Component({
  selector: 'app-doctor-navbar',
  imports: [
    IonicModule,
    NgIf,
    RouterLinkActive,
    RouterModule,
    NgClass,
    NgForOf
  ],
  templateUrl: './doctor-navbar.component.html',
  standalone: true,
  styleUrl: './doctor-navbar.component.css'
})
export class DoctorNavbarComponent implements OnInit{
  user: any;
  pictureUrl: any;
  profileOpen = false;

  menuItems = [
    { icon: 'home', label: 'Profil', route: '/dashboard/doctor' },
    { icon: 'people', label: 'Pácienseim', route: '/my-patients' },
    { icon: 'clipboard', label: 'Új diagnózis', route: '/new-diagnosis' },
    { icon: 'document-attach', label: 'Dokumentum feltöltés', route: '/orvos-kereso' },
    { icon: 'calendar', label: 'Rendelési időpontjaim', route: '/appointments' },
    { icon: 'chatbubbles', label: 'Üzenetek', route: '/doctor-messages' }
  ];

  constructor(private http: HttpClient, private router: Router, private modalCtrl: ModalController) {}

  ngOnInit() {
    this.getMyData();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
      });
  }

  getMyData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get('http://localhost:3000/api/getDoctorMe', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (user: any) => {
        this.user = user;
      },
      error: (err) => {
        console.error('❌ Felhasználó lekérése sikertelen:', err);
      }
    });
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

  onNotifications() {
    /* open notifications panel/modal */
  }

  toggleProfileMenu(ev?: Event) {
    ev?.stopPropagation();
    this.profileOpen = !this.profileOpen;
  }
}
