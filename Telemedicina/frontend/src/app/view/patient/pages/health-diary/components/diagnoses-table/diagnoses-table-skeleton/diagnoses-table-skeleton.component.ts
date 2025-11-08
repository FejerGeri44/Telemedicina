import {Component, Input} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-diagnoses-table-skeleton',
  imports: [
    IonicModule,
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
