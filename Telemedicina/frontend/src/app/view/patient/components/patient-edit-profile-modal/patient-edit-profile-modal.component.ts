import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {NgForOf, NgIf} from '@angular/common';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {environment} from '../../../../../../../backend/config/enviroment';
import {LoggedUser} from '../../../../utils/interfaces/logged-user.interface';
import {UserService} from '../../../../services/user/user.service';
import {mapLoggedToItem} from '../../../../services/user/user.mapper';

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
  styleUrls: ['./patient-edit-profile-modal.component.scss']
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
    private toast: ToastService
  ) {}

  onTagTypeChange() {
    this.currentTagDef = this.tagOptions.find(o => o.key === this.newTag.key) || null;
    this.newTag.label = this.currentTagDef?.label || '';
    this.newTag.value = '';
  }

  canAddTag(): boolean {
    if (!this.newTag.key || !this.newTag.value) return false;

    return !(this.newTag.key === 'bloodType' && this.editForm.tagsDraft.some(t => t.key === 'bloodType'));
  }

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

  removeTag(index: number) {
    this.editForm.tagsDraft.splice(index, 1);
  }

  resetNewTag() {
    this.newTag = { key: '', label: '', value: '' };
    this.currentTagDef = null;
  }

  async save() {
    this.savingData = true;

    const modified = this.getModifiedFields();
    const tags = (this.editForm.tagsDraft || [])
      .filter((t: any) => t && t.label && t.value)
      .map((t: any) => ({ name: String(t.label).trim(), value: String(t.value).trim() }));

    const id = this.user?.user?.id;
    if (!id) {
      this.toast.show('Nincs user ID', 'danger');
      this.savingData = false;
      return;
    }

    if (!this.file && Object.keys(modified).length === 0 && tags.length === 0) {
      this.toast.show('Nincs módosítandó mező.', 'warning');
      this.savingData = false;
      return;
    }

    const form = new FormData();
    form.append('id', String(id));

    Object.entries(modified).forEach(([k, v]) => {
      form.append(k, v != null ? String(v) : '');
    });

    if (tags.length > 0) {
      form.append('tags', JSON.stringify(tags));
    }

    if (this.file) {
      form.append('picture', this.file, this.file.name);
    }

    this.http.patch<{ user: LoggedUser }>(`${environment.apiUrl}/patient/updateProfile`,
      form,
      {
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          const updatedFrontend = mapLoggedToItem(res.user);
          this.userService.setUser(updatedFrontend);

          this.savingData = false;
          this.toast.show('Profil frissítve', 'success');
          void this.modalCtrl.dismiss({ user: updatedFrontend }, 'updated');
        },
        error: (err) => {
          console.error('❌ Mentési hiba:', err);
          this.savingData = false;
          this.toast.show('Mentés közben hiba történt.', 'danger');
        },
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
