import {Component, Input, OnInit} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {FormsModule, ReactiveFormsModule, FormGroup, Validators, FormBuilder} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {formatPhoneNumber} from '../../../../utils/formatProfileData';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {environment} from '../../../../../../enviroment';
import {UserService} from '../../../../services/user/user.service';
import {NgOptimizedImage} from '@angular/common';
import {mapLoggedToItem} from '../../../../services/user/user.mapper';
import {PHONE_PATTERN, TEXT_PATTERN} from '../../../../utils/validation-patterns';
import {PlatformService} from '../../../../services/platform/platform.service';
import {take} from 'rxjs';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';

@Component({
  selector: 'app-edit-profile-modal',
  templateUrl: './doctor-edit-profile-modal.component.html',
  standalone: true,
  imports: [
    ...IONIC_COMPONENTS,
    FormsModule,
    ReactiveFormsModule,
    NgOptimizedImage,
  ],
  styleUrls: ['./doctor-edit-profile-modal.component.scss']
})
export class DoctorEditProfileModalComponent implements OnInit {
  @Input() user!: DoctorItem;

  editProfileForm!: FormGroup;

  file: File | null = null;
  tempPreviewUrl: string | null = null;
  savingData: boolean = false;

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
      speciality: [this.user.doctor.speciality || '', [Validators.pattern(TEXT_PATTERN)]],
      introduction: [this.user.doctor.introduction || '', [Validators.pattern(TEXT_PATTERN)]]
    });
  }

  close() {
    void this.modalCtrl.dismiss();
  }

  async save() {
    this.savingData = true;

    if (this.editProfileForm.invalid) {
      this.toast.show('Kérjük, ellenőrizze az űrlapon lévő hibákat.', 'warning');
      this.savingData = false;
      return;
    }

    const modified = this.getModifiedFields();

    const id = this.user?.user?.id;
    if (!id) {
      this.toast.show('Nincs user ID', 'danger');
      this.savingData = false;
      return;
    }

    if (!this.file && Object.keys(modified).length === 0) {
      this.toast.show('Nincs módosítandó mező.', 'warning');
      this.savingData = false;
      return;
    }

    const form = new FormData();
    form.append('id', String(id));

    Object.entries(modified).forEach(([k, v]) => {
      form.append(k, v != null ? String(v) : '');
    });

    if (this.file) {
      form.append('picture', this.file, this.file.name);
    }

    this.http
      .patch(`${environment.apiUrl}/doctor/updateProfile`, form, { withCredentials: true })
      .subscribe({
        next: (res: any) => {
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

  private getModifiedFields(): Record<string, any> {
    if (!this.editProfileForm) return {};

    const modified: Record<string, any> = {};

    const currentFormValues = this.editProfileForm.getRawValue();

    const baselineUser: any = this.user?.user ?? {};
    const baselineDoctor: any = this.user?.doctor ?? {};

    const fields = [
      { key: 'name', source: baselineUser },
      { key: 'address', source: baselineUser },
      { key: 'phoneNumber', source: baselineUser },
      { key: 'speciality', source: baselineDoctor },
      { key: 'introduction', source: baselineDoctor }
    ];

    for (const field of fields) {
      const oldValue = this.norm(field.source[field.key]);
      const newValueRaw = (currentFormValues as any)[field.key];
      const newValue = this.norm(newValueRaw);

      if (this.isMeaningful(newValue) && newValue !== oldValue) {
        modified[field.key] = newValue;
      } else if (!this.isMeaningful(newValue) && this.isMeaningful(oldValue)) {
        modified[field.key] = '';
      }
    }

    return modified;
  }

  private isMeaningful(val: any): boolean {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    return true;
  }

  private norm(val: any): any {
    return typeof val === 'string' ? val.trim() : val;
  }

  protected readonly formatPhoneNumber = formatPhoneNumber;
}
