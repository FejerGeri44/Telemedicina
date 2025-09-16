import {Component, OnInit} from '@angular/core';
import {DatePipe, NgForOf, NgIf} from '@angular/common';
import {IonicModule} from '@ionic/angular';
import {HttpClient} from '@angular/common/http';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {ToastService} from '../../../../shared/toast/toast.service';

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
  pendingDoctors: any[] = [];
  loading: boolean = false;

  constructor(private http: HttpClient, private alert: AlertService, private toast: ToastService) {}

  ngOnInit(): void {
    this.loadPendingDoctors();
  }

  loadPendingDoctors(): void {
    this.loading = true;
    const token = localStorage.getItem('token') ?? '';
    this.http.get<any[]>('http://localhost:3000/api/admin/pendingDoctors', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (list) => {
        this.pendingDoctors = list ?? [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error('Pending orvosok lekérési hiba:', err);
      }
    });
  }

  formatPhoneNumber(phone?: string | null | undefined): string {
    if (!phone || phone.length !== 11 || !phone.startsWith('06')) return phone ?? '';
    return `${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }

  confirmation(doctor: any) {
    void this.alert.show(
      'Engedély megadása',
      'Biztosan megadja az Orvosnak a regisztrációs engedélyt?',
      () => this.approveDoctor(doctor)
    )
  }

  approveDoctor(doctor: any) {
    const doctorId = doctor?.id ?? doctor?.Doctor?.id;
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
}
