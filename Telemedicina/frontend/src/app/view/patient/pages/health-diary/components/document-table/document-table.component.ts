import {Component, Input} from '@angular/core';
import {Document} from '../../../../../../utils/interfaces/document.interface';

@Component({
  selector: 'app-document-table',
  imports: [],
  templateUrl: './document-table.component.html',
  standalone: true,
  styleUrl: './document-table.component.scss'
})
export class DocumentTableComponent {
  @Input({ required: true }) myDocument!: Document[];
}
