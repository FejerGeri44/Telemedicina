import {Component, HostListener, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {IonicModule} from '@ionic/angular';
import {NgForOf, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {DoctorNavbarComponent} from '../../components/doctor-navbar/doctor-navbar.component';

@Component({
  selector: 'app-doctor-messages',
  imports: [
    IonicModule,
    NgForOf,
    FormsModule,
    NgIf,
    DoctorNavbarComponent
  ],
  templateUrl: './doctor-messages.component.html',
  standalone: true,
  styleUrl: './doctor-messages.component.css'
})
export class DoctorMessagesComponent implements OnInit, OnDestroy{
  user: any;
  pictureUrl: any;
  patients: any[] = [];
  filteredPatients: any[] = [];
  patientQuery = '';
  searchOpen = false;
  allMessages: any[] = [];
  messages: any[] = [];

  selectedPatient: any = null;
  draftText = '';
  isOnline = false;
  isLoading= true;
  isSmall = window.innerWidth <= 1024;
  showChatOnMobile = false;

  private pollTimer: any = null;

  constructor(private http: HttpClient, private toast: ToastService, private alert: AlertService) {}

  ngOnInit(): void {
    this.getMyData();
    const token = localStorage.getItem('token');
    this.http.get<any[]>('http://localhost:3000/api/getAllPatients', {
      headers: token ? { Authorization: `Bearer ${token}` } as any : undefined
    }).subscribe({
      next: (data) => {
        this.patients = data;
        this.isLoading = false;
        if (this.patients.length > 0) {
          this.selectedPatient = this.patients[0];
        } else {
          this.selectedPatient = null;
        }
      },
      error: (err) =>
        console.error('getAllPatients error', err)
    });

    this.isOnline = true;
  }

  @ViewChild('messageScroll') messageScroll: any;
  private scrollToBottom() {
    setTimeout(() => {
      const el = this.messageScroll?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.isSmall = window.innerWidth <= 1024;
    if (!this.isSmall) this.showChatOnMobile = false;
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  trackByDoctorId = (_: number, d: any) => d.id;
  trackByMsgId = (_: number, m: any) => m.id;
  isMine(m: any) {
    const s = m.senderUserId ?? m.sender_user_id ?? m.senderId;
    return s === this.user.user.id;
  }

  selectPatient(patient: any) {
    this.selectedPatient = patient;
    if (this.isSmall) this.showChatOnMobile = true;
    this.applyConversationFilter();
  }

  applyConversationFilter() {
    const otherId = this.selectedPatient?.User?.id;
    if (!this.user.user.id || !otherId) { this.messages = []; return; }

    const rows = (this.allMessages || []).filter((m: any) => {
      const s = m.senderUserId ?? m.sender_user_id ?? m.senderId;
      const r = m.receiverUserId ?? m.receiver_user_id ?? m.receiverId;
      return (s === this.user.user.id && r === otherId) || (s === otherId && r === this.user.user.id);
    });

    this.messages = rows.map((r: any) => ({
      id: r.id,
      text: r.text ?? r.content ?? '',
      createdAt: r.createdAt ?? r.sendDate ?? new Date().toISOString(),
      senderUserId: r.senderUserId ?? r.sender_user_id,
      receiverUserId: r.receiverUserId ?? r.receiver_user_id,
      delivered: r.delivered ?? true
    }));

    setTimeout(() => this.scrollToBottom?.(), 0);
  }

  backToList() {
    this.showChatOnMobile = false;
  }

  getMyData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get('http://localhost:3000/api/getPatientMe', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (user: any) => {
        this.user = user;
        this.pictureUrl = this.user.pictureUrl;
        this.loadAllMyMessages();
      },
      error: (err) => {
        console.error('❌ Felhasználó lekérése sikertelen:', err);
      }
    });
  }

  loadAllMyMessages() {
    const token = localStorage.getItem('token');
    const myUserId = this.user?.user.id;
    if (!myUserId) return;

    this.http.post<any[]>(
      'http://localhost:3000/api/getMyMessages',
      { userId: myUserId, limit: 200 },
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: (rows) => {
        this.allMessages = rows;
        this.applyConversationFilter();
      },
      error: (e) => console.error('messages-byUser error', e)
    });
  }

  applyDoctorFilter(q?: string) {
    const query = (q ?? this.patientQuery ?? '').trim().toLowerCase();

    const base = !query
      ? this.patients.slice()
      : this.patients.filter((doctor: any) => {
        const name = (doctor?.User?.name || '').trim().toLowerCase();
        const spec = (doctor?.speciality || '').trim().toLowerCase();
        return name.includes(query) || spec.includes(query);
      });

    if (query && base.length) {
      const exactIdx = base.findIndex((d: any) =>
        (d?.User?.name || '').trim().toLowerCase() === query
      );
      if (exactIdx > 0) {
        const [hit] = base.splice(exactIdx, 1);
        base.unshift(hit);
      }
    }

    this.filteredPatients = base;
  }

  toggleSearch() {
    this.searchOpen = !this.searchOpen;
    if (!this.searchOpen) {
      this.patientQuery = '';
      this.applyDoctorFilter();
    }
  }

  trySend(ev: Event) {
    const e = ev as KeyboardEvent;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault?.();
      if (this.draftText.trim()) this.send();
    }
  }

  send() {
    const text = this.draftText.trim();
    if (!text || !this.selectedPatient?.User?.id) return;

    const token = localStorage.getItem('token');

    const temp = {
      id: 'tmp-' + Date.now(),
      sender: 'patient',
      text,
      createdAt: new Date().toISOString(),
      delivered: false
    };
    this.allMessages = [...this.allMessages, temp];
    this.applyConversationFilter();
    this.scrollToBottom();
    this.draftText = '';

    this.http.post<any>('http://localhost:3000/api/sendMessage', {
      toUserId: this.selectedPatient.User.id,
      content: text
    }, { headers: { Authorization: `Bearer ${token}` }})
      .subscribe({
        next: (saved) => {
          const savedVm = {
            id: saved.id,
            sender: 'patient',
            text: saved.content,
            delivered: true
          };
          this.allMessages = this.allMessages.map(m => m.id === temp.id ? savedVm : m);
          this.loadAllMyMessages();
          this.applyConversationFilter();
          this.scrollToBottom();
        },
        error: (e) => {
          console.error('sendMessage error', e);
          this.allMessages = this.allMessages.filter(m => m.id !== temp.id);
        }
      });
  }

  confirmDelete() {
    void this.alert.show(
      'Beszélgetés Törlése',
      'Biztosan törölni szeretnéd az összes eddigi beszélgetést?',
      () => this.deleteConversation()
    )
  }

  deleteConversation() {
    const token = localStorage.getItem('token');
    const meUserId = this.user.user.id;
    const otherId = this.selectedPatient?.User?.id;
    if (!token || !meUserId || !otherId) return;

    this.http.post<any>('http://localhost:3000/api/deleteConversation', {
      meUserId: meUserId,
      otherUserId: otherId
    }, { headers: { Authorization: `Bearer ${token}` }})
      .subscribe({
        next: (res) => {
          this.allMessages = [];
          this.loadAllMyMessages();
          this.toast.show("Sikeres törlés!", "success");
        },
        error: (e) => {
          console.error('deleteConversation error', e);
          this.toast.show("Sikertelen törlés!", "warning");
        }
      });
  }

  moreActions(ev?: any) {
    // TODO: action sheet / popover (pl. némítás, archiválás, profil megnyitása)
    console.log('további műveletek', ev);
  }
}
