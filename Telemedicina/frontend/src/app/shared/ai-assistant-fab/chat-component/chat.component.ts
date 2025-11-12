import {Component, Input, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {ChatMessage, Intent, QuickStartItem} from '../../../services/Ai-assistants/AIInterfaces';
import {DatePipe, NgClass, NgForOf, NgIf} from '@angular/common';
import {AiConfigService} from '../../../services/Ai-assistants/AiConfigService';

type ChatMode = 'patient' | 'doctor';

@Component({
  selector: 'app-fab-chat',
  imports: [
    IonicModule,
    FormsModule,
    NgClass,
    NgForOf,
    DatePipe,
    NgIf
  ],
  templateUrl: './chat.component.html',
  standalone: true,
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit{
  @Input({ required: true }) mode!: ChatMode;
  @Input({ required: true }) quickStarts!: QuickStartItem[]

  private intents: Intent[] = [];

  showQuickStarts: boolean = true;
  message: string = '';
  messages: ChatMessage[] = [];

  constructor(private aiConfig: AiConfigService) {}

  async ngOnInit(): Promise<void> {
    await this.aiConfig.whenReady();

    try {
      const config = this.aiConfig.getDraft(this.mode);
      this.intents = config.intents;
    } catch (e) {
      console.error(`Hiba az Intent-ek lekérdezésekor (${this.mode})`, e);
    }

    this.messages = [
      {
        id: 1,
        sender: 'assistant',
        text: this.getInitialMessage(this.mode),
        timestamp: Date.now() - 10000
      },
    ];
  }

  private getInitialMessage(mode: ChatMode): string {
    switch (mode) {
      case 'patient':
        return 'Üdvözlöm! Én vagyok az Ön páciens asszisztense. Miben segíthetek?';
      case 'doctor':
        return 'Jó napot! Orvos M.I. asszisztensként segítem a munkáját.';
      default:
        return 'Üdvözlöm! Miben segíthetek?';
    }
  }

  handleQuickStart(item: QuickStartItem): void {
    this.showQuickStarts = false;
    this.message = item.prompt;
    this.sendMessage(item.reply);
  }

  sendMessage(quickStartReply: string | null = null): void {
    if (this.message.trim().length === 0) {
      return;
    }

    if (this.messages.length === 1 && this.messages[0].sender === 'assistant') {
      this.showQuickStarts = false;
    }

    const userMessage: ChatMessage = {
      id: this.messages.length + 1,
      sender: 'user',
      text: this.message.trim(),
      timestamp: Date.now(),
    };
    this.messages = [...this.messages, userMessage];
    const userTextInput = this.message.trim();
    this.message = '';

    setTimeout(() => {
      let assistantResponseText: string;

      if (quickStartReply) {
        assistantResponseText = quickStartReply;
      } else {
        const matchingIntent = this.findBestIntent(userTextInput, this.intents);

        if (matchingIntent) {
          assistantResponseText = matchingIntent.response;
        } else {
          assistantResponseText = 'Elnézést, nem értettem pontosan a kérését. Kérem, fogalmazza meg másképp, vagy válasszon a Quick Start lehetőségek közül.';
        }
      }

      const assistantMessage: ChatMessage = {
        id: this.messages.length + 1,
        sender: 'assistant',
        text: assistantResponseText,
        timestamp: Date.now(),
      };
      this.messages = [...this.messages, assistantMessage];
    }, 1000);
  }

  get isSendButtonDisabled(): boolean {
    return this.message.trim().length === 0;
  }

  findBestIntent(message: string, intents: Intent[]): Intent | null {
    const normalizedMessage = message.toLowerCase().trim();
    let bestMatch: Intent | null = null;
    let maxMatches = 0;

    for (const intent of intents) {
      let currentMatches = 0;

      for (const pattern of intent.patterns) {
        const normalizedPattern = pattern.toLowerCase().trim();

        if (normalizedMessage.includes(normalizedPattern)) {
          currentMatches++;
        }

        const patternWords = normalizedPattern.split(/\s+/).filter(w => w.length > 2); // Kiszűrjük a rövid szavakat
        const messageWords = normalizedMessage.split(/\s+/).filter(w => w.length > 2);

        const wordMatches = patternWords.filter(word => messageWords.includes(word)).length;
        currentMatches += wordMatches;
      }

      if (currentMatches > maxMatches) {
        maxMatches = currentMatches;
        bestMatch = intent;
      }
    }

    if (maxMatches > 0) {
      return bestMatch;
    }

    return null;
  }
}
