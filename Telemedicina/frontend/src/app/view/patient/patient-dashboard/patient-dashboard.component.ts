import { Component } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-patient-dashboard',
  imports: [
    NgIf
  ],
  templateUrl: './patient-dashboard.component.html',
  standalone: true,
  styleUrl: './patient-dashboard.component.css'
})
export class PatientDashboardComponent {
  user: any;

  constructor() {
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      this.user = JSON.parse(storedUser);
    }
  }

  logout() {
    localStorage.clear();
    this.user = null;
  }
}
