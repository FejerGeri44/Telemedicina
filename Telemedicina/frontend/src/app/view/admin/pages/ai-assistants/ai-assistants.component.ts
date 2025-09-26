import {Component, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {NgForOf, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, SlicePipe} from '@angular/common';
import {HttpClient} from '@angular/common/http';

interface QueryResponse {
  id: string;
  name?: string;
  priority?: number;
  response?: { text?: string };
}

export interface PatientAIConfig {
  meta: {
    audience: string;
    version: string;
    locale: string;
  };
  greeting: AIGreeting;
  intents: AIIntent[];
  fallback: AIFallback;
}
export interface AIGreeting {
  quickStarts: QuickStart[];
  quickStartsText: string;
}

export interface AIFallback {
  suggestions: Suggestion[];
  suggestionsText: string;
}

export type AIIntent = Intent;

export interface Suggestion {
  icon: string;
  label: string;
}

export interface DecomposedAIConfig {
  intents: AIIntent[];
  greeting: AIGreeting;
  fallback: AIFallback;
}

export interface QuickStart {
  icon: string;
  label: string;
  prompt: string;
}

export interface Intent {
  id: string;
  patterns: string[];
  response: string;
}

type RowKind = 'all' | 'intents' | 'greeting' | 'fallback';

@Component({
  selector: 'app-ai-assistants',
  imports: [
    IonicModule,
    FormsModule,
    NgForOf,
    NgIf,
    SlicePipe,
    NgSwitchDefault,
    NgSwitchCase,
    NgSwitch
  ],
  templateUrl: './ai-assistants.component.html',
  standalone: true,
  styleUrl: './ai-assistants.component.css'
})
export class AiAssistantsComponent implements OnInit{
  mainTab: 'patient' | 'doctor' = 'patient';
  patientSubTab: 'rules' | 'demo' = 'rules';
  doctorSubTab: 'rules' | 'demo' = 'rules';

  patientAIConfig!: PatientAIConfig;

  demoInputPatient: string = '';
  aiIntents: Intent[] = [];
  aiGreeting!: AIGreeting;
  aiFallback!: AIFallback;

  aiIntentsFiltered: Intent[] = [];
  aiGreetingFiltered: QuickStart[] = [];
  aiFallbackFiltered: Array<{ icon: string; label: string }> = [];

  allItems: QueryResponse[] = [];

  selectedQueryId: string | null = null;
  searchText = '';

  readonly pageSize = 6;
  pageIndex = 0;

  private _filtered: QueryResponse[] = [];
  selectedType: RowKind = 'all';

  constructor(
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.fetchPatientAIVersion();
    this.applyFilter();
  }

  fetchPatientAIVersion() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<PatientAIConfig>('http://localhost:3000/api/ai-config/patient-assistant', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res) => {
        this.patientAIConfig = res;
        const decomposed = this.decomposeAIConfig(res);
        this.aiGreeting = decomposed.greeting;
        this.aiIntents = decomposed.intents;
        this.aiFallback = decomposed.fallback;
        console.log(this.aiFallback);
      },
      error: (err) => {
        console.error('❌ Patient AI config lekérése sikertelen:', err);
      }
    });
  }

  decomposeAIConfig(cfg: PatientAIConfig): DecomposedAIConfig {
    const greeting: AIGreeting | null = cfg.greeting
      ? {
        quickStarts: cfg.greeting.quickStarts ?? [],
        quickStartsText: (cfg.greeting.quickStarts ?? [])
          .map(q => q?.label || q?.prompt || '')
          .filter(Boolean)
          .join(', ')
      }
      : null;

    const fallback: AIFallback | null = cfg.fallback
      ? {
        suggestions: cfg.fallback.suggestions ?? [],
        suggestionsText: (cfg.fallback.suggestions ?? []).join(', ')
      }
      : null;

    const intents: Intent[] = Array.isArray(cfg.intents)
      ? (cfg.intents as any[]).map(this.toFlatIntent)
      : [];

    return <DecomposedAIConfig>{intents, greeting, fallback};
  }

  private normalizeResponse = (resp: unknown): string => {
    if (typeof resp === 'string') return resp.trim();
    if (resp && typeof (resp as any).text === 'string') return (resp as any).text.trim();
    return '';
  };

