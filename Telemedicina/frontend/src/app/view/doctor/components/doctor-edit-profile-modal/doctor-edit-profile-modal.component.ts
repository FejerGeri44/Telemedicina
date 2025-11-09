import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {formatPhoneNumber} from '../../../../utils/formatProfileData';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {environment} from '../../../../../../../backend/config/enviroment';
import {LoggedUser} from '../../../../utils/interfaces/logged-user.interface';
import {UserService} from '../../../../services/user/user.service';
import {NgOptimizedImage} from '@angular/common';
import {mapLoggedToItem} from '../../../../services/user/user.mapper';

@Component({
  selector: 'app-edit-profile-modal',
  templateUrl: './doctor-edit-profile-modal.component.html',
  standalone: true,
  imports: [
    IonicModule,
    FormsModule,
    NgOptimizedImage,
  ],
  styleUrls: ['./doctor-edit-profile-modal.component.scss']
})
export class DoctorEditProfileModalComponent {
  @Input() user!: DoctorItem;
  editForm = {
    name: '',
    address: '',
    phoneNumber: '',
    speciality: '',
    introduction: ''
  };
  file: File | null = null;
  tempPreviewUrl: string | null = null;
  savingData: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private userService: UserService,
    private toast: ToastService
  ) {}

  close() {
    void this.modalCtrl.dismiss();
  }

  async save() {
    this.savingData = true;

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
          const logged: LoggedUser = (res?.user ?? res?.updated ?? res) as LoggedUser;

          const updatedFrontend = mapLoggedToItem(logged);
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
    const baselineDoctor: any = this.user?.doctor ?? {};

    const userAllowed = ['name', 'address', 'phoneNumber'];
    const doctorAllowed = ['speciality', 'introduction'];

    for (const key of userAllowed) {
      const oldValue = this.norm(baselineUser[key]);
      const newValueRaw = (this.editForm as any)[key];
      const newValue = this.norm(newValueRaw);

      if (this.isMeaningful(newValue) && newValue !== oldValue) {
        modified[key] = newValue;
      }
    }

    for (const key of doctorAllowed) {
      const oldValue = this.norm(baselineDoctor[key]);

      let newValue: any = (this.editForm as any)[key];
      newValue = this.norm(newValue);

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

  private norm(val: any): any {
    return typeof val === 'string' ? val.trim() : val;
  }

  protected readonly formatPhoneNumber = formatPhoneNumber;
}
