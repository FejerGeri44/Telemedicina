import {Component, OnInit} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IonicModule, ModalController } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import {AsyncPipe, DatePipe, NgForOf, NgIf, NgOptimizedImage, TitleCasePipe} from '@angular/common';

import { PatientProfileCardComponent } from '../../components/patient-profile-card/patient-profile-card.component';
import { PatientEditProfileModalComponent } from '../../components/patient-edit-profile-modal/patient-edit-profile-modal.component';

import {UserService} from '../../../../services/user/user.service';
import {MyAppointment} from '../../../../utils/interfaces/appointment.inteface';
import {environment} from '../../../../../../enviroment';
import {ToastService} from '../../../../shared/toast/toast.service';
import {formatAppointmentTime} from '../../../../utils/formatProfileData';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {firstValueFrom, Observable, take} from 'rxjs';
import {DocumentItem} from '../../../../utils/interfaces/document.interface';

@Component({
  selector: 'app-patient-home',
  standalone: true,
  imports: [PatientProfileCardComponent, IonicModule, RouterLink, NgIf, NgForOf, NgOptimizedImage, AsyncPipe, DatePipe, TitleCasePipe],
  templateUrl: './patient-home.component.html',
  styleUrl: './patient-home.component.scss'
})
export class PatientHomeComponent implements OnInit {
  user: Observable<PatientItem | null>;
  myAppointments: MyAppointment[] = [];
  myDocuments: DocumentItem[] = [];

  isAppointmentsLoading: boolean = true;
  isAppointmentsLoaded: boolean = false;
  isDocumentsLoading: boolean = true;
  isDocumentsLoaded: boolean = false;

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController,
    protected userService: UserService,
    private toast: ToastService
  ) {
    this.user = this.userService.patient$();
  }

  ngOnInit() {
    void this.fetchAppointments();
    void this.fetchDocuments();
  }

  private async getPatientId(): Promise<number | null> {
    const user = await firstValueFrom(this.user);
    return user?.patient.id ?? null;
  }

  async openEditModal() {
    const user = await firstValueFrom(this.user.pipe(take(1)));

    const modal = await this.modalCtrl.create({
      component: PatientEditProfileModalComponent as any,
      cssClass: 'Profile-edit-modal',
      componentProps: { user }
    });

    await modal.present();
    const { role } = await modal.onDidDismiss();

    if (role === 'updated') {
    }
  }

  async fetchAppointments(): Promise<void> {
    this.isAppointmentsLoading = true;

    const patientId = await this.getPatientId();
    if (!patientId) {
      this.toast.show('Hiányzik a páciens azonosító. Jelentkezz be újra.', 'danger');
      return;
    }

    this.http.post<MyAppointment[]>(
      `${environment.apiUrl}/patient/loadMyAppointments`,
      { patientId },
      {
        withCredentials: true,
      }
    ).subscribe({
      next: (res) => {
        this.limitAppointmentNumbers(res);
        this.isAppointmentsLoading = false;
        this.isAppointmentsLoaded = true;
      },
      error: (error) => {
        console.error('❌ Nem sikerült betölteni az időpontokat:', error);
        this.isAppointmentsLoading = false;
        this.isAppointmentsLoaded = true;
      }
    });
  }

  async fetchDocuments(): Promise<void> {
    this.isDocumentsLoading = true;

    const patientId = await this.getPatientId();
    if (!patientId) {
      this.toast.show('Hiányzik a páciens azonosító. Jelentkezz be újra.', 'danger');
      return;
    }

    this.http.post<DocumentItem[]>(
      `${environment.apiUrl}/patient/loadMyDocuments`,
      { patientId },
      {
        withCredentials: true,
      }
    ).subscribe({
      next: (res) => {
        this.limitDocuments(res);
        this.isDocumentsLoading = false;
        this.isDocumentsLoaded = true;
      },
      error: (error) => {
        console.error('❌ Nem sikerült betölteni a dokumentumokat:', error);
        this.isDocumentsLoading = false;
        this.isDocumentsLoaded = true;
      }
    });
  }

  getDocumentTypeFromPath(storagePath: string): string | null {
    if (!storagePath) {
      return null;
    }

    const parts = storagePath.split('/');
    const fileNameWithId = parts[parts.length - 1];
    if (!fileNameWithId) {
      return null;
    }

    const firstHyphenIndex = fileNameWithId.indexOf('-');
    if (firstHyphenIndex === -1) {
      return null;
    }

    const docType = fileNameWithId.substring(0, firstHyphenIndex);
    return docType.trim() || null;
  }

  getDocumentIcon(docType: string | null): string {
    if (!docType) return 'document-outline';

    switch (docType.toLowerCase()) {
      case 'recept':
        return 'document-text-outline';
      case 'beutalo':
        return 'send-outline';
      case 'lelet':
        return 'flask-outline';
      default:
        return 'folder-outline';
    }
  }

  limitAppointmentNumbers(appointments: MyAppointment[]) {
    const now = Date.now();

    this.myAppointments = (appointments ?? [])
      .map(a => ({ ...a, _ts: new Date(a.starts_at).getTime() }))
      .filter(a => Number.isFinite(a._ts) && a._ts >= now)
      .sort((a, b) => a._ts - b._ts)
      .slice(0, 2)
      .map(({ _ts, ...a }) => a);
  }

  limitDocuments(documents: DocumentItem[]) {
    this.myDocuments = (documents ?? [])
      .map(d => ({ ...d, _ts: new Date(d.diagnosis_date).getTime() }))
      .filter(d => Number.isFinite(d._ts))
      .sort((a, b) => b._ts - a._ts)
      .slice(0, 2)
      .map(({ _ts, ...d }) => d as DocumentItem);
  }

  protected readonly formatAppointmentTime = formatAppointmentTime;
}
