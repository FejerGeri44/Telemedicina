import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {NgForOf, NgIf, NgSwitch} from '@angular/common';
import {
  AIFallback,
  AIGreeting,
  DecomposedAIConfig, DoctorAIConfig, DoctorAIIntent, Intent,
  PatientAIConfig, PatientAIIntent, QuickStart, Suggestion
} from '../../../../utils/interfaces/AIInterfaces';
import {HttpClient} from '@angular/common/http';
import {NewQueryResponseModalComponent} from '../new-query-response-modal/new-query-response-modal.component';
import {UpdateQueryResponseModalComponent} from '../update-query-response-modal/update-query-response-modal.component';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {ToastService} from '../../../../shared/toast/toast.service';

type RowKind = 'choose' | 'intents' | 'greeting' | 'fallback';
type AIRule =
  | { kind: 'greeting'; data: AIGreeting | QuickStart }
  | { kind: 'intent';   data: PatientAIIntent | DoctorAIIntent }
  | { kind: 'fallback'; data: Suggestion }
  | { kind: 'greetingText'; data: string }
  | { kind: 'fallbackText'; data: string };

@Component({
  selector: 'app-ai-rules-card',
  imports: [
    IonicModule,
    NgForOf,
    NgIf,
    NgSwitch
  ],
  templateUrl: './ai-rules-card.component.html',
  standalone: true,
  styleUrl: './ai-rules-card.component.css'
})
export class AiRulesCardComponent implements OnInit {
  @Input({ required: true }) role!: 'patient' | 'doctor';
  @Output() create = new EventEmitter<AIRule['kind']>();
  @Output() edit = new EventEmitter<AIRule>();
  @Output() remove = new EventEmitter<AIRule>();

  searchText = '';
  selectedType: RowKind = 'choose';
  pageIndex = 0;
  pageSize = 6;

  aiGreeting!: AIGreeting;
  aiIntents: PatientAIIntent[] | DoctorAIIntent[] = [];
  aiFallback!: AIFallback;

  aiGreetingFiltered: QuickStart[] = [];
  aiIntentsFiltered: PatientAIIntent[] | DoctorAIIntent[] = [];
  aiFallbackFiltered: Suggestion[] = [];

  showGreetingText: boolean = true;
  showFallbackText: boolean = true;

