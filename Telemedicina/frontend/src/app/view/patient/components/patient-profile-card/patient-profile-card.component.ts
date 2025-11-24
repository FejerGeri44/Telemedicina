import {Component, EventEmitter, Input, Output} from '@angular/core';
import {DatePipe, NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {formatPhoneNumber, formatTaj, getAge, getUserRoleLabel} from '../../../../utils/formatProfileData';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';
import {ModalController} from '@ionic/angular/standalone';

@Component({
  selector: 'app-patient-profile-card',
  imports: [
    ...IONIC_COMPONENTS,
    NgForOf,
    NgIf,
    NgOptimizedImage,
    DatePipe
  ],
  templateUrl: './patient-profile-card.component.html',
  standalone: true,
  styleUrl: './patient-profile-card.component.scss'
})
export class PatientProfileCardComponent {
  @Input({ required: true }) user!: PatientItem | undefined;
  @Input({ required: true }) editable = false;
  @Input() isModal: boolean = false;
  @Output() edit = new EventEmitter<void>();

  constructor(private modalCtrl: ModalController) {}

  iconFor(name: string): string | null {
    const n = (name || '').toLowerCase();
    if (n.includes('vér')) return 'water-outline';
    if (n.includes('allergia')) return 'alert-circle-outline';
    if (n.includes('krónikus') || n.includes('betegség')) return 'medkit-outline';
    if (n.includes('gyógyszer')) return 'bandage-outline';
    if (n.includes('diéta')) return 'leaf-outline';
    return null;
  }

  close() {
    void this.modalCtrl.dismiss();
  }

  protected readonly formatPhoneNumber = formatPhoneNumber;
  protected readonly formatTaj = formatTaj;
  protected readonly getAge = getAge;
  protected readonly getUserRoleLabel = getUserRoleLabel;
}
