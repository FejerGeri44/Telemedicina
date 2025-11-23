import {Component, Input} from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {ToastService} from '../../../../../../shared/toast/toast.service';
import {environment} from '../../../../../../../../enviroment';
import {AdminItem} from '../../../../../../utils/interfaces/admin.interface';
import {PASSWORD_PATTERN, PHONE_PATTERN, TEXT_PATTERN} from '../../../../../../utils/validation-patterns';
import {PlatformService} from '../../../../../../services/platform/platform.service';
import {formatPhoneNumberInput} from '../../../../../../utils/formatInput';
import {IONIC_COMPONENTS} from '../../../../../../shared/ionic-imports';

@Component({
  selector: 'app-doctor-regist',
  standalone: true,
    imports: [
        ...IONIC_COMPONENTS,
        CommonModule,
        FormsModule,
        ReactiveFormsModule
    ],
  templateUrl: './doctor-regist.component.html',
  styleUrls: ['./doctor-regist.component.scss']
})
export class DoctorRegistComponent {
  @Input() title: string = 'Orvosi jelentkezés';
  @Input() calledByAdmin: boolean = false;
  @Input() adminUser!: AdminItem;

  doctorForm: FormGroup;

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
    this.doctorForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.pattern(TEXT_PATTERN)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      password_again: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
      speciality: ['', [Validators.required, Validators.pattern(TEXT_PATTERN)]],
    });
  }

  onDoctorRegister() {
    if (this.doctorForm.invalid) {
      this.doctorForm.markAllAsTouched();
      if (this.doctorForm.get('email')?.invalid) {
        this.toast.show('Kérlek, adj meg egy érvényes e-mail címet!', 'warning');
      } else if (this.doctorForm.get('password')?.invalid) {
        this.toast.show('A jelszó nem felel meg a követelményeknek (min. 8 karakter, szám, nagybetű)!', 'warning');
      } else {
        this.toast.show('Kérlek, tölts ki minden kötelező mezőt helyesen!', 'warning');
      }
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

    if (password !== password_again) {
      this.doctorForm.get('password_again')?.setErrors({ mismatch: true });
      this.toast.show('A jelszavak nem egyeznek!', 'warning');
      return;
    }

    this.loading = true;

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
          next: () => {
            setTimeout(() => {
              void this.router.navigate(['/regist-login'], {
                queryParams: {
                  tab: 'login',
                  toast: 'Sikeres jelentkezés leadás!',
                  type: 'success',
                  successfulRegist: true
                }
              });
            }, 500);
            this.loading = false;
          },
          error: err => {
            console.error(err);
            const msg = err?.error?.message || 'Hiba történt az orvos regisztráció során.';
            this.toast.show(msg, 'danger');
            this.loading = false;
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
          this.loading = false;
        },
        error: err => {
          console.error(err);
          const msg = err?.error?.message || 'Hiba történt a regisztráció során!';
          this.toast.show(msg, 'danger');
          this.loading = false;
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

  onPhoneChange(event: any) {
    formatPhoneNumberInput(event, this.doctorForm.get('phoneNumber'));
  }
}
