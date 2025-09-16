import {Component, Injector, OnInit, ViewContainerRef} from '@angular/core';
import {AlertController, IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {DatePipe, NgClass, NgForOf, NgIf} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeHu from '@angular/common/locales/hu';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {ToastService} from '../../../../shared/toast/toast.service';

interface newAppointment {
  date: string;
  from: string;
  to: string;
}

interface prevAppointment {
  id: number;
  doctor_id: number;
  patient_id: number | null;
  from: string;
  to: string;
  status: string;
}

registerLocaleData(localeHu);

@Component({
  selector: 'app-appointments',
  imports: [
    IonicModule,
    FormsModule,
    DatePipe,
    NgForOf,
    NgIf,
    NgClass
  ],
  templateUrl: './appointments.component.html',
  standalone: true,
  styleUrl: './appointments.component.css'
})

export class AppointmentsComponent implements OnInit{
  appointments: prevAppointment[] = [];
  appointmentDates: string[] = [];
  newAppointment: newAppointment = {
    date: '',
    from: '',
    to: ''
  };
  user: any;
  selectedDate = new Date();
  weekStart!: Date;
  weekEnd!: Date;
  weekDays: Date[] = [];
  timeSlots: string[] = [];
  activeTab: 'week' | 'new' = 'week';
  appointmentUserDataMap: { [key: number]: { name: string; email: string; phoneNumber: string } } = {};
  openMonthPicker = false;
  timeOptions: string[] = [];
  locale = 'hu-HU';
  appointmentToDelete: any = null;

  constructor(
    private http: HttpClient,
    private viewContainerRef: ViewContainerRef,
    private injector: Injector,
    private alertController: AlertController,
    private alert: AlertService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadMyData();
    this.loadAppointments();
    this.onDateChange({ detail: { value: this.selectedDate } });
    this.computeWeek(this.selectedDate);
    this.timeSlots = this.buildTimeSlots('08:00', '19:30');

    const startHour = 8;
    const endHour = 20;

    for (let hour = startHour; hour < endHour; hour++) {
      this.timeOptions.push(`${this.pad(hour)}:00`, `${this.pad(hour)}:30`);
    }
  }

  loadMyData () {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get('http://localhost:3000/api/getDoctorMe', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (user: any) => {
        this.user = user;
      },
      error: (err) => {
        console.error('❌ Doctor user lekérése sikertelen:', err);
      }
    });
  }

  loadAppointments() {
    const token = localStorage.getItem('token');
    this.http.get<any[]>('http://localhost:3000/api/myAppointments', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (appointments) => {
        this.appointments = appointments;
        this.appointmentDates = appointments.map(appt =>
          new Date(appt.from).toISOString().split('T')[0]
        );

        const patientIds = [...new Set(this.appointments.map(a => a.patient_id).filter(id => id))];
        this.loadAppointmentUserData(patientIds);
      },
      error: (err) => console.error('❌ Hiba az időpontok lekérésekor:', err)
    });
  }

  loadAppointmentUserData(patientIds: (number | null)[]) {
    const token = localStorage.getItem('token');
    if (!token || patientIds.length === 0) return;

    this.http.post('http://localhost:3000/api/getAppointmentUserData', { patientIds }, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (userDataMap: any) => {
        this.appointmentUserDataMap = userDataMap;
      },
      error: (err) => console.error('❌ Hiba a beteg adatok lekérésekor:', err)
    });
  }

  onTabChange(ev: any) {
    const value = ev?.detail?.value ?? ev;
    this.activeTab = value;
    if (value === 'week') {
      this.loadAppointments();
    }
  }

  private computeWeek(pivot: Date) {
    const d = new Date(pivot);
    // hétfőre vissza
    const day = d.getDay() || 7; // 1..7 (vasárnap 7)
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);

    this.weekStart = monday;

    // 7 nap
    this.weekDays = Array.from({ length: 7 }, (_, i) => {
      const x = new Date(monday);
      x.setDate(monday.getDate() + i);
      return x;
    });

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    this.weekEnd = sunday;
  }

  buildTimeSlots(from = '08:00', to = '20:00'): string[] {
    const [fh, fm] = from.split(':').map(Number);
    const [th, tm] = to.split(':').map(Number);
    const slots: string[] = [];

    const cur = new Date();
    cur.setHours(fh, fm, 0, 0);

    const end = new Date();
    end.setHours(th, tm, 0, 0);

    while (cur <= end) {
      const hh = String(cur.getHours()).padStart(2, '0');
      const mm = String(cur.getMinutes()).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
      cur.setMinutes(cur.getMinutes() + 30);
    }
    return slots;
  }

  getAppt(day: Date, time: string) {
    if (!this.appointments?.length) return null;

    // time = "HH:mm"
    const [hh, mm] = time.split(':').map(Number);

    return this.appointments.find(appt => {
      const start = new Date(appt.from);
      const sameDay =
        start.getFullYear() === day.getFullYear() &&
        start.getMonth()    === day.getMonth() &&
        start.getDate()     === day.getDate();

      if (!sameDay) return false;

      const startHH = String(start.getHours()).padStart(2, '0');
      const startMM = String(start.getMinutes()).padStart(2, '0');
      const startTime = `${startHH}:${startMM}`;

      return startTime === time;
    }) || null;
  }


  trackByTime = (_: number, t: string) => t;
  trackByDate = (_: number, d: Date) => d.toISOString().slice(0,10);

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

    this.computeWeek?.(this.selectedDate);
  }


  prevWeek(): void {
    const d = new Date(this.weekStart);
    d.setDate(d.getDate() - 7);
    this.selectedDate = d;
    this.computeWeek(this.selectedDate);
  }

  nextWeek(): void {
    const d = new Date(this.weekStart);
    d.setDate(d.getDate() + 7);
    this.selectedDate = d;
    this.computeWeek(this.selectedDate);
  }

  onMonthPicked(ev: any): void {
    // ion-datetime esemény normalizálása
    const raw = ev?.detail?.value ?? ev;
    const picked = raw instanceof Date ? raw : new Date(raw);
    if (isNaN(picked.getTime())) { this.openMonthPicker = false; return; }

    // Hónap első napjára állunk, és abból számoljuk a hetet
    const firstOfMonth = new Date(picked.getFullYear(), picked.getMonth(), 1);
    this.selectedDate = firstOfMonth;
    this.computeWeek(this.selectedDate);
    this.openMonthPicker = false;
  }

  addAppointment() {
    const now = new Date();
    const date = new Date(this.newAppointment.date);
    const day = date.getDay();

    if (day === 0 || day === 6) {
      this.toast.show('Hétvégére nem lehet rendelést felvenni!', 'warning');
      return;
    }

    if (!this.newAppointment.date || !this.newAppointment.from) {
      this.toast.show('Hiányos időpont adat!', 'warning');
      return;
    }

    const onlyDate = this.newAppointment.date.split('T')[0];
    const fromDateTime = new Date(`${onlyDate}T${this.newAppointment.from}`);
    const toDateTime = new Date(fromDateTime);
          toDateTime.setMinutes(toDateTime.getMinutes() + 30);

    if (fromDateTime > toDateTime || fromDateTime.getTime() > toDateTime.getTime()) {
      this.toast.show('A befejezési időpontnak a kezdés után kell lennie.', 'danger');
      return;
    }

    if (fromDateTime < now || fromDateTime.getTime() === toDateTime.getTime()) {
      this.toast.show('A kezdési időpont nem lehet múltbeli.', 'danger');
      return;
    }

    if (fromDateTime.getTime() === toDateTime.getTime()) {
      this.toast.show('A kezdési és befejezési időpont nem lehet azonos!', 'danger');
      return;
    }

    const diffInMinutes = Math.abs((toDateTime.getTime() - fromDateTime.getTime()) / (1000 * 60));
    if (diffInMinutes !== 30) {
      this.toast.show('Az időpontok közötti különbségnek pontosan 30 percnek kell lennie!', 'danger');
      return;
    }

    const conflict = this.appointments.some(appt => {
      const apptFrom = new Date(appt.from);
      const apptTo = new Date(appt.to);

      return (
        apptFrom.getTime() === fromDateTime.getTime() &&
        apptTo.getTime() === toDateTime.getTime()
      );
    });

    if (conflict) {
      this.toast.show('Már létezik ilyen időpont!', 'danger');
      return;
    }

    const appointmentPayload = {
      doctor_id: this.user.doctor.id,
      from: this.formatDateTimeToMySQL(fromDateTime),
      to: this.formatDateTimeToMySQL(toDateTime)
    };

    const token = localStorage.getItem('token');

    this.http.post('http://localhost:3000/api/createAppointment', appointmentPayload, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.toast.show('Sikeres időpontkiírás!', 'success');
      },
      error: () => {
        this.toast.show('Szerver oldali hiba!!', 'danger');
      }
    });
  }

  private formatDateTimeToMySQL(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  pad(n: number): string {
    return n < 10 ? '0' + n : n.toString();
  }

  async onAppointmentAction(appt: any) {
    this.appointmentToDelete = appt;

    await this.alert.show(
      'Megerősítés',
      'Biztosan szeretnéd törölni az időpontot?',
      () => {
        this.confirmDeleteAppointment();
      }
    );
  }

  confirmDeleteAppointment() {
    if (!this.appointmentToDelete) return;

    const token = localStorage.getItem('token');
    this.http.post('http://localhost:3000/api/deleteAppointment', {
      id: this.appointmentToDelete.id
    }, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.toast.show('Sikeres törlés!', 'success');
        this.loadAppointments();
        this.appointmentToDelete = null;
      },
      error: (err) => console.error('❌ Törlés hiba:', err)
    });
  }
}
