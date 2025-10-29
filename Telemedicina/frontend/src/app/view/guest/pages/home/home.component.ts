import {Component, OnDestroy, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../../../shared/footer/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  imports: [
    CommonModule,
    IonicModule,
    NavbarComponent,
    FooterComponent
  ],
  styleUrls: ['./home.component.scss']
})

export class HomeComponent implements OnInit, OnDestroy {
  isMobile = false;
  private resizeListener!: () => void

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

  navigateToPatient() {
    void this.router.navigate(['/regist-login'], { queryParams: { tab: 'patient' }});
  }

  navigateToDoctor() {
    void this.router.navigate(['/regist-login'], { queryParams: { tab: 'doctor' }});
  }

  navigateToWiki() {
    window.open('https://hu.wikipedia.org/wiki/Arthur_Schopenhauer', '_blank');
  }
}
