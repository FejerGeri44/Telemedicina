import {Component} from '@angular/core';
import {NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {ToastService} from '../../../../shared/toast/toast.service';
import {MyAppointment} from '../../../../utils/interfaces/appointment.inteface';
import {environment} from '../../../../../../enviroment';
import {UserService} from '../../../../services/user/user.service';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {formatAppointmentTime, formatPhoneNumber} from '../../../../utils/formatProfileData';
import {delay, filter, firstValueFrom, Observable, take} from 'rxjs';
import {RouterLink} from '@angular/router';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';

@Component({
  selector: 'app-appointment-list',
  imports: [
    ...IONIC_COMPONENTS,
    NgForOf,
    NgIf,
    NgOptimizedImage,
    RouterLink
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
        this.myAppointments = this.filterFutureAppointments(res);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Nem sikerült betölteni az időpontokat:', error);
        this.isLoading = false;
      }
    });
  }

  private filterFutureAppointments(appointments: MyAppointment[]): MyAppointment[] {
    const now = Date.now();

    return (appointments ?? [])
      .filter(appointment => {
        const appointmentTime = new Date(appointment.starts_at).getTime();
        return Number.isFinite(appointmentTime) && appointmentTime >= now;
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
      const A = Date.parse(a.starts_at);
      const B = Date.parse(b.starts_at);
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
    protected readonly formatPhoneNumber = formatPhoneNumber;
}
