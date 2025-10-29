import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {DatePipe, NgClass, NgForOf, NgIf, registerLocaleData} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import localeHu from '@angular/common/locales/hu';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {ToastService} from '../../../../shared/toast/toast.service';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {UserService} from '../../../../shared/user.service';
import {Appointment, newAppointment} from '../../../../utils/interfaces/appointment.inteface';
import {environment} from '../../../../../../../backend/config/enviroment';

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
  styleUrl: './appointments.component.scss'
})

export class AppointmentsComponent implements OnInit{
  appointments: Appointment[] = [];
  appointmentDates: string[] = [];
  newAppointment: newAppointment = {
    date: '',
    from: '',
    to: ''
  };
  user!: DoctorItem;
  selectedDate = new Date();
  weekStart!: Date;
  weekEnd!: Date;
  weekDays: Date[] = [];
  timeSlots: string[] = [];
  activeTab: 'week' | 'new' = 'week';
  appointmentUserDataMap: Record<string, { userId: number; name: string }> = {};
  openMonthPicker = false;
  timeOptions: string[] = [];
  locale = 'hu-HU';
  appointmentToDelete: any = null;
  savingData: boolean = false;

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private alert: AlertService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.getUserData();
    this.loadAppointments().then();
    this.onDateChange({ detail: { value: this.selectedDate } });
    this.generateWeek(this.selectedDate);
    this.generateTimeSlots();
    this.generateTimeOptions();
  }

  private getUserData() {

  }

  async loadAppointments(): Promise<Appointment[] | null> {

    return new Promise<Appointment[] | null>((resolve) => {
      this.http.post<Appointment[]>(
        `${environment.apiUrl}/doctor/myAppointments`,
        { id: this.user?.doctor?.id },
      ).subscribe({
        next: async (appointments) => {
          this.appointments = appointments;
          this.appointmentDates = appointments.map(appt => appt.from);

          try {
            await this.loadPatientNamesForWeek(appointments);
          } catch (e) {
            console.error('⚠️ Hiba a páciensek nevének betöltésekor:', e);
          }

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

  private async loadPatientNamesForWeek(appts: Appointment[]): Promise<void> {

    const patientIds = [...new Set(
      appts.map(a => a.patient_id).filter((x): x is string => !!x)
    )];

    if (patientIds.length === 0) {
      this.appointmentUserDataMap = {};
      return;
    }

    return new Promise<void>((resolve) => {
      this.http.post<{ map: Record<string, { userId: number; name: string }> }>(
        `${environment.apiUrl}/doctor/resolvePatientNames`,
        { patientIds },
      ).subscribe({
        next: (res) => {
          this.appointmentUserDataMap = res.map;

          Promise.resolve().then(() => this.cdr?.markForCheck?.());

          resolve();
        },
        error: (err) => {
          console.error('❌ Hiba a páciensek nevének feloldásakor:', err);
          this.toast?.show?.('Nem sikerült betölteni a páciensek neveit.', 'danger');
          this.appointmentUserDataMap = {};
          resolve();
        }
      });
    });
  }

  patientName(appt: { patient_id: string | number }): string {
    const pid = appt?.patient_id;
    if (pid == null || pid === '') return 'Szabad';
    const key = String(pid).trim();
    return <string>this.appointmentUserDataMap[key]?.name;
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
    const endHour = 19;

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
    this.weekEnd.setDate(this.weekStart.getDate() + 6);

    this.weekDays = [];
    for (let i = 0; i < 7; i++) {
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

  stringToDate(str: string): Date {
    if (!str) return new Date();
    const [year, month, day, hour, minute] = str.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute);
  }

  getAppt(day: Date, time: string) {
    if (!this.appointments || this.appointments.length === 0) return null;

    return this.appointments.find(appt => {
      if (!appt.from) return false;

      const fromDate = this.stringToDate(appt.from);

      const [hour, minute] = time.split(':').map(Number);

      return (
        fromDate.getFullYear() === day.getFullYear() &&
        fromDate.getMonth() === day.getMonth() &&
        fromDate.getDate() === day.getDate() &&
        fromDate.getHours() === hour &&
        fromDate.getMinutes() === minute
      );
    }) || null;
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

  async addAppointment() {
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

    const fromKeyUTC = this.toKeyLocal(fromDateTime);
    const toKeyUTC   = this.toKeyLocal(toDateTime);

    const conflict = this.appointments.some(appt =>
      appt.from === fromKeyUTC && appt.to === toKeyUTC
    );
    if (conflict) {
      this.toast.show('Már létezik ilyen időpont!', 'danger');
      return;
    }

    const appointmentPayload = {
      doctor_id: this.user.doctor.id,
      from: fromKeyUTC,
      to: toKeyUTC
    };

    this.savingData = true;

    return new Promise<Appointment | null>((resolve) => {
      this.http.post<Appointment>(
        `${environment.apiUrl}/doctor/addAppointment`,
        appointmentPayload,
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

  toKeyLocal(d: Date): string {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${year}:${month}:${day}:${hours}:${minutes}`;
  }

  async confirmDeleteAppointment(appointment: Appointment) {

    await this.alert.show(
      'Megerősítés',
      'Biztosan szeretnéd törölni az időpontot?',
      () => {
        this.deleteAppointment(appointment);
      }
    );
  }

  async deleteAppointment(appointment: Appointment | null): Promise<boolean> {
    if (!appointment) return false;

    return new Promise<boolean>((resolve) => {
      this.http.post<{ deleted: boolean }>(
        `${environment.apiUrl}/doctor/deleteAppointment`,
        { id: appointment.id },
      ).subscribe({
        next: () => {
          this.toast.show('Sikeres törlés!', 'success');

          const removedId = appointment.id;
          this.appointments = this.appointments.filter(a => a.id !== removedId);

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
