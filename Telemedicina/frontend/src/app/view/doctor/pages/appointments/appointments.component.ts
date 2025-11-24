import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import {FormsModule} from '@angular/forms';
import {DatePipe, NgClass, NgForOf, NgIf, registerLocaleData} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import localeHu from '@angular/common/locales/hu';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {ToastService} from '../../../../shared/toast/toast.service';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {UserService} from '../../../../services/user/user.service';
import {Appointment, MyAppointment, newAppointment} from '../../../../utils/interfaces/appointment.inteface';
import {environment} from '../../../../../../enviroment';
import {delay, filter, firstValueFrom, Observable, take} from 'rxjs';
import {
  AppointmentReviewModalComponent
} from '../../components/appointment-review-modal/appointment-review-modal.component';
import {
  PatientProfileCardComponent
} from '../../../patient/components/patient-profile-card/patient-profile-card.component';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';

registerLocaleData(localeHu);

@Component({
  selector: 'app-appointments',
  imports: [
    ...IONIC_COMPONENTS,
    FormsModule,
    DatePipe,
    NgForOf,
    NgIf,
    NgClass
  ],
  templateUrl: './appointments.component.html',
  standalone: true,
  styleUrl: './appointments.component.scss'
})

export class AppointmentsComponent implements OnInit{
  user!: Observable<DoctorItem | null>;
  appointments: MyAppointment[] = [];
  activeTab: 'week' | 'new' = 'week';

  appointmentDates: string[] = [];
  newAppointment: newAppointment = {
    date: new Date().toISOString(),
    from: '',
    to: ''
  };

  private apptBySlot = new Map<string, MyAppointment>();
  selectedDate = new Date();
  weekStart!: Date;
  weekEnd!: Date;
  weekDays: Date[] = [];
  timeSlots: string[] = [];

  openMonthPicker = false;
  timeOptions: string[] = [];

  locale = 'hu-HU';

  appointmentToDelete: any = null;
  savingData: boolean = false;

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private modalCtrl: ModalController,
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

