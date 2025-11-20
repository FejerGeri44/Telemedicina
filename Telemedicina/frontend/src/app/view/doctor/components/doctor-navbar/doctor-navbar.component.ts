import {Component, HostListener, OnInit} from '@angular/core';
import {IonicModule, ModalController, NavController} from '@ionic/angular';
import {
  AsyncPipe,
  DatePipe,
  NgForOf,
  NgIf,
  NgOptimizedImage,
  NgTemplateOutlet,
  SlicePipe,
  TitleCasePipe
} from '@angular/common';
import {NavigationEnd, Router, RouterLinkActive, RouterModule} from '@angular/router';
import {combineLatest, filter, Observable, Subscription} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {UserService} from '../../../../services/user/user.service';
import {UnreadMessageData} from '../../../../utils/interfaces/message.interface';
import {UnreadMessageService} from '../../../../services/UnreadMessages/unread-messages.service';
import {SystemMessage} from '../../../../utils/interfaces/system-message.interface';
import {map} from 'rxjs/operators';
import {SystemMessageService} from '../../../../services/system-messages/system-messages.service';
import {SystemMessageModalComponent} from '../../../../shared/system-message-modal/system-message-modal.component';
import {ToastService} from '../../../../shared/toast/toast.service';
import {SettingsModalComponent} from '../../../../shared/settings-modal/settings-modal.component';
import {getUserRoleLabel} from '../../../../utils/formatProfileData';

@Component({
  selector: 'app-doctor-navbar',
  imports: [
    IonicModule,
    NgIf,
    RouterLinkActive,
    RouterModule,
    NgForOf,
    NgOptimizedImage,
    AsyncPipe,
    NgTemplateOutlet,
    DatePipe,
    SlicePipe,
    TitleCasePipe
  ],
  templateUrl: './doctor-navbar.component.html',
  standalone: true,
  styleUrl: './doctor-navbar.component.scss'
})
export class DoctorNavbarComponent implements OnInit{
  user: Observable<DoctorItem | null>;
  profileOpen = false;
  mobileMenuOpen = false;
  notificationsOpen = false;
  private navSub?: Subscription;

  menuItems = [
    { icon: 'home', label: 'Profil', route: 'doctor-home' },
    { icon: 'people', label: 'Pácienseim', route: 'my-patients' },
    { icon: 'clipboard', label: 'Új diagnózis', route: 'new-diagnosis' },
    { icon: 'document-attach', label: 'Dokumentum feltöltés', route: 'document-upload' },
    { icon: 'calendar', label: 'Rendelési időpontjaim', route: 'appointments' },
    { icon: 'chatbubbles', label: 'Üzenetek', route: 'doctor-messages' }
  ];

  unreadCount$: Observable<number>;
  public unreadSystemMessageCount$: Observable<number>;
  public unreadChatCount$: Observable<number>;

  latestUnreadMessages$!: Observable<UnreadMessageData[]>;
  public allSystemMessages$: Observable<SystemMessage[]>;

  constructor(
    private http: HttpClient,
    private router: Router,
    protected userService: UserService,
    private nav: NavController,
    private alert: AlertService,
    private toast: ToastService,
    private modalCtrl: ModalController,
    private unreadMessageService: UnreadMessageService,
    private systemMessageService: SystemMessageService,
  ) {
    this.user = this.userService.doctor$();

    this.unreadSystemMessageCount$ = this.systemMessageService.unreadCount$;
    this.unreadChatCount$ = this.unreadMessageService.totalCount$;

    this.latestUnreadMessages$ = this.unreadMessageService.latestUnreadMessages$;
    this.allSystemMessages$ = this.systemMessageService.allSystemMessages$;

    this.unreadCount$ = combineLatest([
      this.unreadChatCount$,
      this.systemMessageService.unreadCount$,
    ]).pipe(
      map(([chatCount, systemCount]) =>
        chatCount + systemCount
      )
    );
  }

  ngOnInit() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {});
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.closeAllDrawers());

    void this.unreadMessageService.fetchUnreadSummary();
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

  goToMessages(partnerId: number) {
    this.closeAllDrawers();
    void this.router.navigate(['/doctor/doctor-messages', partnerId]);
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
