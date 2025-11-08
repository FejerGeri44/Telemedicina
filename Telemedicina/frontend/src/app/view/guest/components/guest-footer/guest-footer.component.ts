import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {IonicModule} from '@ionic/angular';

@Component({
  selector: 'app-guest-footer',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './guest-footer.component.html',
  styleUrls: ['./guest-footer.component.scss']
})
export class GuestFooterComponent {}

