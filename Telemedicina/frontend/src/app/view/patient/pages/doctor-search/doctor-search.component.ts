import {Component, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {DecimalPipe, NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import { ModalController } from '@ionic/angular';
import { AppointmentModalComponent } from '../../components/appointment-modal/appointment-modal.component';
import {DoctorProfileCardComponent} from '../../../doctor/components/doctor-profile-card/doctor-profile-card.component';
import {ToastService} from '../../../../shared/toast/toast.service';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {environment} from '../../../../../../enviroment';
import {buildStarIcons, roundToHalf, StarIcon} from '../../../../utils/formatDoctorRating';

@Component({
  selector: 'app-doctor-search',
  imports: [
    IonicModule,
    FormsModule,
    NgForOf,
    NgIf,
    DecimalPipe,
    NgOptimizedImage
  ],
  templateUrl: './doctor-search.component.html',
  standalone: true,
  styleUrl: './doctor-search.component.scss'
})

export class DoctorSearchComponent implements OnInit{
  doctors: DoctorItem[] = [];

  currentPage = 1;
  pageSize = 6;

  searchTerm: string = '';
  inputSearchTerm: string = '';
  showFilters = false;
  selectedSpecialties: string[] = [];
  specialties: string[] = [];
  filteredDoctors: DoctorItem[] = [];

  visiblePages: number[] = [];
  isLoading: boolean = true;
  totalCount = 0;

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.getDoctors().then(r => {});
  }

  async getDoctors(): Promise<DoctorItem[] | null> {

    return new Promise((resolve) => {
      this.http.get<DoctorItem[]>(
        `${environment.apiUrl}/patient/doctors`,
        {
          withCredentials: true,
        }
      ).subscribe({
        next: (res) => {
          this.doctors = res;
          this.filteredDoctors = res;
          this.extractUniqueSpecialties();
          this.applyFilters();
          this.isLoading = false;
          resolve(res);
        },
        error: (err) => {
          console.error('❌ Orvosok lekérése sikertelen:', err);
          this.toast.show('Nem sikerült betölteni az orvosokat.', 'danger');
          this.isLoading = false;
          resolve(null);
        }
      });
    });
  }

  get paginatedDoctors() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDoctors.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredDoctors.length / this.pageSize);
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

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  toggleSpecialty(specialty: string) {
    const index = this.selectedSpecialties.indexOf(specialty);
    if (index > -1) {
      this.selectedSpecialties.splice(index, 1);
    } else {
      this.selectedSpecialties.push(specialty);
    }
  }

  extractUniqueSpecialties() {
    const allSpecialties = this.doctors.map(doctor => doctor.doctor.speciality);
    this.specialties = [...new Set(allSpecialties)];
  }

  applyFilters() {
    this.filteredDoctors = this.doctors.filter(doctor => {
      const nameMatch = doctor.user.name.toLowerCase().includes(this.searchTerm.toLowerCase());
      const specialtyMatch = this.selectedSpecialties.length === 0 || this.selectedSpecialties.includes(doctor.doctor.speciality);
      return nameMatch && specialtyMatch;
    });

    this.totalCount = this.filteredDoctors.length;

    if (this.filteredDoctors.length === 0) {
      this.toast.show('Nincs ilyen Orvos a rendszerben!', 'danger');
    }

    this.currentPage = 1;
    this.updateVisiblePages();
  }

  onSearchInput(event: any) {
    this.inputSearchTerm = event.detail.value;
  }

  applySearch() {
    this.searchTerm = this.inputSearchTerm;
    this.applyFilters();
  }

  clearSearch() {
    this.inputSearchTerm = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  ratingFor(rating: number | null | undefined): { rounded: number; icons: StarIcon[] } {
    const rounded = roundToHalf(rating);
    const icons = buildStarIcons(rounded);
    return { rounded, icons };
  }

  async openAppointmentModal(doctor: DoctorItem) {
    const modal = await this.modalCtrl.create({
      component: AppointmentModalComponent as any,
      componentProps: {
        doctorData: doctor,
      },
      cssClass: 'registerTo-appointment-modal'
    });

    await modal.present();
    await modal.onDidDismiss();
  }

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
}
