import {Component, HostListener, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgForOf, NgIf} from '@angular/common';
import {NavigationEnd, Router, RouterLinkActive, RouterModule} from '@angular/router';
import {filter, Subscription} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {UnreadMessage} from '../../../../utils/interfaces/commonInterfaces';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {UserService} from '../../../../shared/user.service';

@Component({
  selector: 'app-doctor-navbar',
  imports: [
    IonicModule,
    NgIf,
    RouterLinkActive,
    RouterModule,
    NgForOf
  ],
  templateUrl: './doctor-navbar.component.html',
  standalone: true,
  styleUrl: './doctor-navbar.component.css'
})
export class DoctorNavbarComponent implements OnInit{
  user!: DoctorItem;
  profileOpen = false;
  mobileMenuOpen = false;
  private navSub?: Subscription;

  unreadMessages: UnreadMessage[] = [];
  unreadCount = 0;

  menuItems = [
    { icon: 'home', label: 'Profil', route: 'doctor-home' },
    { icon: 'people', label: 'Pácienseim', route: 'my-patients' },
    { icon: 'clipboard', label: 'Új diagnózis', route: 'new-diagnosis' },
    { icon: 'document-attach', label: 'Dokumentum feltöltés', route: 'orvos-kereso' },
    { icon: 'calendar', label: 'Rendelési időpontjaim', route: 'appointments' },
    { icon: 'chatbubbles', label: 'Üzenetek', route: 'doctor-messages' }
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
    const cached = this.userService.getUserAsDoctor();
    if (cached) {
      this.user = cached;
      return;
    }
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

  public getUnreadMessages() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const userId = this.user?.user.id;
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
    void this.router.navigate(['doctor/doctor-messages']);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = true;
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
