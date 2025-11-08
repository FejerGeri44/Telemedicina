import {Component, Input} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-appointment-table-skeleton',
  imports: [
    IonicModule,
    NgForOf
  ],
  templateUrl: './appointment-table-skeleton.component.html',
  standalone: true,
  styleUrl: './appointment-table-skeleton.component.scss'
})
export class AppointmentTableSkeletonComponent {
  @Input() rows = 5;

  get dummyRows(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }
}
