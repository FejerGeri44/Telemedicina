import {Component, EventEmitter, Input, Output} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgForOf, NgIf} from '@angular/common';
import {formatPhoneNumber, formatTaj, getAge} from '../../../../utils/formatProfileData';
import {User, Patient, PatientTag, PatientItem} from '../../../../utils/interfaces/commonInterfaces';

@Component({
  selector: 'app-patient-profile-card',
  imports: [
    IonicModule,
    NgForOf,
    NgIf
  ],
  templateUrl: './patient-profile-card.component.html',
  standalone: true,
  styleUrl: './patient-profile-card.component.css'
})
export class PatientProfileCardComponent {
  @Input() user!: PatientItem;
  @Input() tags: PatientTag[] = [];
  @Input() editable = false;
  @Output() edit = new EventEmitter<void>();
  get patientAge(): number | null {
    return getAge(this.user?.user.birthDate);
  }
  get patientTaj(): string {
    return formatTaj(this.user?.patient?.taj);
  }
  get patientPhoneNumber(): string {
    return formatPhoneNumber(this.user?.user.phoneNumber);
  }
  get patientHomePhone(): string {
    return formatPhoneNumber(this.user?.patient.homePhone);
  }
  iconFor(name: string): string | null {
    const n = (name || '').toLowerCase();
    if (n.includes('vér')) return 'water-outline';
    if (n.includes('allergia')) return 'alert-circle-outline';
    if (n.includes('krónikus') || n.includes('betegség')) return 'medkit-outline';
    if (n.includes('gyógyszer')) return 'bandage-outline';
    if (n.includes('diéta')) return 'leaf-outline';
    return null;
  }
}
