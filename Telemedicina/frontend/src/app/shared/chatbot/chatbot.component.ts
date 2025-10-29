import { Component, Input, OnInit } from '@angular/core';
import { Audience, ChatConfig, ChatMessage } from './chatbot.types';
import { ChatbotService } from './chatbot.service';
import {IonicModule} from '@ionic/angular';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {QuickStart, Suggestion} from '../../utils/interfaces/AIInterfaces';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  standalone: true,
  imports: [
    IonicModule,
    NgIf,
    NgForOf,
    FormsModule,
    NgClass
  ],
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit {
  @Input({ required: true }) audience!: Audience;
  @Input({ required: true }) showBubble!: boolean;

  isOpen = false;

  input = '';
  msgs: ChatMessage[] = [];

  greeting = '';
  quickStarts: QuickStart[] = [];
  isFallback = false;
  fallbackSuggestions: Suggestion[] = [];

  private cfg?: ChatConfig;

  constructor(private svc: ChatbotService) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  private loadConfig(): void {
    this.svc.getConfig(this.audience).subscribe({
      next: cfg => {
        this.cfg = cfg;
        this.greeting = cfg.greeting?.quickStartText ?? '';
        this.quickStarts = cfg.greeting?.quickStarts ?? [];
        this.fallbackSuggestions = cfg.fallback?.suggestions ?? [];
      },
      error: _ => {
        this.cfg = undefined;
        this.greeting = 'A konfiguráció jelenleg nem érhető el.';
        this.quickStarts = [];
        this.fallbackSuggestions = [];
      }
    });
  }

  open(): void {
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  refresh(): void {
    this.input = '';
    this.msgs = [];
  }

  pick(qs: QuickStart): void {
    const question = qs.prompt?.trim();
    if (!question) return;

    this.msgs.push({ who: 'user', text: question, ts: Date.now() });

    const reply = qs.reply?.trim();
    if (reply) {
      setTimeout(() => {
        this.msgs.push({ who: 'bot', text: reply, ts: Date.now() });
      }, 500);
    }
  }

  pickSuggestion(s: Suggestion): void {
    const q = (s.prompt || s.label || '').trim();
    if (!q) return;
    this.isFallback = false;

    this.msgs.push({ who: 'user', text: q, ts: Date.now() });

    const r = (s.reply || '').trim();
    if (r) {
      setTimeout(() => {
        this.msgs.push({ who: 'bot', text: r, ts: Date.now() });
      }, 250);
      return;
    }

    this.send(q);
  }

  send(text: string): void {
    const clean = (text ?? '').trim();
    if (!clean) return;

    this.msgs.push({ who: 'user', text: clean, ts: Date.now() });

    const matched = this.cfg ? this.svc.matchResponse(clean, this.cfg) : undefined;
    const hasMatch = typeof matched === 'string' && matched.trim().length > 0;

    const reply = hasMatch
      ? matched!
      : (this.cfg?.fallback?.suggestionText ?? 'Elnézést, nem értem.');

    this.isFallback = !hasMatch;

    this.msgs.push({ who: 'bot', text: reply, ts: Date.now() });
  }
}
