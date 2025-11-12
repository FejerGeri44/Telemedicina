import {Component, OnInit} from '@angular/core';
import {NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {IonicModule, SegmentChangeEventDetail} from '@ionic/angular';
import {HttpClient} from '@angular/common/http';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {ToastService} from '../../../../shared/toast/toast.service';
import {formatPhoneNumber} from '../../../../utils/formatProfileData';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {environment} from '../../../../../../enviroment';

type Tab = 'pending' | 'denied';

@Component({
  selector: 'app-doctor-approvals',
  imports: [
    IonicModule,
    NgForOf,
    NgIf,
    NgOptimizedImage
  ],
  templateUrl: './doctor-approvals.component.html',
  standalone: true,
  styleUrl: './doctor-approvals.component.scss'
})
export class DoctorApprovalsComponent implements OnInit{
  pendingDoctors: DoctorItem[] = [];
  deniedDoctors: DoctorItem[] = [];

  selectedTab: Tab = 'pending';
  loading = true;

  private pendingLoaded = false;
  private deniedLoaded = false;
  private pendingDirty = false;
  private deniedDirty = false;

  constructor(
    private http: HttpClient,
    private alert: AlertService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadPendingDoctors();
    this.loadDeniedDoctors();
  }

  get displayedDoctors(): any[] {
    return this.selectedTab === 'pending' ? this.pendingDoctors : this.deniedDoctors;
  }

  onSegmentChange(ev: CustomEvent<SegmentChangeEventDetail>): void {
    const next = ev.detail.value as Tab;

    if (next === 'denied') {
      if (!this.deniedLoaded || this.deniedDirty) {
        this.loadDeniedDoctors();
      }
    } else {
      if (!this.pendingLoaded || this.pendingDirty) {
        this.loadPendingDoctors();
      }
    }

    this.selectedTab = next;
  }

  loadPendingDoctors() {
    this.loading = true;

    const payload = {
      status: "Pending"
    }

    this.http.post<DoctorItem[]>(`${environment.apiUrl}/admin/loadPendingOrDeniedDoctors`,
      payload,
    { withCredentials: true }
      ).subscribe({
      next: (res) => {
        this.pendingDoctors = res;
        this.pendingDirty = false;
        this.loading = false;
      },
      error: (err) => {
        this.pendingDirty = false;
        this.loading = false;
        console.error('Pending orvosok lekérési hiba:', err);
      }
    });
  }

  loadDeniedDoctors() {
    this.loading = true;

    const payload = {
      status: "Denied"
    }

    this.http.post<DoctorItem[]>(`${environment.apiUrl}/admin/loadPendingOrDeniedDoctors`,
      payload,
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        this.deniedDoctors = res;
        this.deniedDirty = false;
        this.loading = false;
      },
      error: (err) => {
        this.deniedDirty = false;
        this.loading = false;
        console.error('Pending orvosok lekérési hiba:', err);
      }
    });
  }

  approvalConfirmation(doctor: DoctorItem) {
    void this.alert.show(
      'Engedély megadása',
      'Biztosan megadja az Orvosnak a regisztrációs engedélyt?',
      () => this.approveDoctor(doctor)
    )
  }

  approveDoctor(doctor: DoctorItem) {
    const doctorId = doctor.doctor.id;
    if (!doctorId) {
      this.toast?.show('Hiányzó doctor_id.', 'danger');
      return;
    }

    const payload = {
      doctorId,
      status: "Approved"
    }

    this.http.patch(`${environment.apiUrl}/admin/setDoctorStatus`,
      payload,
      { withCredentials: true }
    ).subscribe({
      next: () => {
        this.pendingDoctors = this.pendingDoctors.filter(d =>
          String(d.doctor.id) !== String(doctorId)
        );

        this.toast?.show('Orvos jóváhagyva.', 'success');
      },
      error: (err) => {
        console.error('Jóváhagyási hiba:', err);
      }
    });
  }

  denialConfirmation(doctor: DoctorItem) {
    void this.alert.show(
      'Engedély megadása',
      'Biztosan megadja az Orvosnak a regisztrációs engedélyt?',
      () => this.denyDoctor(doctor)
    )
  }

  denyDoctor(doctor: DoctorItem) {
    const doctorId = doctor.doctor.id;
    if (!doctorId) {
      this.toast?.show('Hiányzó doctor_id.', 'danger');
      return;
    }

    const payload = {
      doctorId,
      status: "Denied"
    }

    this.http.patch(`${environment.apiUrl}/admin/setDoctorStatus`,
      payload,
      { withCredentials: true }
    ).subscribe({
      next: () => {
        this.deniedDirty = true;
        this.pendingDoctors = this.pendingDoctors.filter(d =>
          String(d.doctor.id) !== String(doctorId)
        );
        this.toast?.show('Orvos elutasítva.', 'success');
      },
      error: (err) => {
        console.error('Elutasítási hiba:', err);
      }
    });
  }

  reconsiderationConfirmation(doctor: DoctorItem) {
    void this.alert.show(
      'Státusz váltás',
      'Biztosan megadja az Orvosnak a regisztrációs lehetőséget?',
      () => this.reconsiderDoctor(doctor)
    )
  }

  reconsiderDoctor(doctor: DoctorItem) {
    const doctorId = doctor.doctor.id;
    if (!doctorId) {
      this.toast?.show('Hiányzó doctor_id.', 'danger');
      return;
    }

    const payload = {
      doctorId,
      status: "Pending"
    }

    this.http.patch(`${environment.apiUrl}/admin/setDoctorStatus`,
      payload,
      { withCredentials: true }
    ).subscribe({
      next: () => {
        this.deniedDoctors = this.deniedDoctors.filter(d =>
          String(d.doctor.id) !== String(doctorId)
        );

        this.toast?.show('Orvosi státusz átállítva.', 'success');
      },
      error: (err) => {
        console.error('Státusz átállítási hiba:', err);
      }
    });
  }

  protected readonly formatPhoneNumber = formatPhoneNumber;
}
