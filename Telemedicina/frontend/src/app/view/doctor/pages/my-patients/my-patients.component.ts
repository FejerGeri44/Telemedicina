import {Component, OnInit} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {HttpClient} from '@angular/common/http';
import {NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {
  PatientProfileCardComponent
} from '../../../patient/components/patient-profile-card/patient-profile-card.component';
import {Router} from '@angular/router';
import {formatPhoneNumber} from '../../../../utils/formatProfileData';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {UserService} from '../../../../shared/user.service';
import {delay, filter, firstValueFrom, Observable, take} from 'rxjs';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {ToastService} from '../../../../shared/toast/toast.service';
import {environment} from '../../../../../../../backend/config/enviroment';

@Component({
  selector: 'app-my-patients',
  imports: [
    IonicModule,
    NgIf,
    NgForOf,
    NgOptimizedImage
  ],
  templateUrl: './my-patients.component.html',
  standalone: true,
  styleUrl: './my-patients.component.scss'
})
export class MyPatientsComponent {
  user!: Observable<DoctorItem | null>;

  isLoading = true;
  hasLoadedPatients = false;
  patients: PatientItem[] = [];

  constructor(
    private router: Router,
    private http: HttpClient,
    private modalCtrl: ModalController,
    private userService: UserService,
    private toast: ToastService
  ) {
    this.user = this.userService.doctor$();

    (async () => {
      const userValue = await firstValueFrom(
        this.userService.doctor$().pipe(
          filter((u): u is DoctorItem => !!u),
          take(1),
          delay(50)
        )
      );

      await this.loadMyPatients();
    })();
  }

  private async getDoctorId(): Promise<number | null> {
    const user = await firstValueFrom(this.user);
    return user?.doctor.id ?? null;
  }

  async loadMyPatients() {
    this.isLoading = true;

    const doctorId = await this.getDoctorId();
    if (!doctorId) {
      this.toast.show('Hiányzik az orvos azonosító.', 'danger');
      return null;
    }
    return new Promise<PatientItem[] | null>((resolve) => {
      this.http.post<PatientItem[]>(
        `${environment.apiUrl}/doctor/getAllMyPatients`,
        { id: doctorId },
        { withCredentials: true }
      ).subscribe({
        next: (res) => {
          this.patients = res;
          this.isLoading = false;
          this.hasLoadedPatients = true;
          resolve(res);
        },
        error: (err) => {
          console.error('❌ Nem sikerült lekérni a pácienseket:', err);
          this.isLoading = false;
          this.patients = [];
          resolve(null);
        }
      });
    });
  }

  async openPatientModal(patient: PatientItem) {
    const modal = await this.modalCtrl.create({
      component: PatientProfileCardComponent as any,
      componentProps: {
        user: patient,
        editable: false
      },
      cssClass: 'profile-view-modal',
      backdropDismiss: true
    });
    await modal.present();
  }

  goToMessages(raw: any) {
    const normalized = this.normalizePatientForMessages(raw);
    void this.router.navigate(['/doctor-messages'], {
      state: { selectedPatient: normalized }
    });
  }

  private normalizePatientForMessages(src: any) {
    if (src?.patient && src?.user) {
      const { patient, user } = src;
      const merged = {
        ...patient,
        User: user
      };

      if (merged.userId == null && user?.id != null) {
        (merged as any).userId = user.id;
      }

      return merged;
    }
    return src;
  }

  protected readonly formatPhoneNumber = formatPhoneNumber;
}
