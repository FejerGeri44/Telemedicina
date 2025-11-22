import {Component, Input} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {
  PatientProfileCardComponent
} from '../../../patient/components/patient-profile-card/patient-profile-card.component';
import {MyAppointment} from '../../../../utils/interfaces/appointment.inteface';
import {environment} from '../../../../../../enviroment';
import {HttpClient} from '@angular/common/http';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';

interface AppointmentActionResponse {
  message: string;
  id: number;
  newStatus: string;
}

@Component({
  selector: 'app-appointment-review-modal',
  imports: [
    ...IONIC_COMPONENTS,
    PatientProfileCardComponent
  ],
  templateUrl: './appointment-review-modal.component.html',
  standalone: true,
  styleUrl: './appointment-review-modal.component.scss'
})
export class AppointmentReviewModalComponent {
  @Input({ required: true }) appointment!: MyAppointment;
  isLoading: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient
  ) {}

  async handleAppointmentAction(appointmentId: number, status: 'approved' | 'rejected'): Promise<AppointmentActionResponse | null> {
    this.isLoading = true;

    const payload = {
      appointmentId: appointmentId,
      status: status,
    }

    return new Promise<AppointmentActionResponse | null>((resolve) => {
      this.http.post<AppointmentActionResponse>(`${environment.apiUrl}/doctor/approveOrRejectAppointment`,
        payload,
        { withCredentials: true }
      ).subscribe({
        next: (res) => {
          this.isLoading = false;
          resolve(res);
        },
        error: (err) => {
          this.isLoading = false;
          console.error('❌ Nem sikerült lekérni a pácienseket:', err);
          resolve(null);
        }
      });
    });
  }

  async onApproveClick(appointmentId: number) {
    const result = await this.handleAppointmentAction(appointmentId, 'approved');
    if (result) {
      await this.modalCtrl.dismiss({
        dismissed: true,
        action: 'approved',
        appointmentId: appointmentId
      });
    }
  }

  async onRejectClick(appointmentId: number) {
    const result = await this.handleAppointmentAction(appointmentId, 'rejected');
    if (result) {
      await this.modalCtrl.dismiss({
        dismissed: true,
        action: 'rejected',
        appointmentId: appointmentId
      });
    }
  }

  close() {
    void this.modalCtrl.dismiss({
      dismissed: true,
      action: 'none'
    });
  }
}
