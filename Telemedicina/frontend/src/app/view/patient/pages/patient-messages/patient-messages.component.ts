import {Component, OnDestroy, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {NgClass, NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {UserService} from '../../../../services/user/user.service';
import {firstValueFrom, Observable} from 'rxjs';
import {environment} from '../../../../../../enviroment';
import {Message} from '../../../../utils/interfaces/message.interface';
import {RealtimeChannel} from '@supabase/supabase-js';
import {SupabaseService} from '../../../../services/chat/supabase.service';
import {UnreadMessageService} from '../../../../services/UnreadMessages/unread-messages.service';

@Component({
  selector: 'app-patient-messages',
  imports: [
    IonicModule,
    FormsModule,
    NgIf,
    NgForOf,
    NgOptimizedImage,
    NgClass
  ],
  templateUrl: './patient-messages.component.html',
  standalone: true,
  styleUrl: './patient-messages.component.scss'
})
export class PatientMessagesComponent implements OnInit, OnDestroy {
  user!: Observable<PatientItem | null>;
  patientId: number | null = null;
  patientPictureUrl: string | null = null;
  unreadSummary: Map<number, number> = new Map();
  isChatPaneVisible: boolean = false;

  doctors!: DoctorItem[];
  allDoctors: DoctorItem[] = [];
  filterText: string = '';

  messages: Message[] = [];
  isLoading = true;

  selectedDoctorId: number | null = null;
  selectedDoctor: DoctorItem | null = null;

  newMessageContent: string = '';
  private chatChannel: RealtimeChannel | null = null;

  constructor(
    private http: HttpClient,
    protected userService: UserService,
    private toast: ToastService,
    private alert: AlertService,
    private supabaseService: SupabaseService,
    private unreadMessageService: UnreadMessageService
  ) {
    this.user = this.userService.patient$();
  }

  async ngOnInit(): Promise<void> {
    this.patientId = await this.getPatientId();
    this.user.subscribe(u => {
      if (u) {
        this.patientPictureUrl = u.user.pictureUrl;
      }
    });
    void this.getDoctors();
    void this.getUnreadSummary();
  }

  ngOnDestroy(): void {
    if (this.chatChannel) {
      void this.supabaseService.client.removeChannel(this.chatChannel);
      this.chatChannel = null;
    }
  }

  private async getPatientId(): Promise<number | null> {
    const user = await firstValueFrom(this.user);
    return user?.user.id ?? null;
  }

  async getUnreadSummary(): Promise<void> {
    if (!this.patientId) return;

    try {
      this.unreadSummary = await this.unreadMessageService.fetchUnreadSummary();
    } catch (err) {
      console.error('❌ Olvasatlan összegzés komponensbeli frissítése sikertelen:', err);
    }
  }

  getUnreadCount(doctorId: number): number {
    return this.unreadSummary.get(doctorId) ?? 0;
  }

  async getDoctors(): Promise<DoctorItem[] | null> {
    return new Promise((resolve) => {
      this.http.get<DoctorItem[]>(
        `${environment.apiUrl}/patient/doctors`,
        { withCredentials: true }
      ).subscribe({
        next: (res) => {
          this.allDoctors = res;
          this.doctors = res;
          this.isLoading = false;
          resolve(res);
        },
        error: (err) => {
          console.error('❌ Orvosok lekérése sikertelen:', err);
          this.toast.show('Nem sikerült betölteni az orvosokat.', 'danger');
          this.isLoading = false;
          resolve(null);
        }
      });
    });
  }

  async markConversationAsRead(doctorId: number): Promise<void> {
    if (!this.patientId || !doctorId) return;

    const currentUnreadCount = this.unreadSummary.get(doctorId) ?? 0;
    if (currentUnreadCount === 0) return;

    const payload = { doctorId };

    try {
      await firstValueFrom(this.http.post(
        `${environment.apiUrl}/messages/markConversationAsRead`,
        payload,
        { withCredentials: true }
      ));

      this.unreadSummary.set(doctorId, 0);
      this.unreadMessageService.decrementTotalCount(currentUnreadCount);

    } catch (err) {
      console.error('❌ Beszélgetés olvasottnak jelölése sikertelen:', err);
    }
  }

  filterDoctors(): void {
    if (!this.filterText.trim()) {
      this.doctors = this.allDoctors;
      return;
    }

    const searchTerm = this.filterText.trim().toLowerCase();
    this.doctors = this.allDoctors.filter(doctor => {
      const name = doctor.user.name.toLowerCase();
      const speciality = doctor.doctor.speciality ? doctor.doctor.speciality.toLowerCase() : '';

      return name.includes(searchTerm) || speciality.includes(searchTerm);
    });
  }

  async selectDoctor(userId: number): Promise<void> {
    this.selectedDoctor = this.allDoctors.find(d => d.user.id === userId) ?? null;

    if (this.selectedDoctorId === userId) return;

    this.selectedDoctorId = userId;
    this.messages = [];
    this.newMessageContent = '';

    if (this.chatChannel) {
      void this.supabaseService.client.removeChannel(this.chatChannel);
      this.chatChannel = null;
    }

    if (this.patientId) {
      await this.markConversationAsRead(userId);
      this.unreadSummary.set(userId, 0);
      await this.loadConversation(userId);
      this.setupRealtime(userId);
      this.isChatPaneVisible = true;
      this.scrollToBottom();
    }
  }

  getSelectedDoctorName(): string {
    if (this.selectedDoctor) {
      return this.selectedDoctor.user.name;
    }
    return 'Nincs kiválasztva';
  }

  async loadConversation(doctorId: number): Promise<void> {
    const patientId = this.patientId as number;

    const payload = {
      patientId,
      doctorId
    }
    this.http.post<Message[]>(
      `${environment.apiUrl}/messages/conversation`,
      payload,
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        this.messages = res;
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('❌ Beszélgetés lekérése sikertelen:', err);
        this.toast.show('Nem sikerült betölteni a beszélgetést.', 'danger');
      }
    });
  }

  setupRealtime(doctorId: number): void {
    const patientId = this.patientId as number;
    const channelName = `chat_${patientId}_${doctorId}`;

    this.chatChannel = this.supabaseService.client.channel(channelName);

    this.chatChannel.on('postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_user_id=eq.${patientId}`
      },
      (payload) => {
        const newMessage = payload.new as Message;

        const isRelevantSender = newMessage.senderUserId === doctorId;
        const isRelevantReceiver = newMessage.receiverUserId === patientId;

        if (isRelevantSender && isRelevantReceiver) {
          console.log('Realtime INSERT: Új üzenet érkezett a beszélgetéshez.');
          this.messages = [...this.messages, newMessage];
          this.scrollToBottom();
        }
      }
    );

    this.chatChannel.on('postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `sender_user_id=eq.${patientId}`
      },
      (payload) => {
        const updatedMessage = payload.new as Message;

        if (updatedMessage.receiverUserId === doctorId) {
          console.log('Realtime UPDATE: Üzenet olvasottsága frissült.');
          this.messages = this.messages.map(m =>
            m.id === updatedMessage.id ? updatedMessage : m
          );
        }
      }
    );

    this.chatChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Realtime csatorna feliratkozva: ${channelName}`);
      }
    });
  }

  async sendMessage(event?: Event): Promise<void> {
    event?.preventDefault();

    if (!this.selectedDoctorId || !this.patientId || this.newMessageContent.trim() === '') {
      return;
    }

    const content = this.newMessageContent.trim();
    const senderUserId = this.patientId;
    const receiverUserId = this.selectedDoctorId;
    this.newMessageContent = '';

    const payload = {
      senderUserId,
      receiverUserId,
      content
    }

    try {
      const message = await firstValueFrom(this.http.post<Message>(
        `${environment.apiUrl}/messages/create`,
        payload,
        { withCredentials: true }
      ));

      if (message && !this.messages.some(m => m.id === message.id)) {
        this.messages = [...this.messages, message];
      }
      this.scrollToBottom();

    } catch (err) {
      console.error('❌ Üzenet küldése sikertelen:', err);
      this.toast.show('Nem sikerült elküldeni az üzenetet.', 'danger');
      this.newMessageContent = content;
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const chatContainer = document.querySelector('.messages-container');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  isMyMessage(message: Message): boolean {
    return message.senderUserId === this.patientId;
  }

  async confirmDelete() {
    await this.alert.show(
      'Beszélgetés törlése',
      'Biztosan törölni szeretnéd a beszélgetést?',
      () => {
        this.deleteConversation();
      }
    );
  }

  async deleteConversation() {
    if (!this.selectedDoctorId || !this.patientId) {
      this.toast.show('Előbb válassz ki egy beszélgetést!', 'warning');
      return;
    }

    const payload = {
      doctorId: this.selectedDoctorId
    };

    try {
      await firstValueFrom(this.http.post(
        `${environment.apiUrl}/messages/deleteConversation`,
        payload,
        { withCredentials: true }
      ));

      this.toast.show('A beszélgetés törölve lett a listádról.', 'success');
      this.messages = [];
      this.selectedDoctorId = null;
      this.selectedDoctor = null;

      if (this.chatChannel) {
        void this.supabaseService.client.removeChannel(this.chatChannel);
        this.chatChannel = null;
      }

    } catch (err) {
      console.error('❌ Beszélgetés törlése sikertelen:', err);
      this.toast.show('Nem sikerült törölni a beszélgetést.', 'danger');
    }
  }

  back() {
    this.isChatPaneVisible = false;
    this.selectedDoctor = null;
    this.selectedDoctorId = null;
  }
}
