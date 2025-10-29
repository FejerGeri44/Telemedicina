import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {ToastService} from '../../../../../../shared/toast/toast.service';
import {environment} from '../../../../../../../../../backend/config/enviroment';

@Component({
  selector: 'app-patient-regist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  templateUrl: './patient-regist.component.html',
  styleUrls: ['./patient-regist.component.scss']
})

export class PatientRegistComponent {
  @Input() title: string = 'Páciens regisztráció';
  @Input() calledByAdmin: boolean = false;
  @Input() adminUser: any;

  fullName: string = '';
  email: string = '';
  password: string = '';
  password_again: string = '';
  phoneNumber: string = '';
  taj: string = '';
  address: string = '';
  birthDate: string = '';
  gender: string = '';

  showPassword: boolean = false;

  buttonText: string = this.calledByAdmin ? 'jelentkezek' : 'Mentés';

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController,
    private router: Router,
    private toast: ToastService
  ) {}

  onPatientRegister() {
    if (!this.fullName || !this.email || !this.password || !this.password_again ||
      !this.phoneNumber || !this.address || !this.birthDate) {
      this.toast.show('Kérlek, tölts ki minden kötelező mezőt!', 'warning');
      return;
    }

    const email = String(this.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.toast.show('Hibás e-mail cím!', 'danger');
      return;
    }

    if (this.password !== this.password_again) {
      this.toast.show('A jelszavak nem egyeznek!', 'warning');
      return;
    }

    const payloadBase: any = {
      name: String(this.fullName).trim(),
      email,
      password: String(this.password),
      phoneNumber: String(this.phoneNumber).trim(),
      address: String(this.address).trim(),
      birthDate: new Date(this.birthDate).toISOString().split('T')[0],
    };

    if (this.taj) payloadBase.taj = String(this.taj).trim();
    if (this.gender) payloadBase.gender = this.gender;

    if (!this.calledByAdmin) {
      this.http.post(`${environment.apiUrl}/auth/register/patient`, payloadBase)
        .subscribe({
          next: (resp) => {
            setTimeout(() => {
              void this.router.navigate(['/regist-login'], {
                queryParams: {
                  tab: 'login',
                  toast: 'Sikeres páciens regisztráció!',
                  type: 'success',
                  successfulRegist: true
                }
              });
            }, 500);
          },
          error: err => {
            console.error(err);
            const msg = err?.error?.message || 'Hiba történt a páciens regisztráció során.';
            this.toast.show(msg, 'danger');
          }
        });

    } else {
      const payloadAdmin = {
        ...payloadBase,
        adminUserId: this.adminUser.user.id,
        adminId: this.adminUser.admin.id
      };

      this.http.post(`${environment.apiUrl}/admin/registerPatient`, payloadAdmin, {
        withCredentials: true
      }).subscribe({
        next: () => {
          this.toast.show('Sikeres Páciens felvitel!', 'success');
          void this.modalCtrl.dismiss(true);
        },
        error: err => {
          console.error(err);
          const msg = err?.error?.message || 'Hiba történt a regisztráció során!';
          this.toast.show(msg, 'danger');
        }
      });
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  backToDash() {
    void this.router.navigate(['/']);
  }
}
