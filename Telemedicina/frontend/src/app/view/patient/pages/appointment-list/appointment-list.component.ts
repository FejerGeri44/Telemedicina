import {Component} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {ToastService} from '../../../../shared/toast/toast.service';
import {MyAppointment} from '../../../../utils/interfaces/appointment.inteface';
import {environment} from '../../../../../../../backend/config/enviroment';
import {UserService} from '../../../../shared/user.service';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {formatAppointmentTime} from '../../../../utils/formatProfileData';
import {delay, filter, firstValueFrom, Observable, take} from 'rxjs';

@Component({
  selector: 'app-appointment-list',
  imports: [
    IonicModule,
    NgForOf,
    NgIf,
    NgOptimizedImage
  ],
  templateUrl: './appointment-list.component.html',
  standalone: true,
  styleUrl: './appointment-list.component.scss'
})

export class AppointmentListComponent {
  user!: Observable<PatientItem | null>;
  myAppointments: MyAppointment[] = [];
  isLoading = true;
  sortColumn: 'datetime' | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private http: HttpClient,
    protected userService: UserService,
    private toast: ToastService,
    private alert: AlertService
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
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Nem sikerült betölteni az időpontokat:', error);
        this.isLoading = false;
      }
    });
  }

  sortAppointments(): void {
    if (this.sortColumn !== 'datetime') {
      this.sortColumn = 'datetime';
      this.sortDirection = 'asc';
    } else {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    }

    const dir = this.sortDirection === 'asc' ? 1 : -1;

    this.myAppointments = [...this.myAppointments].sort((a, b) => {
      const A = Date.parse(a.from);
      const B = Date.parse(b.from);
      return (A - B) * dir;
    });
  }

  confirmDelete(appointment: MyAppointment) {
    void this.alert.show(
      'Biztosan törlöd?',
      'Ez a művelet nem visszavonható.',
      () => this.cancelAppointment(appointment)
    );
  }

  async cancelAppointment(appointment: MyAppointment): Promise<void | null> {

    this.http.patch<{ message: string }>(
      `${environment.apiUrl}/patient/cancelAppointment`,
      {payload: appointment.id},
      {
        withCredentials: true
      }
    ).subscribe({
      next: () => {
        this.toast.show('Időpont lemondva', 'success');
        this.myAppointments = this.myAppointments.filter(a => a.id !== appointment.id);
      },
      error: (err) => {
        console.error('❌ Lemondás sikertelen:', err);
        this.toast.show('Lemondás sikertelen', 'danger');
      }
    });
  }

  protected readonly formatAppointmentTime = formatAppointmentTime;
}
