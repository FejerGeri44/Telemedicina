import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {ToastService} from '../../../../../../shared/toast/toast.service';
import {environment} from '../../../../../../../../../backend/config/enviroment';

@Component({
  selector: 'app-doctor-regist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  templateUrl: './doctor-regist.component.html',
  styleUrls: ['./doctor-regist.component.css']
})
export class DoctorRegistComponent {
  @Input() title: string = 'Orvosi jelentkezés';
  @Input() calledByAdmin: boolean = false;
  @Input() adminUser: any;

  fullName: string = '';
  email: string = '';
  password: string = '';
  password_again: string = '';
  phoneNumber: string = '';
  speciality: string = '';

  showPassword: boolean = false;

  buttonText: string = this.calledByAdmin ? 'jelentkezek' : 'Mentés';

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController,
    private router: Router,
    private toast: ToastService
  ) {}

  onDoctorRegister() {
    if (
      !this.fullName || !this.email || !this.password || !this.password_again ||
      !this.phoneNumber  || !this.speciality
    ) {
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

    const payloadBase = {
      name: String(this.fullName).trim(),
      email,
      password: String(this.password),
      phoneNumber: String(this.phoneNumber).trim(),
      speciality: String(this.speciality).trim(),
    };

    if (!this.calledByAdmin) {
      this.http.post(`${environment.apiUrl}/auth/register/doctor`, payloadBase)
        .subscribe({
          next: () => {
            setTimeout(() => {
              void this.router.navigate(['/regist-login'], {
                queryParams: {
                  tab: 'login',
                  toast: 'Sikeres orvos regisztráció!',
                  type: 'success',
                  successfulRegist: true
                }
              });
            }, 500);
          },
          error: err => {
            console.error(err);
            const msg = err?.error?.message || 'Hiba történt az orvos regisztráció során.';
            this.toast.show(msg, 'danger');
          }
        });

    } else {
      const token = localStorage.getItem('token');
      if (!token) return;

      const payloadAdmin = {
        ...payloadBase,
        adminUserId: this.adminUser.user.id,
        adminId: this.adminUser.admin.id
      };

      this.http.post(`${environment.apiUrl}/admin/registerDoctor`, payloadAdmin, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: () => {
          this.toast.show('Sikeres Orvos felvitel!', 'success');
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
