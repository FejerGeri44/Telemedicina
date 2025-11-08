import { Component, OnDestroy, OnInit } from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';

@Component({
  selector: 'app-guest-navbar',
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
  ],
  templateUrl: './guest-navbar.component.html',
  styleUrl: './guest-navbar.component.scss'
})
export class GuestNavbarComponent implements OnInit, OnDestroy {
  isMobile = false;
  private resizeListener!: () => void;

  constructor(private router: Router) {}

  ngOnInit() {
    this.updateScreenSize();
    this.resizeListener = () => this.updateScreenSize();
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.resizeListener);
  }

  updateScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  navigateToLogin() {
    void this.router.navigate(['/regist-login'], { queryParams: { tab: 'login' }});
  }

  navigateToPatient() {
    void this.router.navigate(['/regist-login'], { queryParams: { tab: 'patient' }});
  }

  navigateToDoctor() {
    void this.router.navigate(['/regist-login'], { queryParams: { tab: 'doctor' }});
  }
}
