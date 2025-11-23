import {Component, Input, OnInit} from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import {FormsModule} from '@angular/forms';
import {DatePipe, NgClass, NgForOf} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {Appointment} from '../../../../utils/interfaces/appointment.inteface';
import {UserService} from '../../../../services/user/user.service';
import {environment} from '../../../../../../enviroment';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {firstValueFrom, Observable} from 'rxjs';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';

@Component({
  selector: 'app-appointment-modal',
  imports: [
    ...IONIC_COMPONENTS,
    FormsModule,
    NgForOf,
    DatePipe,
    NgClass
  ],
  templateUrl: './appointment-modal.component.html',
  standalone: true,
  styleUrl: './appointment-modal.component.scss'
})

export class AppointmentModalComponent implements OnInit{
  @Input() doctorData!: DoctorItem;
  patientData!: Observable<PatientItem | null>;
  appointments: Appointment[] = [];
  private apptBySlot = new Map<string, Appointment>();
  days: { date: Date, weekday: string }[] = [];
  timeSlots: string[] = [];
  selectedDate: Date = new Date();

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    protected userService: UserService,
    private toast: ToastService,
    private alert: AlertService
    ) {
    this.patientData = this.userService.patient$();
  }

  ngOnInit() {
    this.generateDays();
    this.generateTimeSlots();
    void this.getDoctorsAppointments();
  }

  private async getPatientId(): Promise<number | null> {
    const user = await firstValueFrom(this.patientData);
    return user?.patient.id ?? null;
  }

  async getDoctorsAppointments(): Promise<Appointment[] | null> {
    const userId = this.doctorData?.user?.id;

    return new Promise<Appointment[] | null>((resolve) => {
      this.http.post<Appointment[]>(
        `${environment.apiUrl}/patient/getDoctorsAppointments`,
        { userId },
        { withCredentials: true }
      ).subscribe({
        next: (res) => {
          this.appointments = res;
          this.reindexAppointments();
          resolve(this.appointments);
        },
        error: (err) => {
          console.error('API hiba:', err);
          this.toast?.show?.('Nem sikerült betölteni az időpontokat.', 'danger');
          resolve(null);
        }
      });
    });
  }

  generateDays() {
    this.days = [];

    const startOfWeek = this.getStartOfWeek(this.selectedDate);
    for (let i = 0; i < 5; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      const weekday = date.toLocaleDateString('hu-HU', { weekday: 'short' });
      this.days.push({ date, weekday });
    }

    this.selectedDate = new Date(startOfWeek);
  }

  getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    return new Date(d.setDate(diff));
  }

  changeWeek(offset: number) {
    const newDate = new Date(this.selectedDate);
    newDate.setDate(this.selectedDate.getDate() + offset * 7);
    this.selectedDate = newDate;
    this.generateDays();
  }

  changeMonth(offset: number) {
    const newDate = new Date(this.selectedDate);
    newDate.setMonth(this.selectedDate.getMonth() + offset);
    this.selectedDate = newDate;
    this.generateDays();
  }

  generateTimeSlots() {
    const slots: string[] = [];
    let h = 8, m = 0;
    while (true) {
      slots.push(`${this.pad(h)}:${this.pad(m)}`);
      m += 30;
      if (m === 60) { m = 0; h += 1; }
      if (h === 19 && m === 30) { slots.push('19:30'); break; }
      if (h > 19) break;
    }
    this.timeSlots = slots;
  }

  async selectTime(day: any, time: string) {
    const cssClass = this.getButtonClass(day, time);

    const [hours, minutes] = time.split(':').map(Number);

    const fromDate = new Date(day.date);
    fromDate.setHours(hours, minutes, 0, 0);

    const toDate = new Date(fromDate);
    toDate.setMinutes(fromDate.getMinutes() + 30);

    const toKeyString = (d: Date): string => {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const hour = d.getHours().toString().padStart(2, '0');
      const minute = d.getMinutes().toString().padStart(2, '0');
      return `${year}:${month}:${day}:${hour}:${minute}`;
    };

    const fromString = toKeyString(fromDate);
    const toString = toKeyString(toDate);

    if (cssClass.includes('btn-free')) {
      await this.alert.show(
        'Megerősítés',
        'Biztosan szeretnél időpontot foglalni?',
        () => {
          this.handleAppointmentSaving(fromString, toString);
        }
      );

    } else if (cssClass.includes('btn-accepted')) {
      this.toast.show('Erre az időpontra nincs rendelés kiírva!', 'warning');
    } else {
      this.toast.show('Ez az időpont már foglalt!', 'danger');
    }
  }

  getButtonClass(day: { date: Date }, timeHHmm: string) {
    const key = `${this.dateKey(day.date)}|${timeHHmm}`;
    const appt = this.apptBySlot.get(key);

    if (!appt) return 'btn-date btn-accepted';
    if (appt.patient_id == null) return 'btn-date btn-free';
    return 'btn-date btn-booked';
  }

  private pad(n: number) { return String(n).padStart(2, '0'); }

  private dateKey(d: Date): string {
    return `${d.getFullYear()}-${this.pad(d.getMonth()+1)}-${this.pad(d.getDate())}`;
  }

  private parseLocal(dt: string): Date {
    if (!dt) return new Date(NaN);
    if (dt.includes('T')) return new Date(dt);
    const [d, t='00:00:00'] = dt.split(' ');
    const [y,m,day] = d.split('-').map(Number);
    const [hh,mm,ss] = t.split(':').map(Number);
    return new Date(y, m-1, day, hh, mm, ss ?? 0, 0);
  }

  private reindexAppointments() {
    this.apptBySlot.clear();
    for (const a of this.appointments ?? []) {
      const start = this.parseLocal(String(a.starts_at));
      const key = `${this.dateKey(start)}|${this.pad(start.getHours())}:${this.pad(start.getMinutes())}`;
      this.apptBySlot.set(key, a);
    }
  }

  toSupabaseTimestamp(s: string): string {
    const [year, month, day, hour, minute] = s.split(':').map(Number);

    const pad = (n: number) => String(n).padStart(2, '0');

    return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:00`;
  }

  async handleAppointmentSaving(from: string, to: string) {
    const patientId = await this.getPatientId();
    if (!patientId) {
      this.toast.show('Hiányzik a páciens azonosító. Jelentkezz be újra.', 'danger');
      return;
    }

    const starts_at = this.toSupabaseTimestamp(from);
    const ends_at   = this.toSupabaseTimestamp(to);

    const payload = {
      doctorId: Number(this.doctorData?.doctor?.id),
      patientId: patientId,
      from: starts_at,
      to: ends_at
    };

    this.http.post<{ id: number }>(
      `${environment.apiUrl}/patient/registerToAppointment`,
      payload,
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        this.replaceLocalAppointment(res.id, patientId);
        this.reindexAppointments();
        this.toast.show('Sikeres foglalás!', 'success');
      },
      error: (err) => {
        console.error('API hiba:', err);
        if (err.status === 404) {
          this.toast.show('Ez az időpont már foglalt.', 'danger');
        } else {
          this.toast.show('Hiba történt a foglalás közben.', 'danger');
        }
      }
    });
  }

  private replaceLocalAppointment(appointmentId: number, newPatientId: number) {
    if (appointmentId === undefined || appointmentId === null) {
      console.warn('Hiba: Az időpont ID hiányzik a frissítéshez.');
      return;
    }

    const index = this.appointments.findIndex(a => a.id === appointmentId);

    if (index !== -1) {
      const currentAppt = this.appointments[index];

      this.appointments[index] = {
        ...currentAppt,
        patient_id: newPatientId,
        status: 'pending'
      };
    } else {
      console.warn('Nem sikerült megtalálni a frissítendő időpontot a lokális listában.', appointmentId);
    }
  }

  dismiss() {
    void this.modalCtrl.dismiss();
  }
}
