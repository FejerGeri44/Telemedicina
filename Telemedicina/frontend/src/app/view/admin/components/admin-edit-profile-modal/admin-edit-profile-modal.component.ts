import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {Admin, User, AdminItem} from '../../../../utils/interfaces/commonInterfaces';
import {formatPhoneNumber} from '../../../../utils/formatProfileData';

@Component({
  selector: 'app-admin-edit-profile-modal',
  imports: [
    IonicModule,
    FormsModule
  ],
  templateUrl: './admin-edit-profile-modal.component.html',
  standalone: true,
  styleUrl: './admin-edit-profile-modal.component.css'
})
export class AdminEditProfileModalComponent {
  @Input() user!: AdminItem;
  editForm = {
    name: '',
    address: '',
    phoneNumber: '',
  };
  file: File | null = null;
  tempPreviewUrl: string | null = null;

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private toast: ToastService
  ) {
  }

  close() {
    void this.modalCtrl.dismiss();
  }

  async save() {
    const modifiedFields = this.getModifiedFields();

    if (Object.keys(modifiedFields).length === 0) {
      this.toast.show('Nincs kitöltve módosítandó mező!', 'warning');
      return;
    }

    const id = this.user?.user?.id;
    if (!id) {
      console.error('❌ Nincs felhasználó ID a payloadban!');
      return;
    }

    const payload: any = { id, ...modifiedFields };

    const formData = this.buildFormData(payload);

    this.http.patch('http://localhost:3000/api/admin/profile/update', formData).subscribe({
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
    const file = input.files && input?.files[0] ? input?.files[0] : null;
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.toast.show('Csak JPG/PNG/WEBP kép tölthető fel.', 'warning');
      return;
    }
    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      this.toast.show(`A kép nem lehet nagyobb, mint ${MAX_MB} MB.`, 'warning');
      return;
    }
    this.tempPreviewUrl = URL.createObjectURL(file);
    (this as any).file = file;
  }

  private getModifiedFields(): Record<string, any> {
    const modified: Record<string, any> = {};

    const baselineUser: any = this.user || {};

    const userAllowed = ['name', 'address', 'phoneNumber'];

    const norm = (v: any) => (typeof v === 'string' ? v.trim() : v);

    for (const key of userAllowed) {
      const oldValue = norm(baselineUser[key]);
      const newValue = norm((this.editForm as any)[key]);
      if (newValue !== undefined && newValue !== oldValue) {
        (modified as any)[key] = newValue;
      }
    }

    if (this.file) {
      (modified as any).picture = this.file;
    }

    return modified;
  }

  private buildFormData(payload: any): FormData {
    const fd = new FormData();

    const appendValue = (key: string, value: any) => {
      if (value === undefined || value === null) return;

      if (key === 'picture' && value instanceof File) {
        fd.append('picture', value, value.name);
        return;
      }

      if (typeof value === 'object' && !(value instanceof File)) {
        fd.append(key, JSON.stringify(value));
        return;
      }

      fd.append(key, String(value));
    };

    Object.keys(payload).forEach(k => appendValue(k, payload[k]));
    return fd;
  }

  protected readonly formatPhoneNumber = formatPhoneNumber;
}
