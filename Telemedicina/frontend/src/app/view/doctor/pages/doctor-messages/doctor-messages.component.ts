import {Component, OnInit, OnDestroy} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {NgForOf, NgIf, NgOptimizedImage, Location, NgClass} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {UserService} from '../../../../services/user/user.service';
import {firstValueFrom, Observable} from 'rxjs';
import {environment} from '../../../../../../enviroment';
import { Message } from '../../../../utils/interfaces/message.interface';
import { RealtimeChannel } from '@supabase/supabase-js';
import {SupabaseService} from '../../../../services/chat/supabase.service';
import {formatTaj} from '../../../../utils/formatProfileData';
import {Router} from '@angular/router';
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
  templateUrl: './doctor-messages.component.html',
  standalone: true,
  styleUrl: './doctor-messages.component.scss'
})
export class DoctorMessagesComponent implements OnInit, OnDestroy {
  user!: Observable<DoctorItem | null>;
  doctorId: number | null = null;
  doctorPictureUrl: string | null = null;
  unreadSummary: Map<number, number> = new Map();
  isChatPaneVisible: boolean = false;

  patients!: PatientItem[];
  allPatients: PatientItem[] = [];
  filterText: string = '';

  messages: Message[] = [];
  isLoading = true;

  selectedPatientId: number | null = null;
  selectedPatient: PatientItem | null = null;

  newMessageContent: string = '';
  private chatChannel: RealtimeChannel | null = null;

