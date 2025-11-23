import {Component, Input} from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import {NgForOf, NgIf} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {
  AssistantDraft, FallbackConfig,
  FallbackSuggestion, GreetingConfig,
  Intent,
  ItemID,
  QuickStartItem
} from '../../../../services/Ai-assistants/AIInterfaces';
import {AiConfigService} from '../../../../services/Ai-assistants/AiConfigService';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';

type UpdateKind = 'greeting' | 'intent' | 'fallback' | 'greetingText' | 'fallbackText';
type Incoming = string | Intent | QuickStartItem | FallbackSuggestion;

type GreetingForm = { id: number | null; icon: string; label: string; prompt: string, reply: string };
type FallbackForm = { id: number | null; icon: string; label: string; prompt: string, reply: string };
type IntentForm   = { id: number | null; patterns: string; response: string };

@Component({
  selector: 'app-update-query-response-modal',
  imports: [
    ...IONIC_COMPONENTS,
    NgForOf,
    NgIf,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './update-query-response-modal.component.html',
  standalone: true,
  styleUrl: './update-query-response-modal.component.scss'
})
export class UpdateQueryResponseModalComponent {
  @Input({ required: true }) kind!: UpdateKind;
  @Input({ required: true }) value!: Incoming;
  @Input({ required: true }) role!: 'patient' | 'doctor';

  baseIcons = ['sparkles', 'chatbubbles', 'flash', 'reader', 'bulb', 'heart', 'rocket', 'help' ];
  moreIcons = ['construct', 'flame', 'gift', 'hand-left', 'leaf', 'map', 'key', 'send', 'thumbs-up', 'time', 'trending-up', 'happy', 'star', 'call'];
  showMoreIcons = false;
  selectedIcon: string | null = null;

  model = {
    greetingText: '',
    fallbackText: '',
    greeting: { icon: '', label: '', prompt: '', reply: '' } as GreetingForm,
    fallback: { icon: '', label: '', prompt: '', reply: '' } as FallbackForm,
    intent:   { patterns: '', response: '' } as IntentForm
  };

  isSaving: boolean = false;

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController,
    private ai: AiConfigService,
    private toast: ToastService
  ) {}

  get valueAsGreeting(): QuickStartItem | undefined {
    return this.kind === 'greeting' ? (this.value as QuickStartItem) : undefined;
  }
  get valueAsIntent(): Intent | undefined {
    return this.kind === 'intent' ? (this.value as Intent) : undefined;
  }
  get valueAsFallback(): FallbackSuggestion | undefined {
    return this.kind === 'fallback' ? (this.value as FallbackSuggestion) : undefined;
  }
  get valueAsString(): string | undefined {
    return this.kind === 'greetingText' || this.kind === 'fallbackText' ? (this.value as string) : undefined;
  }

  toggleMoreIcons() {
    this.showMoreIcons = !this.showMoreIcons;
  }

  selectIcon(icon: string) {
    this.selectedIcon = icon;
    if (this.kind === 'greeting') {
      this.model.greeting.icon = icon;
    } else if (this.kind === 'fallback') {
      this.model.fallback.icon = icon;
    }
  }

  isIconSelected(icon: string): boolean {
    const current =
      this.selectedIcon ??
      (this.kind === 'greeting' ? this.model.greeting.icon :
        this.kind === 'fallback' ? this.model.fallback.icon : null);
    return current === icon;
  }

  onCancel() {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  isIntent(v: Incoming): v is Intent {
    return v != null && typeof v === 'object' && 'response' in v && 'patterns' in v && 'id' in v;
  }
  isQuickStart(v: Incoming): v is QuickStartItem {
    return v != null && typeof v === 'object' && 'label' in v && 'prompt' in v && 'icon' in v;
  }
  isSuggestion(v: Incoming): v is FallbackSuggestion {
    return v != null && typeof v === 'object' && 'label' in v && 'icon' in v && !('prompt' in v);
  }
  isString(v: Incoming): v is string {
    return typeof v === 'string';
  }

  private trim(v?: string): string { return (v ?? '').toString().trim(); }

  private arraysEqual(a?: string[], b?: string[]): boolean {
    if (!a && !b) return true;
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  private changedStr(newVal?: string, oldVal?: string): boolean {
    const n = this.trim(newVal);
    const o = this.trim(oldVal);
    return n !== '' && n !== o;
  }

  private changedNum(newVal?: number | null, oldVal?: ItemID): boolean {
    return newVal !== null && newVal !== undefined && !Number.isNaN(newVal) && newVal !== oldVal;
  }

  private diffQuickStart(orig: QuickStartItem, form: GreetingForm): Partial<QuickStartItem> {
    const patch: Partial<QuickStartItem> = {};
    if (this.changedStr(form.icon,   orig.icon))   patch.icon = this.trim(form.icon);
    if (this.changedStr(form.label,  orig.label))  patch.label = this.trim(form.label);
    if (this.changedStr(form.prompt, orig.prompt)) patch.prompt = this.trim(form.prompt);
    return patch;
  }

  private diffSuggestion(orig: FallbackSuggestion, form: FallbackForm): Partial<FallbackSuggestion> {
    const patch: Partial<FallbackSuggestion> = {};
    if (this.changedStr(form.icon,  orig.icon))  patch.icon = this.trim(form.icon);
    if (this.changedStr(form.label, orig.label)) patch.label = this.trim(form.label);
    return patch;
  }

  private diffIntent(orig: Intent, form: IntentForm): Partial<Intent> {
    const patch: Partial<Intent> = {};

    if (this.changedNum(form.id, orig.id)) {
      patch.id = form.id!;
    }
    if (this.changedStr(form.response, orig.response)) {
      patch.response = this.trim(form.response);
    }

    const parsed = this.trim(form.patterns)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (parsed.length && !this.arraysEqual(parsed, orig.patterns)) {
      patch.patterns = parsed;
    }
    return patch;
  }

  private hasText(v: any): boolean {
    return !!(v && v.toString().trim());
  }

  get canSave(): boolean {
    switch (this.kind) {
      case 'greeting': {
        const hasAnyText = [this.model.greeting.label, this.model.greeting.prompt, this.model.greeting.reply].some(v => this.hasText(v));
        const iconChanged = !!this.model.greeting.icon && this.model.greeting.icon !== this.valueAsGreeting?.icon;
        return hasAnyText || iconChanged;
      }
      case 'fallback': {
        const hasAnyText = [this.model.fallback.label, this.model.fallback.prompt, this.model.fallback.reply].some(v => this.hasText(v));
        const iconChanged = !!this.model.fallback.icon && this.model.fallback.icon !== this.valueAsFallback?.icon;
        return hasAnyText || iconChanged;
      }
      case 'greetingText':
        return this.hasText(this.model.greetingText);
      case 'fallbackText':
        return this.hasText(this.model.fallbackText);
      case 'intent':
        return [this.model.intent.patterns, this.model.intent.response].some(v => this.hasText(v));
      default:
        return false;
    }
  }

  async onSave() {
    this.isSaving = true;

    let patchObj: { kind: string, id?: ItemID, patch: any } | null = null;


    if (this.kind === 'greetingText' && this.isString(this.value)) {
      const newText = this.trim(this.model.greetingText);
      patchObj = { kind: 'greetingText', patch: { quickStartText: newText } };
    }
    else if (this.kind === 'fallbackText' && this.isString(this.value)) {
      const newText = this.trim(this.model.fallbackText);
      patchObj = { kind: 'fallbackText', patch: { suggestionText: newText } };
    }
    else if (this.kind === 'greeting' && this.isQuickStart(this.value)) {
      const patch = this.diffQuickStart(this.value, this.model.greeting);
      if (Object.keys(patch).length) {
        patchObj = { kind: 'quickStart', id: this.value.id, patch };
      }
    }
    else if (this.kind === 'fallback' && this.isSuggestion(this.value)) {
      const patch = this.diffSuggestion(this.value, this.model.fallback);
      if (Object.keys(patch).length) {
        patchObj = { kind: 'fallbackSuggestion', id: this.value.id, patch };
      }
    }
    else if (this.kind === 'intent' && this.isIntent(this.value)) {
      const patch = this.diffIntent(this.value, this.model.intent);
      if (Object.keys(patch).length) {
        patchObj = { kind: 'intent', id: this.value.id, patch };
      }
    }

    if (!patchObj) {
      this.isSaving = false;
      console.log('ℹ️ Nincs módosítás.');
      return;
    }

    try {
      if (patchObj.kind === 'quickStart') {
        await this.ai.updateQuickStart(this.role, patchObj.id!, patchObj.patch);
      } else if (patchObj.kind === 'fallbackSuggestion') {
        await this.ai.updateFallbackSuggestion(this.role, patchObj.id!, patchObj.patch);
      } else if (patchObj.kind === 'intent') {
        await this.ai.updateIntent(this.role, patchObj.id!, patchObj.patch);
      } else if (patchObj.kind === 'greetingText' || patchObj.kind === 'fallbackText') {
        const draftPatch = patchObj.kind === 'greetingText' ?
          { greeting: { quickStartText: patchObj.patch.quickStartText } as Partial<GreetingConfig> } :
          { fallback: { suggestionText: patchObj.patch.suggestionText } as Partial<FallbackConfig> };
        await this.ai.saveDraft(this.role, draftPatch as unknown as AssistantDraft);
      }

      this.toast.show("Sikeres módosítás a vázlatban!", "success");
      await this.modalCtrl.dismiss({ updated: true }, 'updated');
    } catch (err) {
      this.isSaving = false;
      console.error('❌ Mentés sikertelen a vázlatban:', err);
      this.toast.show("Hiba történt a mentéskor.", "danger");
    } finally {
      this.isSaving = false;
    }
  }

  close() {
    void this.modalCtrl.dismiss();
  }
}
