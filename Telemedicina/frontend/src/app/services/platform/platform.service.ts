import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class PlatformService {
  public isIos: boolean;

  constructor(private platform: Platform) {
    this.isIos = this.platform.is('ios');
  }
}
