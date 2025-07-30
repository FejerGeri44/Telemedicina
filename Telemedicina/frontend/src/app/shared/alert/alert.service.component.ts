import {Injectable} from '@angular/core';
import {AlertController} from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})

export class AlertService {
  constructor(private alertController: AlertController) {}

  async show(header: string, message: string, confirmHandler: () => void): Promise<void> {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: [
        {
          text: 'Mégsem',
          role: 'cancel',
          cssClass: 'cancel-button'
        },
        {
          text: 'Igen',
          cssClass: 'confirm-button',
          handler: confirmHandler
        }
      ]
    });

    await alert.present();
  }
}
