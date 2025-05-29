import {Component, Input, OnInit, ViewEncapsulation} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-custom-toast',
  template: `
    <div class="toast-wrapper" [ngClass]="type">
      <ion-icon [name]="iconName"></ion-icon>
      <span>{{ message }}</span>
    </div>
  `,
  styleUrls: ['./toast.component.css'],
  standalone: true,
  imports: [
    IonicModule,
    NgClass
  ],
  encapsulation: ViewEncapsulation.None
})
export class CustomToastComponent implements OnInit {
  @Input() message = '';
  @Input() type: 'success' | 'warning' | 'danger' = 'success';
  iconName = 'checkmark-circle';

  ngOnInit() {
    switch (this.type) {
      case 'success': this.iconName = 'checkmark-circle'; break;
      case 'warning': this.iconName = 'alert-circle'; break;
      case 'danger': this.iconName = 'close-circle'; break;
    }

    setTimeout(() => {
      const el = document.querySelector('.toast-wrapper');
      el?.classList.add('fade-out');
    }, 3000);
  }
}

