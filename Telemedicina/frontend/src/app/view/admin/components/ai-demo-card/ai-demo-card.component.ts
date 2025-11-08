import {Component, Input} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-ai-demo-card',
  imports: [
    IonicModule,
    FormsModule
  ],
  templateUrl: './ai-demo-card.component.html',
  standalone: true,
  styleUrl: './ai-demo-card.component.scss'
})
export class AiDemoCardComponent {
  @Input({ required: true }) role!: 'patient' | 'doctor';
}
