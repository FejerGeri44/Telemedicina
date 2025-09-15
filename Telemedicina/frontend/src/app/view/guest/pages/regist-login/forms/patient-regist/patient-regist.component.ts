import {Component, ComponentRef, Injector, Input, ViewContainerRef} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastController } from '@ionic/angular';
import {CustomToastComponent} from '../../../../../../shared/toast/toast.component';
import {ToastService} from '../../../../../../shared/toast/toast.service';

@Component({
  selector: 'app-patient-regist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  templateUrl: './patient-regist.component.html',
  styleUrls: ['./patient-regist.component.css']
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

  onPatientRegister() {
    // Üres mezők ellenőrzése
    if (!this.fullName || !this.email || !this.password || !this.password_again || !this.phoneNumber || !this.address ||! this.birthDate) {
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

    const patientData = {
      name: this.fullName,
      email: this.email,
      password: this.password,
      phoneNumber: this.phoneNumber,
      taj: this.taj,
      address: this.address,
      birthDate: this.birthDate,
      gender: this.gender
    };

    if (!this.calledByAdmin) {
      this.http.post('http://localhost:3000/api/auth/register/patient', patientData)
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
            this.toast.show('Hiba történt a páciens regisztráció során.', 'danger');
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
        taj: this.taj,
        address: this.address,
        birthDate: this.birthDate,
        gender: this.gender,
        adminUserId: UserId,
        adminId: AdminId
      };

      this.http.post('http://localhost:3000/api/admin/registerPatient', payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .subscribe({
          next: () => {
            this.toast.show("Sikeres Páciens felvitel!", "success");
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
