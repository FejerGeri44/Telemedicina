import {Component, Input, OnInit} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {DatePipe, NgForOf, NgIf} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {AlertService} from '../../../../shared/alert/alert.service.component';

interface prevAppointment {
  id: number;
  doctor_id: number;
  patient_id: number | null;
  from: string;
  to: string;
  status: string;
}

@Component({
  selector: 'app-appointment-modal',
  imports: [
    IonicModule,
    FormsModule,
    NgForOf,
    DatePipe,
    NgIf
  ],
  templateUrl: './appointment-modal.component.html',
  standalone: true,
  styleUrl: './appointment-modal.component.css'
})

export class AppointmentModalComponent implements OnInit{
  @Input() doctor: any;
  user: any;

  appointments: prevAppointment[] = [];
  days: { date: Date, weekday: string }[] = [];
  timeSlots: string[] = [];
  selectedDate: Date = new Date();

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private toast: ToastService,
    private alert: AlertService
    ) {}

  ngOnInit() {
    this.getMyData();
    this.generateDays();
    this.generateTimeSlots();
    this.getDoctorsAppointments();
  }

  getMyData () {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get('http://localhost:3000/api/getPatientMe', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe((res: any) => {
      this.user = res;
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
    const start = 8 * 60;
    const end = 19 * 60 + 30;
    for (let mins = start; mins <= end; mins += 30) {
      const h = Math.floor(mins / 60).toString().padStart(2, '0');
      const m = (mins % 60).toString().padStart(2, '0');
      this.timeSlots.push(`${h}:${m}`);
    }
  }

  async selectTime(day: any, time: string) {
    const cssClass = this.getButtonClass(day, time);

    const [hours, minutes] = time.split(':').map(Number);

    const from = new Date(day.date);
    from.setHours(hours, minutes, 0, 0);

    const to = new Date(from);
    to.setMinutes(from.getMinutes() + 30);

    if (cssClass.includes('btn-free')) {
      await this.alert.show(
        'Megerősítés',
        'Biztosan szeretnél időpontot foglalni?',
        () => {
          this.handleAppointmentSaving(from, to);
          this.toast.show('Sikeres foglalás!', 'success');
        }
      );

    } else if (cssClass.includes('btn-accepted')) {
      this.toast.show('Ez az időpont már foglalt!', 'danger');
    } else {
      this.toast.show('Erre az időpontra nincs rendelés kiírva!', 'warning');
    }
  }

  getButtonClass(day: any, time: string): string {
    const match = this.appointments.find(app => {
      const from = new Date(app.from);

      const buttonDate = new Date(day.date);
      const hours = Number(time.split(':')[0]) ;
      const minutes = Number(time.split(':')[1]);
      buttonDate.setHours(hours, minutes, 0, 0);

      return from.getTime() === buttonDate.getTime();
    });

    if (!match) return 'btn-date';

    if (match.status === 'free') return 'btn-date btn-free';
    if (match.status === 'accepted') return 'btn-date btn-accepted';

    return 'btn-date';
  }

  getDoctorsAppointments() {
    const doctorId = this.doctor?.id;
    const token = localStorage.getItem('token');

    if (!doctorId || !token) return;

    this.http.post<any[]>('http://localhost:3000/api/getDoctorsAppointments',
      { doctorId },
      {headers: {
          Authorization: `Bearer ${token}`
        }
      }).subscribe({
      next: (data) => {
        this.appointments = data;
      },
      error: (err) => {
        console.error('API hiba:', err);
      }
    });
  }

  handleAppointmentSaving(from: Date, to: Date) {
    const doctorId = this.doctor?.id;
    const patientId = this.user?.patient?.id;
    const token = localStorage.getItem('token');

    const payload = {
      doctorId,
      patientId,
      from,
      to
    };

    if (!doctorId || !token || !payload.patientId) {
      return;
    }

    this.http.post<any[]>('http://localhost:3000/api/registerToAppointment', payload, {
      headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
      next: (data) => {
        this.toast.show('Sikeres foglalás!', 'success');
        this.getDoctorsAppointments();
      },
      error: (err) => {
        console.error('API hiba:', err);
      }
    });
  }

  dismiss() {
    void this.modalCtrl.dismiss();
  }
}
