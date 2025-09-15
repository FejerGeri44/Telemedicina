import {Component, Input, OnInit} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';

@Component({
  selector: 'app-edit-profile-modal',
  templateUrl: './doctor-edit-profile-modal.component.html',
  standalone: true,
  imports: [
    IonicModule,
    FormsModule,
  ],
  styleUrls: ['./doctor-edit-profile-modal.component.css']
})
export class DoctorEditProfileModalComponent {
  @Input() user!: { user: any; doctor?: any | null };
  editForm = {
    name: '',
    address: '',
    phoneNumber: '',
    speciality: '',
    introduction: ''
  };
  file: File | null = null;

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private toast: ToastService
  ) {}

  close() {
    void this.modalCtrl.dismiss();
  }

  formatPhoneNumber(phone?: string | null | undefined): string {
    if (!phone || phone.length !== 11 || !phone.startsWith('06')) return phone ?? '';
    return `${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }

  async save() {
    const modifiedFields = this.getModifiedFields();

    if (Object.keys(modifiedFields).length === 0) {
      this.toast.show('Nincs kitöltve módosítandó mező!', 'warning');
      return;
    }

    const payload: any = {
      id: this.user?.user?.id,
      ...modifiedFields
    };

    if (!payload.id) {
      console.error('❌ Nincs felhasználó ID a payloadban!');
      return;
    }

    this.http.patch('http://localhost:3000/api/doctor/profile/update', payload).subscribe({
      next: (res) => {
        console.log('✅ Sikeres mentés:', res);
        void this.modalCtrl.dismiss(res, 'updated');
      },
      error: (err) => {
        console.error('❌ Mentési hiba:', err);
        this.toast.show('Mentés közben hiba történt.', 'danger');
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const selectedFile = input?.files[0];
      const fileType = selectedFile.type;

      if (fileType === 'image/svg+xml') {
        this.toast.show('Az SVG formátum nem engedélyezett!', 'danger');
        return;
      }

      if (fileType === 'image/gif') {
        this.toast.show('A GIF formátum nem engedélyezett!', 'danger');
        return;
      }

      this.file = selectedFile;
    }
  }

  getModifiedFields() {
    const modified: Partial<Record<keyof typeof this.editForm, string | number | null>> = {};

    const formKeys = Object.keys(this.editForm) as (keyof typeof this.editForm)[];

    for (const key of formKeys) {
      const raw = this.editForm[key];
      const newValue = typeof raw === 'string' ? raw.trim() : raw;

      const originalFromUser    = this.user?.user?.[key as any];
      const originalFromDoctor  = this.user?.doctor?.[key as any];
      const originalValue = originalFromUser ?? originalFromDoctor;

      if (
        newValue !== null &&
        newValue !== undefined &&
        newValue !== '' &&
        newValue !== originalValue
      ) {
        modified[key] = newValue as any;
      }
    }

    return modified;
  }
}
