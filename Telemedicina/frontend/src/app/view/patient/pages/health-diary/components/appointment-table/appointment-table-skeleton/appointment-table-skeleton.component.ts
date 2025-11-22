import {Component, Input} from '@angular/core';
import {NgForOf} from '@angular/common';
import {IONIC_COMPONENTS} from '../../../../../../../shared/ionic-imports';

@Component({
  selector: 'app-appointment-table-skeleton',
  imports: [
    ...IONIC_COMPONENTS,
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
