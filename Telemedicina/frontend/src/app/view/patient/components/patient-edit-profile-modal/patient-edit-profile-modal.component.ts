import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {NgForOf, NgIf} from '@angular/common';
import {PatientItem} from '../../../../utils/interfaces/commonInterfaces';

@Component({
  selector: 'app-edit-profile-modal',
  templateUrl: './patient-edit-profile-modal.component.html',
  standalone: true,
  imports: [
    IonicModule,
    FormsModule,
    NgIf,
    NgForOf
  ],
  styleUrls: ['./patient-edit-profile-modal.component.css']
})
export class PatientEditProfileModalComponent {
  @Input() user!: PatientItem;
  editForm = {
    name: '',
    address: '',
    birthDate: '',
    phoneNumber: '',
    homePhone: '',
    height: null as number | null,
    weight: null as number | null,
    tagsDraft: [] as { key: string; label: string; value: string }[]
  };
  currentTagDef: any = null;
  newTag: {
    key: string;
    label: string;
    value: string
  } = {
    key: '',
    label: '',
    value: ''
  };
  file: File | null = null;
  tempPreviewUrl: string | null = null;

  tagOptions = [
    { key: 'bloodType',  label: 'Vértípus',           type: 'select', options: ['A+','A-','B+','B-','AB+','AB-','0+','0-'] },
    { key: 'allergy',    label: 'Allergia',           type: 'text',   placeholder: 'pl. Penicillin' },
    { key: 'chronic',    label: 'Krónikus betegség',  type: 'text',   placeholder: 'pl. Asztma' },
    { key: 'medication', label: 'Gyógyszer',          type: 'text',   placeholder: 'pl. Metformin' },
    { key: 'diet',       label: 'Diéta',              type: 'text',   placeholder: 'pl. Laktózmentes' },
  ] as const;

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private toast: ToastService
  ) {}

  onTagTypeChange() {
    this.currentTagDef = this.tagOptions.find(o => o.key === this.newTag.key) || null;
    this.newTag.label = this.currentTagDef?.label || '';
    this.newTag.value = '';
  }

  // hozzáadható-e az aktuális új tag
  canAddTag(): boolean {
    if (!this.newTag.key || !this.newTag.value) return false;

    // pl. vértípus csak egyszer legyen
    return !(this.newTag.key === 'bloodType' && this.editForm.tagsDraft.some(t => t.key === 'bloodType'));
  }

  // új tag hozzáadása a draft listához
  addTag() {
    if (!this.canAddTag()) return;
    const value = String(this.newTag.value).trim();
    if (!value) return;

    this.editForm.tagsDraft.push({
      key: this.newTag.key,
      label: this.newTag.label,
      value
    });
    this.resetNewTag();
  }

  // tag törlése
  removeTag(index: number) {
    this.editForm.tagsDraft.splice(index, 1);
  }

  // új tag mezők törlése
  resetNewTag() {
    this.newTag = { key: '', label: '', value: '' };
    this.currentTagDef = null;
  }

  async save() {
    const modifiedFields = this.getModifiedFields();

    const tags = (this.editForm.tagsDraft || [])
      .filter((t: any) => t && t.label && t.value)
      .map((t: any) => ({ name: String(t.label).trim(), value: String(t.value).trim() }));

    if (Object.keys(modifiedFields).length === 0 && tags.length === 0) {
      this.toast.show('Nincs kitöltve módosítandó mező!', 'warning');
      return;
    }

    const id = this.user?.user?.id;
    if (!id) {
      console.error('❌ Nincs felhasználó ID a payloadban!');
      return;
    }

    const payload: any = { id, ...modifiedFields };
    if (tags.length > 0) payload.tags = tags;

    const formData = this.buildFormData(payload);

    this.http.patch('http://localhost:3000/api/patient/profile/update', formData).subscribe({
      next: (res) => {
        console.log('✅ Sikeres mentés:', res);
        this.toast.show('Profil frissítve', 'success');
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
    const baselinePatient: any = baselineUser.patient || baselineUser;

    const userAllowed = ['name', 'address', 'phoneNumber'];
    const patientAllowed = ['gender', 'height', 'weight', 'homePhone'];

    const norm = (v: any) => (typeof v === 'string' ? v.trim() : v);

    for (const key of userAllowed) {
      const oldValue = norm(baselineUser[key]);
      const newValue = norm((this.editForm as any)[key]);
      if (newValue !== undefined && newValue !== oldValue) {
        (modified as any)[key] = newValue;
      }
    }

    for (const key of patientAllowed) {
      const oldValue = norm(baselinePatient[key]);
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

      if (key === 'tags' && Array.isArray(value)) {
        fd.append('tags', JSON.stringify(value));
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
  close() {
    void this.modalCtrl.dismiss();
  }
}
