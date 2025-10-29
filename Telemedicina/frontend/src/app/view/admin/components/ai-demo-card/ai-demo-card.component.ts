import {Component, Input} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {ChatbotComponent} from '../../../../shared/chatbot/chatbot.component';

@Component({
  selector: 'app-ai-demo-card',
  imports: [
    IonicModule,
    FormsModule,
    ChatbotComponent
  ],
  templateUrl: './ai-demo-card.component.html',
  standalone: true,
  styleUrl: './ai-demo-card.component.scss'
})
export class AiDemoCardComponent {
  @Input({ required: true }) role!: 'patient' | 'doctor';
}
