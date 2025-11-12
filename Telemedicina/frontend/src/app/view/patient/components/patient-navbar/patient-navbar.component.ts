import {Component, HostListener, OnInit} from '@angular/core';
import {IonicModule, NavController} from '@ionic/angular';
import {AsyncPipe, NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {NavigationEnd, Router, RouterLinkActive, RouterModule} from '@angular/router';
import {filter, finalize, firstValueFrom, Observable, Subscription, take} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {UnreadMessage} from '../../../../utils/interfaces/message.interface';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {UserService} from '../../../../services/user/user.service';

@Component({
  selector: 'app-patient-navbar',
  imports: [
    IonicModule,
    NgIf,
    RouterLinkActive,
    RouterModule,
    NgForOf,
    NgOptimizedImage,
    AsyncPipe
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

  unreadMessages: UnreadMessage[] = [];
  unreadCount = 0;

  menuItems = [
    { icon: 'home', label: 'Profil', route: 'patient-home' },
    { icon: 'search', label: 'Orvos kereső', route: 'doctor-search' },
    { icon: 'calendar', label: 'Időpontjaim', route: 'appointment-list' },
    { icon: 'fitness', label: 'Egészségügyi napló', route: 'health-diary' },
    { icon: 'chatbubbles', label: 'Üzenetek', route: 'patient-messages' },
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    protected userService: UserService,
    private nav: NavController,
    private alert: AlertService
  ) {
    this.user = this.userService.patient$();
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

  public getUnreadMessages() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.post<{unread:any[], count:number}>(
      'http://localhost:3000/api/getUnreadMessages',
      {
        role: 'patient',
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
}
