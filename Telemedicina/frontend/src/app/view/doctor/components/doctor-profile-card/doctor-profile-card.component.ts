import {Component, EventEmitter, Input, Output} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgClass, NgIf, NgOptimizedImage} from '@angular/common';
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
    NgOptimizedImage
  ],
  styleUrls: ['./doctor-profile-card.component.scss']
})
export class DoctorProfileCardComponent {
  @Input() user!: DoctorItem;
  @Input() editable = false;
  @Input() myRating: number | null = null;

  @Output() rate = new EventEmitter<{ doctorId: number, value: number }>();
  @Output() edit = new EventEmitter<void>();

  get fullName(): string {
    return this.user?.user?.name || '';
  }

  protected readonly formatPhoneNumber = formatPhoneNumber;
}
