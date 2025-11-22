import {Component, Input} from '@angular/core';
import {NgForOf} from '@angular/common';
import {IONIC_COMPONENTS} from '../../../../../../../shared/ionic-imports';

@Component({
  selector: 'app-document-table-skeleton',
  imports: [
    ...IONIC_COMPONENTS,
    NgForOf
  ],
  templateUrl: './document-table-skeleton.component.html',
  standalone: true,
  styleUrl: './document-table-skeleton.component.scss'
})
export class DocumentTableSkeletonComponent {
  @Input() rows = 5;

  get dummyRows(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }
}
