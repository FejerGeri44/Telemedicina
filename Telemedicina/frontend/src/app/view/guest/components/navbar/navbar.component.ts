import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {Router} from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    NgOptimizedImage
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  isMobile = false;
  isMenuOpen = false;
  private resizeListener!: () => void;

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

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  constructor(private router: Router) {}

  navigateToLogin() {
    this.toggleMenu();
    void this.router.navigate(['/regist-login'], {
      queryParams: { tab: 'login' }
    });
  }

  navigateToPatient() {
    this.toggleMenu();
    void this.router.navigate(['/regist-login'], {
      queryParams: { tab: 'patient' }
    });
  }

  navigateToDoctor() {
    this.toggleMenu();
    void this.router.navigate(['/regist-login'], {
      queryParams: { tab: 'doctor' }
    });
  }
}
