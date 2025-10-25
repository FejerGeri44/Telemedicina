import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {formatPhoneNumber} from '../../../../utils/formatProfileData';
import {AdminItem} from '../../../../utils/interfaces/admin.interface';
import {environment} from '../../../../../../../backend/config/enviroment';
import {LoggedUser} from '../../../../utils/interfaces/logged-user.interface';
import {UserService} from '../../../../shared/user.service';
import {AuthService} from '../../../../shared/auth.service';

@Component({
  selector: 'app-admin-edit-profile-modal',
  imports: [
    IonicModule,
    FormsModule
  ],
  templateUrl: './admin-edit-profile-modal.component.html',
  standalone: true,
  styleUrl: './admin-edit-profile-modal.component.css'
})
export class AdminEditProfileModalComponent {
  @Input() user!: AdminItem;
  editForm = {
    name: '',
    address: '',
    phoneNumber: '',
  };
  file: File | null = null;
  tempPreviewUrl: string | null = null;
  savingData: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private userService: UserService,
    private authService: AuthService,
    private toast: ToastService
  ) {
  }

  close() {
    void this.modalCtrl.dismiss();
  }

  async save() {
    this.savingData = true;
    const modifiedFields = this.getModifiedFields();

    if (Object.keys(modifiedFields).length === 0 && !this.file) {
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

      form.append('picture', this.file, this.file.name);

      this.http.patch(`${environment.apiUrl}/admin/updateProfile`, form, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      }).subscribe({
        next: (res: any) => {
          const updated: LoggedUser = (res?.updated ?? res) as LoggedUser;
          console.log(updated)
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

      this.http.patch(`${environment.apiUrl}/admin/updateProfile`, payload, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      }).subscribe({
        next: (res: any) => {
          const updated: LoggedUser = (res?.updated ?? res) as LoggedUser;
          console.log(updated)
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

    const userAllowed = ['name', 'address', 'phoneNumber'];

    for (const key of userAllowed) {
      const oldValue = this.norm(baselineUser[key]);
      const newValueRaw = (this.editForm as any)[key];
      const newValue = this.norm(newValueRaw);

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
