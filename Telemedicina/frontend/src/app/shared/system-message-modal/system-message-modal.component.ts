import {Component, Input} from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import {DatePipe, NgClass, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, UpperCasePipe} from '@angular/common';
import {SystemMessage} from '../../utils/interfaces/system-message.interface';
import {IONIC_COMPONENTS} from '../ionic-imports';

@Component({
  selector: 'app-system-message-modal',
  imports: [
    ...IONIC_COMPONENTS,
    NgIf,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
    DatePipe,
    UpperCasePipe,
    NgClass,
  ],
  templateUrl: './system-message-modal.component.html',
  standalone: true,
  styleUrl: './system-message-modal.component.scss'
})
export class SystemMessageModalComponent {
  @Input() messages: SystemMessage[] = [];
  currentIndex = 0;

  constructor(private modalCtrl: ModalController) {}

  get current(): any | null {
    return this.messages?.[this.currentIndex] ?? null;
  }

  dismiss(): void {
    void this.modalCtrl.dismiss();
  }
}