// --- Segéd: egy elem stringgé (és tisztít)
  private toCleanString = (v: unknown): string =>
    (v ?? '').toString().trim();

// --- ÚJ: patterns kinyerése bármilyen alakból
  private extractPatterns = (src: unknown): string[] => {
    // 1) nincs semmi
    if (src == null) return [];

    // 2) ha egyetlen objektum {list: [...]}
    if (typeof src === 'object' && !Array.isArray(src)) {
      const maybeList = (src as any).list;
      if (Array.isArray(maybeList)) {
        return maybeList.map(this.toCleanString).filter(Boolean);
      }
    }

    // 3) ha tömb
    if (Array.isArray(src)) {
      // 3/a) elemei stringek
      if (src.every(x => typeof x === 'string')) {
        return (src as unknown[]).map(this.toCleanString).filter(Boolean);
      }
      // 3/b) elemei objektumok {list: [...]}
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

    // 4) ha egyetlen string, pl. "a,b;c"
    if (typeof src === 'string') {
      return src.split(/[,\n;]+/g).map(s => s.trim()).filter(Boolean);
    }

    return [];
  };

// --- Egy nyers intent -> lapos Intent
  private toFlatIntent = (raw: any, index: number): { response: string; patterns: string[]; id: any; priority: any } => {
    const id = raw?.id || raw?.name || `intent-${index + 1}`;
    return {
      id,
      patterns: this.extractPatterns(raw?.patterns),
      response: this.normalizeResponse(raw?.response),
      priority: typeof raw?.priority === 'number' ? raw.priority : undefined,
    };
  };
  onSelectType(t: RowKind) {
    this.selectedType = t;
    this.pageIndex = 0;
    this.applyFilter();
  }

  private norm(v: unknown): string {
    return (v ?? '').toString().toLowerCase().trim();
  }

// --- Lényeg: itt differenciáltan szűrünk
  applyFilter() {
    const q = this.norm(this.searchText);

    // Greeting
    const qs = this.aiGreeting?.quickStarts ?? [];
    this.aiGreetingFiltered = q
      ? qs.filter(it =>
        [it.label, it.prompt, it.icon].some(x => this.norm(x).includes(q))
      )
      : qs.slice();

    // Fallback
    // Ha nálad fb egy objektum {icon,label}, akkor így:
    const fb = (this.aiFallback?.suggestions as Array<{icon:string;label:string}> | undefined) ?? [];
    this.aiFallbackFiltered = q
      ? fb.filter(it => this.norm(it.label).includes(q))
      : fb.slice();

    // Intents
    const intents = this.aiIntents ?? [];
    this.aiIntentsFiltered = q
      ? intents.filter(it =>
          (it.patterns ?? []).some(p => this.norm(p).includes(q))
      )
      : intents.slice();

    if (this.selectedType === 'intents') this.pageIndex = 0;
  }

  get totalPages(): number {
    if (this.selectedType !== 'intents') return 1;
    const n = this.aiIntentsFiltered.length;
    return Math.max(1, Math.ceil(n / this.pageSize));
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  get currentPageIntents(): Intent[] {
    if (this.selectedType !== 'intents') return [];
    const start = this.pageIndex * this.pageSize;
    return this.aiIntentsFiltered.slice(start, start + this.pageSize);
  }

  prevPage() { if (this.pageIndex > 0) this.pageIndex--; }
  nextPage() { if (this.pageIndex < this.totalPages - 1) this.pageIndex++; }
  goToPage(i: number) {
    if (i >= 0 && i < this.totalPages) this.pageIndex = i;
  }

  onEdit(item: any) {
    // TODO
  }

  onDelete(item: any) {
    // TODO
  }

  onCreate() {
    // TODO
  }

  send() {
    // TODO
  }

  onEditGreeting(g: any) {
    // TODO: greeting szerkesztő megnyitása
    console.log('EDIT GREETING', g);
  }
  onDeleteGreeting(g: any) {
    // TODO: greeting törlése / mentés Firebase-re
    console.log('DELETE GREETING', g);
  }
  onEditFallback(f: any) {
    // TODO: fallback szerkesztő megnyitása
    console.log('EDIT FALLBACK', f);
  }
  onDeleteFallback(f: any) {
    // TODO: fallback törlése / mentés Firebase-re
    console.log('DELETE FALLBACK', f);
  }
}
