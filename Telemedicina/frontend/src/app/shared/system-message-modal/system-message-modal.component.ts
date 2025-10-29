import {Component, Input} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault} from '@angular/common';

@Component({
  selector: 'app-system-message-modal',
  imports: [
    IonicModule,
    NgIf,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
  ],
  templateUrl: './system-message-modal.component.html',
  standalone: true,
  styleUrl: './system-message-modal.component.scss'
})
export class SystemMessageModalComponent {
  @Input() messages: any[] = [];

  currentIndex = 0;

  constructor(private modalCtrl: ModalController) {}

  get current(): any | null {
    return this.messages?.[this.currentIndex] ?? null;
  }

  dismiss(): void {
    void this.modalCtrl.dismiss();
  }
}
