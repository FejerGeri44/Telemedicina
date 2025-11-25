import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgIf, NgOptimizedImage} from '@angular/common';
import {AdminItem} from '../../../../utils/interfaces/admin.interface';
import {formatPhoneNumber, getUserRoleLabel} from '../../../../utils/formatProfileData';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';
import {ModalController} from '@ionic/angular/standalone';

@Component({
  selector: 'app-admin-profile-card',
  imports: [
    ...IONIC_COMPONENTS,
    NgIf,
    NgOptimizedImage
  ],
  templateUrl: './admin-profile-card.component.html',
  standalone: true,
  styleUrl: './admin-profile-card.component.scss'
})
export class AdminProfileCardComponent {
  @Input() user!: AdminItem;
  @Input() editable = false;
  @Input() isModal: boolean = false;
  @Output() edit = new EventEmitter<void>();

  constructor(private modalCtrl: ModalController) {}

  close() {
    void this.modalCtrl.dismiss();
  }

  protected readonly formatPhoneNumber = formatPhoneNumber;
    protected readonly getUserRoleLabel = getUserRoleLabel;
}
