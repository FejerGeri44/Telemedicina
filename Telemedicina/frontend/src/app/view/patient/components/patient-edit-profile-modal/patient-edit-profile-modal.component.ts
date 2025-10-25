import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {NgForOf, NgIf} from '@angular/common';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {environment} from '../../../../../../../backend/config/enviroment';
import {AuthService} from '../../../../shared/auth.service';
import {LoggedUser} from '../../../../utils/interfaces/logged-user.interface';
import {UserService} from '../../../../shared/user.service';

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
  savingData: boolean = false;

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
    private userService: UserService,
    private authService: AuthService,
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
    this.savingData = true;
    const modifiedFields = this.getModifiedFields();

    const tags = (this.editForm.tagsDraft || [])
      .filter((t: any) => t && t.label && t.value)
      .map((t: any) => ({ name: String(t.label).trim(), value: String(t.value).trim() }));

    if (Object.keys(modifiedFields).length === 0 && tags.length === 0 && !this.file) {
      this.toast.show('Nincs kitöltve módosítandó mező!', 'warning');
      return;
    }

    const id = this.user?.user?.id;
    if (!id) {
      console.error('❌ Nincs felhasználó ID a payloadban!');
      return;
    }

    const token = await this.authService.getIdToken();
    if (!token) {
      this.toast.show('Nincs bejelentkezett felhasználó!', 'warning');
      return;
    }

    if (this.file) {
      const form = new FormData();
      form.append('id', String(id));

      Object.entries(modifiedFields).forEach(([k, v]) => {
        form.append(k, typeof v === 'number' ? String(v) : (v ?? ''));
      });

      if (tags.length > 0) form.append('tags', JSON.stringify(tags));

      form.append('picture', this.file, this.file.name);

      this.http.patch(`${environment.apiUrl}/patient/updateProfile`, form, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      }).subscribe({
        next: (res: any) => {
          const updated: LoggedUser = (res?.updated ?? res) as LoggedUser;
          this.userService.setUser(updated);
          this.savingData = false;
          this.toast.show('Profil frissítve', 'success');
          void this.modalCtrl.dismiss(updated, 'updated');
        },
        error: (err) => {
          console.error('❌ Mentési hiba:', err);
          this.toast.show('Mentés közben hiba történt.', 'danger');
        }
      });

    } else {
      const payload: any = { id, ...modifiedFields };
      if (tags.length > 0) payload.tags = tags;

      this.http.patch(`${environment.apiUrl}/patient/updateProfile`, payload, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      }).subscribe({
        next: (res: any) => {
          const updated: LoggedUser = (res?.updated ?? res) as LoggedUser;
          this.userService.setUser(updated);
          this.savingData = false;
          this.toast.show('Profil frissítve', 'success');
          void this.modalCtrl.dismiss(updated, 'updated');
        },
        error: (err) => {
          console.error('❌ Mentési hiba:', err);
          this.toast.show('Mentés közben hiba történt.', 'danger');
        }
      });
    }
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

    const baselineUser: any = this.user?.user ?? {};
    const baselinePatient: any = this.user?.patient ?? {};

    const userAllowed = ['name', 'address', 'phoneNumber'] as const;
    const patientAllowed = ['gender', 'height', 'weight', 'homePhone'] as const;

    for (const key of userAllowed) {
      const oldValue = this.norm(baselineUser[key]);
      const newValueRaw = (this.editForm as any)[key];
      const newValue = this.norm(newValueRaw);

      if (this.isMeaningful(newValue) && newValue !== oldValue) {
        modified[key] = newValue;
      }
    }

    for (const key of patientAllowed) {
      const oldValue = this.norm(baselinePatient[key]);

      let newValue: any = (this.editForm as any)[key];
      if (key === 'height' || key === 'weight') {
        newValue = this.toNumberOrUndef(newValue);
      } else {
        newValue = this.norm(newValue);
      }

      if (this.isMeaningful(newValue) && newValue !== oldValue) {
        modified[key] = newValue;
      }
    }

    return modified;
  }

  private isMeaningful(val: any): boolean {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    return true;
  }

  private toNumberOrUndef(val: any): number | undefined {
    if (val === '' || val === null || val === undefined) return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? undefined : n;
  }

  private norm(val: any): any {
    return typeof val === 'string' ? val.trim() : val;
  }

  close() {
    void this.modalCtrl.dismiss();
  }
}
