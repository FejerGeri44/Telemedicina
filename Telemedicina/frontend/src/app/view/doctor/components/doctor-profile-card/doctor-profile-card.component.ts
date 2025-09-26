import {Component, EventEmitter, Input, Output} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {formatPhoneNumber} from '../../../../utils/formatProfileData';
import {DoctorItem} from '../../../../utils/interfaces';

@Component({
  selector: 'app-doctor-profile-card',
  templateUrl: './doctor-profile-card.component.html',
  standalone: true,
  imports: [
    IonicModule,
    NgForOf,
    NgClass,
    NgIf
  ],
  styleUrls: ['./doctor-profile-card.component.css']
})
export class DoctorProfileCardComponent {
  @Input() user!: DoctorItem;
  @Input() editable = false;
  @Input() myRating: number | null = null;
  @Input() canRate = false;

  @Output() rate = new EventEmitter<{ doctorId: number, value: number }>();
  @Output() edit = new EventEmitter<void>();

  editingRating = false;
  draftRating: number | null = null;

  constructor(
    private http: HttpClient
  ) {}
  get fullName(): string {
    return this.user?.user?.name || '';
  }

  starIcon(i: number): string {
    const avg = Number(this.user?.doctor?.avgRating ?? 0);
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
    if (!this.draftRating || !this.user?.doctor?.id) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const val = Math.max(1, Math.min(5, Math.round(this.draftRating)));
    const doctorId = this.user.doctor.id;

    try {
      const res = await firstValueFrom(
        this.http.post<{ ok: boolean; avg?: number }>(
          'http://localhost:3000/api/doctorsRating',
          { doctorId, value: val },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );

      this.editingRating = false;
      if (res?.avg != null) this.user.doctor.avgRating = res.avg;

      console.log('✅ Értékelés elmentve', res);
    } catch (err) {
      console.error('❌ Hiba az értékelés mentésekor:', err);
    }
  }

  protected readonly formatPhoneNumber = formatPhoneNumber;
}
