import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {DatePipe, NgForOf, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {DoctorRatingItem} from '../../../../utils/interfaces/doctor.interface';

@Component({
  selector: 'app-doctor-rating-modal',
  imports: [
    DatePipe,
    IonicModule,
    NgForOf,
    FormsModule,
    NgIf
  ],
  templateUrl: './doctor-rating-modal.component.html',
  standalone: true,
  styleUrl: './doctor-rating-modal.component.scss'
})
export class DoctorRatingModalComponent {
  @Input({ required: true }) rating!: DoctorRatingItem;

  public ratingNumber: number = 0;
  public comment: string = '';
  public stars: number[] = [1, 2, 3, 4, 5];

  constructor(private modalCtrl: ModalController)
  {}

  rate(starValue: number, event: MouseEvent): void {
    const starElement = event.currentTarget as HTMLElement;
    const rect = starElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;

    if (clickX < rect.width / 2) {
      this.ratingNumber = starValue - 0.5;
    } else {
      this.ratingNumber = starValue;
    }
  }

  getStarIcon(starValue: number): string {
    if (this.ratingNumber >= starValue) {
      return 'star';
    }
    if (this.ratingNumber >= starValue - 0.5) {
      return 'star-half';
    }
    return 'star-outline';
  }

  submit(): void {
    if (this.ratingNumber === 0) {
      alert('Kérem, válasszon egy csillag értékelést!');
      return;
    }

    void this.modalCtrl.dismiss({ rating: this.ratingNumber, comment: this.comment, action: 'submit' });
  }

  clearRating(): void {
    this.ratingNumber = 0;
    this.comment = '';
  }

  dismiss() {
    void this.modalCtrl.dismiss({ action: 'cancel' });
  }
}
