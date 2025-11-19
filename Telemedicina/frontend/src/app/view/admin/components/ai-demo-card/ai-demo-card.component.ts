import {Component, Input, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {AiAssistantFabComponent} from '../../../../shared/ai-assistant-fab/ai-assistant-fab.component';

@Component({
  selector: 'app-ai-demo-card',
  imports: [
    IonicModule,
    FormsModule,
    AiAssistantFabComponent
  ],
  templateUrl: './ai-demo-card.component.html',
  standalone: true,
  styleUrl: './ai-demo-card.component.scss'
})
export class AiDemoCardComponent implements OnInit {
  @Input({ required: true }) role!: 'patient' | 'doctor';
  cardTitle: string = 'Szabályzatok Demózása';

  ngOnInit(): void {
    this.updateCardTitle();
  }

  private updateCardTitle(): void {
    const roleMap = {
      patient: 'Páciens Asszisztens',
      doctor: 'Orvosi Asszisztens'
    };
    this.cardTitle = `${roleMap[this.role]} Demó`;
  }
}
