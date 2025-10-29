import {Component, HostListener, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {NavigationEnd, Router, RouterLinkActive, RouterModule} from '@angular/router';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {filter, Subscription} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {AdminItem} from '../../../../utils/interfaces/admin.interface';
import {UserService} from '../../../../shared/user.service';

@Component({
  selector: 'app-admin-navbar',
  imports: [
    IonicModule,
    NgIf,
    RouterLinkActive,
    RouterModule,
    NgForOf,
    NgOptimizedImage
  ],
  templateUrl: './admin-navbar.component.html',
  standalone: true,
  styleUrl: './admin-navbar.component.scss'
})
export class AdminNavbarComponent implements OnInit{
  user!: AdminItem;
  profileOpen = false;
  mobileMenuOpen = false;
  private navSub?: Subscription;

  menuItems = [
    { icon: 'home', label: 'Profil', route: 'admin-home' },
    { icon: 'people', label: 'Felhasználók', route: 'all-users' },
    { icon: 'id-card', label: 'Orvosi jelenzkezések', route: 'doctor-approvals' },
    { icon: 'paper-plane', label: 'Rendszerüzenet', route: 'system-messages' },
    { icon: 'hardware-chip', label: 'MI asszisztens', route: 'ai-assistants' }
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private userService: UserService,
    private alert: AlertService
  ) {}

  ngOnInit() {
    this.getUserData();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {});
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.closeMobileMenu());
  }

  private getUserData() {

  }

  confirmLogout() {
    void this.alert.show(
      'Kijelentkezés',
      'Biztosan ki szeretnél jelentkezni?',
      () => this.logout()
    )
  }

  logout() {
    void this.userService.logout();
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
