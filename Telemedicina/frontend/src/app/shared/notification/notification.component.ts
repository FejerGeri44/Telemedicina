import { Component, Input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [
    NgClass,
    NgIf
  ],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationComponent {
  @Input() message = '';
  @Input() type: 'success' | 'error' = 'success';
  @Input() show = false;
}
