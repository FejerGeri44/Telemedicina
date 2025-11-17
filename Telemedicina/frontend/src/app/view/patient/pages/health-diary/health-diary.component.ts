import { Component } from '@angular/core';
import {MyAppointment} from '../../../../utils/interfaces/appointment.inteface';
import {NgIf} from '@angular/common';
import {MyDiagnosis} from '../../../../utils/interfaces/diagnosis.interface';
import {DocumentItem} from '../../../../utils/interfaces/document.interface';
import {environment} from '../../../../../../enviroment';
import {HttpClient} from '@angular/common/http';
import {UserService} from '../../../../services/user/user.service';
import {ToastService} from '../../../../shared/toast/toast.service';
import {delay, filter, firstValueFrom, Observable, take} from 'rxjs';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {AppointmentTableComponent} from './components/appointment-table/appointment-table.component';
import {
  AppointmentTableSkeletonComponent
} from './components/appointment-table/appointment-table-skeleton/appointment-table-skeleton.component';
import {DiagnosesTableComponent} from './components/diagnoses-table/diagnoses-table.component';
import {
  DiagnosesTableSkeletonComponent
} from './components/diagnoses-table/diagnoses-table-skeleton/diagnoses-table-skeleton.component';
import {IonicModule} from '@ionic/angular';
import {DocumentTableComponent} from './components/document-table/document-table.component';
import {
  DocumentTableSkeletonComponent
} from './components/document-table/document-table-skeleton/document-table-skeleton.component';
import {formatAppointmentTime, formatTimestamp} from '../../../../utils/formatProfileData';

type DiaryTab = 'appointments' | 'documents' | 'diagnoses';

@Component({
  selector: 'app-health-diary',
  imports: [
    NgIf,
    AppointmentTableComponent,
    AppointmentTableSkeletonComponent,
    DiagnosesTableComponent,
    DiagnosesTableSkeletonComponent,
    IonicModule,
    DocumentTableComponent,
    DocumentTableSkeletonComponent
  ],
  templateUrl: './health-diary.component.html',
  standalone: true,
  styleUrl: './health-diary.component.scss'
})
export class HealthDiaryComponent {
  user!: Observable<PatientItem | null>;
  myAppointments: MyAppointment[] = [];
  myDiagnoses: MyDiagnosis[] = [];
  myDocuments: DocumentItem[] = [];
  isLoading = true;

  filteredAppointments: MyAppointment[] = [];
  filteredDiagnoses: MyDiagnosis[] = [];
  filteredDocuments: DocumentItem[] = [];

  myAppointmentCalledAndLoaded: boolean = false;
  myDiagnosesCalledAndLoaded: boolean = false;
  myDocumentCalledAndLoaded: boolean = false;

  query = '';
  activeTab: DiaryTab = 'appointments';

  pageSize = 10;
  currentPage = 1;

  constructor(
    private http: HttpClient,
    protected userService: UserService,
    private toast: ToastService
  ) {
    this.user = this.userService.patient$();

    (async () => {
      const userValue = await firstValueFrom(
        this.userService.patient$().pipe(
          filter((u): u is PatientItem => !!u),
          take(1),
          delay(50)
        )
      );

      await void this.fetchAppointments();
    })();
  }

  private async getPatientId(): Promise<number | null> {
    const user = await firstValueFrom(this.user);
    return user?.patient.id ?? null;
  }

  setTab(tabValue: string | number | null | undefined): void {
    if (typeof tabValue !== 'string') return;
    const newTab = tabValue as DiaryTab;
    if (!['appointments', 'documents', 'diagnoses'].includes(newTab)) return;
    if (this.activeTab === newTab) return;
    this.activeTab = newTab;
    this.currentPage = 1;

    switch (newTab) {
      case 'diagnoses':
        if (!this.myDiagnosesCalledAndLoaded) {
          void this.fetchDiagnoses();
        }
        break;
      case 'documents':
        if (!this.myDocumentCalledAndLoaded) {
          void this.fetchDocuments();
        }
        break;
      case 'appointments':
        if (!this.myAppointmentCalledAndLoaded) {
          void this.fetchAppointments();
        }
        break;
    }
  }

