import {Component, HostListener, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {NavigationEnd, Router, RouterLinkActive, RouterModule} from '@angular/router';
import {filter, Subscription} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {AlertService} from '../../../../shared/alert/alert.service.component';

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
  mobileMenuOpen = false;
  private navSub?: Subscription;

  unreadMessages: any[] = [];
  unreadCount = 0;

  menuItems = [
    { icon: 'home', label: 'Profil', route: '/dashboard/doctor' },
    { icon: 'people', label: 'Pácienseim', route: '/my-patients' },
    { icon: 'clipboard', label: 'Új diagnózis', route: '/new-diagnosis' },
    { icon: 'document-attach', label: 'Dokumentum feltöltés', route: '/orvos-kereso' },
    { icon: 'calendar', label: 'Rendelési időpontjaim', route: '/appointments' },
    { icon: 'chatbubbles', label: 'Üzenetek', route: '/doctor-messages' }
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private alert: AlertService
  ) {}

  ngOnInit() {
    this.getMyData();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
      });
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.closeMobileMenu());
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
        this.getUnreadMessages();
      },
      error: (err) => {
        console.error('❌ Felhasználó lekérése sikertelen:', err);
      }
    });
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

  getUnreadMessages() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const userId = this.user?.user?.id;
    if (!userId) return;

    this.http.post<{unread:any[], count:number}>(
      'http://localhost:3000/api/getUnreadMessages',
      {
        userId,
        role: 'doctor',
        limit: 200
      },
      {
        headers:
          { Authorization: `Bearer ${token}` }
      }
    ).subscribe({
      next: (res) => {
        this.unreadMessages = res.unread ?? [];
        this.unreadCount = res.count ?? this.unreadMessages.length;
      },
      error: (e) => console.error('getUnreadMessages error', e)
    });
  }

  onNotifications() {
    void this.router.navigate(['/doctor-messages']);
  }

  openMobileMenu() {
    this.mobileMenuOpen = true;
    this.addBodyNoScroll();
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
    this.profileOpen = false;
    this.removeBodyNoScroll();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.mobileMenuOpen) this.closeMobileMenu();
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 1000 && this.mobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  private addBodyNoScroll() {
    document.body.classList.add('no-scroll');
  }
  private removeBodyNoScroll() {
    document.body.classList.remove('no-scroll');
  }

  toggleProfileMenu(ev?: Event) {
    ev?.stopPropagation();
    this.profileOpen = !this.profileOpen;
  }
}
