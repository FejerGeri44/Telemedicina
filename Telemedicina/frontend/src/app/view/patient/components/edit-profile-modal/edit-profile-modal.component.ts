import { Component, Input } from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';

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

  constructor(private modalCtrl: ModalController, private http: HttpClient) {}

  ngOnInit() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get('http://localhost:3000/api/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe((res: any) => {
      console.log('Kapott user:', res);
      this.user = res;
    });
  }

  close() {
    void this.modalCtrl.dismiss();
  }

  async save() {
    const modifiedFields = this.getModifiedFields();

    if (Object.keys(modifiedFields).length === 0) {
      console.log('Nincs módosított mező. Modal bezárva.');
      this.close();
      return;
    }

    const payload = {
      id: this.user?.id,
      ...modifiedFields
    };

    if (!payload.id) {
      console.error('❌ Nincs felhasználó ID a payloadban!');
      return;
    }

    this.http.patch('http://localhost:3000/api/profile/update', payload).subscribe({
      next: (res) => {
        console.log('✅ Sikeres mentés:', res);

        const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = {...existingUser, ...modifiedFields};
        localStorage.setItem('user', JSON.stringify(updatedUser));

        this.user = updatedUser;
        void this.modalCtrl.dismiss(updatedUser);
      },
      error: (err) => {
        console.error('❌ Mentési hiba:', err);
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      return;
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
