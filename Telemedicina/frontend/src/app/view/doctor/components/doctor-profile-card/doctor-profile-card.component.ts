import { Component, EventEmitter, Input, Output } from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';

export interface UserDto {
  id: number;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  pictureUrl?: string | null;
}
export interface DoctorDto {
  id: number;
  userId: number;
  speciality: string;
  introduction?: string | null;
  registDate?: string | null;
  avgRating?: number | null;
}

@Component({
  selector: 'app-doctor-profile-card',
  templateUrl: './doctor-profile-card.component.html',
  standalone: true,
  imports: [
    IonicModule,
    NgForOf,
    NgIf,
    NgClass
  ],
  styleUrls: ['./doctor-profile-card.component.css']
})
export class DoctorProfileCardComponent {
  @Input() user!: UserDto | null | undefined;
  @Input() doctor!: DoctorDto | null | undefined;
  @Input() editable = false;
  @Input() myRating: number | null = null;
  @Input() canRate = false;

  @Output() rate = new EventEmitter<{ doctorId: number, value: number }>();
  @Output() edit = new EventEmitter<void>();

  constructor(private http: HttpClient, private modalCtrl: ModalController) {}

  editingRating = false;
  draftRating: number | null = null;

  formatPhoneNumber(phone?: string | null | undefined): string {
    if (!phone || phone.length !== 11 || !phone.startsWith('06')) return phone ?? '';
    return `${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }

  starIcon(i: number): string {
    const avg = Number(this.doctor?.avgRating ?? 0);
    const v = this.editingRating
      ? (this.draftRating ?? avg)
      : avg;

    return v >= i ? 'star' : 'star-outline';
  }

  startEditRating() {
    if (!this.canRate || this.editable) return;
    this.editingRating = true;
    this.draftRating = null;
  }

  onStarClick(s: number) {
    if (!this.editingRating) this.editingRating = true;
    this.draftRating = s;
  }

  cancelRating() {
    this.editingRating = false;
    this.draftRating = this.myRating ?? null;
  }

  async saveRating() {
    if (!this.draftRating || !this.doctor?.id) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const val = Math.max(1, Math.min(5, Math.round(this.draftRating)));
    const doctorId = this.doctor.id;

    try {
      const res = await firstValueFrom(
        this.http.post<{ ok: boolean; avg?: number }>(
          'http://localhost:3000/api/doctorsRating',
          { doctorId, value: val },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );

      this.editingRating = false;
      if (res?.avg != null) this.doctor.avgRating = res.avg;

      console.log('✅ Értékelés elmentve', res);
    } catch (err) {
      console.error('❌ Hiba az értékelés mentésekor:', err);
    }
  }
}
