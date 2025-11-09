import {Component, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-patient-chat',
  imports: [
    IonicModule,
    FormsModule
  ],
  templateUrl: './patient-chat.component.html',
  standalone: true,
  styleUrl: './patient-chat.component.scss'
})
export class PatientChatComponent {
  message: string = '';

  get isSendButtonDisabled(): boolean {
    return this.message.trim().length === 0;
  }
}
