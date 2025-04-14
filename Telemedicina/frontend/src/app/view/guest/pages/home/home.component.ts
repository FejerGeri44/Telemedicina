import {Component, OnDestroy, OnInit} from '@angular/core';
import {RouterLink, RouterOutlet} from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import {FooterComponent} from '../../../../shared/footer/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  imports: [
    CommonModule,
    RouterLink,
    IonicModule,
    NavbarComponent,
    FooterComponent,
    RouterOutlet
  ],
  styleUrls: ['./home.component.css']
})

export class HomeComponent implements OnInit, OnDestroy {
  desktopImages = [
    'pictures/slide-show/desktop1.png',
    'pictures/slide-show/desktop2.png',
    'pictures/slide-show/desktop3.jpg',
    'pictures/slide-show/desktop4.png',
    'pictures/slide-show/desktop5.png',
    'pictures/slide-show/desktop6.png'
  ];

  mobileImages = [
    'pictures/slide-show/mobil1.png',
    'pictures/slide-show/mobil2.png',
    'pictures/slide-show/mobil3.png',
    'pictures/slide-show/mobil4.png',
    'pictures/slide-show/mobil5.png',
    'pictures/slide-show/mobil6.png'
  ];

  images: string[] = [];
  currentSlideIndex = 0;
  private intervalId: any;
  isMobile = false;

  ngOnInit() {
    this.updateImageSet();
    window.addEventListener('resize', this.updateImageSet.bind(this));

    this.intervalId = setInterval(() => {
      this.currentSlideIndex = (this.currentSlideIndex + 1) % this.images.length;
    }, 10000);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
    window.removeEventListener('resize', this.updateImageSet.bind(this));
  }

  goToSlide(index: number) {
    this.currentSlideIndex = index;
    this.resetInterval();
  }

  resetInterval() {
    clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.currentSlideIndex = (this.currentSlideIndex + 1) % this.images.length;
    }, 10000);
  }

  updateImageSet() {
    const isNowMobile = window.innerWidth < 768;

    if (this.images.length === 0 || this.isMobile !== isNowMobile) {
      this.isMobile = isNowMobile;
      this.images = this.isMobile ? this.mobileImages : this.desktopImages;
      this.currentSlideIndex = 0;
    }
  }
}
