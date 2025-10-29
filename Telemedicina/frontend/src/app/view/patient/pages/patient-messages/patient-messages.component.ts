import {Component, HostListener, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {NgForOf, NgIf} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {
  UnreadMessage,
  DoctorUnreadSummary,
} from '../../../../utils/interfaces/commonInterfaces';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';

@Component({
  selector: 'app-patient-messages',
  imports: [
    IonicModule,
    FormsModule,
    NgIf,
    NgForOf
  ],
  templateUrl: './patient-messages.component.html',
  standalone: true,
  styleUrl: './patient-messages.component.scss'
})
export class PatientMessagesComponent implements OnInit, OnDestroy{
  user!: PatientItem;
  doctors!: DoctorItem[];
  filteredDoctors: DoctorItem[] = [];
  doctorQuery = '';
  searchOpen = false;

  allMessages: any[] = [];
  messages: any[] = [];
  unreadMessages: UnreadMessage[] = [];
  unreadByDoctor: DoctorUnreadSummary[] = [];

  selectedDoctor!: DoctorItem;
  draftText = '';
  isOnline = false;
  isLoading= true;
  isSmall = window.innerWidth <= 1024;
  showChatOnMobile = false;

  private pollTimer: any = null;

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private alert: AlertService
  ) {}

  ngOnInit(): void {
    this.getMyData();
    this.http.get<DoctorItem[]>('http://localhost:3000/api/doctors').subscribe(res => {
      this.doctors = res;
      this.isLoading = false;
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

  selectDoctor(doctor: any) {
    this.selectedDoctor = doctor;
    if (this.isSmall) this.showChatOnMobile = true;
    this.applyConversationFilter();
    this.markConversationReadAsPatient(this.selectedDoctor.user.id);
    setTimeout(() => {
      this.getUnreadMessages();
    }, 0);
  }

  applyConversationFilter() {
    const otherId = this.selectedDoctor?.user?.id;
    if (!this.user.user.id || !otherId) {
      this.messages = []; return;
    }

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

  markConversationReadAsPatient(doctorUserId: number) {
    const myUserId = this.user.user.id;
    const token = localStorage.getItem('token');
    if (!token || !myUserId || !doctorUserId) return;

    this.http.post<void>('http://localhost:3000/api/mark-conversation-as-read',
      {
        myUserId: myUserId,
        withUserId: doctorUserId,
        role: 'patient'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).subscribe({
      next: () => {},
      error: (e) => console.error('markConversationReadAsDoctor error', e)
    });
  }

  backToList() {
    this.showChatOnMobile = false;
  }

  getMyData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<PatientItem>('http://localhost:3000/api/getPatientMe', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res) => {
        this.user = res;
        this.loadAllMyMessages();
      },
      error: (err) => {
        console.error('❌ Felhasználó lekérése sikertelen:', err);
      }
    });
  }

  loadAllMyMessages() {
    const token = localStorage.getItem('token');
    const myUserId = this.user.user.id;
    if (!myUserId) return;

    this.http.post<any[]>(
      'http://localhost:3000/api/getMyMessages',
      {
        userId: myUserId,
        role: 'patient',
        limit: 200
      },
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: (rows) => {
        this.allMessages = rows;
        this.applyConversationFilter();
        this.getUnreadMessages();
      },
      error: (e) => console.error('messages-byUser error', e)
    });
  }

  applyDoctorFilter(q?: string) {
    const query = (q ?? this.doctorQuery ?? '').trim().toLowerCase();

    const base = !query
      ? this.doctors.slice()
      : this.doctors.filter((doctor: any) => {
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

    this.filteredDoctors = base;
  }

  toggleSearch() {
    this.searchOpen = !this.searchOpen;
    if (!this.searchOpen) {
      this.doctorQuery = '';
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
    if (!text || !this.selectedDoctor.user.id) return;

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
      toUserId: this.selectedDoctor.user.id,
      content: text,
      role: 'patient'
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
    const otherId = this.selectedDoctor.user.id;
    if (!token || !meUserId || !otherId) return;

    this.http.post<any>('http://localhost:3000/api/deleteConversation', {
      meUserId: meUserId,
      otherUserId: otherId,
      role: 'patient'
    }, { headers: { Authorization: `Bearer ${token}` }})
      .subscribe({
        next: () => {
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

  getUnreadMessages() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const userId = this.user.user.id;
    if (!userId) return;

    this.http.post<{unread:UnreadMessage[], count:number}>(
      'http://localhost:3000/api/getUnreadMessages',
      {
        userId,
        role: 'patient',
        limit: 200
      },
      {
        headers:
          { Authorization: `Bearer ${token}` }
      }
    ).subscribe({
      next: (res) => {
        this.unreadMessages = res.unread ?? [];
        this.unreadByDoctor = this.computeUnreadByDoctor(this.unreadMessages);
      },
      error: (e) => console.error('getUnreadMessages error', e)
    });
  }

  computeUnreadByDoctor(unreadMessages: UnreadMessage[]): DoctorUnreadSummary[] {
    const map = new Map<number, { doctorId: number; latest: any; count: number }>();

    for (const msg of unreadMessages) {
      const doctorId = msg.senderUserId;
      const existing = map.get(doctorId);

      if (!existing) {
        map.set(doctorId, { doctorId, latest: msg, count: 1 });
        continue;
      }

      existing.count += 1;

      const currTime = new Date(existing.latest.sendDate).getTime();
      const newTime = new Date(msg.sendDate).getTime();
      if (newTime > currTime) {
        existing.latest = msg;
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latest.sendDate).getTime() - new Date(a.latest.sendDate).getTime()
    );
  }

  getUnreadSummary(doctorUserId: number | undefined): DoctorUnreadSummary | null {
    if (!doctorUserId) return null;
    return this.unreadByDoctor.find(u => u.doctorId === doctorUserId) ?? null;
  }
}
