import {Component, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {DatePipe, NgForOf, NgIf} from '@angular/common';
import {PatientNavbarComponent} from '../../components/patient-navbar/patient-navbar.component';
import {HttpClient} from '@angular/common/http';
import {RouterLink} from '@angular/router';
import {Appointment} from '../../patient-dashboard/patient-dashboard.component';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {ToastService} from '../../../../shared/toast/toast.service';

@Component({
  selector: 'app-appointment-list',
  imports: [
    IonicModule,
    NgForOf,
    NgIf,
    PatientNavbarComponent,
    DatePipe,
    RouterLink
  ],
  templateUrl: './appointment-list.component.html',
  standalone: true,
  styleUrl: './appointment-list.component.css'
})

export class AppointmentListComponent implements OnInit {
  appointments: any[] = [];
  isLoading = true;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private http: HttpClient, private alertService: AlertService, private toastService: ToastService) {}

  ngOnInit() {
    this.fetchAppointments();
  }

  fetchAppointments() {
    this.isLoading = true;

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ Nincs token, nem lehet lekérni az időpontokat.');
      this.isLoading = false;
      return;
    }

    this.http.get<any[]>('http://localhost:3000/api/loadMyRegisteredAppointments', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (response) => {
        this.appointments = response.map((appt) => ({
          id: appt.id,
          date: new Date(appt.from),
          time: this.formatTime(appt.from),
          doctor: appt.doctor?.name,
          status: appt.status,
          speciality: appt.speciality,
          email: appt.doctor?.email,
          phoneNumber: appt.doctor?.phoneNumber,
          address: appt.doctor?.address,
          pictureUrl: appt.doctor?.pictureUrl
        }));

        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Nem sikerült betölteni az időpontokat:', error);
        this.isLoading = false;
      }
    });
  }

  formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  sortAppointments(column: 'date' | 'time'): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.appointments.sort((a, b) => {
      let aValue = a[column];
      let bValue = b[column];

      if (column === 'date') {
        aValue = new Date(`${a.date} ${a.time}`);
        bValue = new Date(`${b.date} ${b.time}`);
      }

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  confirmDelete(appointment: Appointment) {
    void this.alertService.show(
      'Biztosan törlöd?',
      'Ez a művelet nem visszavonható.',
      () => this.deleteAppointment(appointment)
    );
  }

  deleteAppointment(appointment: Appointment) {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ Nincs token, nem lehet törölni.');
      return;
    }

    console.log(appointment)

    this.http.delete(`http://localhost:3000/api/deleteAppointment`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: { id: appointment.id }
    }).subscribe({
      next: () => {
        this.toastService.show("Sikeres törlés", "success");
        this.appointments = this.appointments.filter(a => a.id !== appointment.id);
      },
      error: (err) => {
        console.error('❌ Törlés sikertelen:', err);
      }
    });
  }
}
