import {Component, EventEmitter, Input, Output} from '@angular/core';
import {DatePipe, NgIf, NgOptimizedImage} from '@angular/common';
import {formatPhoneNumber, formatTaj, getAge, getUserRoleLabel} from '../../../../utils/formatProfileData';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';

@Component({
  selector: 'app-doctor-profile-card',
  templateUrl: './doctor-profile-card.component.html',
  standalone: true,
  imports: [
    ...IONIC_COMPONENTS,
    NgIf,
    NgOptimizedImage,
    DatePipe
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
    protected readonly getUserRoleLabel = getUserRoleLabel;
  protected readonly getAge = getAge;
  protected readonly formatTaj = formatTaj;
}
