import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {ToastService} from '../../../../../../shared/toast/toast.service';
import {environment} from '../../../../../../../../enviroment';
import {AdminItem} from '../../../../../../utils/interfaces/admin.interface';
import {PASSWORD_PATTERN, PHONE_PATTERN, TAJ_PATTERN, TEXT_PATTERN} from '../../../../../../utils/validation-patterns';
import {PlatformService} from '../../../../../../services/platform/platform.service';

@Component({
  selector: 'app-patient-regist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule
  ],
  templateUrl: './patient-regist.component.html',
  styleUrls: ['./patient-regist.component.scss']
})

export class PatientRegistComponent {
  @Input() title: string = 'Páciens regisztráció';
  @Input() calledByAdmin: boolean = false;
  @Input() adminUser!: AdminItem;

  patientForm: FormGroup;

  showPwd1 = false;
  showPwd2 = false;

  loading = false;

  constructor(
    protected platform: PlatformService,
    private http: HttpClient,
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private router: Router,
    private toast: ToastService
  ) {
    this.patientForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.pattern(TEXT_PATTERN)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      password_again: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
      address: ['', [Validators.required, Validators.pattern(TEXT_PATTERN)]],
      birthDate: ['', Validators.required],
      taj: ['', [Validators.required, Validators.pattern(TAJ_PATTERN)]],
      gender: ['', Validators.required]
    });
  }

  onPatientRegister() {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      this.toast.show('Kérlek, tölts ki minden kötelező mezőt!', 'warning');
      return;
    }

    const {
      fullName,
      email,
      password,
      password_again,
      phoneNumber,
      address,
      birthDate,
      taj,
      gender
    } = this.patientForm.getRawValue();

    const emailNorm = String(email ?? '').trim().toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm);
    if (!emailOk) {
      this.patientForm.get('email')?.setErrors({ email: true });
      this.toast.show('Hibás e-mail cím!', 'danger');
      return;
    }

    if (password !== password_again) {
      this.patientForm.get('password_again')?.setErrors({ mismatch: true });
      this.toast.show('A jelszavak nem egyeznek!', 'warning');
      return;
    }

    const payloadBase: any = {
      name: String(fullName ?? '').trim(),
      email: emailNorm,
      password: String(password ?? ''),
      phoneNumber: String(phoneNumber ?? '').trim(),
      address: String(address ?? '').trim(),
      birthDate: new Date(birthDate),
      ...(taj ? { taj: String(taj).trim() } : {}),
      ...(gender ? { gender } : {})
    };

    if (!this.calledByAdmin) {
      this.http.post(`${environment.apiUrl}/auth/register/patient`, payloadBase)
        .subscribe({
          next: () => {
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
