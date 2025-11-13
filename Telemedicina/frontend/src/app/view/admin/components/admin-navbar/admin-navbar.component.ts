import {Component, HostListener, OnInit} from '@angular/core';
import {IonicModule, NavController} from '@ionic/angular';
import {AsyncPipe, NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {NavigationEnd, Router, RouterLinkActive, RouterModule} from '@angular/router';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {delay, filter, firstValueFrom, Observable, Subscription, take} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {AdminItem} from '../../../../utils/interfaces/admin.interface';
import {UserService} from '../../../../services/user/user.service';

@Component({
  selector: 'app-admin-navbar',
  imports: [
    IonicModule,
    NgIf,
    RouterLinkActive,
    RouterModule,
    NgForOf,
    NgOptimizedImage,
    AsyncPipe
  ],
  templateUrl: './admin-navbar.component.html',
  standalone: true,
  styleUrl: './admin-navbar.component.scss'
})
export class AdminNavbarComponent implements OnInit{
  user!: Observable<AdminItem | null>;
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
    private nav: NavController,
    protected userService: UserService,
    private alert: AlertService
  ) {
    this.user = this.userService.admin$();

    (async () => {
      const userValue = await firstValueFrom(
        this.userService.admin$().pipe(
          filter((u): u is AdminItem => !!u),
          take(1),
          delay(50)
        )
      );
    })();
  }

  ngOnInit() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {});
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.closeMobileMenu());
  }

  confirmLogout() {
    void this.alert.show(
      'Kijelentkezés',
      'Biztosan ki szeretnél jelentkezni?',
      () => this.logout()
    )
  }

  logout() {
    this.userService.logout().subscribe(() => this.nav.navigateRoot('/regist-login?tab=login'));
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

  confirmAccountDelete() {
    void this.alert.show(
      'Fiók törlése',
      'Biztosan törölni szeretnéd a fiókodat? Ez a funkció visszafordíthatatlan!', // <-- Megmarad a \n
      () => this.deleteAccount()
    )
  }

  deleteAccount() {
    this.userService.deleteAccount().subscribe(() => this.nav.navigateRoot('/regist-login?tab=login'));
  }
}
