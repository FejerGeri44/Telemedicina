import {Component, HostListener, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgForOf, NgIf} from '@angular/common';
import {NavigationEnd, Router, RouterLinkActive, RouterModule} from '@angular/router';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {filter, Subscription} from 'rxjs';
import {HttpClient} from '@angular/common/http';

@Component({
  selector: 'app-admin-navbar',
  imports: [
    IonicModule,
    NgIf,
    RouterLinkActive,
    RouterModule,
    NgForOf
  ],
  templateUrl: './admin-navbar.component.html',
  standalone: true,
  styleUrl: './admin-navbar.component.css'
})
export class AdminNavbarComponent implements OnInit{
  user: any;
  pictureUrl: any;
  profileOpen = false;
  mobileMenuOpen = false;
  private navSub?: Subscription;

  menuItems = [
    { icon: 'home', label: 'Profil', route: '/dashboard/admin' },
    { icon: 'people', label: 'Felhasználók', route: '/all-users' },
    { icon: 'id-card', label: 'Orvosi jelenzkezések', route: '' },
    { icon: 'paper-plane', label: 'Rendszerüzenet', route: '' },
    { icon: 'hardware-chip', label: 'MI asszisztens', route: '' }
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

    this.http.get('http://localhost:3000/api/getAdminMe', {
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
