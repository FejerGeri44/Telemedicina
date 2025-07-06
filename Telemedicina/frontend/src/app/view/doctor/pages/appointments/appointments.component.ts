import {Component, ComponentRef, Injector, ViewContainerRef} from '@angular/core';
import {DoctorNavbarComponent} from '../../components/doctor-navbar/doctor-navbar.component';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {DatePipe, NgForOf, NgIf} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {CustomToastComponent} from '../../../../shared/toast/toast.component';

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

@Component({
  selector: 'app-appointments',
  imports: [
    DoctorNavbarComponent,
    IonicModule,
    FormsModule,
    DatePipe,
    NgForOf,
    NgIf
  ],
  templateUrl: './appointments.component.html',
  standalone: true,
  styleUrl: './appointments.component.css'
})

export class AppointmentsComponent {
  appointments: prevAppointment[] = [];
  appointmentDates: string[] = [];
  newAppointment: newAppointment = {
    date: '',
    from: '',
    to: ''
  };
  user: any;
  selectedDate: string = new Date().toISOString().split('T')[0];
  hourlySlots: string[] = [];
  appointmentUserDataMap: { [key: number]: { name: string; email: string; phoneNumber: string } } = {};
  isExpanded = false;
  activeView: 'calendar' | 'new' = 'calendar';
  timeOptions: string[] = [];

  ngOnInit() {
    this.loadMyData();
    this.loadAppointments();
    const patientIds = [...new Set(this.appointments.map(a => a.patient_id).filter(id => id))];
    this.loadAppointmentUserData(patientIds);
    this.onDateChange({ detail: { value: this.selectedDate } });

    const startHour = 8;
    const endHour = 21;

    for (let hour = startHour; hour < endHour; hour++) {
      this.timeOptions.push(`${this.pad(hour)}:00`, `${this.pad(hour)}:30`);
    }
  }

  constructor(
    private http: HttpClient,
    private viewContainerRef: ViewContainerRef,
    private injector: Injector) {}

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

  switchView(view: 'calendar' | 'new') {
    this.activeView = view;

    if (view === 'calendar') {
      this.loadAppointments();
    }
  }

  onDateChange(event: any): void {
    const value = event.detail?.value;
    if (!value) {
      console.error('Nincs dátum érték.');
      return;
    }

    this.selectedDate = value.split('T')[0];
    this.generateTimeSlots();
  }

  generateTimeSlots() {
    const slots: string[] = [];
    const start = 8 * 60;
    const end = 20 * 60;

    for (let mins = start; mins <= end; mins += 30) {
      const hour = Math.floor(mins / 60).toString().padStart(2, '0');
      const minute = (mins % 60).toString().padStart(2, '0');
      slots.push(`${hour}:${minute}`);
    }

    this.hourlySlots = slots;
  }

  getAppointmentForSlot(slotTime: string) {
    if (!this.selectedDate) return null;

    const slotDateTime = new Date(`${this.selectedDate}T${slotTime}`);
    return this.appointments.find(appt => {
      const apptDate = new Date(appt.from);
      return (
        apptDate.getFullYear() === slotDateTime.getFullYear() &&
        apptDate.getMonth() === slotDateTime.getMonth() &&
        apptDate.getDate() === slotDateTime.getDate() &&
        apptDate.getHours() === slotDateTime.getHours() &&
        apptDate.getMinutes() === slotDateTime.getMinutes()
      );
    });
  }

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
  }

  addAppointment() {
    const now = new Date();

    if (!this.newAppointment.date || !this.newAppointment.from || !this.newAppointment.to) {
      this.showCustomToast('Hiányos időpont adat!', 'warning');
      return;
    }

    const onlyDate = this.newAppointment.date.split('T')[0];
    const fromDateTime = new Date(`${onlyDate}T${this.newAppointment.from}`);
    const toDateTime = new Date(`${onlyDate}T${this.newAppointment.to}`);

    if (fromDateTime > toDateTime || fromDateTime.getTime() > toDateTime.getTime()) {
      this.showCustomToast('A befejezési időpontnak a kezdés után kell lennie.', 'danger');
      return;
    }

    if (fromDateTime < now || fromDateTime.getTime() === toDateTime.getTime()) {
      this.showCustomToast('A kezdési időpont nem lehet múltbeli.', 'danger');
      return;
    }

    if (fromDateTime.getTime() === toDateTime.getTime()) {
      this.showCustomToast('A kezdési és befejezési időpont nem lehet azonos!', 'danger');
      return;
    }

    const diffInMinutes = Math.abs((toDateTime.getTime() - fromDateTime.getTime()) / (1000 * 60));
    if (diffInMinutes !== 30) {
      this.showCustomToast('Az időpontok közötti különbségnek pontosan 30 percnek kell lennie!', 'danger');
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
      this.showCustomToast('Már létezik ilyen időpont!', 'danger');
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
        this.showCustomToast('Sikeres időpontkiírás!', 'success');
      },
      error: () => {
        this.showCustomToast('Szerver oldali hiba!!', 'danger');
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

  showCustomToast(message: string, type: 'success' | 'warning' | 'danger') {
    const toastRef: ComponentRef<CustomToastComponent> = this.viewContainerRef.createComponent(CustomToastComponent, {
      injector: this.injector
    });

    toastRef.instance.message = message;
    toastRef.instance.type = type;

    setTimeout(() => toastRef.destroy(), 4000);
  }
}
