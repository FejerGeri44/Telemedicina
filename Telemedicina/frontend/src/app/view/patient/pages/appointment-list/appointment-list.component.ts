import {Component, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {DatePipe, NgForOf, NgIf} from '@angular/common';
import {PatientNavbarComponent} from '../../components/patient-navbar/patient-navbar.component';
import {HttpClient} from '@angular/common/http';
import {RouterLink} from '@angular/router';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {ToastService} from '../../../../shared/toast/toast.service';
import {Appointment, MyAppointment} from '../../../../utils/interfaces';

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
  myAppointments: MyAppointment[] = [];
  isLoading = true;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private http: HttpClient,
    private alertService: AlertService,
    private toastService: ToastService
  ) {}

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

    this.http.get<MyAppointment[]>('http://localhost:3000/api/loadMyRegisteredAppointments', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res) => {
        this.myAppointments = res;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Nem sikerült betölteni az időpontokat:', error);
        this.isLoading = false;
      }
    });
  }

  sortAppointments(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    const dir = this.sortDirection === 'asc' ? 1 : -1;

    this.myAppointments = [...this.myAppointments].sort((a, b) => {
      const A = Date.parse(a.from);
      const B = Date.parse(b.from);
      return (A - B) * dir;
    });
  }

  confirmDelete(appointment: MyAppointment) {
    void this.alertService.show(
      'Biztosan törlöd?',
      'Ez a művelet nem visszavonható.',
      () => this.cancelAppointment(appointment)
    );
  }

  cancelAppointment(appointment: MyAppointment) {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.patch(
      'http://localhost:3000/api/patient/cancelAppointment',
      { id: appointment.id },
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: () => {
        this.toastService.show('Időpont lemondva', 'success');
        this.myAppointments = this.myAppointments.filter(a => a.id !== appointment.id);
      },
      error: (err) => console.error('❌ Lemondás sikertelen:', err)
    });
  }
}