  constructor(
    private http: HttpClient,
    protected userService: UserService,
    private router: Router,
    private location: Location,
    private supabaseService: SupabaseService,
    private toast: ToastService,
    private alert: AlertService,
    private unreadMessageService: UnreadMessageService
  ) {
    this.user = this.userService.doctor$();

    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const rawPatient = navigation.extras.state['selectedPatient'];

      if (rawPatient) {
        this.selectedPatient = rawPatient as PatientItem;
        this.location.replaceState(navigation.extractedUrl.toString());
      }
    }
  }

  async ngOnInit(): Promise<void> {
    this.doctorId = await this.getDoctorId();
    this.user.subscribe(u => {
      if (u) {
        this.doctorPictureUrl = u.user.pictureUrl;
      }
    });

    await this.getDoctors();
    void this.getUnreadSummary();

    if (this.selectedPatient) {
      const initialPatientId = this.selectedPatient.user.id;
      const patientToSelect = this.allPatients.find(p => p.user.id === initialPatientId);

      if (patientToSelect) {
        await this.selectPatient(initialPatientId);
      } else {
        this.toast.show('Hiba: Az átadott páciens nem található a listában.', 'danger');
      }
    }
  }

  ngOnDestroy(): void {
    if (this.chatChannel) {
      void this.supabaseService.client.removeChannel(this.chatChannel);
      this.chatChannel = null;
    }
  }

  private async getDoctorId(): Promise<number | null> {
    const user = await firstValueFrom(this.user);
    return user?.user.id ?? null;
  }

  async getUnreadSummary(): Promise<void> {
    if (!this.doctorId) return;

    try {
      this.unreadSummary = await this.unreadMessageService.fetchUnreadSummary();
    } catch (err) {
      console.error('❌ Olvasatlan összegzés komponensbeli frissítése sikertelen:', err);
    }
  }

  getUnreadCount(doctorId: number): number {
    return this.unreadSummary.get(doctorId) ?? 0;
  }

  async getDoctors(): Promise<PatientItem[] | null> {
    return new Promise((resolve) => {
      this.http.get<PatientItem[]>(
        `${environment.apiUrl}/doctor/patients`,
        { withCredentials: true }
      ).subscribe({
        next: (res) => {
          this.allPatients = res;
          this.patients = res;
          this.isLoading = false;
          resolve(res);
        },
        error: (err) => {
          console.error('❌ Orvosok lekérése sikertelen:', err);
          this.toast.show('Nem sikerült betölteni a pácienseket.', 'danger');
          this.isLoading = false;
          resolve(null);
        }
      });
    });
  }

  async markConversationAsRead(patientId: number): Promise<void> {
    if (!this.doctorId || !patientId) return;

    const currentUnreadCount = this.unreadSummary.get(patientId) ?? 0;
    if (currentUnreadCount === 0) return;

    const payload = { patientId };

    try {
      await firstValueFrom(this.http.post(
        `${environment.apiUrl}/messages/markConversationAsRead`,
        payload,
        { withCredentials: true }
      ));

      this.unreadSummary.set(patientId, 0);
      this.unreadMessageService.decrementTotalCount(currentUnreadCount);

    } catch (err) {
      console.error('❌ Beszélgetés olvasottnak jelölése sikertelen:', err);
    }
  }

  filterPatients(): void {
    if (!this.filterText.trim()) {
      this.patients = this.allPatients;
      return;
    }

    const searchTerm = this.filterText.trim().toLowerCase();
    this.patients = this.allPatients.filter(patient => {
      const name = patient.user.name.toLowerCase();
      const speciality = patient.patient.taj ? patient.patient.taj.toLowerCase() : '';

      return name.includes(searchTerm) || speciality.includes(searchTerm);
    });
  }

  async selectPatient(userId: number): Promise<void> {
    this.selectedPatient = this.allPatients.find(p => p.user.id === userId) ?? null;

    if (this.selectedPatientId === userId) return;

    this.selectedPatientId = userId;
    this.messages = [];
    this.newMessageContent = '';

    if (this.chatChannel) {
      void this.supabaseService.client.removeChannel(this.chatChannel);
      this.chatChannel = null;
    }

    if (this.doctorId) {
      await this.markConversationAsRead(userId);
      this.unreadSummary.set(userId, 0);
      await this.loadConversation(userId);
      this.setupRealtime(userId);
      this.isChatPaneVisible = true;
      this.scrollToBottom();
    }
  }

  getSelectedDoctorName(): string {
    if (this.selectedPatient) {
      return this.selectedPatient.user.name;
    }
    return 'Nincs kiválasztva';
  }

  async loadConversation(patientId: number): Promise<void> {
    const doctorId = this.doctorId as number;

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

  setupRealtime(patientId: number): void {
    const doctorId = this.doctorId as number;
    const channelName = `chat_${patientId}_${doctorId}`;

    this.chatChannel = this.supabaseService.client.channel(channelName);

    this.chatChannel.on('postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_user_id=eq.${doctorId}`
      },
      (payload) => {
        const newMessage = payload.new as Message;

        const isRelevantSender = newMessage.senderUserId === patientId;
        const isRelevantReceiver = newMessage.receiverUserId === doctorId;

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
        filter: `sender_user_id=eq.${doctorId}`
      },
      (payload) => {
        const updatedMessage = payload.new as Message;

        if (updatedMessage.receiverUserId === patientId) {
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

    if (!this.selectedPatientId || !this.selectedPatient || this.newMessageContent.trim() === '') {
      return;
    }

    const content = this.newMessageContent.trim();
    const senderUserId = this.doctorId;
    const receiverUserId = this.selectedPatientId;
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
    return message.senderUserId === this.doctorId;
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
    if (!this.selectedPatientId || !this.doctorId) {
      this.toast.show('Előbb válassz ki egy beszélgetést!', 'warning');
      return;
    }

    const payload = {
      patientId: this.selectedPatientId
    };

    try {
      await firstValueFrom(this.http.post(
        `${environment.apiUrl}/messages/deleteConversation`,
        payload,
        { withCredentials: true }
      ));

      this.toast.show('A beszélgetés törölve lett a listádról.', 'success');
      this.messages = [];
      this.selectedPatientId = null;
      this.selectedPatient = null;

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
    this.selectedPatient = null;
    this.selectedPatientId = null;
  }

  protected readonly formatTaj = formatTaj;
}
