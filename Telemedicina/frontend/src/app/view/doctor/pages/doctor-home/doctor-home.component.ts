import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {IonicModule, ModalController} from '@ionic/angular';
import {
  DoctorEditProfileModalComponent
} from '../../components/doctor-edit-profile-modal/doctor-edit-profile-modal.component';
import {RouterLink} from '@angular/router';
import {DoctorProfileCardComponent} from '../../components/doctor-profile-card/doctor-profile-card.component';
import {SystemMessageModalComponent} from '../../../../shared/system-message-modal/system-message-modal.component';
import {SystemMessage} from '../../../../utils/interfaces/commonInterfaces';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {UserService} from '../../../../shared/user.service';
import {Appointment} from '../../../../utils/interfaces/appointment.inteface';
import {environment} from '../../../../../../../backend/config/enviroment';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {ToastService} from '../../../../shared/toast/toast.service';
import {AsyncPipe, DecimalPipe, NgForOf, NgIf} from '@angular/common';
import {buildStarIcons, roundToHalf} from '../../../../utils/formatDoctorRating';
import {delay, filter, firstValueFrom, Observable, Subject, take, takeUntil} from 'rxjs';

@Component({
  selector: 'app-doctor-home',
  imports: [
    IonicModule,
    RouterLink,
    DoctorProfileCardComponent,
    DecimalPipe,
    NgForOf,
    AsyncPipe,
    NgIf
  ],
  templateUrl: './doctor-home.component.html',
  standalone: true,
  styleUrl: './doctor-home.component.scss'
})
export class DoctorHomeComponent implements OnInit, OnDestroy{
  user: Observable<DoctorItem | null>;
  appointments: Appointment[] = [];
  systemMessages: SystemMessage[] = [];

  todaysAppointments: number = 0;
  roundedRating = 0;
  starIcons: string[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController,
    protected userService: UserService,
    private cdr: ChangeDetectorRef,
    private alert: AlertService,
    private toast: ToastService
  ) {
    this.user = this.userService.doctor$();

    (async () => {
      const userValue = await firstValueFrom(
        this.userService.doctor$().pipe(
          filter((u): u is DoctorItem => !!u),
          take(1),
          delay(50)
        )
      );

      await void this.loadAppointments();
    })();
  }

  ngOnInit() {
    this.user
      .pipe(takeUntil(this.destroy$))
      .subscribe(u => this.updateRatingStars(u));

    this.loadSystemMessagesOnceAfterLogin();
  }

  private async getDoctorId(): Promise<number | null> {
    const user = await firstValueFrom(this.user);
    return user?.doctor.id ?? null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSystemMessagesOnceAfterLogin(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    const key = `System-Messages`;
    const alreadyShown = localStorage.getItem(key) === '1';
    if (alreadyShown) return;

    const payload = { audiences: ['all', 'doctor'] };
    this.http.post<SystemMessage[]>(
      'http://localhost:3000/api/system-messages-for-me',
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: (res) => {
        this.systemMessages = res ?? [];
        void this.presentSystemMessagesModalsOnce();
        localStorage.setItem(key, '1');
      },
      error: (err) => console.error('❌ Rendszerüzenetek lekérése sikertelen:', err)
    });
  }

  async presentSystemMessagesModalsOnce(): Promise<void> {
    const token = localStorage.getItem('token');
    if (!token) return;

    const messages = this.systemMessages ?? [];
    if (!messages.length) return;

    const unseen = messages.filter(m => !localStorage.getItem(`System-Messages`));
    if (!unseen.length) return;

    for (const message of unseen) {
      const modal = await this.modalCtrl.create({
        component: SystemMessageModalComponent as any,
        componentProps: {
          messages: [message],
        },
        cssClass: 'system-message-modal',
        canDismiss: true,
        backdropDismiss: true,
      });

      await modal.present();
      await modal.onDidDismiss();

      localStorage.setItem(`System-Messages`, '1');
    }
  }

  async loadAppointments(): Promise<Appointment[] | null> {
    const doctorId = await this.getDoctorId();
    if (!doctorId) {
      this.toast.show('Hiányzik az orvos azonosító.', 'danger');
      return null;
    }

    return new Promise<Appointment[] | null>((resolve) => {
      this.http.post<Appointment[]>(
        `${environment.apiUrl}/doctor/myAppointments`,
        { id: doctorId },
        { withCredentials: true }
      ).subscribe({
        next: async (appointments) => {
          this.appointments = appointments;
          this.setTodaysAppointmentsFrom(this.appointments);
          Promise.resolve().then(() => this.cdr.markForCheck?.());

          resolve(appointments);
        },
        error: (err) => {
          console.error('❌ Hiba az időpontok lekérésekor:', err);
          this.toast.show('Nem sikerült betölteni az időpontokat.', 'danger');
          resolve(null);
        }
      });
    });
  }

  private parseToDate(src: string): Date | null {
    if (!src) return null;

    const re = /^(\d{4}):(\d{2}):(\d{2}):(\d{2}):(\d{2})$/;
    const m = src.match(re);
    if (m) {
      const y  = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const d  = parseInt(m[3], 10);
      const hh = parseInt(m[4], 10);
      const mm = parseInt(m[5], 10);
      return new Date(y, mo, d, hh, mm, 0, 0);
    }

    const dt = new Date(src);
    return isNaN(dt.getTime()) ? null : dt;
  }

  private isTodayAndNotPast(appt: Appointment, now = new Date()): boolean {
    const dt = this.parseToDate(appt.from);
    if (!dt) return false;

    const sameDay =
      dt.getFullYear() === now.getFullYear() &&
      dt.getMonth() === now.getMonth() &&
      dt.getDate() === now.getDate();

    if (!sameDay) return false;

    return dt.getTime() >= now.getTime();
  }

  setTodaysAppointmentsFrom(appts: Appointment[]): number {
    if (!Array.isArray(appts) || appts.length === 0) {
      this.todaysAppointments = 0;
      return 0;
    }

    const count = appts.reduce((acc, a) => {
      if (!this.isTodayAndNotPast(a)) return acc;
      return acc + 1;
    }, 0);

    this.todaysAppointments = count;
    return count;
  }

  updateRatingStars(u: DoctorItem | null): void {
    const r = roundToHalf(u?.doctor?.avgRating ?? 0);
    this.roundedRating = r;
    this.starIcons = buildStarIcons(r);
    this.cdr?.markForCheck?.();
  }

  async openEditModal() {
    const user = await firstValueFrom(this.user.pipe(take(1)));

    const modal = await this.modalCtrl.create({
      component: DoctorEditProfileModalComponent as any,
      cssClass: 'Profile-edit-modal',
      componentProps: {
        user,
      }
    });

    await modal.present();

    const { role } = await modal.onDidDismiss();

    if (role === 'updated') {
    }
  }
}
