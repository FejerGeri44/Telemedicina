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

  constructor(
    private modalCtrl: ModalController
  ) {}

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
