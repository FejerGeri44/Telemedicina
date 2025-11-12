import {Component, Input} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-document-table-skeleton',
  imports: [
    IonicModule,
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
