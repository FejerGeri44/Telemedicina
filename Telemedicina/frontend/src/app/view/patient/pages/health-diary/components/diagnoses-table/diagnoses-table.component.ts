import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {NgForOf, NgOptimizedImage} from '@angular/common';
import {formatAppointmentTime, formatPhoneNumber} from '../../../../../../utils/formatProfileData';
import {MyDiagnosis} from '../../../../../../utils/interfaces/diagnosis.interface';
import {DoctorItem} from '../../../../../../utils/interfaces/doctor.interface';
import {
  DoctorProfileCardComponent
} from '../../../../../doctor/components/doctor-profile-card/doctor-profile-card.component';
import {ToastService} from '../../../../../../shared/toast/toast.service';
import {
  DiagnosisSummaryModalComponent
} from '../../../../components/diagnosis-summary-modal/diagnosis-summary-modal.component';

@Component({
  selector: 'app-diagnoses-table',
  imports: [
    IonicModule,
    NgForOf,
    NgOptimizedImage
  ],
  templateUrl: './diagnoses-table.component.html',
  standalone: true,
  styleUrl: './diagnoses-table.component.scss'
})
export class DiagnosesTableComponent {
  @Input({ required: true }) myDiagnoses!: MyDiagnosis[];
  isLoading = true;
  protected readonly formatAppointmentTime = formatAppointmentTime;
  protected readonly formatPhoneNumber = formatPhoneNumber;

  constructor(
    private modalCtrl: ModalController,
    private toast: ToastService
  ) {}

  async openDoctorProfileModal(doctor: DoctorItem) {
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

  async openSummary(diagnosis: MyDiagnosis) {
    const modal = await this.modalCtrl.create({
      component: DiagnosisSummaryModalComponent as any,
      componentProps: { diagnosis },
      cssClass: 'diagnosis-summary-modal'
    });
    await modal.present();
  }

  async downloadDiagnosis(diagnosis: MyDiagnosis) {
    console.debug('Letöltés:', diagnosis);
    this.toast.show("Letöltés.", "success");
  }
}
