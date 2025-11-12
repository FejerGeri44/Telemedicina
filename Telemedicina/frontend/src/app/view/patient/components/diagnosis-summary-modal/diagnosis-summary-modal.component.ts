import {Component, Input, OnInit} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {NgIf} from '@angular/common';
import {MyDiagnosis} from '../../../../utils/interfaces/diagnosis.interface';
import {formatPhoneNumber, formatTaj, formatTimestamp} from '../../../../utils/formatProfileData';

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
  vm: any = {};

  constructor(private modalCtrl: ModalController) {}

  ngOnInit(): void {
    this.buildSummaryVM();
    console.log("vm:", this.vm)
  }

  buildSummaryVM() {
    const p = this.diagnosis.patient_data
    const s = { chiefComplaint: this.diagnosis.chief_complaint, onsetDate: this.diagnosis.onset_date, history: this.diagnosis.history };
    const e = { bpSys: this.diagnosis.bp_sys, bpDia: this.diagnosis.bp_dia, heartRate: this.diagnosis.heart_rate, tempC: this.diagnosis.temp_c, spo2: this.diagnosis.spo2, weightKg: this.diagnosis.weight_kg, heightCm: this.diagnosis.height_cm, bmi: this.diagnosis.bmi, examSummary: this.diagnosis.exam_summary };
    const d = { primaryText: this.diagnosis.primary_text, codeSystem: this.diagnosis.code_system, code: this.diagnosis.code, certaintyPct: this.diagnosis.certainty_pct, severity: this.diagnosis.severity, differentials: this.diagnosis.differentials };
    const plan = { assessment: this.diagnosis.assessment, planText: this.diagnosis.plan_text, redFlags: this.diagnosis.red_flags, informed: this.diagnosis.informed };

    const taj = formatTaj(this.diagnosis.patient_data.patient.taj);
    const phone = formatPhoneNumber(this.diagnosis.patient_data.user.phoneNumber);

    const bp = (e.bpSys && e.bpDia) ? `${e.bpSys}/${e.bpDia} mmHg` : '';
    const hr = e.heartRate ? `${e.heartRate} bpm` : '';
    const temp = e.tempC ? `${e.tempC} °C` : '';
    const spo2 = e.spo2 ? `${e.spo2}%` : '';
    const weight = e.weightKg ? `${e.weightKg} kg` : '';
    const height = e.heightCm ? `${e.heightCm} cm` : '';
    const bmi = e.bmi ? `${e.bmi}` : '';

    const certainty = `${d.certaintyPct}%`;
    const severity = d.severity === 'mild' ? 'Enyhe'
      : d.severity === 'moderate' ? 'Középsúlyos'
        : d.severity === 'severe' ? 'Súlyos' : '';

    this.vm = {
      patientName: p.user.name || '',
      taj,
      phone,
      email: p.user.email || '',
      appointmentTime: formatTimestamp(this.diagnosis.diagnosis_date),

      diagnosisDate: formatTimestamp(this.diagnosis.diagnosis_date),

      onsetDate: s.onsetDate ? new Date(s.onsetDate).toLocaleDateString('hu-HU') : '',
      chiefComplaint: s.chiefComplaint || '',
      history: s.history || '',

      bp, hr, temp, spo2, weight, height, bmi,
      examSummary: e.examSummary || '',

      diagnosisMain: d.primaryText || '',
      diagnosisCodeSystem: d.codeSystem || '',
      diagnosisCode: d.code || '',
      certainty, severity,
      differentials: d.differentials || '',

      planText: plan.planText || '',
      redFlags: plan.redFlags,
      informed: plan.informed,
    };
  }

  close() {
    void this.modalCtrl.dismiss();
  }
}