      await this.loadAppointments();
    })();
  }

  ngOnInit() {
    this.onDateChange({ detail: { value: this.selectedDate } });
    this.generateWeek(this.selectedDate);
    this.generateTimeSlots();
    this.generateTimeOptions();
  }

  private async getDoctorId(): Promise<number | null> {
    const user = await firstValueFrom(this.user);
    return user?.doctor.id ?? null;
  }

  async loadAppointments(): Promise<MyAppointment[] | null> {
    const doctorId = await this.getDoctorId();
    if (!doctorId) {
      this.toast.show('Hiányzik az orvos azonosító.', 'danger');
      return null;
    }

    return new Promise<MyAppointment[] | null>((resolve) => {
      this.http.post<MyAppointment[]>(
        `${environment.apiUrl}/doctor/getMyAppointments`,
        { id: doctorId  },
        { withCredentials: true }
      ).subscribe({
        next: async (appointments) => {
          this.appointments = appointments;
          this.reindexAppointments();
          this.appointmentDates = appointments.map(appt => appt.starts_at);
          try {} catch {}

          Promise.resolve().then(() => this.cdr?.markForCheck?.());
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

  getApptStatusClass(appt: MyAppointment): string {
    type AppointmentWithPatientInfo = MyAppointment & {
      patient_id?: string | number | null;
      status?: string;
    };

    const appointment = appt as AppointmentWithPatientInfo;
    const status = appointment.status ? appointment.status.toLowerCase() : 'free';

    if (status === 'done') {
      return 'cell--done';
    }

    const now = new Date();
    const startRes = this.parseLocal(String(appointment.starts_at));

    if (!isNaN(startRes.getTime()) && startRes < now) {

      if (appointment.patient_id != null) {
        return 'cell--noShow';
      } else {
        return 'cell--no-appointment';
      }
    }

    if (status === 'pending' || appointment.patient_id != null) {
      return 'cell--pending';
    }

    if (status === 'accepted') {
      return 'cell--accepted';
    }

    return 'cell--free';
  }

  onTabChange(ev: any) {
    const value = ev?.detail?.value ?? ev;
    this.activeTab = value;
    if (value === 'week') {
      void this.loadAppointments();
    }
  }

  generateTimeSlots() {
    const slots: string[] = [];
    const startHour = 8;
    const endHour = 19.5;

    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour !== endHour) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }

    this.timeSlots = slots;
  }

  generateTimeOptions() {
    const options: string[] = [];
    for (let hour = 8; hour <= 19; hour++) {
      options.push(`${hour.toString().padStart(2, '0')}:00`);
      options.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    this.timeOptions = options;
  }

  generateWeek(date: Date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(date.setDate(diff));

    this.weekStart = new Date(start);
    this.weekEnd = new Date(start);

    this.weekEnd.setDate(this.weekStart.getDate() + 4);

    this.weekDays = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(this.weekStart);
      d.setDate(this.weekStart.getDate() + i);
      this.weekDays.push(d);
    }
  }

  prevWeek() {
    const newStart = new Date(this.weekStart);
    newStart.setDate(this.weekStart.getDate() - 7);
    this.generateWeek(newStart);
  }

  nextWeek() {
    const newStart = new Date(this.weekStart);
    newStart.setDate(this.weekStart.getDate() + 7);
    this.generateWeek(newStart);
  }

  getAppt(day: Date, timeHHmm: string): Appointment | null {
    const key = `${this.dateKey(day)}|${timeHHmm}`;
    return this.apptBySlot.get(key) ?? null;
  }

  private pad(n: number) { return String(n).padStart(2, '0'); }

  private dateKey(d: Date): string {
    return `${d.getFullYear()}-${this.pad(d.getMonth()+1)}-${this.pad(d.getDate())}`;
  }

  private parseLocal(dtStr: string): Date {
    if (dtStr.includes('T')) {
      return new Date(dtStr);
    }
    const [d, t] = dtStr.split(' ');
    const [y,m,day] = d.split('-').map(Number);
    const [hh,mm,ss] = (t ?? '00:00:00').split(':').map(Number);
    return new Date(y, m-1, day, hh, mm, ss ?? 0, 0);
  }

  private reindexAppointments() {
    this.apptBySlot.clear();
    for (const a of this.appointments ?? []) {
      const start = this.parseLocal(a.starts_at as unknown as string);
      const key = `${this.dateKey(start)}|${this.pad(start.getHours())}:${this.pad(start.getMinutes())}`;
      this.apptBySlot.set(key, a);
    }
  }

  trackByTime(index: number, time: string) {
    return time;
  }

  trackByDate(index: number, date: Date) {
    return date.getTime();
  }

  onDateChange(value: any): void {
    if (value && value.detail && value.detail.value != null) {
      value = value.detail.value;
    }

    const asDate: Date =
      value instanceof Date ? value : new Date(value);

    if (isNaN(asDate.getTime())) {
      return;
    }

    this.selectedDate = new Date(
      asDate.getFullYear(),
      asDate.getMonth(),
      asDate.getDate()
    );

    this.generateWeek?.(this.selectedDate);
  }

  onMonthPicked(ev: any): void {
    const raw = ev?.detail?.value ?? ev;
    const picked = raw instanceof Date ? raw : new Date(raw);
    if (isNaN(picked.getTime())) { this.openMonthPicker = false; return; }

    this.selectedDate = new Date(picked.getFullYear(), picked.getMonth(), 1);
    this.generateWeek(this.selectedDate);
    this.openMonthPicker = false;
  }

  async openPatientProfile(appointment: MyAppointment) {
    const modal = await this.modalCtrl.create({
      component: PatientProfileCardComponent as any,
      componentProps: {
        user: appointment.patient,
        editable: false
      },
      cssClass: 'profile-view-modal',
      backdropDismiss: true
    });
    await modal.present();
  }

  async addAppointment() {
    const now = new Date();
    const today = new Date(this.newAppointment.date).getDay();

    if (today === 0 || today === 6) {
      this.toast.show('Hétvégére nem lehet rendelést felvenni!', 'warning');
      return;
    }

    if (!this.newAppointment.date || !this.newAppointment.from) {
      this.toast.show('Hiányos időpont adat!', 'warning');
      return;
    }

    const onlyDate = this.newAppointment.date.split('T')[0];

    const pad = (n: number) => String(n).padStart(2, '0');
    const [y, m, d] = onlyDate.split('-').map(Number);
    const [hh, mm]  = this.newAppointment.from.split(':').map(Number);

    const fromDateTime = new Date(y, m - 1, d, hh, mm, 0, 0);
    const toDateTime   = new Date(fromDateTime.getTime() + 30 * 60 * 1000);

    const toLocalSql = (dt: Date) =>
      `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ` +
      `${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;

    if (fromDateTime >= toDateTime) {
      this.toast.show('A befejezési időpontnak a kezdés után kell lennie.', 'danger');
      return;
    }
    if (fromDateTime < now) {
      this.toast.show('A kezdési időpont nem lehet múltbeli.', 'danger');
      return;
    }
    const diffInMinutes = Math.abs((+toDateTime - +fromDateTime) / 60000);
    if (diffInMinutes !== 30) {
      this.toast.show('Az időpontok közötti különbségnek pontosan 30 percnek kell lennie!', 'danger');
      return;
    }

    const doctorId = await this.getDoctorId();
    if (!doctorId) {
      this.toast.show('Hiányzik az orvos azonosító. Jelentkezz be újra.', 'danger');
      return;
    }

    const appointmentPayload = {
      doctor_id: doctorId,
      from: toLocalSql(fromDateTime),
      to: toLocalSql(toDateTime)
    };

    this.savingData = true;

    return new Promise<MyAppointment | null>((resolve) => {
      this.http.post<MyAppointment>(
        `${environment.apiUrl}/doctor/addAppointment`,
        appointmentPayload,
        { withCredentials: true }
      ).subscribe({
        next: (created) => {
          this.toast.show('Sikeres időpontfelvétel!', 'success');
          this.savingData = false;
          resolve(created);
        },
        error: (err) => {
          this.savingData = false;
          console.error('❌ Időpont létrehozása sikertelen:', err);
          if (err?.status === 409) {
            this.toast.show('Ez az időpont már létezik az orvosnál.', 'danger');
          } else {
            this.toast.show('Szerver oldali hiba!', 'danger');
          }
          resolve(null);
        }
      });
    });
  }

  async reviewAppointment(appointment: MyAppointment) {
    const modal = await this.modalCtrl.create({
      component: AppointmentReviewModalComponent as any,
      componentProps: {
        appointment: appointment
      },
      cssClass: 'profile-view-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data && data.dismissed) {
      const { action, appointmentId } = data;

      const index = this.appointments.findIndex(a => a.id === appointmentId);

      if (index !== -1) {
        if (action === 'approved') {
          this.appointments[index].status = 'accepted';
          console.log(`✅ Appointment ID ${appointmentId} sikeresen jóváhagyva a frontenden.`);
        } else if (action === 'rejected') {
          this.appointments[index].status = 'free';
          this.appointments[index].patient_id = null;
          this.appointments[index].patient = undefined;
          console.log(`❌ Appointment ID ${appointmentId} sikeresen elutasítva és felszabadítva a frontenden.`);
        }

        this.appointments = [...this.appointments];

        this.reindexAppointments();
        this.cdr.markForCheck();
      }
    }
  }

  async confirmDeleteAppointment(appointment: MyAppointment) {

    await this.alert.show(
      'Megerősítés',
      'Biztosan szeretnéd törölni az időpontot?',
      () => {
        this.deleteAppointment(appointment);
      }
    );
  }

  async deleteAppointment(appointment: MyAppointment | null): Promise<boolean> {
    if (!appointment) return false;

    return new Promise<boolean>((resolve) => {
      this.http.post<{ deleted: boolean }>(
        `${environment.apiUrl}/doctor/deleteAppointment`,
        { id: appointment.id },
        { withCredentials: true }
      ).subscribe({
        next: () => {
          this.toast.show('Sikeres törlés!', 'success');

          const removedId = appointment.id;
          this.appointments = this.appointments.filter(a => a.id !== removedId);

          this.reindexAppointments();

          Promise.resolve().then(() => {
            this.appointmentToDelete = null;
            this.cdr.markForCheck();
          });

          resolve(true);
        },
        error: (err) => {
          console.error('❌ Törlés hiba:', err);
          this.toast.show('Törlés közben hiba történt.', 'danger');
          resolve(false);
        }
      });
    });
  }
}
