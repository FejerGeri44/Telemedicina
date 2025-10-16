import {Component, Input} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {ChatbotComponent} from '../../../../shared/chatbot/chatbot.component';

@Component({
  selector: 'app-ai-demo-card',
  imports: [
    IonicModule,
    FormsModule,
    NgIf,
    ChatbotComponent
  ],
  templateUrl: './ai-demo-card.component.html',
  standalone: true,
  styleUrl: './ai-demo-card.component.css'
})
export class AiDemoCardComponent {
  @Input({ required: true }) role!: 'patient' | 'doctor';
}
