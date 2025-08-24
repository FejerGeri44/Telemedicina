import {Component, EventEmitter, Input, Output} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgForOf, NgIf} from '@angular/common';

export interface PatientTag { name: string; value: string; }

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
  @Input() user: any | null = null;
  @Input() patient: any | null = null;
  @Input() tags: PatientTag[] = [];
  @Input() editable = false;
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

  getAge(birthDateString?: string): number | null {
    if (!birthDateString) return null;
    const today = new Date();
    const birth = new Date(birthDateString);
    let age = today.getFullYear() - birth.getFullYear();
    const md = today.getMonth() - birth.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  formatPhoneNumber(phone?: string): string {
    if (!phone || phone.length !== 11 || !phone.startsWith('06')) return phone ?? '';
    return `${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }

  formatTaj(taj?: string | number): string {
    if (!taj) return 'N/A';
    const clean = String(taj).replace(/\D/g, '');
    return clean.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  }
}
