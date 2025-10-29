import {Component, Input, OnInit} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {DatePipe, NgClass, NgForOf} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {Appointment} from '../../../../utils/interfaces/appointment.inteface';
import {UserService} from '../../../../shared/user.service';
import {environment} from '../../../../../../../backend/config/enviroment';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';

@Component({
  selector: 'app-appointment-modal',
  imports: [
    IonicModule,
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
  patientData!: PatientItem;
  appointments: Appointment[] = [];
  days: { date: Date, weekday: string }[] = [];
  timeSlots: string[] = [];
  selectedDate: Date = new Date();

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private userService: UserService,
    private toast: ToastService,
    private alert: AlertService
    ) {}

  ngOnInit() {
    this.getUserData();
    this.generateDays();
    this.generateTimeSlots();
    void this.getDoctorsAppointments();
  }

  private getUserData() {

  }

  async getDoctorsAppointments(): Promise<Appointment[] | null> {
    const userId = this.doctorData?.user?.id;

    return new Promise<Appointment[] | null>((resolve) => {
      this.http.post<Appointment[]>(
        `${environment.apiUrl}/patient/getDoctorsAppointments`,
        { userId },
        {
          withCredentials: true,
        }).subscribe({
        next: (res) => {
          this.appointments = res;
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
    const startHour = 8;
    const endHour = 19;

    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour !== endHour) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
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
      this.toast.show('Ez az időpont már foglalt!', 'danger');
    } else {
      this.toast.show('Erre az időpontra nincs rendelés kiírva!', 'warning');
    }
  }

  getButtonClass(day: any, time: string): string {
    const list = Array.isArray(this.appointments)
      ? this.appointments
      : (this.appointments && (this as any).appointments.appointments) || [];

    if (!list.length) return 'btn-date';

    const parseDateString = (str: string): Date => {
      if (!str) return new Date('');
      const [year, month, day, hour, minute] = str.split(':').map(Number);
      return new Date(year, month - 1, day, hour, minute, 0, 0);
    };

    const [h, m] = time.split(':').map(Number);
    const buttonDate = new Date(day.date);
    buttonDate.setHours(h || 0, m || 0, 0, 0);

    const match = list.find(app => {
      const from = parseDateString(app.from);
      return from.getTime() === buttonDate.getTime();
    });

    if (!match) return 'btn-date';

    switch (match.status) {
      case 'free': return 'btn-date btn-free';
      case 'booked': return 'btn-date btn-booked';
      case 'accepted': return 'btn-date btn-accepted';
      default: return 'btn-date';
    }
  }

  async handleAppointmentSaving(from: string, to: string) {
    const doctorId = this.doctorData?.doctor?.id;
    const patientId = this.patientData.user.id;

    const payload = {
      doctorId: Number(doctorId),
      patientId: String(patientId),
      from: from,
      to: to
    };

    this.http.post(
      `${environment.apiUrl}/patient/registerToAppointment`,
      payload,
      { withCredentials: true }
    ).subscribe({
      next: () => {
        const list: any[] = Array.isArray(this.appointments)
          ? this.appointments
          : (this.appointments && (this as any).appointments?.appointments) || [];

        const idx = list.findIndex(a =>
          String(a.from) === from &&
          String(a.to) === to &&
          Number(a.doctor_id) === Number(doctorId)
        );

        if (idx !== -1) {
          const updated = {
            ...list[idx],
            patient_id: String(patientId),
            status: (list[idx].status && list[idx].status !== 'free') ? list[idx].status : 'booked',
          };

          const newList = [...list];
          newList[idx] = updated;

          if (Array.isArray(this.appointments)) {
            this.appointments = newList;
          } else if (this.appointments && (this as any).appointments) {
            (this as any).appointments = {
              ...(this as any).appointments,
              appointments: newList
            };
          }
        }

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

  dismiss() {
    void this.modalCtrl.dismiss();
  }
}
