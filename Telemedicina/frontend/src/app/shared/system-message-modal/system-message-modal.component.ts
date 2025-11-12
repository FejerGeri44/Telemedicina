import {Component, Input, OnInit} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {DatePipe, NgClass, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, UpperCasePipe} from '@angular/common';
import {SystemMessage} from '../../utils/interfaces/system-message.interface';

@Component({
  selector: 'app-system-message-modal',
  imports: [
    IonicModule,
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
export class SystemMessageModalComponent implements OnInit {
  @Input() messages: SystemMessage[] = [];

  currentIndex = 0;

  constructor(private modalCtrl: ModalController) {}

  get current(): any | null {
    return this.messages?.[this.currentIndex] ?? null;
  }

  dismiss(): void {
    void this.modalCtrl.dismiss();
  }

  ngOnInit(): void {
    console.log(this.messages)
  }
}
