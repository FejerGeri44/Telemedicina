import {Component, EventEmitter, Input, Output, SimpleChanges} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgIf} from '@angular/common';
import {formatPhoneNumber} from '../../../../utils/formatProfileData';
import {AdminItem} from '../../../../utils/interfaces';

@Component({
  selector: 'app-admin-profile-card',
  imports: [
    IonicModule,
    NgIf
  ],
  templateUrl: './admin-profile-card.component.html',
  standalone: true,
  styleUrl: './admin-profile-card.component.css'
})
export class AdminProfileCardComponent {
  @Input() user!: AdminItem;
  @Input() editable = false;
  @Output() edit = new EventEmitter<void>();

  get adminPhoneNumber(): string {
    return formatPhoneNumber(this.user?.user?.phoneNumber ?? '');
  }
}
