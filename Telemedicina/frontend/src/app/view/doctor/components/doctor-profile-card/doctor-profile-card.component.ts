import {Component, EventEmitter, Input, Output} from '@angular/core';
import {DatePipe, NgIf, NgOptimizedImage} from '@angular/common';
import {formatPhoneNumber, formatTaj, getUserRoleLabel} from '../../../../utils/formatProfileData';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';
import {ModalController} from '@ionic/angular/standalone';

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
  @Input() isModal: boolean = false;
  @Output() edit = new EventEmitter<void>();

  constructor(private modalCtrl: ModalController) {}

  get fullName(): string {
    return this.user?.user?.name || '';
  }

  close() {
    void this.modalCtrl.dismiss();
  }

  protected readonly formatPhoneNumber = formatPhoneNumber;
  protected readonly getUserRoleLabel = getUserRoleLabel;
  protected readonly formatTaj = formatTaj;
}
