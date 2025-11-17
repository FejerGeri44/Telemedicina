import {Component, HostListener, OnInit} from '@angular/core';
import {IonicModule, NavController} from '@ionic/angular';
import {AsyncPipe, NgForOf, NgIf, NgOptimizedImage, NgTemplateOutlet} from '@angular/common';
import {NavigationEnd, Router, RouterLinkActive, RouterModule} from '@angular/router';
import {filter, Observable, Subscription} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {UserService} from '../../../../services/user/user.service';
import {UnreadMessageService} from '../../../../services/UnreadMessages/unread-messages.service';

@Component({
  selector: 'app-patient-navbar',
  imports: [
    IonicModule,
    NgIf,
    RouterLinkActive,
    RouterModule,
    NgForOf,
    NgOptimizedImage,
    AsyncPipe,
    NgTemplateOutlet
  ],
  templateUrl: './patient-navbar.component.html',
  standalone: true,
  styleUrl: './patient-navbar.component.scss'
})
export class PatientNavbarComponent implements OnInit{
  user: Observable<PatientItem | null>;
  profileOpen = false;
  mobileMenuOpen = false;
  private navSub?: Subscription;

  menuItems = [
    { icon: 'home', label: 'Profil', route: 'patient-home' },
    { icon: 'search', label: 'Orvos kereső', route: 'doctor-search' },
    { icon: 'calendar', label: 'Időpontjaim', route: 'appointment-list' },
    { icon: 'fitness', label: 'Egészségügyi napló', route: 'health-diary' },
    { icon: 'chatbubbles', label: 'Üzenetek', route: 'patient-messages' },
  ];

  unreadCount$: Observable<number>;

  constructor(
    private http: HttpClient,
    private router: Router,
    protected userService: UserService,
    private nav: NavController,
    private alert: AlertService,
    private unreadMessageService: UnreadMessageService
  ) {
    this.user = this.userService.patient$();
    this.unreadCount$ = this.unreadMessageService.totalCount$;
  }

  ngOnInit() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {});
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.closeMobileMenu());

    void this.unreadMessageService.fetchUnreadSummary();
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

  onNotifications() {
    void this.router.navigate(['patient/patient-messages']);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
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

  private removeBodyNoScroll() {
    document.body.classList.remove('no-scroll');
  }

  toggleProfileMenu(event?: MouseEvent) {
    event?.stopPropagation();
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
