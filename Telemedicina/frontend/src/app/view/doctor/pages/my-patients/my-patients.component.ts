import {Component, OnInit} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {HttpClient} from '@angular/common/http';
import {NgForOf, NgIf} from '@angular/common';
import {
  PatientProfileCardComponent
} from '../../../patient/components/patient-profile-card/patient-profile-card.component';
import {Router} from '@angular/router';
import {formatPhoneNumber} from '../../../../utils/formatProfileData';
import {MyPatientCard} from '../../../../utils/interfaces';

@Component({
  selector: 'app-my-patients',
  imports: [
    IonicModule,
    NgIf,
    NgForOf
  ],
  templateUrl: './my-patients.component.html',
  standalone: true,
  styleUrl: './my-patients.component.css'
})
export class MyPatientsComponent implements OnInit{
  isLoading = false;
  patients: MyPatientCard[] = [];

  constructor(
    private router: Router,
    private http: HttpClient,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.loadMyPatients();
  }

  loadMyPatients() {
    const token = localStorage.getItem('token');
    if (!token) return;
    this.isLoading = true;

    this.http.get<MyPatientCard[]>(
      'http://localhost:3000/api/getMyPatients',
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: (res) => {
        this.patients = res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Nem sikerült lekérni a pácienseket:', err);
        this.isLoading = false;
      }
    });
  }

  async openPatientModal(p: MyPatientCard) {
    const modal = await this.modalCtrl.create({
      component: PatientProfileCardComponent as any,
      componentProps: {
        user: p.user,
        patient: p.patient,
        tags: p.tags,
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