  get cardTitle() {
    if (this.role == 'patient') {
      return "Páciensi M.I. Szabályok";
    } else if (this.role == 'doctor') {
      return "Orvosi M.I. Szabályok";
    } else {
      return this.role;
    }
  }

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController,
    private toast: ToastService,
    private alert: AlertService
  ) {
  }

  ngOnInit() {
    this.applyFilter();
    this.fetchAIVersion(this.role);
  }

  fetchAIVersion(role: 'patient' | 'doctor') {
    const token = localStorage.getItem('token');
    if (!token) return;

    const urlMap = {
      patient: 'http://localhost:3000/api/ai-config/patient-assistant',
      doctor:  'http://localhost:3000/api/ai-config/doctor-assistant'
    } as const;

    const url = urlMap[role];

    this.http.get<PatientAIConfig | DoctorAIConfig>(url, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        const decomposed = this.decomposeAIConfig(res as any);
        this.aiGreeting = decomposed.greeting!;
        this.aiIntents  = decomposed.intents;
        this.aiFallback = decomposed.fallback!;
        this.applyFilter?.();
      },
      error: (err) => console.error('❌ AI config lekérése sikertelen:', err)
    });
  }

  decomposeAIConfig(cfg: PatientAIConfig): DecomposedAIConfig {
    const greeting: AIGreeting | null = cfg.greeting
      ? {
        quickStarts: cfg.greeting.quickStarts,
        quickStartText: (cfg.greeting.quickStartText)
      }
      : null;

    const fallback: AIFallback | null = cfg.fallback
      ? {
        suggestions: cfg.fallback.suggestions,
        suggestionText: (cfg.fallback.suggestionText)
      }
      : null;

    const intents: Intent[] = Array.isArray(cfg.intents)
      ? (cfg.intents as any[]).map(this.toFlatIntent)
      : [];

    return <DecomposedAIConfig>{intents, greeting, fallback};
  }

  private toFlatIntent = (raw: any, index: number): Intent => {
    const id: number =
      typeof raw?.id === 'number' ? raw.id
        : Number.isFinite(Number(raw?.id)) ? Number(raw.id)
          : index + 1;

    return {
      id,
      patterns: this.extractPatterns(raw?.patterns),
      response: this.normalizeResponse(raw?.response),
    };
  };

  private extractPatterns = (src: unknown): string[] => {
    if (src == null) return [];

    if (typeof src === 'object' && !Array.isArray(src)) {
      const maybeList = (src as any).list;
      if (Array.isArray(maybeList)) {
        return maybeList.map(this.toCleanString).filter(Boolean);
      }
    }

    if (Array.isArray(src)) {
      if (src.every(x => typeof x === 'string')) {
        return (src as unknown[]).map(this.toCleanString).filter(Boolean);
      }
      const collected: string[] = [];
      for (const item of src) {
        if (item && typeof item === 'object' && Array.isArray((item as any).list)) {
          collected.push(
            ...(item as any).list.map(this.toCleanString).filter(Boolean)
          );
        } else if (typeof item === 'string') {
          collected.push(this.toCleanString(item));
        }
      }
      return collected.filter(Boolean);
    }

    if (typeof src === 'string') {
      return src.split(/[,\n;]+/g).map(s => s.trim()).filter(Boolean);
    }

    return [];
  };

  private normalizeResponse = (resp: unknown): string => {
    if (typeof resp === 'string') return resp.trim();
    if (resp && typeof (resp as any).text === 'string') return (resp as any).text.trim();
    return '';
  };

  private toCleanString = (v: unknown): string => (v ?? '').toString().trim();

  onSelectType(t: RowKind) {
    this.selectedType = t;
    this.pageIndex = 0;
    this.applyFilter();
  }

  private norm(v: unknown): string {
    return (v ?? '').toString().toLowerCase().trim();
  }

  onSearchInput(ev: any) {
    this.searchText = (ev?.detail?.value ?? '').toString();
    this.applyFilter();
  }

  applyFilter() {
    const q = this.norm(this.searchText);

    switch (this.selectedType) {
      case 'greeting': {
        const qs = this.aiGreeting?.quickStarts ?? [];
        this.aiGreetingFiltered = q
          ? qs.filter(x => [x.label, x.prompt].some(v => this.norm(v).includes(q)))
          : qs.slice();
        this.showGreetingText = (q === '');
        break;
      }

      case 'intents': {
        const intents = (this.aiIntents ?? []) as Array<PatientAIIntent | DoctorAIIntent>;
        this.aiIntentsFiltered = q
          ? intents.filter(it => {
            const pats = this.extractPatterns((it as any).patterns);
            const matchPat = pats.some(p => this.norm(p).includes(q));
            const matchResp = this.norm((it as any).response).includes(q);
            return matchPat || matchResp;
          })
          : intents.slice();
        break;
      }

      case 'fallback': {
        const fb = (this.aiFallback?.suggestions as Suggestion[] | undefined) ?? [];
        this.aiFallbackFiltered = q
          ? fb.filter(x => this.norm(x.label).includes(q))
          : fb.slice();
        this.showFallbackText = (q === '');

        break;
      }
    }
  }

  get currentPageIntents() {
    if (this.selectedType !== 'intents') return [];
    const start = this.pageIndex * this.pageSize;
    return this.aiIntentsFiltered.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    if (this.selectedType !== 'intents') return 1;
    const n = this.aiIntentsFiltered.length;
    return Math.max(1, Math.ceil(n / this.pageSize));
  }

  get pagesArray(): number[] {
    return Array.from({length: this.totalPages}, (_, i) => i);
  }

  prevPage() {
    if (this.pageIndex > 0) this.pageIndex--;
  }

  nextPage() {
    if (this.pageIndex < this.totalPages - 1) this.pageIndex++;
  }

  goToPage(i: number) {
    if (i >= 0 && i < this.totalPages) this.pageIndex = i;
  }

  async onCreate(kind: string) {
    const modal = await this.modalCtrl.create({
      component: NewQueryResponseModalComponent as any,
      componentProps: {
        kind: kind,
        role: this.role
      },
      cssClass: 'admin-ai-modal'
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss<{ updated?: boolean }>();

    if (role === 'updated' || data?.updated) {
      this.fetchAIVersion(this.role);
    }
  }

  async onEdit(rule: AIRule) {
    const modal = await this.modalCtrl.create({
      component: UpdateQueryResponseModalComponent as any,
      componentProps: {
        kind: rule.kind,
        value: rule.data,
        role: this.role
      },
      cssClass: 'admin-ai-modal'
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss<{ updated?: boolean }>();

    if (role === 'updated' || data?.updated) {
      this.fetchAIVersion(this.role);
    }
  }

  onDeleteConfirmation(rule: AIRule) {
    void this.alert.show(
      'Szabály törlése',
      'Biztosan törölni szeretnéd a kijelölt szabályt?',
      () => this.onDelete(rule)
    )
  }

  onDelete(rule: AIRule) {
    const token = localStorage.getItem('token');
    if (!token) return;

    let type: 'intent' | 'quickStart' | 'suggestion' | null = null;
    let id: number | null = null;

    if (rule.kind === 'intent') {
      type = 'intent'; id = (rule.data as any).id;
    } else if (rule.kind === 'greeting') {
      type = 'quickStart'; id = (rule.data as any).id ?? (rule.data as any).label;
    } else if (rule.kind === 'fallback') {
      type = 'suggestion'; id = (rule.data as any).id ?? (rule.data as any).label;
    } else {
      return;
    }

    const body = { role: this.role, type, id };

    let rollback = () => {};
    if (type === 'intent') {
      rollback = this.removeIntentById(id!).restore;
    } else if (type === 'quickStart') {
      rollback = this.removeQuickStartById(id!).restore;
    } else if (type === 'suggestion') {
      rollback = this.removeSuggestionById(id!).restore;
    }

    // 2) Backend hívás
    this.http.post('http://localhost:3000/api/ai-config/ai-rules/delete', body, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.toast?.show?.('Sikeres törlés!', 'success');
        this.fixPaginationAfterDelete();
      },
      error: (err) => {
        console.error('❌ Törlés sikertelen, visszaállítom:', err);
        rollback();
        this.fixPaginationAfterDelete();
        this.toast?.show?.('A törlés nem sikerült.', 'danger');
      }
    });
  }

  private eqId(a: any, b: any) { return String(a) === String(b); }

  private removeIntentById(id: number) {
    const idx = (this.aiIntents as any[]).findIndex(it => this.eqId(it?.id, id));
    if (idx < 0) return { removed: null, restore: () => {} };

    const removed = (this.aiIntents as any[])[idx];
    const next = [...(this.aiIntents as any[])];
    next.splice(idx, 1);
    this.aiIntents = next;
    return {
      removed,
      restore: () => {
        const back = [...(this.aiIntents as any[])];
        back.splice(idx, 0, removed);
        this.aiIntents = back;
      }
    };
  }

  private removeQuickStartById(id: number) {
    const list = this.aiGreeting?.quickStarts ?? [];
    const idx = list.findIndex(qs => this.eqId(qs?.id, id) || this.eqId(qs?.label, id));
    if (idx < 0) return { removed: null, restore: () => {} };

    const removed = list[idx];
    const next = [...list]; next.splice(idx, 1);
    this.aiGreeting = { ...(this.aiGreeting as any), quickStarts: next };
    return {
      removed,
      restore: () => {
        const back = [...(this.aiGreeting?.quickStarts ?? [])];
        back.splice(idx, 0, removed);
        this.aiGreeting = { ...(this.aiGreeting as any), quickStarts: back };
      }
    };
  }

  private removeSuggestionById(id: number) {
    const list = this.aiFallback?.suggestions ?? [];
    const idx = list.findIndex(s => this.eqId(s?.id, id) || this.eqId(s?.label, id));
    if (idx < 0) return { removed: null, restore: () => {} };

    const removed = list[idx];
    const next = [...list]; next.splice(idx, 1);
    this.aiFallback = { ...(this.aiFallback as any), suggestions: next };
    return {
      removed,
      restore: () => {
        const back = [...(this.aiFallback?.suggestions ?? [])];
        back.splice(idx, 0, removed);
        this.aiFallback = { ...(this.aiFallback as any), suggestions: back };
      }
    };
  }

  private fixPaginationAfterDelete() {
    if (this.selectedType === 'intents') {
      const total = this.totalPages;
      if (this.pageIndex >= total) this.pageIndex = Math.max(0, total - 1);
    }
    this.applyFilter();
  }
}
