import {Component, OnInit} from '@angular/core';
import {DatePipe, NgForOf, NgIf} from '@angular/common';
import {IonicModule} from '@ionic/angular';
import {HttpClient} from '@angular/common/http';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {ToastService} from '../../../../shared/toast/toast.service';
import {formatPhoneNumber} from '../../../../utils/formatProfileData';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';

@Component({
  selector: 'app-doctor-approvals',
  imports: [
    DatePipe,
    IonicModule,
    NgForOf,
    NgIf
  ],
  templateUrl: './doctor-approvals.component.html',
  standalone: true,
  styleUrl: './doctor-approvals.component.css'
})
export class DoctorApprovalsComponent implements OnInit{
  pendingDoctors: DoctorItem[] = [];
  loading: boolean = false;

  constructor(
    private http: HttpClient,
    private alert: AlertService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadPendingDoctors();
  }

  loadPendingDoctors() {
    this.loading = true;
    const token = localStorage.getItem('token') ?? '';
    this.http.get<DoctorItem[]>('http://localhost:3000/api/admin/pendingDoctors', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        this.pendingDoctors = res;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error('Pending orvosok lekérési hiba:', err);
      }
    });
  }

  confirmation(doctor: DoctorItem) {
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

    const token = localStorage.getItem('token') ?? '';

    this.http.patch(
      'http://localhost:3000/api/admin/approveDoctor',
      { doctorId },
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: () => {
        this.toast?.show('Orvos jóváhagyva.', 'success');
        this.loadPendingDoctors();
      },
      error: (err) => {
        console.error('Jóváhagyási hiba:', err);
      }
    });
  }

  protected readonly formatPhoneNumber = formatPhoneNumber;
}
