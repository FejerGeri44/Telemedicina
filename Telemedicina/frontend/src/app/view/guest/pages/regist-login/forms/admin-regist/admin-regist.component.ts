import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from "@ionic/angular";
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {HttpClient} from "@angular/common/http";
import {Router} from "@angular/router";
import {ToastService} from "../../../../../../shared/toast/toast.service";
import {AdminItem} from '../../../../../../utils/interfaces/admin.interface';
import {environment} from '../../../../../../../../enviroment';
import {PASSWORD_PATTERN, PHONE_PATTERN, TEXT_PATTERN} from '../../../../../../utils/validation-patterns';
import {PlatformService} from '../../../../../../services/platform/platform.service';

@Component({
  selector: 'app-admin-regist',
  imports: [
    IonicModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './admin-regist.component.html',
  standalone: true,
  styleUrl: './admin-regist.component.scss'
})
export class AdminRegistComponent {
  @Input() adminUser!: AdminItem;

  adminForm: FormGroup;

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
    this.adminForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.pattern(TEXT_PATTERN)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      password_again: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
      address: ['', [Validators.required, Validators.pattern(TEXT_PATTERN)]],
    });
  }

  onAdminRegister() {
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
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
    } = this.adminForm.getRawValue();

    const emailNorm = String(email ?? '').trim().toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm);
    if (!emailOk) {
      this.adminForm.get('email')?.setErrors({ email: true });
      this.toast.show('Hibás e-mail cím!', 'danger');
      return;
    }

    if (password !== password_again) {
      this.adminForm.get('password_again')?.setErrors({ mismatch: true });
      this.toast.show('A jelszavak nem egyeznek!', 'warning');
      return;
    }

    const payload = {
      name: String(fullName).trim(),
      email,
      password: String(password),
      phoneNumber: String(phoneNumber).trim(),
      address: String(address).trim(),
    };

    this.http.post(`${environment.apiUrl}/admin/registerAdmin`,
      payload,
      { withCredentials: true }
      )
      .subscribe({
        next: () => {
          this.toast.show("Sikeres Admin felvitel!", "success");
          void this.modalCtrl.dismiss(true);
        },
        error: err => {
          console.error(err);
          this.toast.show('Hiba történt a regisztráció során!', 'danger');
        }
      });
  }

  togglePwd1() {
    this.showPwd1 = !this.showPwd1;
  }

  togglePwd2() {
    this.showPwd2 = !this.showPwd2;
  }
}
