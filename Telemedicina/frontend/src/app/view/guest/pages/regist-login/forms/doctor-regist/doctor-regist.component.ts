import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

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
  isMobile: boolean = false;
  private resizeListener!: () => void;

  fullName: string = '';
  email: string = '';
  password: string = '';
  password_again: string = '';
  phoneNumber: string = '';
  speciality: string = '';
  address: string = '';
  birthDate: string = '';
  introduction: string = '';

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

  onDoctorRegister() {
    const doctorData: any = {
      name: this.fullName,
      email: this.email,
      password: this.password,
      phoneNumber: this.phoneNumber,
      speciality: this.speciality,
    };

    if (this.address) {
      doctorData.address = this.address;
    }

    if (this.birthDate) {
      doctorData.birthDate = this.birthDate;
    }

    if (this.introduction) {
      doctorData.introduction = this.introduction;
    }

    this.http.post('http://localhost:3000/api/auth/register/doctor', doctorData)
      .subscribe({
        next: () => {
          alert('Sikeres orvos regisztráció!');
          void this.router.navigate(['/login']);
        },
        error: err => {
          console.error(err);
          alert('Hiba történt az orvos regisztráció során.');
        }
      });
  }

  backToDash() {
    void this.router.navigate(['/']);
  }
}
