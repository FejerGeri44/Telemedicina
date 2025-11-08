import {Component, Input, OnInit} from '@angular/core';
import {FormsModule, NgForm, ReactiveFormsModule} from '@angular/forms';
import {IonicModule, ModalController} from '@ionic/angular';
import {NgForOf, NgIf} from '@angular/common';
import {ToastService} from '../../../../shared/toast/toast.service';
import {AiConfigService} from '../../../../shared/Ai-assistants/AiConfigService';
import type {
  Intent,
  QuickStartItem,
  FallbackSuggestion,
  ItemID
} from '../../../../shared/Ai-assistants/AIInterfaces';

type UpdateKind = 'greeting' | 'intent' | 'fallback';
type ItemForm = { label: string; prompt: string; reply: string; icon: string };
type IntentForm   = { patterns: string; response: string };

@Component({
  selector: 'app-new-query-response-modal',
  imports: [
    IonicModule,
    NgIf,
    NgForOf,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './new-query-response-modal.component.html',
  standalone: true,
  styleUrl: './new-query-response-modal.component.scss'
})
export class NewQueryResponseModalComponent implements OnInit {
  @Input({required: true}) kind!: UpdateKind;
  @Input({required: true}) role!: 'patient' | 'doctor';

  baseIcons = ['sparkles', 'chatbubbles', 'flash', 'reader', 'bulb', 'heart', 'rocket', 'help'];
  moreIcons = ['construct', 'flame', 'gift', 'hand-left', 'leaf', 'map', 'key', 'send', 'thumbs-up', 'time', 'trending-up', 'happy', 'star', 'call'];
  showMoreIcons = false;
  selectedIcon: string | null = null;

  model = {
    item: {label: '', prompt: '', reply: '', icon: 'sparkles'} as ItemForm,
    intent: {patterns: '', response: ''} as IntentForm
  };

  isSaving: boolean = false;

  private trim(v?: string): string {
    return (v ?? '').toString().trim();
  }


  constructor(
    private ai: AiConfigService,
    private toast: ToastService,
    private modalCtrl: ModalController
  ) {
  }

  ngOnInit() {
    this.selectedIcon = this.model.item.icon;
  }


  toggleMoreIcons() {
    this.showMoreIcons = !this.showMoreIcons;
  }

  selectIcon(icon: string) {
    this.selectedIcon = icon;
    this.model.item.icon = icon;
  }

  isIconSelected(icon: string): boolean {
    return this.selectedIcon === icon;
  }


  async onSave(form: NgForm) {
    if (form.invalid) {
      this.toast.show('Kérlek, tölts ki minden kötelező mezőt!', 'danger');
      return;
    }

    this.isSaving = true;

    try {
      if (this.kind === 'intent') {
        await this.addIntent();
      } else if (this.kind === 'greeting') {
        await this.addQuickStart();
      } else if (this.kind === 'fallback') {
        await this.addFallbackSuggestion();
      } else {
        throw new Error('Érvénytelen szabály típus.');
      }

    } catch (err) {
      console.error(`❌ ${this.kind} létrehozása sikertelen a vázlatban:`, err);
      this.toast.show('Hiba történt a mentéskor.', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  private async addIntent(): Promise<void> {
    const patternsArray = this.model.intent.patterns
      .split(',')
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);

    if (patternsArray.length === 0) {
      this.toast.show('Az Intenthez legalább egy Pattern (kifejezés) megadása kötelező!', 'danger');
      throw new Error('Hiányzó Pattern.');
    }

    const newIntent: Intent = {
      id: Date.now().toString(), // Temp ID
      patterns: patternsArray,
      response: this.model.intent.response.trim()
    };

    await this.ai.addIntent(this.role, newIntent);

    this.toast.show('Új Intent létrehozva a vázlatban!', 'success');
    await this.modalCtrl.dismiss({updated: true, item: newIntent}, 'updated');
  }

  private async addQuickStart(): Promise<void> {
    const itemModel = this.model.item;

    if (this.trim(itemModel.label) === '' || this.trim(itemModel.prompt) === '' || this.trim(itemModel.reply) === '') {
      this.toast.show('Kérlek, tölts ki minden QuickStart mezőt!', 'danger');
      throw new Error('Hiányzó QuickStart mező.');
    }

    const newQuickStart: QuickStartItem = {
      id: Date.now().toString(),
      icon: itemModel.icon,
      label: itemModel.label.trim(),
      prompt: itemModel.prompt.trim(),
      reply: itemModel.reply.trim()
    };

    await this.ai.addQuickStart(this.role, newQuickStart);

    this.toast.show('Új QuickStart létrehozva a vázlatban!', 'success');
    await this.modalCtrl.dismiss({updated: true, item: newQuickStart}, 'updated');
  }

  private async addFallbackSuggestion(): Promise<void> {
    const itemModel = this.model.item;

    if (this.trim(itemModel.label) === '' || this.trim(itemModel.prompt) === '' || this.trim(itemModel.reply) === '') {
      this.toast.show('Kérlek, tölts ki minden Fallback mezőt!', 'danger');
      throw new Error('Hiányzó Fallback mező.');
    }

    const newSuggestion: FallbackSuggestion = {
      id: Date.now().toString(),
      icon: itemModel.icon,
      label: itemModel.label.trim(),
      prompt: itemModel.prompt.trim(),
      reply: itemModel.reply.trim()
    };

    await this.ai.addFallbackSuggestion(this.role, newSuggestion);

    this.toast.show('Új Fallback Suggestion létrehozva a vázlatban!', 'success');
    await this.modalCtrl.dismiss({updated: true, item: newSuggestion}, 'updated');
  }

  close() {
    void this.modalCtrl.dismiss();
  }
}
