import {Component} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {HttpClient} from '@angular/common/http';
import {NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {
  PatientProfileCardComponent
} from '../../../patient/components/patient-profile-card/patient-profile-card.component';
import {Router, RouterLink} from '@angular/router';
import {formatPhoneNumber} from '../../../../utils/formatProfileData';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {UserService} from '../../../../services/user/user.service';
import {delay, filter, firstValueFrom, Observable, take} from 'rxjs';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {ToastService} from '../../../../shared/toast/toast.service';
import {environment} from '../../../../../../enviroment';

@Component({
  selector: 'app-my-patients',
  imports: [
    IonicModule,
    NgIf,
    NgForOf,
    NgOptimizedImage,
    RouterLink
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

  searchTerm: string = '';
  currentSearchTerm: string = '';

  currentPage = 1;
  pageSize = 6;
  visiblePages: number[] = [];
  totalCount = 0;

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
          this.applyPagination();
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

  get filteredPatients(): PatientItem[] {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      return this.patients;
    }

    const lowerCaseTerm = this.searchTerm.toLowerCase().trim();

    return this.patients.filter(patient =>
      patient.user.name.toLowerCase().includes(lowerCaseTerm)
    );
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    this.applyPagination();
  }

  applySearch() {
    this.currentSearchTerm = this.searchTerm;
    this.applyPagination();
  }

  clearSearch() {
    this.searchTerm = '';
    this.currentSearchTerm = '';
    this.applyPagination();
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
    void this.router.navigate(['/doctor/doctor-messages'], {
      state: { selectedPatient: normalized }
    });
  }

  private normalizePatientForMessages(src: any) {
    if (src?.patient && src?.user) {
      const { patient, user } = src;
      const merged: PatientItem = {
        user: user,
        patient: patient
      };

      if (merged.patient.userId == null && user?.id != null) {
        (merged as any).userId = user.id;
      }

      return merged;
    }
    return src;
  }

  get paginatedPatients(): PatientItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredPatients.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredPatients.length / this.pageSize);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateVisiblePages();
    }
  }

  updateVisiblePages() {
    const pagesToShow = 5;
    let start = Math.max(1, this.currentPage - Math.floor(pagesToShow / 2));
    let end = Math.min(this.totalPages, start + pagesToShow - 1);

    if (end - start < pagesToShow - 1) {
      start = Math.max(1, end - pagesToShow + 1);
    }

    this.visiblePages = [];
    for (let i = start; i <= end; i++) {
      this.visiblePages.push(i);
    }
  }

  private applyPagination() {
    this.totalCount = this.filteredPatients.length;
    this.currentPage = 1;
    this.updateVisiblePages();
  }

  protected readonly formatPhoneNumber = formatPhoneNumber;
}
