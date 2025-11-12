import {Component, Input} from '@angular/core';
import {NgForOf, NgOptimizedImage} from '@angular/common';
import {formatAppointmentTime, formatPhoneNumber} from '../../../../../../utils/formatProfileData';
import {IonicModule, ModalController} from '@ionic/angular';
import {MyAppointment} from '../../../../../../utils/interfaces/appointment.inteface';
import {DoctorItem} from '../../../../../../utils/interfaces/doctor.interface';
import {
  DoctorProfileCardComponent
} from '../../../../../doctor/components/doctor-profile-card/doctor-profile-card.component';

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

  constructor(
    private modalCtrl: ModalController
  ) {}

  sortAppointments(): void {
    if (this.sortColumn !== 'datetime') {
      this.sortColumn = 'datetime';
      this.sortDirection = 'asc';
    } else {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    }

    const dir = this.sortDirection === 'asc' ? 1 : -1;

    this.myAppointments = [...this.myAppointments].sort((a, b) => {
      const A = Date.parse(a.starts_at);
      const B = Date.parse(b.ends_at);
      return (A - B) * dir;
    });
  }

  async openDoctorProfileModal(doctor: DoctorItem | undefined) {
    const modal = await this.modalCtrl.create({
      component: DoctorProfileCardComponent as any,
      componentProps: {
        user: doctor,
        editable: false,
        canRate: true
      },
      cssClass: 'profile-view-modal'
    });

    await modal.present();
    await modal.onDidDismiss();
  }

  protected readonly formatAppointmentTime = formatAppointmentTime;
  protected readonly formatPhoneNumber = formatPhoneNumber;
}
