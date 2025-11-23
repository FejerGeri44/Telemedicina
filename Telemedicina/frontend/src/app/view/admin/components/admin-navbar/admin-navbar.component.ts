import {Component, HostListener, OnInit} from '@angular/core';
import {ModalController, NavController} from '@ionic/angular/standalone';
import {
  AsyncPipe,
  DatePipe,
  NgForOf,
  NgIf,
  NgOptimizedImage,
  NgTemplateOutlet,
  SlicePipe
} from '@angular/common';
import {NavigationEnd, Router, RouterLinkActive, RouterModule} from '@angular/router';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {combineLatest, filter, Observable, Subscription} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {AdminItem} from '../../../../utils/interfaces/admin.interface';
import {UserService} from '../../../../services/user/user.service';
import {SystemMessage} from '../../../../utils/interfaces/system-message.interface';
import {SystemMessageModalComponent} from '../../../../shared/system-message-modal/system-message-modal.component';
import {map} from 'rxjs/operators';
import {ToastService} from '../../../../shared/toast/toast.service';
import {SystemMessageService} from '../../../../services/system-messages/system-messages.service';
import {SettingsModalComponent} from '../../../../shared/settings-modal/settings-modal.component';
import {getUserRoleLabel} from '../../../../utils/formatProfileData';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';

@Component({
  selector: 'app-admin-navbar',
  imports: [
    ...IONIC_COMPONENTS,
    NgIf,
    RouterLinkActive,
    RouterModule,
    NgForOf,
    NgOptimizedImage,
    AsyncPipe,
    NgTemplateOutlet,
    DatePipe,
    SlicePipe
  ],
  templateUrl: './admin-navbar.component.html',
  standalone: true,
  styleUrl: './admin-navbar.component.scss'
})
export class AdminNavbarComponent implements OnInit{
  user: Observable<AdminItem | null>;
  profileOpen = false;
  mobileMenuOpen = false;
  notificationsOpen = false;
  private navSub?: Subscription;

  menuItems = [
    { icon: 'home', label: 'Profil', route: 'admin-home' },
    { icon: 'people', label: 'Felhasználók', route: 'all-users' },
    { icon: 'id-card', label: 'Orvosi jelenzkezések', route: 'doctor-approvals' },
    { icon: 'paper-plane', label: 'Rendszerüzenet', route: 'system-messages' },
    { icon: 'hardware-chip', label: 'MI asszisztens', route: 'ai-assistants' }
  ];

  unreadCount$: Observable<number>;
  public unreadSystemMessageCount$: Observable<number>;
  public allSystemMessages$: Observable<SystemMessage[]>;

  constructor(
    private http: HttpClient,
    private router: Router,
    protected userService: UserService,
    private nav: NavController,
    private alert: AlertService,
    private toast: ToastService,
    private modalCtrl: ModalController,
    private systemMessageService: SystemMessageService,
  ) {
    this.user = this.userService.admin$();

    this.unreadSystemMessageCount$ = this.systemMessageService.unreadCount$;
    this.allSystemMessages$ = this.systemMessageService.allSystemMessages$;

    this.unreadCount$ = combineLatest([
      this.systemMessageService.unreadCount$,
    ]).pipe(
      map(([chatCount]) =>
        chatCount
      )
    );
  }

  ngOnInit() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {});
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.closeMobileMenu());

    this.systemMessageService.loadSystemMessagesOnceAfterLogin('doctor');
  }

  public isMessageUnread(messageId: number): boolean {
    return !this.systemMessageService.isMessageSeen(messageId);
  }

  async openSystemMessageModal(message: SystemMessage): Promise<void> {
    this.closeAllDrawers();

    const modal = await this.modalCtrl.create({
      component: SystemMessageModalComponent as any,
      componentProps: {
        messages: [message]
      },
      cssClass: 'system-message-modal',
      canDismiss: true,
      backdropDismiss: true,
    });

    await modal.present();
    await modal.onDidDismiss();

    this.systemMessageService.markMessageAsSeen(message.id);
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
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.closeMobileMenu();
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      this.notificationsOpen = false;
    }
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
    this.removeBodyNoScroll();
  }

  closeAllDrawers() {
    this.mobileMenuOpen = false;
    this.notificationsOpen = false;
    this.profileOpen = false;
    this.removeBodyNoScroll();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.mobileMenuOpen || this.notificationsOpen) {
      this.closeAllDrawers();
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 1000 && (this.mobileMenuOpen || this.notificationsOpen)) {
      this.closeAllDrawers();
    }
  }

  private removeBodyNoScroll() {
    document.body.classList.remove('no-scroll');
  }

  toggleProfileMenu(event?: MouseEvent) {
    event?.stopPropagation();
    this.profileOpen = !this.profileOpen;
  }

  async openSettingsModal() {
    this.closeAllDrawers();

    const modal = await this.modalCtrl.create({
      component: SettingsModalComponent as any,
      cssClass: 'settings-modal',
      canDismiss: true,
      backdropDismiss: true,
    });

    await modal.present();
  }

  protected readonly getUserRoleLabel = getUserRoleLabel;
}
