import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';

import { LoginFormComponent } from './forms/login-form/login-form.component';
import { PatientRegistComponent } from './forms/patient-regist/patient-regist.component';
import { DoctorRegistComponent } from './forms/doctor-regist/doctor-regist.component';

@Component({
  selector: 'app-regist-login',
  standalone: true,
  templateUrl: './regist-login.component.html',
  styleUrls: ['./regist-login.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    LoginFormComponent,
    PatientRegistComponent,
    DoctorRegistComponent
  ]
})
export class RegistLoginComponent {
  isMobile: boolean = false;
  private resizeListener!: () => void;
  activeTab: 'login' | 'patient' | 'doctor' = 'login';

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.updateScreenSize();
    this.resizeListener = () => this.updateScreenSize();
    window.addEventListener('resize', this.resizeListener);

    this.route.queryParams.subscribe(params => {
      const tab = params['tab'] as 'login' | 'patient' | 'doctor';
      if (tab === 'login' || tab === 'patient' || tab === 'doctor') {
        this.activeTab = tab;
      }
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeListener);
  }

  updateScreenSize() {
    this.isMobile = window.innerWidth < 768;

    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty('--content-height', `${viewportHeight}px`);
  }

  getTabHeight(): string {
    if (this.isMobile) {
      switch (this.activeTab) {
        case 'login':
          return '96.4vh';
        case 'patient':
          return 'auto';
        case 'doctor':
          return 'auto';
        default:
          return 'auto';
      }
    } else {
      return '82.4vh';
    }
  }

}
