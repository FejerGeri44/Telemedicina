import {Component, EventEmitter, Input, Output} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgIf} from '@angular/common';

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
  @Input() user: any | null = null;
  @Input() admin: any | null = null;
  @Input() editable = false;
  @Output() edit = new EventEmitter<void>();

  formatPhoneNumber(phone?: string): string {
    if (!phone || phone.length !== 11 || !phone.startsWith('06')) return phone ?? '';
    return `${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }
}
