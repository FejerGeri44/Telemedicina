import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from "@ionic/angular";
import {FormsModule} from "@angular/forms";
import {NgClass, NgIf} from "@angular/common";
import {HttpClient} from "@angular/common/http";
import {Router} from "@angular/router";
import {ToastService} from "../../../../../../shared/toast/toast.service";

@Component({
  selector: 'app-admin-regist',
  imports: [
    IonicModule,
    FormsModule,
    NgIf,
    NgClass
  ],
  templateUrl: './admin-regist.component.html',
  standalone: true,
  styleUrl: './admin-regist.component.css'
})
export class AdminRegistComponent {
  @Input() calledByAdmin: boolean = false;
  @Input() adminUser: any;

  fullName: string = '';
  email: string = '';
  password: string = '';
  password_again: string = '';
  phoneNumber: string = '';
  address: string = '';

  validEmail: boolean = false;
  invalidEmail: boolean = false;
  showPassword: boolean = false;

  buttonText: string = this.calledByAdmin ? 'jelentkezek' : 'Mentés';

  constructor(
      private http: HttpClient,
      private modalCtrl: ModalController,
      private router: Router,
      private toast: ToastService
  ) {}

  onAdminRegister() {
    // Üres mezők ellenőrzése
    if (!this.fullName || !this.email || !this.password || !this.password_again || !this.phoneNumber || !this.address) {
      this.toast.show('Kérlek, tölts ki minden kötelező mezőt!', 'warning');
      return;
    } else {

      // Email ellenőrzése
      if (!this.email.includes('@')) {
        this.invalidEmail = true;
        this.validEmail = false;
        this.toast.show('Hibás e-mail cím!', 'danger');
        return;
      } else {
        this.invalidEmail = false;
        this.validEmail = true;
      }

      // Jelszavak egyezősége
      if (this.password !== this.password_again) {
        this.toast.show('A jelszavak nem egyeznek!', 'warning');
        return;
      }
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const UserId  = this.adminUser.user.id;
    const AdminId = this.adminUser.admin.id;

    const adminData: any = {
      name: this.fullName,
      email: this.email,
      password: this.password,
      phoneNumber: this.phoneNumber,
      address: this.address,
      adminUserId: UserId,
      adminId: AdminId
    };

    this.http.post('http://localhost:3000/api/admin/registerAdmin', adminData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
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

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
