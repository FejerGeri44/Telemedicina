import {Component, Input, OnInit} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {PatientItem, PatientTag} from '../../../../utils/interfaces/patient.interface';
import {environment} from '../../../../../../enviroment';
import {LoggedUser} from '../../../../utils/interfaces/logged-user.interface';
import {UserService} from '../../../../services/user/user.service';
import {mapLoggedToItem} from '../../../../services/user/user.mapper';
import {PHONE_PATTERN, TEXT_PATTERN} from '../../../../utils/validation-patterns';
import {PlatformService} from '../../../../services/platform/platform.service';
import {take} from 'rxjs';

@Component({
  selector: 'app-edit-profile-modal',
  templateUrl: './patient-edit-profile-modal.component.html',
  standalone: true,
  imports: [
    IonicModule,
    FormsModule,
    NgIf,
    NgForOf,
    ReactiveFormsModule,
    NgOptimizedImage
  ],
  styleUrls: ['./patient-edit-profile-modal.component.scss']
})
export class PatientEditProfileModalComponent implements  OnInit {
  @Input({ required: true }) user!: PatientItem;

  editProfileForm!: FormGroup;
  newTagKey: string = '';
  newTag: PatientTag = { id: 0, tag_name: '', tag_value: '' };
  currentTagDef: any = null;
  file: File | null = null;
  tempPreviewUrl: string | null = null;
  private tagsManuallyModified: boolean = false;
  savingData: boolean = false;

  tagOptions = [
    { key: 'bloodType',  label: 'Vértípus',           type: 'select', options: ['A+','A-','B+','B-','AB+','AB-','0+','0-'] },
    { key: 'allergy',    label: 'Allergia',           type: 'text',   placeholder: 'pl. Penicillin' },
    { key: 'chronic',    label: 'Krónikus betegség',  type: 'text',   placeholder: 'pl. Asztma' },
    { key: 'medication', label: 'Gyógyszer',          type: 'text',   placeholder: 'pl. Metformin' },
    { key: 'diet',       label: 'Diéta',              type: 'text',   placeholder: 'pl. Laktózmentes' },
  ] as const;

  constructor(
    protected platform: PlatformService,
    private modalCtrl: ModalController,
    private http: HttpClient,
    private fb: FormBuilder,
    private userService: UserService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.editProfileForm = this.fb.group({
      name: [this.user.user.name || '', [Validators.pattern(TEXT_PATTERN)]],
      address: [this.user.user.address || '', [Validators.pattern(TEXT_PATTERN)]],
      phoneNumber: [this.user.user.phoneNumber || '', [Validators.pattern(PHONE_PATTERN)]],
      homePhone: [this.user.patient.homePhone || '', [Validators.pattern(PHONE_PATTERN)]],
      height: [this.user.patient.height || null, [Validators.min(50), Validators.max(300)]],
      weight: [this.user.patient.weight || null, [Validators.min(10), Validators.max(500)]],
      tags: this.fb.array(this.user.patient.tags?.map(t => this.createTagGroup(t.id, t.tag_name, t.tag_value)) || [])
    });
  }

  private createTagGroup(id: number, tag_name: string, tag_value: string): FormGroup {
    return this.fb.group({
      id: [id],
      tag_name: [tag_name, []],
      tag_value: [tag_value, []],
    });
  }

  onTagTypeChange() {
    this.currentTagDef = this.tagOptions.find(o => o.key === this.newTagKey) || null;
    this.newTag.tag_name = this.currentTagDef?.label || '';
    this.newTag.tag_value = '';
  }

  get tagsFormArray() {
    return this.editProfileForm.get('tags') as FormArray;
  }

  canAddTag(): boolean {
    if (!this.newTagKey || !String(this.newTag.tag_value).trim()) return false;

    if (this.newTagKey === 'bloodType') {
      const bloodTypeTagLabel = this.tagOptions.find(o => o.key === 'bloodType')?.label;
      const currentTags = this.tagsFormArray.value as PatientTag[];
      return !currentTags.some(t => t.tag_name === bloodTypeTagLabel);
    }

    return true;
  }

  addTag() {
    if (!this.canAddTag()) return;

    const value = String(this.newTag.tag_value).trim();

    const newTagGroup = this.createTagGroup(0, this.newTag.tag_name, value);

    newTagGroup.get('tag_name')?.setValidators([Validators.required]);
    newTagGroup.get('tag_value')?.setValidators([Validators.required]);

    newTagGroup.get('tag_name')?.updateValueAndValidity();
    newTagGroup.get('tag_value')?.updateValueAndValidity();

    this.tagsFormArray.push(newTagGroup);

    this.editProfileForm.markAsDirty();
    this.tagsManuallyModified = true;
    this.resetNewTag();
  }

  removeTag(index: number) {
    this.tagsFormArray.removeAt(index);
    this.editProfileForm.markAsDirty();
    this.tagsManuallyModified = true;
  }

  resetNewTag() {
    this.newTagKey = '';
    this.newTag = { id: 0, tag_name: '', tag_value: '' };
    this.currentTagDef = null;
  }

  async save() {
    if (this.editProfileForm.invalid) {
      this.toast.show('Kérlek javítsd a jelölt mezőket.', 'danger');
      this.savingData = false;
      this.editProfileForm.markAllAsTouched();
      return;
    }

    this.savingData = true;

    const formValues = this.editProfileForm.value;

    const modified = this.getModifiedFields(formValues);
    const tags = (formValues.tags || [])
      .filter((t: any) => t && t.tag_name && t.tag_value)
      .map((t: any) => ({ name: String(t.tag_name).trim(), value: String(t.tag_value).trim() }));

    const id = this.user?.user?.id;
    if (!id) {
      this.toast.show('Nincs user ID', 'danger');
      this.savingData = false;
      return;
    }

    const form = new FormData();
    form.append('id', String(id));

    Object.entries(modified).forEach(([k, v]) => {
      form.append(k, v != null ? String(v) : '');
    });

    if (tags.length > 0 || this.tagsManuallyModified) {
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

          this.userService.user$().pipe(take(1)).subscribe(loggedInUser => {

            const isEditingSelf = loggedInUser?.user?.id === updatedFrontend.user.id;

            if (isEditingSelf) {
              this.userService.setUser(updatedFrontend);
            }

            this.savingData = false;
            this.toast.show('Profil frissítve', 'success');
            void this.modalCtrl.dismiss({ user: updatedFrontend }, 'updated');
          });
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

  private getModifiedFields(formValues: any): Record<string, any> {
    const modified: Record<string, any> = {};

    const baselineUser: any = this.user?.user ?? {};
    const baselinePatient: any = this.user?.patient ?? {};

    const userAllowed = ['name', 'address', 'phoneNumber'] as const;
    const patientAllowed = ['height', 'weight', 'homePhone'] as const;

    for (const key of userAllowed) {
      const oldValue = this.norm(baselineUser[key]);
      const newValueRaw = formValues[key];
      const newValue = this.norm(newValueRaw);

      if (this.isMeaningful(newValue) && newValue !== oldValue) {
        modified[key] = newValue;
      }
    }

    for (const key of patientAllowed) {
      const oldValue = this.norm(baselinePatient[key]);

      let newValue: any = formValues[key];
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
