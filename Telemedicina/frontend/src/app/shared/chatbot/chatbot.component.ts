import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {IonContent, IonicModule} from '@ionic/angular';
import {NgForOf, NgIf} from '@angular/common';
import {AssistantReply, Audience, QuickStart} from './chatbot.types';
import {ChatbotService} from './chatbot.service';
import {FormsModule} from '@angular/forms';

type Bubble = { who: 'user' | 'bot'; text: string };

@Component({
  selector: 'app-chatbot',
  imports: [
    IonicModule,
    NgForOf,
    NgIf,
    FormsModule
  ],
  templateUrl: './chatbot.component.html',
  standalone: true,
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent implements OnInit, OnChanges {
  /** Ki használja: 'patient' vagy 'clinician' */
  @Input() audience: Audience = 'patient';

  /** Admin teszt mód (mutasson-e debugot: intentId, score) */
  @Input() debug = false;

  /** (Opcionális) konfig felülírás admin teszthez, JSON-ből */
  @Input() configOverride?: any;

  /** Handoff esemény (pl. ügyelet/asszisztens/orvos felé) */
  @Output() handoff = new EventEmitter<{ type: string; lastUserText: string }>();

  @ViewChild(IonContent) content?: IonContent;

  msgs: Bubble[] = [];
  quickStarts: QuickStart[] = [];
  greeting = '';
  input = '';
  isOpen = false;
  greetingSent = false;

  constructor(private chatbot: ChatbotService) {}

  async ngOnInit() {
    await this.initEngine();
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['audience'] || changes['configOverride']) {
      await this.initEngine();
    }
  }

  /** Motor inicializálása a kiválasztott audience-szel */
  private async initEngine() {
    if (this.configOverride) {
      await this.chatbot.initFromObject(this.configOverride, this.audience);
    } else {
      await this.chatbot.init(this.audience);
    }
    const g = this.chatbot.getGreeting();
    this.greeting = g.text;
    this.quickStarts = g.quickStarts;
    this.msgs = []; // új persona → új beszélgetés
  }

  /** Beszédindító (chip) kiválasztása → ugyanúgy küldjük tovább */
  pick(q: QuickStart) {
    this.send(q.prompt);
  }

  /** Üzenet küldése és a válasz megjelenítése */
  send(raw: string) {
    const t = String(raw ?? '').trim();
    if (!t) return;

    this.msgs.push({ who: 'user', text: t });

    const rep: AssistantReply = this.chatbot.respond(t, this.audience);
    const botText = this.debug && rep.intentId
      ? `${rep.text}\n\n— [intent: ${rep.intentId}, conf: ${rep.confidence.toFixed(2)}]`
      : rep.text;

    this.msgs.push({ who: 'bot', text: botText });

    this.quickStarts = (rep.suggestions ?? []).map(s => ({ label: s, prompt: s }));

    if (rep.handoff) {
      this.handoff.emit({ type: rep.handoff, lastUserText: t });
    }
    this.input = '';
    setTimeout(() => this.content?.scrollToBottom(200), 0);
  }

  close(): void {
    this.isOpen = false;
  }
  async open(): Promise<void> {
    this.isOpen = true;

    if (!this.greetingSent && this.greeting?.trim()) {
      setTimeout(() => {
        this.msgs.push({ who: 'bot', text: this.greeting });
        this.greetingSent = true;
        this.content?.scrollToBottom(200);
      }, 0);
    } else {
      setTimeout(() => this.content?.scrollToBottom(200), 0);
    }
  }
}