  async fetchAppointments(): Promise<void> {
    this.isLoading = true;

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
        this.myAppointments = res;
        this.filterData();
        this.isLoading = false;
        this.myAppointmentCalledAndLoaded = true;
      },
      error: (error) => {
        console.error('❌ Nem sikerült betölteni az időpontokat:', error);
        this.isLoading = false;
      }
    });
  }

  async fetchDocuments(): Promise<void> {
    this.isLoading = true;

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
        this.myDocuments = res;
        this.filterData();
        this.isLoading = false;
        this.myDocumentCalledAndLoaded = true;
      },
      error: (error) => {
        console.error('❌ Nem sikerült betölteni a dokumentumokat:', error);
        this.isLoading = false;
      }
    });
  }

  async fetchDiagnoses(): Promise<void> {
    this.isLoading = true;

    const patientId = await this.getPatientId();
    if (!patientId) {
      this.toast.show('Hiányzik a páciens azonosító. Jelentkezz be újra.', 'danger');
      return;
    }

    this.http.post<MyDiagnosis[]>(
      `${environment.apiUrl}/patient/loadMyDiagnoses`,
      { patientId },
      {
        withCredentials: true,
      }
    ).subscribe({
      next: (res) => {
        this.myDiagnoses = res;
        this.filterData();
        this.isLoading = false;
        this.myDiagnosesCalledAndLoaded = true;
      },
      error: (error) => {
        console.error('❌ Nem sikerült betölteni a diagnózisokat:', error);
        this.isLoading = false;
      }
    });
  }

  filterData(): void {
    const q = this.query.toLowerCase().trim();
    this.currentPage = 1;
    if (!q) {
      this.filteredAppointments = this.myAppointments;
      this.filteredDiagnoses = this.myDiagnoses;
      this.filteredDocuments = this.myDocuments;
      return;
    }

    this.filteredAppointments = this.myAppointments.filter(appt => {
      const doctorName = appt.doctor?.user?.name?.toLowerCase() || '';
      const apptTime = formatAppointmentTime(appt.starts_at, appt.ends_at).toLowerCase();

      return doctorName.includes(q) || apptTime.includes(q);
    });

    this.filteredDocuments = this.myDocuments.filter(doc => {
      const doctorName = doc.doctor?.user?.name?.toLowerCase() || '';
      const diagnosisTime = formatTimestamp(doc.diagnosis_date).toLowerCase();

      return doctorName.includes(q) || diagnosisTime.includes(q);
    });

    this.filteredDiagnoses = this.myDiagnoses.filter(diag => {
      const doctorName = diag.doctor_data?.user?.name?.toLowerCase() || '';
      const diagnosisTime = formatTimestamp(diag.diagnosis_date).toLowerCase();

      return doctorName.includes(q) || diagnosisTime.includes(q);
    });
  }

  get totalItems(): number {
    switch (this.activeTab) {
      case 'appointments':
        return this.filteredAppointments.length;
      case 'documents':
        return this.filteredDocuments.length;
      case 'diagnoses':
        return this.filteredDiagnoses.length;
      default:
        return 0;
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  private getPaginatedData<T>(data: T[]): T[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return data.slice(startIndex, endIndex);
  }

  get paginatedAppointments(): MyAppointment[] {
    return this.getPaginatedData(this.filteredAppointments);
  }

  get paginatedDiagnoses(): MyDiagnosis[] {
    return this.getPaginatedData(this.filteredDiagnoses);
  }

  get paginatedDocuments(): DocumentItem[] {
    return this.getPaginatedData(this.filteredDocuments);
  }
}
