import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {NgIf, AsyncPipe, NgComponentOutlet} from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {BehaviorSubject, Subscription, timer} from 'rxjs';
import {AiConfigService} from '../../services/Ai-assistants/AiConfigService';
import { PatientChatComponent } from './patient-chat/patient-chat.component';
import { DoctorChatComponent } from './doctor-chat/doctor-chat.component';

type BotRole = 'patient' | 'doctor';

@Component({
  selector: 'app-ai-assistant-fab',
  templateUrl: './ai-assistant-fab.component.html',
  styleUrls: ['./ai-assistant-fab.component.scss'],
  standalone: true,
  imports: [
    IonicModule,
    NgIf,
    AsyncPipe,
    NgComponentOutlet,
    PatientChatComponent,
    DoctorChatComponent
  ],
})
export class AiAssistantFabComponent implements OnInit, OnDestroy {
  @Input({ required: true }) role!: BotRole;

  isOpen = new BehaviorSubject<boolean>(false);
  quickStartText: string = 'Miben tudok segíteni?';

  showInitialMessage: boolean = false;

  private draftSubscription?: Subscription;
  private messageTimerSub?: Subscription;

  constructor(private aiConfig: AiConfigService) {}

  async ngOnInit(): Promise<void> {
    await this.aiConfig.whenReady();

    try {
      const config = this.aiConfig.getDraft(this.role);
      this.quickStartText = config.greeting.quickStartText;
    } catch (e) {
      console.error(`Hiba a ${this.role} QuickStart szöveg lekérdezésekor.`, e);
    }

    this.messageTimerSub = timer(2000).subscribe(() => {
      this.showInitialMessage = true;

      timer(5000).subscribe(() => {
        this.showInitialMessage = false;
      });
    });
  }

  ngOnDestroy(): void {
    this.draftSubscription?.unsubscribe();
    this.messageTimerSub?.unsubscribe();
  }

  get chatTitle(): string {
    return this.role === 'patient' ? 'Páciens M.I. Asszisztens' : 'Orvos M.I. Asszisztens';
  }

  toggleChat(): void {
    this.isOpen.next(!this.isOpen.value);

    if (this.isOpen.value) {
      this.showInitialMessage = false;
      this.messageTimerSub?.unsubscribe();
      console.log(`Chat ablak megnyitása: ${this.role}`);
    }
  }
}
