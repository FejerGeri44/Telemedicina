import {Component, EventEmitter, Input, Output} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {DatePipe, NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {formatPhoneNumber, formatTaj, getAge, getUserRoleLabel} from '../../../../utils/formatProfileData';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';

@Component({
  selector: 'app-patient-profile-card',
  imports: [
    IonicModule,
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
  @Output() edit = new EventEmitter<void>();

  iconFor(name: string): string | null {
    const n = (name || '').toLowerCase();
    if (n.includes('vér')) return 'water-outline';
    if (n.includes('allergia')) return 'alert-circle-outline';
    if (n.includes('krónikus') || n.includes('betegség')) return 'medkit-outline';
    if (n.includes('gyógyszer')) return 'bandage-outline';
    if (n.includes('diéta')) return 'leaf-outline';
    return null;
  }

  protected readonly formatPhoneNumber = formatPhoneNumber;
  protected readonly formatTaj = formatTaj;
  protected readonly getAge = getAge;
  protected readonly getUserRoleLabel = getUserRoleLabel;
}
