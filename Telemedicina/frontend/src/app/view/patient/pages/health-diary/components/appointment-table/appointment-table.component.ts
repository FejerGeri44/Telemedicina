import {Component, Input} from '@angular/core';
import {NgForOf, NgOptimizedImage} from '@angular/common';
import {formatAppointmentTime, formatPhoneNumber} from '../../../../../../utils/formatProfileData';
import {IonicModule} from '@ionic/angular';
import {MyAppointment} from '../../../../../../utils/interfaces/appointment.inteface';

@Component({
  selector: 'app-appointment-table',
  imports: [
    NgOptimizedImage,
    IonicModule,
    NgForOf
  ],
  templateUrl: './appointment-table.component.html',
  standalone: true,
  styleUrl: './appointment-table.component.scss'
})
export class AppointmentTableComponent {
  @Input({ required: true }) myAppointments!: MyAppointment[];
  isLoading = true;
  sortColumn: 'datetime' | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  sortAppointments(): void {
    if (this.sortColumn !== 'datetime') {
      this.sortColumn = 'datetime';
      this.sortDirection = 'asc';
    } else {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    }

    const dir = this.sortDirection === 'asc' ? 1 : -1;

    this.myAppointments = [...this.myAppointments].sort((a, b) => {
      const A = Date.parse(a.from);
      const B = Date.parse(b.from);
      return (A - B) * dir;
    });
  }

  protected readonly formatAppointmentTime = formatAppointmentTime;
  protected readonly formatPhoneNumber = formatPhoneNumber;
}
