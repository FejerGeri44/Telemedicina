import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {NgForOf, NgIf} from '@angular/common';
import {Patient, PatientItem, User} from '../../../../utils/interfaces';

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

    // tagsDraft -> tags payload [{name, value}]
    const tags = (this.editForm.tagsDraft || [])
      .filter(t => t && t.label && t.value)
      .map(t => ({ name: t.label.trim(), value: t.value.trim() }));

    if (Object.keys(modifiedFields).length === 0 && tags.length === 0) {
      this.toast.show('Nincs kitöltve módosítandó mező!', 'warning');
      return;
    }

    const payload: any = {
      id: this.user?.user?.id,
      ...modifiedFields
    };
    if (tags.length > 0) {
      payload.tags = tags;
    }

    if (!payload.id) {
      console.error('❌ Nincs felhasználó ID a payloadban!');
      return;
    }

    this.http.patch('http://localhost:3000/api/patient/profile/update', payload).subscribe({
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
    const file = input.files?.[0];

    if (!file) return;

    if (file.type === 'image/svg+xml') {
      this.toast.show('Az SVG formátum nem engedélyezett!', 'danger');
      input.value = ''; // reset
      return;
    }
    if (file.type === 'image/gif') {
      this.toast.show('A GIF formátum nem engedélyezett!', 'danger');
      input.value = ''; // reset
      return;
    }

    this.file = file;
    input.value = '';
  }

  getModifiedFields() {
    const modified: Partial<Record<
      Exclude<keyof typeof this.editForm, 'tagsDraft'>,
      string | number | null
    >> = {};

    const formKeys = Object.keys(this.editForm) as (keyof typeof this.editForm)[];

    for (const key of formKeys) {
      if (key === 'tagsDraft') continue;

      const raw = this.editForm[key];
      const newValue = typeof raw === 'string' ? raw.trim() : raw;

      const originalFromUser    = this.user?.user?.[key as keyof User];
      const originalFromPatient = this.user?.patient?.[key as keyof Patient];
      const originalValue = originalFromUser ?? originalFromPatient;

      if (
        newValue !== null &&
        newValue !== '' &&
        newValue !== originalValue
      ) {
        modified[key as Exclude<keyof typeof this.editForm, 'tagsDraft'>] = newValue as any;
      }
    }

    if (this.file) {
      (modified as any).picture = this.file;
    }

    return modified;
  }
  close() {
    void this.modalCtrl.dismiss();
  }
}
