import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {IonicModule, ModalController} from '@ionic/angular';
import {ToastService} from '../../../../shared/toast/toast.service';
import {SystemMessageModalComponent} from '../../../../shared/system-message-modal/system-message-modal.component';
import {NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {SystemMessage} from '../../../../utils/interfaces/commonInterfaces';
import {AdminItem} from '../../../../utils/interfaces/admin.interface';
import {UserService} from '../../../../services/user/user.service';
import {delay, filter, firstValueFrom, Observable, take} from 'rxjs';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {environment} from '../../../../../../../backend/config/enviroment';

@Component({
  selector: 'app-system-messages',
  imports: [
    FormsModule,
    IonicModule,
    NgIf,
    NgForOf,
    NgOptimizedImage
  ],
  templateUrl: './system-messages.component.html',
  standalone: true,
  styleUrl: './system-messages.component.scss'
})
export class SystemMessagesComponent implements OnInit {
  user!: Observable<AdminItem | null>;
  activeTab: 'list' | 'create' = 'list';
  messages: SystemMessage[] = [];
  formData = {
    title: '',
    message: '',
    type: 'info',
    audience: 'all',
    validUntil: ''
  };

  isLoading: boolean = true;

  constructor(
    private http: HttpClient,
    private alert: AlertService,
    private toast: ToastService,
    private modalCtrl: ModalController,
    protected userService: UserService
  ) {
    this.user = this.userService.admin$();

    (async () => {
      const userValue = await firstValueFrom(
        this.userService.doctor$().pipe(
          filter((u): u is DoctorItem => !!u),
          take(1),
          delay(50)
        )
      );
    })();
  }

  ngOnInit() {
    this.loadMessages();
  }

  private async getAdminId(): Promise<number | null> {
    const user = await firstValueFrom(this.user);
    return user?.admin.id ?? null;
  }

  onTabChange(value: 'list' | 'create') {
    this.activeTab = value;
    if (value === 'list') {
      this.loadMessages();
    }
  }

  async createMessage(): Promise<void> {
    const adminId = await this.getAdminId();
    if (!adminId) {
      this.toast.show('Hiányzik az admin azonosító.', 'danger');
      return;
    }

    const title = (this.formData.title ?? '').trim();
    if (!title) {
      this.toast.show('A cím megadása kötelező.', 'warning');
      return;
    }

    const message = (this.formData.message ?? '').trim();
    if (!message) {
      this.toast.show('Az üzenet megadása kötelező.', 'warning');
      return;
    }

    const type = (this.formData.type ?? 'info') as string;
    if (!['info', 'warning', 'error', 'success'].includes(type)) {
      this.toast.show('Érvénytelen típus (info | warning | error | success).', 'warning');
      return;
    }

    const audience = (this.formData.audience ?? 'all') as string;
    if (!['all', 'patient', 'doctor', 'admin'].includes(audience)) {
      this.toast.show('Érvénytelen célközönség (all | patient | doctor | admin).', 'warning');
      return;
    }

    let validUntil = (this.formData.validUntil ?? null);
    if (this.formData.validUntil) {
      const raw = this.formData.validUntil;
      if (!raw) {
        this.toast.show('A lejárat dátuma kötelező.', 'warning');
        return;
      }

      const s = String(raw);
      const ymd = s.includes('T') ? s.split('T')[0] : s;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        this.toast.show('A lejárat dátuma érvénytelen (YYYY-MM-DD).', 'warning');
        return;
      }

      const today = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const todayYmd = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

      if (ymd <= todayYmd) {
        this.toast.show('A lejárat dátumának a mai napnál későbbinek kell lennie.', 'warning');
        return;
      }

      validUntil = ymd;
    }

    const payload = {
      adminId,
      title,
      message,
      type,
      audience,
      validUntil
    };

    this.http.post(`${environment.apiUrl}/admin/create-systemMessage`, payload,
      { withCredentials: true }
      ).subscribe({
      next: () => {
        this.toast.show('Rendszerüzenet elmentve.', 'success');
        this.resetForm();
      },
      error: (err) => {
        console.error('Rendszerüzenet mentési hiba:', err);
      }
    });
  }

  resetForm(): void {
    this.formData = {
      title:'',
      message:'',
      type:'info',
      audience:'all',
      validUntil:''
    };
  }

  async showPreview(): Promise<void> {
    const adminId = await this.getAdminId();
    if (!adminId) {
      this.toast.show('Hiányzik az admin azonosító.', 'danger');
      return;
    }

    const raw = this.formData.validUntil;
    const s = String(raw);
    const validUntil = s.includes('T') ? s.split('T')[0] : s;

    const msg = {
      id: 0,
      adminId: adminId,
      title: this.formData.title?.trim(),
      message: this.formData.message?.trim(),
      type: this.formData.type,
      audience: this.formData.audience,
      validUntil,
      createdAt: new Date().toISOString()
    };

    const modal = await this.modalCtrl.create({
      component: SystemMessageModalComponent as any,
      componentProps: {messages: [msg]},
      cssClass: 'system-message-modal'
    });

    await modal.present();
  }

  loadMessages(): void {
    this.isLoading = true;
    this.http.get<SystemMessage[]>(`${environment.apiUrl}/admin/getAllSystemMessage`,
      { withCredentials: true }
      ).subscribe({
      next: (res) => {
        this.messages = res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Rendszerüzenetek lekérése sikertelen:', err);
      }
    });
  }

  confirmDelete(message: any) {
    void this.alert.show(
      'Rendszerüzenet törlés',
      'Biztosan törölni szeretnéd a kijelölt rendszerüzenetet?',
      () => this.deleteMessage(message)
    )
  }

  deleteMessage(message: SystemMessage) {
    const payload = {
      messageId: message.id
    };

    this.http.post(`${environment.apiUrl}/admin/delete-system-message`,
      payload,
      { withCredentials: true }
      ).subscribe({
      next: () => {
        this.toast.show('Sikeres rendszerüzenet törlés!', 'success');
        this.messages = this.messages.filter(m =>
          String(m.id) !== String(message.id)
        );
      },
      error: (err) => {
        console.error('Hiba a törlés közben:', err);
      }
    });
  }
}
