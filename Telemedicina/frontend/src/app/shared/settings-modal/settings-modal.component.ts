import { Component } from '@angular/core';
import {ModalController, NavController} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, trashOutline } from 'ionicons/icons';
import {AlertService} from '../alert/alert.service.component';
import {UserService} from '../../services/user/user.service';
import {IONIC_COMPONENTS} from '../ionic-imports';

@Component({
  selector: 'app-settings-modal',
  imports: [
    ...IONIC_COMPONENTS
  ],
  templateUrl: './settings-modal.component.html',
  styleUrl: './settings-modal.component.scss',
  standalone: true
})
export class SettingsModalComponent {

  constructor(
    private modalCtrl: ModalController,
    private nav: NavController,
    private alert: AlertService,
    private userService: UserService
  ) {
    addIcons({
      closeOutline,
      trashOutline
    });
  }

  dismiss() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  async saveSettings() {
    console.log('Beállítások mentése...');
    await this.modalCtrl.dismiss({ saved: true }, 'confirm');
  }

  confirmAccountDelete() {
    void this.alert.show(
      'Fiók törlése',
      'Biztosan törölni szeretnéd a fiókodat? Ez a funkció visszafordíthatatlan!', // <-- Megmarad a \n
      () => this.deleteAccount()
    )
  }

  deleteAccount() {
    this.userService.deleteAccount().subscribe(() => this.nav.navigateRoot('/regist-login?tab=login'));
  }
}
