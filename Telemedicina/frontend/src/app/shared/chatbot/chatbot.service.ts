import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {AssistantConfig, AssistantReply, Audience, Intent, Pattern} from './chatbot.types';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private cfg?: AssistantConfig;

  constructor(private http: HttpClient) {}

  async init(audience: Audience): Promise<void> {
    const url = audience === 'patient'
      ? '/chatbot/patient-assistant.json'
      : '/public/chatbot/assistant-clinician.json';
    this.cfg = await firstValueFrom(this.http.get<AssistantConfig>(url));
  }

  async initFromObject(obj: AssistantConfig, audience: Audience): Promise<void> {
    // opcionálisan ellenőrizheted: obj.meta.audience === audience
    this.cfg = obj;
  }

  getGreeting() {
    this.ensure();
    return this.cfg!.greeting;
  }

  respond(text: string, audience: Audience): AssistantReply {
    this.ensure();
    const now = Date.now();

    const intents = this.cfg!.intents
      .filter(i => i.audience.includes(audience))
      .filter(i => this.isValid(i, now))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    let best: { intent: Intent; score: number } | null = null;
    for (const i of intents) {
      const s = this.score(text, i.patterns);
      if (s > (best?.score ?? 0)) best = { intent: i, score: s };
    }

    if (best && best.score >= 0.5) {
      return {
        intentId: best.intent.id,
        text: best.intent.response.text,
        suggestions: best.intent.response.suggestions,
        handoff: best.intent.response.handoff ?? null,
        confidence: best.score
      };
    }

    const fb = this.cfg!.fallback;
    return { text: fb.text, suggestions: fb.suggestions, confidence: 0 };
  }

  private isValid(i: Intent, now: number): boolean {
    const from = i.validFrom ? Date.parse(i.validFrom) : -Infinity;
    const until = i.validUntil ? Date.parse(i.validUntil) : Infinity;
    return now >= from && now <= until;
  }

  private score(text: string, patterns: Pattern[]): number {
    const t = this.norm(text);
    let s = 0;
    for (const p of patterns) {
      if (p.type === 'keywords_any') {
        if (p.list.some(k => t.includes(this.norm(k)))) s += 0.6;
      } else if (p.type === 'keywords_all') {
        if (p.list.every(k => t.includes(this.norm(k)))) s += 0.8;
      } else if (p.type === 'startsWith') {
        if (t.startsWith(this.norm(p.text))) s += 0.5;
      } else if (p.type === 'regex') {
        const re = new RegExp(p.pattern, p.flags ?? 'i');
        if (re.test(text)) s += 0.7;
      }
    }
    return Math.max(0, Math.min(1, s));
  }

  private norm(s: string) {
    return s.toLowerCase().normalize('NFKD').replace(/[^\w\s]/g, '').trim();
  }

  private ensure() {
    if (!this.cfg) throw new Error('AssistantEngineService nincs inicializálva (init).');
  }
}
