import {Component, Input, OnInit} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {formatPhoneNumber} from '../../../../utils/formatProfileData';
import {AdminItem} from '../../../../utils/interfaces/admin.interface';
import {environment} from '../../../../../../enviroment';
import {LoggedUser} from '../../../../utils/interfaces/logged-user.interface';
import {UserService} from '../../../../services/user/user.service';
import {NgIf, NgOptimizedImage} from "@angular/common";
import {mapLoggedToItem} from '../../../../services/user/user.mapper';
import {PHONE_PATTERN, TEXT_PATTERN} from '../../../../utils/validation-patterns';

@Component({
  selector: 'app-admin-edit-profile-modal',
  imports: [
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    NgOptimizedImage,
    NgIf
  ],
  templateUrl: './admin-edit-profile-modal.component.html',
  standalone: true,
  styleUrl: './admin-edit-profile-modal.component.scss'
})
export class AdminEditProfileModalComponent implements OnInit {
  @Input() user!: AdminItem;
  editProfileForm!: FormGroup;

  file: File | null = null;
  tempPreviewUrl: string | null = null;
  savingData: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private userService: UserService,
    private toast: ToastService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.editProfileForm = this.fb.group({
      name: [this.user.user.name || '', [Validators.pattern(TEXT_PATTERN)]],
      address: [this.user.user.address || '', [Validators.pattern(TEXT_PATTERN)]],
      phoneNumber: [this.user.user.phoneNumber || '', [Validators.pattern(PHONE_PATTERN)]],
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

    this.http.patch<{ user: LoggedUser }>(`${environment.apiUrl}/admin/updateProfile`,
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
    if (!this.editProfileForm) return {};

    const modified: Record<string, any> = {};

    const currentFormValues = this.editProfileForm.getRawValue();

    const baselineUser: any = this.user?.user ?? {};

    const userAllowed = ['name', 'address', 'phoneNumber'];

    for (const key of userAllowed) {
      const oldValue = this.norm(baselineUser[key]);
      const newValueRaw = (currentFormValues as any)[key];
      const newValue = this.norm(newValueRaw);

      if (this.isMeaningful(newValue) && newValue !== oldValue) {
        modified[key] = newValue;
      } else if (!this.isMeaningful(newValue) && this.isMeaningful(oldValue)) {
        modified[key] = '';
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
