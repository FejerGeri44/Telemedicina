import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import { ModalController } from '@ionic/angular/standalone';
import {
  DoctorEditProfileModalComponent
} from '../../components/doctor-edit-profile-modal/doctor-edit-profile-modal.component';
import {RouterLink} from '@angular/router';
import {DoctorProfileCardComponent} from '../../components/doctor-profile-card/doctor-profile-card.component';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {UserService} from '../../../../services/user/user.service';
import {Appointment} from '../../../../utils/interfaces/appointment.inteface';
import {environment} from '../../../../../../enviroment';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {ToastService} from '../../../../shared/toast/toast.service';
import {AsyncPipe, DecimalPipe, NgForOf, NgIf} from '@angular/common';
import {buildStarIcons, roundToHalf} from '../../../../utils/formatDoctorRating';
import {delay, filter, firstValueFrom, Observable, Subject, take, takeUntil} from 'rxjs';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';

@Component({
  selector: 'app-doctor-home',
  imports: [
    ...IONIC_COMPONENTS,
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
  doctorId: number | null = null;

  appointments: Appointment[] = [];

  todaysAppointments: number = 0;
  myPatients: number = 0;
  unreadSummary: Map<number, number> = new Map();
  pendingAppointments: number = 0;
  rejectedAppointments: number = 0;

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

      await void this.countRejectedApplications();
      await void this.countNewApplications();
      await void this.loadAppointments();
      await void this.loadMyPatients();
    })();
  }

  async ngOnInit() {
    this.doctorId = await this.getDoctorUserId();

    this.user
      .pipe(takeUntil(this.destroy$))
      .subscribe(u => this.updateRatingStars(u));
  }

  private async getDoctorId(): Promise<number | null> {
    const user = await firstValueFrom(this.user);
    return user?.doctor.id ?? null;
  }

  private async getDoctorUserId(): Promise<number | null> {
    const user = await firstValueFrom(this.user);
    return user?.user.id ?? null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get unreadCountsArray(): number[] {
    if (this.unreadSummary.size === 0) {
      return [0];
    }

    return [...this.unreadSummary.values()];
  }

  async loadAppointments(): Promise<Appointment[] | null> {
    const doctorId = await this.getDoctorId();
    if (!doctorId) {
      this.toast.show('Hiányzik az orvos azonosító.', 'danger');
      return null;
    }

    return new Promise<Appointment[] | null>((resolve) => {
      this.http.post<Appointment[]>(
        `${environment.apiUrl}/doctor/getMyAppointments`,
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

  async loadMyPatients() {
    const doctorId = await this.getDoctorId();
    if (!doctorId) {
      this.toast.show('Hiányzik az orvos azonosító.', 'danger');
      return null;
    }
    return new Promise<PatientItem[] | null>((resolve) => {
      this.http.post<PatientItem[]>(
        `${environment.apiUrl}/doctor/getAllMyPatients`,
        { id: doctorId },
        { withCredentials: true }
      ).subscribe({
        next: (res) => {
          this.myPatients = res.length;
          resolve(res);
        },
        error: (err) => {
          console.error('❌ Nem sikerült lekérni a pácienseket:', err);
          resolve(null);
        }
      });
    });
  }

  async countNewApplications() {
    const doctorId = await this.getDoctorId();
    if (!doctorId) {
      this.toast.show('Hiányzik az orvos azonosító.', 'danger');
      return null;
    }
    return new Promise<number | null>((resolve) => {
      this.http.post<number>(
        `${environment.apiUrl}/doctor/countMyPendingAppointments`,
        { id: doctorId },
        { withCredentials: true }
      ).subscribe({
        next: (res) => {
          this.pendingAppointments = res;
          resolve(res);
        },
        error: (err) => {
          console.error('❌ Nem sikerült lekérni a pácienseket:', err);
          resolve(null);
        }
      });
    });
  }

  async countRejectedApplications() {
    const doctorId = await this.getDoctorId();
    if (!doctorId) {
      this.toast.show('Hiányzik az orvos azonosító.', 'danger');
      return null;
    }
    return new Promise<number | null>((resolve) => {
      this.http.post<number>(
        `${environment.apiUrl}/doctor/countMyRejections`,
        { id: doctorId },
        { withCredentials: true }
      ).subscribe({
        next: (res) => {
          this.rejectedAppointments = res;
          resolve(res);
        },
        error: (err) => {
          console.error('❌ Nem sikerült lekérni a pácienseket:', err);
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
    const dt = this.parseToDate(appt.starts_at);
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
    const rawRating = Number(u?.doctor?.avgRating ?? 0);
    const r = roundToHalf(isNaN(rawRating) ? 0 : rawRating);

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
