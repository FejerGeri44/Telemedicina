import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {IonicModule, ModalController} from '@ionic/angular';
import {ToastService} from '../../../../shared/toast/toast.service';
import {SystemMessageModalComponent} from '../../../../shared/system-message-modal/system-message-modal.component';
import {NgForOf, NgIf} from '@angular/common';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {SystemMessage} from '../../../../utils/interfaces/commonInterfaces';
import {AdminItem} from '../../../../utils/interfaces/admin.interface';

@Component({
  selector: 'app-system-messages',
  imports: [
    FormsModule,
    IonicModule,
    NgIf,
    NgForOf
  ],
  templateUrl: './system-messages.component.html',
  standalone: true,
  styleUrl: './system-messages.component.scss'
})
export class SystemMessagesComponent implements OnInit {
  user!: AdminItem;
  activeTab: 'list' | 'create' = 'list';
  messages: SystemMessage[] = [];
  formData = {
    title: '',
    message: '',
    type: 'info',
    audience: 'all',
    validUntil: ''
  };

  constructor(
    private http: HttpClient,
    private alert: AlertService,
    private toast: ToastService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.getMyData();
    this.loadMessages();
  }

  getMyData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<AdminItem>('http://localhost:3000/api/getAdminMe', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res) => {
        this.user = { user: res.user, admin: res.admin };
      },
      error: (err) => {
        console.error('❌ Admin user lekérése sikertelen:', err);
      }
    });
  }

  loadMessages(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<SystemMessage[]>('http://localhost:3000/api/admin/getAllSystemMessage', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        this.messages = res;
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
    const token = localStorage.getItem('token');
    if (!token) return;

    const payload = {
      messageId: message.id
    };

    this.http.delete('http://localhost:3000/api/admin/delete-system-message', {
      body: payload,
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.toast.show('Sikeres rendszerüzenet törlés!', 'success');
        this.loadMessages();
      },
      error: (err) => {
        console.error('Hiba a törlés közben:', err);
      }
    });
  }

  onTabChange(value: 'list' | 'create') {
    this.activeTab = value;
    if (value === 'list') {
      this.loadMessages();
    }
  }

  createMessage() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const adminId = this.user?.admin?.id;
    if (!adminId) {
      this.toast.show('Hiányzik az admin azonosító (adminId).', 'warning');
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

    this.http.post('http://localhost:3000/api/admin/system-messages', payload, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.toast.show('Rendszerüzenet elmentve.', 'success');
        this.resetForm();
      },
      error: (err) => {
        console.error('Rendszerüzenet mentési hiba:', err);
      }
    });
  }

  async showPreview() {
    const raw = this.formData.validUntil;
    const s = String(raw);
    const validUntil = s.includes('T') ? s.split('T')[0] : s;

    const msg = {
      id: 0,
      adminId: this.user?.admin?.id,
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

  resetForm()     {
    this.formData = {
      title:'',
      message:'',
      type:'info',
      audience:'all',
      validUntil:''
    };
  }
}
