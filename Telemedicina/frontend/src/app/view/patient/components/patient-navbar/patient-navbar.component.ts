import {Component, HostListener, OnInit} from '@angular/core';
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
import {combineLatest, filter, firstValueFrom, Observable, Subscription} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {UserService} from '../../../../services/user/user.service';
import {UnreadMessageService} from '../../../../services/UnreadMessages/unread-messages.service';
import {DoctorRatingItem} from '../../../../utils/interfaces/doctor.interface';
import {SystemMessage} from '../../../../utils/interfaces/system-message.interface';
import {SystemMessageService} from '../../../../services/system-messages/system-messages.service';
import {SystemMessageModalComponent} from '../../../../shared/system-message-modal/system-message-modal.component';
import {map} from 'rxjs/operators';
import {DoctorRatingService} from '../../../../services/doctor-rating/doctor-rating.service';
import {DoctorRatingModalComponent} from '../doctor-rating-modal/doctor-rating-modal.component';
import {ToastService} from '../../../../shared/toast/toast.service';
import {UnreadMessageData} from '../../../../utils/interfaces/message.interface';
import {SettingsModalComponent} from '../../../../shared/settings-modal/settings-modal.component';
import {getUserRoleLabel} from '../../../../utils/formatProfileData';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';
import { ModalController } from '@ionic/angular/standalone';
import { NavController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-patient-navbar',
  imports: [
    ...IONIC_COMPONENTS,
    NgIf,
    RouterLinkActive,
    RouterModule,
    NgForOf,
    NgOptimizedImage,
    AsyncPipe,
    NgTemplateOutlet,
    TitleCasePipe,
    SlicePipe,
    DatePipe
  ],
  templateUrl: './patient-navbar.component.html',
  standalone: true,
  styleUrl: './patient-navbar.component.scss'
})
export class PatientNavbarComponent implements OnInit{
  user: Observable<PatientItem | null>;
  profileOpen = false;
  mobileMenuOpen = false;
  notificationsOpen = false;
  private navSub?: Subscription;

  menuItems = [
    { icon: 'home', label: 'Profil', route: 'patient-home' },
    { icon: 'search', label: 'Orvos kereső', route: 'doctor-search' },
    { icon: 'calendar', label: 'Időpontjaim', route: 'appointment-list' },
    { icon: 'fitness', label: 'Egészségügyi napló', route: 'health-diary' },
    { icon: 'chatbubbles', label: 'Üzenetek', route: 'patient-messages' },
  ];

  unreadCount$: Observable<number>;
  public unreadSystemMessageCount$: Observable<number>;
  public unreadChatCount$: Observable<number>;
  public pendingRatingsCount$: Observable<number>;

  latestUnreadMessages$!: Observable<UnreadMessageData[]>;
  public allSystemMessages$: Observable<SystemMessage[]>;
  public pendingRatings$: Observable<DoctorRatingItem[]>;

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
    private doctorRatingService: DoctorRatingService
  ) {
    this.user = this.userService.patient$();

    this.unreadSystemMessageCount$ = this.systemMessageService.unreadCount$;
    this.unreadChatCount$ = this.unreadMessageService.totalCount$;
    this.pendingRatingsCount$ = this.doctorRatingService.pendingCount$;

    this.latestUnreadMessages$ = this.unreadMessageService.latestUnreadMessages$;
    this.allSystemMessages$ = this.systemMessageService.allSystemMessages$;
    this.pendingRatings$ = this.doctorRatingService.pendingRatings$;
    void this.doctorRatingService.checkForRatingRequests(() => this.getPatientId());

    this.unreadCount$ = combineLatest([
      this.unreadChatCount$,
      this.systemMessageService.unreadCount$,
      this.pendingRatingsCount$
    ]).pipe(
      map(([chatCount, systemCount, ratingCount]) =>
        chatCount + systemCount + ratingCount
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
    this.systemMessageService.loadSystemMessagesOnceAfterLogin('patient');
  }

  private async getPatientId(): Promise<number | null> {
    const user = await firstValueFrom(this.user);
    return user?.patient.id ?? null;
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

  async showRatingModal(request: DoctorRatingItem): Promise<void> {
    this.closeAllDrawers();

    const modal = await this.modalCtrl.create({
      component: DoctorRatingModalComponent as any,
      componentProps: {
        rating: request
      },
      cssClass: 'doctor-rating-modal',
      canDismiss: true,
      backdropDismiss: true,
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data && data.action === 'submit') {
      this.doctorRatingService.completeRatingRequest(request.id);
      this.toast.show("Értékelés elküldve, köszönjük a visszajelzését!", "success");
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
    void this.router.navigate(['/patient/patient-messages', partnerId]);
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
