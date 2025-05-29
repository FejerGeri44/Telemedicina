import {Component, ComponentRef, Injector, OnDestroy, OnInit, ViewContainerRef} from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {CustomToastComponent} from '../../../../../../shared/toast/toast.component';

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

  constructor(
    private http: HttpClient,
    private router: Router,
    private viewContainerRef: ViewContainerRef,
    private injector: Injector
  ) {}

  onDoctorRegister() {

    // Üres mezők ellenőrzése
    if (!this.fullName || !this.email || !this.password || !this.password_again || !this.phoneNumber || !this.speciality) {
      this.showCustomToast('Kérlek, tölts ki minden kötelező mezőt!', 'warning');
      return;
    } else {

      // Email ellenőrzése
      if (!this.email.includes('@')) {
        this.invalidEmail = true;
        this.validEmail = false;
        this.showCustomToast('Hibás e-mail cím!', 'danger');
        return;
      } else {
        this.invalidEmail = false;
        this.validEmail = true;
      }

      // Jelszavak egyezősége
      if (this.password !== this.password_again) {
        this.showCustomToast('A jelszavak nem egyeznek!', 'warning');
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
          this.showCustomToast('Hiba történt a regisztráció során!', 'danger');
        }
      });
  }

  backToDash() {
    void this.router.navigate(['/']);
  }

  showCustomToast(message: string, type: 'success' | 'warning' | 'danger') {
    const toastRef: ComponentRef<CustomToastComponent> = this.viewContainerRef.createComponent(CustomToastComponent, {
      injector: this.injector
    });

    toastRef.instance.message = message;
    toastRef.instance.type = type;

    setTimeout(() => toastRef.destroy(), 4000);
  }
}
