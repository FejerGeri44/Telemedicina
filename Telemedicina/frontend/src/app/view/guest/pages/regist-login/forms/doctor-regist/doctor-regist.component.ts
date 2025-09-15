import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {ToastService} from '../../../../../../shared/toast/toast.service';

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
  address: string = '';
  birthDate: string = '';
  introduction: string = '';

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

  onDoctorRegister() {
    // Üres mezők ellenőrzése
    if (!this.fullName || !this.email || !this.password || !this.password_again || !this.phoneNumber || !this.speciality) {
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

    const doctorData: any = {
      name: this.fullName,
      email: this.email,
      password: this.password,
      phoneNumber: this.phoneNumber,
      speciality: this.speciality,
    };

    if (!this.calledByAdmin) {
      this.http.post('http://localhost:3000/api/auth/register/doctor', doctorData)
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
            this.toast.show('Hiba történt a regisztráció során!', 'danger');
          }
        });
    }else {
      const token = localStorage.getItem('token');
      if (!token) return;

      const UserId  = this.adminUser.user.id;
      const AdminId = this.adminUser.admin.id;

      const payload = {
        name: this.fullName,
        email: this.email,
        password: this.password,
        phoneNumber: this.phoneNumber,
        speciality: this.speciality,
        adminUserId: UserId,
        adminId: AdminId
      };

      this.http.post('http://localhost:3000/api/admin/registerDoctor', payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .subscribe({
          next: () => {
            this.toast.show("Sikeres Orvos felvitel!", "success");
            void this.modalCtrl.dismiss(true);
          },
          error: err => {
            console.error(err);
            this.toast.show('Hiba történt a regisztráció során!', 'danger');
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
