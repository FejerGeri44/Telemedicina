import {Component, EventEmitter, Input, Output, SimpleChanges} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgIf} from '@angular/common';
import {AdminItem} from '../../../../utils/interfaces/admin.interface';
import {formatPhoneNumber} from '../../../../utils/formatProfileData';

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
  protected readonly formatPhoneNumber = formatPhoneNumber;
}
