import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
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
        IonicModule,
        ReactiveFormsModule
    ],
  templateUrl: './doctor-regist.component.html',
  styleUrls: ['./doctor-regist.component.scss']
})
export class DoctorRegistComponent {
  @Input() title: string = 'Orvosi jelentkezés';
  @Input() calledByAdmin: boolean = false;
  @Input() adminUser: any;

  doctorForm: FormGroup;

  showPwd1 = false;
  showPwd2 = false;

  loading = false;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private router: Router,
    private toast: ToastService
  ) {
    this.doctorForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      password_again: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      speciality: ['', Validators.required],
    });
  }

  onDoctorRegister() {
    if (this.doctorForm.invalid) {
      this.doctorForm.markAllAsTouched();
      this.toast.show('Kérlek, tölts ki minden kötelező mezőt!', 'warning');
      return;
    }

    const {
      fullName,
      email,
      password,
      password_again,
      phoneNumber,
      speciality,
    } = this.doctorForm.getRawValue();

    const emailNorm = String(email ?? '').trim().toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm);
    if (!emailOk) {
      this.doctorForm.get('email')?.setErrors({ email: true });
      this.toast.show('Hibás e-mail cím!', 'danger');
      return;
    }

    if (password !== password_again) {
      this.doctorForm.get('password_again')?.setErrors({ mismatch: true });
      this.toast.show('A jelszavak nem egyeznek!', 'warning');
      return;
    }

    const payloadBase: any = {
      name: String(fullName).trim(),
      email,
      password: String(password),
      phoneNumber: String(phoneNumber).trim(),
      speciality: String(speciality).trim(),
    };

    if (!this.calledByAdmin) {
      this.http.post(`${environment.apiUrl}/auth/register/doctor`, payloadBase)
        .subscribe({
          next: (res) => {
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
      const payloadAdmin = {
        ...payloadBase,
        adminUserId: this.adminUser.user.id,
        adminId: this.adminUser.admin.id
      };

      this.http.post(`${environment.apiUrl}/admin/registerDoctor`, payloadAdmin, {
        withCredentials: true
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

  togglePwd1() {
    this.showPwd1 = !this.showPwd1;
  }

  togglePwd2() {
    this.showPwd2 = !this.showPwd2;
  }

  backToDash() {
    void this.router.navigate(['/']);
  }
}
