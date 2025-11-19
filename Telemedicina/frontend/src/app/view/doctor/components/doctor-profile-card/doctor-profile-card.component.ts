import {Component, EventEmitter, Input, Output} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgIf, NgOptimizedImage} from '@angular/common';
import {formatPhoneNumber} from '../../../../utils/formatProfileData';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';

@Component({
  selector: 'app-doctor-profile-card',
  templateUrl: './doctor-profile-card.component.html',
  standalone: true,
  imports: [
    IonicModule,
    NgIf,
    NgOptimizedImage
  ],
  styleUrls: ['./doctor-profile-card.component.scss']
})
export class DoctorProfileCardComponent {
  @Input({ required: true }) user!: DoctorItem;
  @Input({ required: true }) editable = false;
  @Output() edit = new EventEmitter<void>();

  get fullName(): string {
    return this.user?.user?.name || '';
  }

  protected readonly formatPhoneNumber = formatPhoneNumber;
}
