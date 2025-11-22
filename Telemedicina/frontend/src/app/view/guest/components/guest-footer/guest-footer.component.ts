import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';

@Component({
  selector: 'app-guest-footer',
  standalone: true,
  imports: [
    ...IONIC_COMPONENTS,
    CommonModule
  ],
  templateUrl: './guest-footer.component.html',
  styleUrls: ['./guest-footer.component.scss']
})
export class GuestFooterComponent {}

