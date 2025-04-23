import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {NotificationComponent} from '../../../../../../shared/notification/notification.component';

@Component({
  selector: 'app-patient-regist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NotificationComponent
  ],
  templateUrl: './patient-regist.component.html',
  styleUrls: ['./patient-regist.component.css']
})

export class PatientRegistComponent {
  isMobile: boolean = false;
  private resizeListener!: () => void;

  fullName: string = '';
  email: string = '';
  password: string = '';
  password_again: string = '';
  phoneNumber: string = '';
  address: string = '';
  birthDate: string = '';

  notificationMessage = '';
  notificationType: 'success' | 'error' = 'success';
  showNotification = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.updateScreenSize();
    this.resizeListener = () => this.updateScreenSize();
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeListener);
  }

  updateScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  onPatientRegister() {

    // Üres mezők ellenőrzése
    if (!this.fullName || !this.email || !this.password || !this.password_again) {
      this.showCustomNotification('Kérlek tölts ki minden mezőt!', 'error');
      return;
    }

    // Jelszavak egyezősége
    if (this.password !== this.password_again) {
      this.showCustomNotification('A jelszavak nem egyeznek!', 'error');
      return;
    }

    const patientData = {
      name: this.fullName,
      email: this.email,
      password: this.password,
      phoneNumber: this.phoneNumber,
      address: this.address,
      birthDate: this.birthDate
    };

    this.http.post('http://localhost:3000/api/auth/register/patient', patientData)
      .subscribe({
        next: () => {
          this.showCustomNotification('Sikeres regisztráció!', 'success');
          void this.router.navigate(['/regist-login'], { queryParams: { tab: 'login' }});
        },
        error: err => {
          console.error(err);
          this.showCustomNotification('Hiba történt a regisztráció során.', 'error');
        }
      });
  }

  backToDash() {
    void this.router.navigate(['/']);
  }

  showCustomNotification(message: string, type: 'success' | 'error' = 'success') {
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotification = true;

    setTimeout(() => {
      this.showNotification = false;
    }, 3000);
  }
}
