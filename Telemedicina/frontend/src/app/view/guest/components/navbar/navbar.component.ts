import { Component, OnDestroy, OnInit } from '@angular/core';
import {IonicModule, MenuController} from '@ionic/angular';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  isMobile = false;
  private resizeListener!: () => void;
  isMenuOpen = false;

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
