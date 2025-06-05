import { Component } from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';

@Component({
  selector: 'app-logout-modal',
  imports: [IonicModule],
  templateUrl: './logout-modal.component.html',
  standalone: true,
  styleUrl: './logout-modal.component.css'
})
export class LogoutModalComponent {
  constructor(private modalCtrl: ModalController) {}

  confirm() {
    void this.modalCtrl.dismiss(true);
  }

  dismiss() {
    void this.modalCtrl.dismiss(false);
  }
}
