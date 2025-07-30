import { Component, Input } from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';

@Component({
  selector: 'app-edit-profile-modal',
  templateUrl: './edit-profile-modal.component.html',
  standalone: true,
  imports: [
    IonicModule,
    FormsModule
  ],
  styleUrls: ['./edit-profile-modal.component.css']
})
export class EditProfileModalComponent {
  user: any;
  editForm: any = {};
  file: File | null = null;

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.getMyData();
  }

  getMyData () {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get('http://localhost:3000/api/getPatientMe', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe((res: any) => {
      this.user = res;
    });
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

    const payload = {
      id: this.user?.user?.id,
      ...modifiedFields
    };

    if (!payload.id) {
      console.error('❌ Nincs felhasználó ID a payloadban!');
      return;
    }

    this.http.patch('http://localhost:3000/api/profile/update', payload).subscribe({
      next: (res) => {
        console.log('✅ Sikeres mentés:', res);

        this.getMyData();
        void this.modalCtrl.dismiss(res, 'updated');
      },
      error: (err) => {
        console.error('❌ Mentési hiba:', err);
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
    const modified: any = {};
    for (const key in this.editForm) {
      const newValue = this.editForm[key]?.trim?.() || this.editForm[key];
      const originalValue = this.user[key];

      if (newValue?.toString().trim() && newValue !== originalValue) {
        modified[key] = newValue;
      }
    }
    return modified;
  }
}
