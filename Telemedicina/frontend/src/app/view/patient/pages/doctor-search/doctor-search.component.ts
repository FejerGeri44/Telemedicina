import {Component, ComponentRef, Injector, OnInit, ViewContainerRef} from '@angular/core';
import {PatientNavbarComponent} from '../../components/patient-navbar/patient-navbar.component';
import {IonicModule, ToastController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {CustomToastComponent} from '../../../../shared/toast/toast.component';
import { ModalController } from '@ionic/angular';
import { AppointmentModalComponent } from '../../components/appointment-modal/appointment-modal.component';
import {
  DoctorEditProfileModalComponent
} from '../../../doctor/components/doctor-edit-profile-modal/doctor-edit-profile-modal.component';
import {DoctorProfileCardComponent} from '../../../doctor/components/doctor-profile-card/doctor-profile-card.component';

@Component({
  selector: 'app-doctor-search',
  imports: [
    PatientNavbarComponent,
    IonicModule,
    FormsModule,
    NgForOf,
    NgOptimizedImage,
    NgIf
  ],
  templateUrl: './doctor-search.component.html',
  standalone: true,
  styleUrl: './doctor-search.component.css'
})

export class DoctorSearchComponent implements OnInit{
  doctors: any[] = [];
  currentPage = 1;
  pageSize = 6;
  showFilters = false;
  selectedSpecialties: string[] = [];
  specialties: string[] = [];
  searchTerm: string = '';
  filteredDoctors: any[] = [];
  visiblePages: number[] = [];
  isLoading: boolean = true;
  totalCount = 0;

  constructor(
    private http: HttpClient,
    private toastController: ToastController,
    private viewContainerRef: ViewContainerRef,
    private injector: Injector,
    private modalCtrl: ModalController) {}

  ngOnInit() {
    this.http.get<any[]>('http://localhost:3000/api/doctors').subscribe(data => {
      this.doctors = data;
      this.filteredDoctors = data;
      this.extractUniqueSpecialties();
      this.applyFilters();
      this.isLoading = false;
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
    this.currentPage = page;
    this.updateVisiblePages();
  }

  prevPageSet() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateVisiblePages();
    }
  }

  nextPageSet() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
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
    const allSpecialties = this.doctors.map(doc => doc.speciality);
    this.specialties = [...new Set(allSpecialties)];
  }

  applyFilters() {
    this.filteredDoctors = this.doctors.filter(doctor => {
      const nameMatch = doctor.User.name.toLowerCase().includes(this.searchTerm.toLowerCase());
      const specialtyMatch = this.selectedSpecialties.length === 0 || this.selectedSpecialties.includes(doctor.speciality);
      return nameMatch && specialtyMatch;
    });

    this.totalCount = this.filteredDoctors.length;

    if (this.filteredDoctors.length === 0) {
      this.showCustomToast('Nincs ilyen Orvos a rendszerben!', 'danger');
    }

    this.currentPage = 1;
    this.updateVisiblePages();
  }

  onSearchChange() {
    this.applyFilters();
  }

  async openAppointmentModal(doctor: any) {
    const modal = await this.modalCtrl.create({
      component: AppointmentModalComponent,
      componentProps: { doctor },
      cssClass: 'registerTo-appointment-modal'
    });

    await modal.present();
    await modal.onDidDismiss();
  }

  async openDoctorProfileModal(doctor: any) {
    const modal = await this.modalCtrl.create({
      component: DoctorProfileCardComponent,
      componentProps: {
        user: doctor?.User ?? null,
        doctor,
        editable: false,
        canRate: true
      },
      cssClass: 'profile-view-modal'
    });

    await modal.present();
    await modal.onDidDismiss();
  }

  showCustomToast(message: string, type: 'success' | 'warning' | 'danger') {
    const toastRef: ComponentRef<CustomToastComponent> = this.viewContainerRef.createComponent(CustomToastComponent, {
      injector: this.injector
    });

    toastRef.instance.message = message;
    toastRef.instance.type = type;

    setTimeout(() => toastRef.destroy(), 4000);
  }
}
