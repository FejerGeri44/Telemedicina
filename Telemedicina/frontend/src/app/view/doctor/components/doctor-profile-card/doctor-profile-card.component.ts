import {Component, EventEmitter, Input, Output} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {DecimalPipe, NgClass, NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {formatPhoneNumber} from '../../../../utils/formatProfileData';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';

@Component({
  selector: 'app-doctor-profile-card',
  templateUrl: './doctor-profile-card.component.html',
  standalone: true,
  imports: [
    IonicModule,
    NgClass,
    NgIf,
    NgOptimizedImage,
    DecimalPipe,
    NgForOf
  ],
  styleUrls: ['./doctor-profile-card.component.scss']
})
export class DoctorProfileCardComponent {
  @Input({ required: true }) user!: DoctorItem;
  @Input({ required: true }) editable = false;
  @Input() canRate = false;
  @Output() rate = new EventEmitter<{ doctorId: number, value: number }>();
  @Output() edit = new EventEmitter<void>();

  protected hoverRating: number | null = null;
  protected readonly MAX_STARS = 5;

  get fullName(): string {
    return this.user?.user?.name || '';
  }

  getStarIcon(starIndex: number): string {
    const displayRating = this.hoverRating !== null ? this.hoverRating : (this.user.doctor.avgRating ?? 0);

    if (displayRating >= starIndex) {
      return 'star';
    } else if (displayRating >= starIndex - 0.5) {
      return 'star-half';
    } else {
      return 'star-outline';
    }
  }

  setRating(rating: number): void {
    if (this.canRate) {
      this.rate.emit({ doctorId: this.user.doctor.id, value: rating });
      this.hoverRating = null;
    }
  }

  setHover(rating: number | null): void {
    if (this.canRate) {
      this.hoverRating = rating;
    }
  }

  clearHover(): void {
    if (this.canRate) {
      this.hoverRating = null;
    }
  }

  protected readonly formatPhoneNumber = formatPhoneNumber;
}
