import {Component, OnInit} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {HttpClient} from '@angular/common/http';
import {NgForOf, NgIf} from '@angular/common';
import {
  PatientProfileCardComponent
} from '../../../patient/components/patient-profile-card/patient-profile-card.component';
import {Router} from '@angular/router';

interface PatientUser {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  address: string;
  birthDate: string;
  pictureUrl?: string;
}

interface PatientInfo {
  id: number;
  homePhone?: string;
  height?: number | null;
  weight?: number | null;
  gender?: string | null;
  taj?: string | null;
}

interface PatientTag {
  name: string;
  value: string;
}

interface MyPatientCard {
  user: PatientUser;
  patient: PatientInfo;
  tags: PatientTag[];
}

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

  formatPhoneNumber(phone?: string | null | undefined): string {
    if (!phone || phone.length !== 11 || !phone.startsWith('06')) return phone ?? '';
    return `${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }

  loadMyPatients() {
    const token = localStorage.getItem('token');
    if (!token) return;
    this.isLoading = true;

    this.http.get<{ doctorId: number; count: number; patients: MyPatientCard[] }>(
      'http://localhost:3000/api/getMyPatients',
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: (res) => {
        this.patients = res?.patients ?? [];
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
}
