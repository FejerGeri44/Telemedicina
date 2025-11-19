import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { NgForOf, NgIf, NgOptimizedImage } from '@angular/common';
import { DoctorRatingItem } from '../../../../utils/interfaces/doctor.interface';
import { DoctorRatingService } from '../../../../services/doctor-rating/doctor-rating.service';
import { AlertService } from '../../../../shared/alert/alert.service.component';

@Component({
  selector: 'app-doctor-rating-modal',
  imports: [
    IonicModule,
    NgForOf,
    NgIf,
    NgOptimizedImage
  ],
  templateUrl: './doctor-rating-modal.component.html',
  standalone: true,
  styleUrl: './doctor-rating-modal.component.scss'
})
export class DoctorRatingModalComponent {
  @Input({ required: true }) rating!: DoctorRatingItem;

  public ratingNumber: number = 0;
  public hoverRating: number = 0;
  public stars: number[] = [1, 2, 3, 4, 5];
  public isLoading = false;

  constructor(
    private modalCtrl: ModalController,
    private doctorRatingService: DoctorRatingService,
    private alert: AlertService
  ) {}

  rate(starValue: number, event: MouseEvent): void {
    if (this.isLoading) return;
    this.ratingNumber = this.calculateRating(starValue, event);
  }

  onMouseMove(starValue: number, event: MouseEvent): void {
    if (this.isLoading) return;
    this.hoverRating = this.calculateRating(starValue, event);
  }

  onMouseLeave(): void {
    this.hoverRating = 0;
  }

  private calculateRating(starValue: number, event: MouseEvent): number {
    const starElement = event.currentTarget as HTMLElement;
    const rect = starElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;

    return clickX < rect.width / 2 ? starValue - 0.5 : starValue;
  }

  getStarIcon(starIndex: number): string {
    const currentDisplayValue = this.hoverRating > 0 ? this.hoverRating : this.ratingNumber;

    if (currentDisplayValue >= starIndex) return 'star';
    if (currentDisplayValue >= starIndex - 0.5) return 'star-half';
    return 'star';
  }

  isStarActive(starIndex: number): boolean {
    const currentDisplayValue = this.hoverRating > 0 ? this.hoverRating : this.ratingNumber;
    return currentDisplayValue >= (starIndex - 0.5);
  }

  confirmSubmit() {
    void this.alert.show(
      'Értékelés',
      'Biztosan értékelni szertené a kijelölt értékkel?',
      () => this.submit()
    )
  }

  submit(): void {
    if (this.ratingNumber === 0 || this.isLoading) {
      return;
    }

    this.isLoading = true;

    const payload = {
      ratingId: this.rating.id,
      doctorId: this.rating.doctor.doctor.id,
      value: this.ratingNumber
    };

    this.doctorRatingService.submitRating(payload).subscribe({
      next: () => {
        this.doctorRatingService.completeRatingRequest(this.rating.id);

        this.isLoading = false;

        void this.modalCtrl.dismiss({
          rating: this.ratingNumber,
          action: 'submit'
        });
        },
      error: (err) => {
        console.error('Hiba az értékelés mentésekor:', err);
        this.isLoading = false;
      }
    });
  }

  dismiss() {
    if (!this.isLoading) {
      void this.modalCtrl.dismiss({ action: 'cancel' });
    }
  }
}
