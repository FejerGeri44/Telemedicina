import {Component, OnInit, OnDestroy} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {NgForOf, NgIf, DatePipe} from '@angular/common';
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

@Component({
  selector: 'app-patient-messages',
  imports: [
    IonicModule,
    FormsModule,
    NgIf,
    NgForOf,
    DatePipe
  ],
  templateUrl: './patient-messages.component.html',
  standalone: true,
  styleUrl: './patient-messages.component.scss'
})
export class PatientMessagesComponent implements OnInit, OnDestroy {
  user!: Observable<PatientItem | null>;
  patientId: number | null = null;

  doctors!: DoctorItem[];

  messages: Message[] = [];
  isLoading = true;
  selectedDoctorId: number | null = null;
  newMessageContent: string = '';

  private chatChannel: RealtimeChannel | null = null;

  constructor(
    private http: HttpClient,
    protected userService: UserService,
    private toast: ToastService,
    private alert: AlertService,
    private supabaseService: SupabaseService
  ) {
    this.user = this.userService.patient$();
  }

  async ngOnInit(): Promise<void> {
    this.patientId = await this.getPatientId();
    void this.getDoctors();
  }

  ngOnDestroy(): void {
    if (this.chatChannel) {
      void this.supabaseService.client.removeChannel(this.chatChannel);
      this.chatChannel = null;
    }
  }

  private async getPatientId(): Promise<number | null> {
    const user = await firstValueFrom(this.user);
    return user?.patient.id ?? null;
  }

  async getDoctors(): Promise<DoctorItem[] | null> {
    return new Promise((resolve) => {
      this.http.get<DoctorItem[]>(
        `${environment.apiUrl}/patient/doctors`,
        { withCredentials: true }
      ).subscribe({
        next: (res) => {
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

  async selectDoctor(doctorId: number): Promise<void> {
    if (this.selectedDoctorId === doctorId) return;

    this.selectedDoctorId = doctorId;
    this.messages = [];
    this.newMessageContent = '';

    if (this.chatChannel) {
      void this.supabaseService.client.removeChannel(this.chatChannel);
      this.chatChannel = null;
    }

    if (this.patientId) {
      await this.loadConversation(doctorId);
      this.setupRealtime(doctorId);
    }
  }

  async loadConversation(doctorId: number): Promise<void> {
    const patientId = this.patientId as number;
    this.http.get<Message[]>(
      `${environment.apiUrl}/messages/conversation/${patientId}/${doctorId}`,
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
    const channelName = `chat_messages`;


    this.chatChannel = this.supabaseService.client
      .channel(channelName)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_user_id=eq.${patientId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;

          const isRelevantSender = newMessage.senderUserId === doctorId || newMessage.receiverUserId === doctorId;
          const isRelevantReceiver = newMessage.receiverUserId === patientId || newMessage.senderUserId === patientId;

          if (isRelevantSender && isRelevantReceiver) {
            this.messages = [...this.messages, newMessage];
            this.scrollToBottom();
          }
        }
      )
      .subscribe((status) => {
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

    try {
      const message = await firstValueFrom(this.http.post<Message>(
        `${environment.apiUrl}/messages/create`,
        { senderUserId, receiverUserId, content },
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
}
