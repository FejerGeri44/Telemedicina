import {Component, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-doctor-chat',
  imports: [
    IonicModule,
    FormsModule
  ],
  templateUrl: './doctor-chat.component.html',
  standalone: true,
  styleUrl: './doctor-chat.component.scss'
})
export class DoctorChatComponent {
  message: string = '';

  get isSendButtonDisabled(): boolean {
    return this.message.trim().length === 0;
  }
}
