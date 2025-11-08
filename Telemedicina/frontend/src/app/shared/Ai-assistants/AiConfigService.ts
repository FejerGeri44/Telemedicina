import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

import type {
  AssistantConfig,
  AssistantDraft,
  FallbackSuggestion,
  Intent,
  ItemID,
  QuickStartItem,
} from './AIInterfaces';

import {AssistantService} from './assistant.service';

type BotKind = 'patient' | 'doctor';

@Injectable({ providedIn: 'root' })
export class AiConfigService {
  private patient = AssistantService.create('patient-assistant.json', 'chatbots');
  private doctor  = AssistantService.create('doctor-assistant.json',  'chatbots');

  private patientDraftSub = new BehaviorSubject<AssistantConfig | null>(null);
  private doctorDraftSub  = new BehaviorSubject<AssistantConfig | null>(null);

  patientDraft$ = this.patientDraftSub.asObservable();
  doctorDraft$  = this.doctorDraftSub.asObservable();

  private initPromise: Promise<void> | null = null;
  private initialized = false;

  private readySub = new BehaviorSubject<boolean>(false);
  ready$ = this.readySub.asObservable();

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      await Promise.all([this.patient.init(), this.doctor.init()]);

      this.patientDraftSub.next(this.patient.getDraft());
      this.doctorDraftSub.next(this.doctor.getDraft());

      this.initialized = true;
      this.readySub.next(true);
      this.initPromise = null;
    })();

    return this.initPromise;
  }

  async whenReady(): Promise<void> {
    if (this.initialized) return;
    await this.init();
    if (this.initialized) return;
    await new Promise<void>((resolve) => {
      const sub = this.ready$.subscribe((ok) => {
        if (ok) { sub.unsubscribe(); resolve(); }
      });
    });
  }

  private getService(which: BotKind): AssistantService {
    return which === 'patient' ? this.patient : this.doctor;
  }

  getDraft(which: BotKind): AssistantConfig {
    return this.getService(which).getDraft();
  }

  async saveDraft(which: BotKind, patch: AssistantDraft): Promise<void> {
    await this.getService(which).saveDraft(patch);
  }

  resyncDraft(which: BotKind, publishedConfig: AssistantConfig): void {
    this.getService(which).resyncDraft(publishedConfig);
    this.refreshDraft(which);
  }

  async addQuickStart(which: BotKind, item: QuickStartItem) {
    await this.getService(which).addQuickStart(item);
    this.refreshDraft(which);
  }
  async updateQuickStart(which: BotKind, id: ItemID, patch: Partial<QuickStartItem>) {
    await this.getService(which).updateQuickStart(id, patch);
    this.refreshDraft(which);
  }
  async removeQuickStart(which: BotKind, id: ItemID) {
    await this.getService(which).removeQuickStart(id);
    this.refreshDraft(which);
  }

  async addIntent(which: BotKind, item: Intent) {
    await this.getService(which).addIntent(item);
    this.refreshDraft(which);
  }
  async updateIntent(which: BotKind, id: ItemID, patch: Partial<Intent>) {
    await this.getService(which).updateIntent(id, patch);
    this.refreshDraft(which);
  }
  async removeIntent(which: BotKind, id: ItemID) {
    await this.getService(which).removeIntent(id);
    this.refreshDraft(which);
  }

  async addFallbackSuggestion(which: BotKind, item: FallbackSuggestion) {
    await this.getService(which).addFallbackSuggestion(item);
    this.refreshDraft(which);
  }
  async updateFallbackSuggestion(
    which: BotKind,
    id: ItemID,
    patch: Partial<FallbackSuggestion>
  ) {
    await this.getService(which).updateFallbackSuggestion(id, patch);
    this.refreshDraft(which);
  }
  async removeFallbackSuggestion(which: BotKind, id: ItemID) {
    await this.getService(which).removeFallbackSuggestion(id);
    this.refreshDraft(which);
  }

  private refreshDraft(which: BotKind): void {
    const draft = this.getService(which).getDraft();
    if (which === 'patient') {
      this.patientDraftSub.next(draft);
    } else {
      this.doctorDraftSub.next(draft);
    }
  }
}
