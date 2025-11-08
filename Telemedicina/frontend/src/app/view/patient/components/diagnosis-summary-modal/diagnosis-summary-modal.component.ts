import {Component, Input, OnInit} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {NgIf} from '@angular/common';
import {MyDiagnosis} from '../../../../utils/interfaces/diagnosis.interface';

@Component({
  selector: 'app-diagnosis-summary-modal',
  imports: [
    IonicModule,
    NgIf
  ],
  templateUrl: './diagnosis-summary-modal.component.html',
  standalone: true,
  styleUrl: './diagnosis-summary-modal.component.scss'
})
export class DiagnosisSummaryModalComponent implements OnInit {
  @Input({ required: true }) diagnosis!: MyDiagnosis;

  constructor(private modalCtrl: ModalController) {}

  close() {
    void this.modalCtrl.dismiss();
  }

  ngOnInit(): void {
    console.log(this.diagnosis)
  }
}
