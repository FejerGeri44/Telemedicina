import {Component, Input} from '@angular/core';
import {FormsModule, NgForm, ReactiveFormsModule} from '@angular/forms';
import {IonicModule, ModalController} from '@ionic/angular';
import {NgForOf, NgIf} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';

type UpdateKind = 'greeting' | 'intent' | 'fallback' | 'greetingText' | 'fallbackText';
type IntentForm   = { id: number | null; patterns: string; response: string };

@Component({
  selector: 'app-new-query-response-modal',
  imports: [
    IonicModule,
    NgForOf,
    NgIf,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './new-query-response-modal.component.html',
  standalone: true,
  styleUrl: './new-query-response-modal.component.css'
})
export class NewQueryResponseModalComponent {
  @Input({ required: true }) kind!: UpdateKind;
  @Input({ required: true }) role!: 'patient' | 'doctor';

  model = {
    intent:   { patterns: '', response: '' } as IntentForm
  };
  isSaving: boolean = false

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private modalCtrl: ModalController
  ) {}

  onCancel() {
    void this.modalCtrl.dismiss();
  }

  onSave(form: NgForm) {
    if (form.invalid) {
      this.toast.show('Kérlek, tölts ki minden kötelező mezőt!', 'danger');
      return;
    } else {
      this.isSaving = true;
      const token = localStorage.getItem('token');
      if (!token) return;

      const body = {
        role: this.role,
        patterns: this.model.intent.patterns,
        response: this.model.intent.response
      };

      this.http.post('http://localhost:3000/api/ai-config/ai-rules/create', body, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: async (res) => {
          this.isSaving = false;
          this.toast.show('Új intent létrehozva!', 'success');
          await this.modalCtrl.dismiss({updated: true}, 'updated');
        },
        error: (err) => {
          this.isSaving = false;
          console.error('❌ Intent létrehozása sikertelen:', err)
        }
      });
    }
  }
}
