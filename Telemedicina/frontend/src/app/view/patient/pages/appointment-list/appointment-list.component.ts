import { Component } from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {DatePipe, NgForOf, NgIf} from '@angular/common';
import {PatientNavbarComponent} from '../../components/patient-navbar/patient-navbar.component';

@Component({
  selector: 'app-appointment-list',
  imports: [
    IonicModule,
    NgForOf,
    NgIf,
    PatientNavbarComponent,
    DatePipe
  ],
  templateUrl: './appointment-list.component.html',
  standalone: true,
  styleUrl: './appointment-list.component.css'
})
export class AppointmentListComponent {
  appointments = [
    { date: new Date('2025-07-10'), time: '10:00', doctor: 'Dr. Kovács', status: 'Megerősítve' },
    { date: new Date('2025-06-15'), time: '09:30', doctor: 'Dr. Szabó', status: 'Lemondva' },
    // ...további adatok
  ];
  currentPage = 1;
  visiblePages: number[] = [];
  pageSize = 6;
  filteredDoctors: any[] = [];

  get sortedAppointments() {
    return this.appointments.sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
