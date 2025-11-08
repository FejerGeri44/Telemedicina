import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { Subscription } from 'rxjs';
import {IonicModule, ModalController} from '@ionic/angular';
import {NgFor, NgIf, NgSwitch, NgSwitchCase} from '@angular/common';

import type {
  AssistantConfig,
  FallbackConfig,
  GreetingConfig,
  Intent,
  MetaConfig,
  QuickStartItem,
  ItemID
} from '../../../../shared/Ai-assistants/AIInterfaces';
import {AiConfigService} from '../../../../shared/Ai-assistants/AiConfigService';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {UpdateQueryResponseModalComponent} from '../update-query-response-modal/update-query-response-modal.component';
import {NewQueryResponseModalComponent} from '../new-query-response-modal/new-query-response-modal.component';
import {environment} from '../../../../../../../backend/config/enviroment';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';

type BotKind = 'patient' | 'doctor';
type RuleType = 'choose' | 'greeting' | 'intent' | 'fallback';

@Component({
  selector: 'app-ai-rules-card',
  imports: [
    IonicModule,
    NgIf, NgFor, NgSwitch, NgSwitchCase
  ],
  templateUrl: './ai-rules-card.component.html',
  standalone: true,
  styleUrl: './ai-rules-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiRulesCardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) role: BotKind = 'patient';

  meta: MetaConfig | null = null;
  greeting: GreetingConfig | null = null;
  intents: Intent[] = [];
  fallback: FallbackConfig | null = null;

  cardTitle: string = 'Szabályzatok Kezelése';
  selectedType: RuleType = 'choose';
  searchText: string = '';

  readonly pageSize = 10;
  pageIndex = 0;
  totalPages = 0;
  pagesArray: number[] = [];

  aiGreetingFiltered: QuickStartItem[] = [];
  aiFallbackFiltered: QuickStartItem[] = [];
  currentPageIntents: Intent[] = [];

  loading = true;
  error: string | null = null;

  private sub?: Subscription;

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController,
    private ai: AiConfigService,
    private cdr: ChangeDetectorRef,
    private alert: AlertService,
    private toast: ToastService
    ) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.ai.whenReady();

      const initialDraft = this.ai.getDraft(this.role);
      this.splitDraft(initialDraft);
      this.updateCardTitle();

      this.sub = (this.role === 'patient' ? this.ai.patientDraft$ : this.ai.doctorDraft$)
        .subscribe(d => {
          if (d) {
            this.splitDraft(d);
            this.updateCardTitle();
            this.applyFiltersAndPagination();
            this.cdr.detectChanges();
          }
        });

      this.loading = false;
      this.cdr.detectChanges();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Ismeretlen hiba az inicializáláskor.';
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private splitDraft(draft: AssistantConfig | null): void {
    if (!draft) {
      this.meta = null;
      this.greeting = null;
      this.intents = [];
      this.fallback = null;
      return;
    }

    const clonedDraft = JSON.parse(JSON.stringify(draft)) as AssistantConfig;

    this.meta = clonedDraft.meta;
    this.greeting = clonedDraft.greeting;
    this.intents = clonedDraft.intents;
    this.fallback = clonedDraft.fallback;

    this.applyFiltersAndPagination();
  }

  private updateCardTitle(): void {
    const roleMap = {
      patient: 'Páciens Asszisztens',
      doctor: 'Orvosi Asszisztens'
    };
    this.cardTitle = `${roleMap[this.role]} Szabályzatok (${this.meta?.version || 'nincs verzió'})`;
  }

  private applyFiltersAndPagination(): void {

    const quickStartsList: QuickStartItem[] = this.greeting?.quickStarts ?? [];

    this.aiGreetingFiltered = quickStartsList.filter(item =>
      !this.searchText ||
      item.label.toLowerCase().includes(this.searchText) ||
      item.prompt.toLowerCase().includes(this.searchText) ||
      item.reply.toLowerCase().includes(this.searchText)
    );

    const fallbackList: QuickStartItem[] = this.fallback?.suggestions ?? [];

    this.aiFallbackFiltered = fallbackList.filter(item =>
      !this.searchText ||
      item.label.toLowerCase().includes(this.searchText) ||
      item.prompt.toLowerCase().includes(this.searchText) ||
      item.reply.toLowerCase().includes(this.searchText)
    );

    const filteredIntents = this.intents.filter(intent =>
      !this.searchText ||
      intent.response.toLowerCase().includes(this.searchText) ||
      intent.patterns.some(p => p.toLowerCase().includes(this.searchText))
    );

    this.totalPages = Math.ceil(filteredIntents.length / this.pageSize);
    this.pagesArray = Array(this.totalPages).fill(0).map((x, i) => i);

    if (this.pageIndex >= this.totalPages && this.totalPages > 0) {
      this.pageIndex = this.totalPages - 1;
    } else if (this.totalPages === 0) {
      this.pageIndex = 0;
    }

    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.currentPageIntents = filteredIntents.slice(start, end);

    this.cdr.detectChanges();
  }

  onSearchInput(event: any): void {
    this.searchText = event.detail.value.toLowerCase();
    this.pageIndex = 0;
    this.applyFiltersAndPagination();
  }

  onSelectType(type: RuleType): void {
    this.selectedType = type;
    this.pageIndex = 0;
    this.applyFiltersAndPagination();
  }

  goToPage(index: number): void {
    if (index >= 0 && index < this.totalPages) {
      this.pageIndex = index;
      this.applyFiltersAndPagination();
    }
  }

  prevPage(): void {
    if (this.pageIndex > 0) {
      this.pageIndex--;
      this.applyFiltersAndPagination();
    }
  }

  nextPage(): void {
    if (this.pageIndex < this.totalPages - 1) {
      this.pageIndex++;
      this.applyFiltersAndPagination();
    }
  }

  async onCreate(kind: 'greeting' | 'intent' | 'fallback'): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NewQueryResponseModalComponent as any,
      componentProps: {
        kind: kind,
        role: this.role
      },
      cssClass: 'admin-ai-modal'
    });

    await modal.present();
  }

  async onEdit(item: { kind: string, data: any, id?: ItemID }): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: UpdateQueryResponseModalComponent as any,
      componentProps: {
        kind: item.kind,
        value: item.data,
        role: this.role
      },
      cssClass: 'admin-ai-modal'
    });

    await modal.present();
  }

  onDeleteConfirmation(item: { kind: string, data: any, id: ItemID }): void {
    void this.alert.show(
      'Szabály törlése',
      'Biztosan törölni szeretnéd a kijelölt szabályt?',
      () => this.onDelete(item.kind, item.id)
    )
  }

  async onDelete(kind: string, id: ItemID): Promise<void> {
    try {
      switch (kind) {
        case 'quickStart':
          await this.ai.removeQuickStart(this.role, id);
          break;
        case 'intent':
          await this.ai.removeIntent(this.role, id);
          break;
        case 'fallback':
          await this.ai.removeFallbackSuggestion(this.role, id);
          break;
        default:
          console.error(`Ismeretlen törlendő típus: ${kind}`);
          return;
      }
    } catch (error) {
      console.error(`Hiba a(z) ${kind} törlésekor:`, error);
    }
  }

  onPublishConfirmation(): void {
    let AlertTitle = this.role === "patient" ? "Páciens M.I. Asszisztens" : "Orvos M.I. Asszisztens";
    void this.alert.show(
      `${AlertTitle}`,
      `Biztosan publikálni szeretnéd a ${AlertTitle} verziót?`,
      () => this.onPublish()
    )
  }

  async onPublish(): Promise<void> {
    const draftConfig = this.ai.getDraft(this.role);

    const payload = {
      role: this.role,
      config: draftConfig
    }

    this.http.post(`${environment.apiUrl}/admin/publish-ai-config`,
      payload,
      { withCredentials: true }
    ).subscribe({
      next: async () => {
        this.ai.resyncDraft(this.role, draftConfig);

        await this.toast.show("A konfiguráció publikálva lett!", 'success');
      },
      error: (err) => {
        console.error('❌ Publikálási hiba:', err);
        this.toast.show('A publikálás sikertelen. Lásd a konzolt.', 'danger');
      }
    });
  }
}
