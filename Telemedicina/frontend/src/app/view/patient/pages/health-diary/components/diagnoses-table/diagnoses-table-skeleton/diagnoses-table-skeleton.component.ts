import {Component, Input} from '@angular/core';
import {NgForOf} from '@angular/common';
import {IONIC_COMPONENTS} from '../../../../../../../shared/ionic-imports';

@Component({
  selector: 'app-diagnoses-table-skeleton',
  imports: [
    ...IONIC_COMPONENTS,
    NgForOf
  ],
  templateUrl: './diagnoses-table-skeleton.component.html',
  standalone: true,
  styleUrl: './diagnoses-table-skeleton.component.scss'
})
export class DiagnosesTableSkeletonComponent {
  @Input() rows = 5;

  get dummyRows(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }
}
