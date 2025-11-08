import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from "@ionic/angular";
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {HttpClient} from "@angular/common/http";
import {Router} from "@angular/router";
import {ToastService} from "../../../../../../shared/toast/toast.service";
import {AdminItem} from '../../../../../../utils/interfaces/admin.interface';
import {environment} from '../../../../../../../../../backend/config/enviroment';

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

  fullName: string = '';
  email: string = '';
  password: string = '';
  password_again: string = '';
  phoneNumber: string = '';
  address: string = '';

  adminForm: FormGroup;

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
    this.adminForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      password_again: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      address: ['', Validators.required],
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
