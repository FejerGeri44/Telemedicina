import {Component, Input, Inject, Renderer2} from '@angular/core';
import {LoadingController, ModalController} from '@ionic/angular';
import {NgForOf, NgOptimizedImage, DOCUMENT} from '@angular/common';
import {formatPhoneNumber, formatTaj, formatTimestamp} from '../../../../../../utils/formatProfileData';
import {MyDiagnosis} from '../../../../../../utils/interfaces/diagnosis.interface';
import {DoctorItem} from '../../../../../../utils/interfaces/doctor.interface';
import {
  DoctorProfileCardComponent
} from '../../../../../doctor/components/doctor-profile-card/doctor-profile-card.component';
import {ToastService} from '../../../../../../shared/toast/toast.service';
import {
  DiagnosisSummaryModalComponent
} from '../../../../components/diagnosis-summary-modal/diagnosis-summary-modal.component';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {IONIC_COMPONENTS} from '../../../../../../shared/ionic-imports';

interface SummaryVM {
  patientName: string; taj: string; phone: string; email: string; appointmentTime: string; diagnosisDate: string;
  onsetDate: string; chiefComplaint: string; history: string;
  bp: string; hr: string; temp: string; spo2: string; weight: string; height: string; bmi: string; examSummary: string;
  diagnosisMain: string; diagnosisCodeSystem: string; diagnosisCode: string; certainty: string; severity: string; differentials: string;
  planText: string; redFlags: boolean; informed: boolean;
}

@Component({
  selector: 'app-diagnoses-table',
  imports: [
    ...IONIC_COMPONENTS,
    NgForOf,
    NgOptimizedImage
  ],
  templateUrl: './diagnoses-table.component.html',
  standalone: true,
  styleUrl: './diagnoses-table.component.scss'
})
export class DiagnosesTableComponent {
  @Input({ required: true }) myDiagnoses!: MyDiagnosis[];

  isLoading = true;
  protected readonly formatPhoneNumber = formatPhoneNumber;
  vm!: SummaryVM | any;

  constructor(
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private toast: ToastService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  async openDoctorProfileModal(doctor: DoctorItem) {
    const modal = await this.modalCtrl.create({
      component: DoctorProfileCardComponent as any,
      componentProps: {
        user: doctor,
        editable: false,
        canRate: true
      },
      cssClass: 'profile-view-modal'
    });

    await modal.present();
    await modal.onDidDismiss();
  }

  async openSummary(diagnosis: MyDiagnosis) {
    const modal = await this.modalCtrl.create({
      component: DiagnosisSummaryModalComponent as any,
      componentProps: { diagnosis },
      cssClass: 'diagnosis-summary-modal'
    });
    await modal.present();
  }

  buildSummaryVM(diagnosis: MyDiagnosis) {
    const p = diagnosis.patient_data;
    const s = { chiefComplaint: diagnosis.chief_complaint, onsetDate: diagnosis.onset_date, history: diagnosis.history };
    const e = { bpSys: diagnosis.bp_sys, bpDia: diagnosis.bp_dia, heartRate: diagnosis.heart_rate, tempC: diagnosis.temp_c, spo2: diagnosis.spo2, weightKg: diagnosis.weight_kg, heightCm: diagnosis.height_cm, bmi: diagnosis.bmi, examSummary: diagnosis.exam_summary };
    const d = { primaryText: diagnosis.primary_text, codeSystem: diagnosis.code_system, code: diagnosis.code, certaintyPct: diagnosis.certainty_pct, severity: diagnosis.severity, differentials: diagnosis.differentials };
    const plan = { assessment: diagnosis.assessment, planText: diagnosis.plan_text, redFlags: diagnosis.red_flags, informed: diagnosis.informed };

    const taj = (typeof formatTaj !== 'undefined' && p.patient.taj) ? formatTaj(p.patient.taj) : p.patient.taj || '';
    const phone = (typeof formatPhoneNumber !== 'undefined' && p.user.phoneNumber) ? formatPhoneNumber(p.user.phoneNumber) : p.user.phoneNumber || '';

    const bp = (e.bpSys && e.bpDia) ? `${e.bpSys}/${e.bpDia} mmHg` : '';
    const hr = e.heartRate ? `${e.heartRate} bpm` : '';
    const temp = e.tempC ? `${e.tempC} °C` : '';
    const spo2 = e.spo2 ? `${e.spo2}%` : '';
    const weight = e.weightKg ? `${e.weightKg} kg` : '';
    const height = e.heightCm ? `${e.heightCm} cm` : '';
    const bmi = e.bmi ? `${e.bmi}` : '';

    const certainty = d.certaintyPct ? `${d.certaintyPct}%` : '';
    const severity = d.severity === 'mild' ? 'Enyhe'
      : d.severity === 'moderate' ? 'Középsúlyos'
        : d.severity === 'severe' ? 'Súlyos' : '';

    this.vm = {
      patientName: p.user.name || '—',
      taj,
      phone,
      email: p.user.email || '—',
      appointmentTime: formatTimestamp(diagnosis.diagnosis_date),

      diagnosisDate: formatTimestamp(diagnosis.diagnosis_date),

      onsetDate: s.onsetDate ? new Date(s.onsetDate).toLocaleDateString('hu-HU') : '—',
      chiefComplaint: s.chiefComplaint || '—',
      history: s.history || '—',

      bp: bp || '—',
      hr: hr || '—',
      temp: temp || '—',
      spo2: spo2 || '—',
      weight: weight || '—',
      height: height || '—',
      bmi: bmi || '—',
      examSummary: e.examSummary || '—',

      diagnosisMain: d.primaryText || '—',
      diagnosisCodeSystem: d.codeSystem || '—',
      diagnosisCode: d.code || '—',
      certainty: certainty || '—',
      severity: severity || '—',
      differentials: d.differentials || '—',

      planText: plan.planText || '—',
      redFlags: plan.redFlags,
      informed: plan.informed,
    };
  }

  private generatePdfHtml(vm: SummaryVM): string {
    return `
      <div style="padding: 20px; font-family: Arial, sans-serif; width: 210mm; box-sizing: border-box; background: white;">
        <h1 style="border-bottom: 2px solid #ccc; padding-bottom: 10px; font-size: 18px;">Diagnózis Összefoglaló</h1>
        <h3 style="color: #555; font-size: 14px;">Dátum: ${vm.diagnosisDate || '—'}</h3>

        <div style="margin-top: 20px;">
          <h4 style="background: #f4f4f4; padding: 10px; border-radius: 4px; font-size: 14px;">Páciens és időpont</h4>
          <div style="margin-top: 10px;">
            <p style="margin: 5px 0; font-size: 12px;"><strong>Páciens:</strong> <span style="display: block; margin-left: 10px;">${vm.patientName}</span></p>
            <p style="margin: 5px 0; font-size: 12px;"><strong>TAJ:</strong> <span style="display: block; margin-left: 10px;">${vm.taj}</span></p>
            <p style="margin: 5px 0; font-size: 12px;"><strong>Időpont:</strong> <span style="display: block; margin-left: 10px;">${vm.appointmentTime}</span></p>
            <p style="margin: 5px 0; font-size: 12px;"><strong>Telefon:</strong> <span style="display: block; margin-left: 10px;">${vm.phone}</span></p>
            <p style="margin: 5px 0; font-size: 12px;"><strong>E-mail:</strong> <span style="display: block; margin-left: 10px;">${vm.email}</span></p>
          </div>
        </div>

        <div style="margin-top: 20px;">
          <h4 style="background: #f4f4f4; padding: 10px; border-radius: 4px; font-size: 14px;">Tünetek</h4>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Kezdet dátuma:</strong> <span style="display: block; margin-left: 10px;">${vm.onsetDate}</span></p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Fő panasz:</strong> <span style="display: block; margin-left: 10px; white-space: normal; overflow-wrap: break-word;">${vm.chiefComplaint}</span></p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Releváns anamnézis:</strong> <span style="display: margin-left: 10px; block; white-space: normal; overflow-wrap: break-word;">${vm.history}</span></p>
        </div>

        <div style="margin-top: 20px;">
          <h4 style="background: #f4f4f4; padding: 10px; border-radius: 4px; font-size: 14px;">Objektív lelet összefoglaló</h4>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Vizsgálat összefoglaló:</strong> <span style="display: block; margin-left: 10px; white-space: normal; overflow-wrap: break-word;">${vm.examSummary}</span></p>
        </div>

        <div style="margin-top: 20px;">
          <h4 style="background: #f4f4f4; padding: 10px; border-radius: 4px; font-size: 14px;">Diagnózis</h4>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Fő diagnózis:</strong> <span style="display: block; margin-left: 10px; white-space: normal; overflow-wrap: break-word;">${vm.diagnosisMain}</span></p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Kódrendszer:</strong> <span style="display: block; margin-left: 10px;">${vm.diagnosisCodeSystem}</span></p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Kód:</strong> <span style="display: block; margin-left: 10px;">${vm.diagnosisCode}</span></p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Bizonyosság:</strong> <span style="display: block; margin-left: 10px;">${vm.certainty}</span></p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Súlyosság:</strong> <span style="display: block; margin-left: 10px;">${vm.severity}</span></p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Differenciáldiagnózis(ok):</strong> <span style="display: block; margin-left: 10px; white-space: normal; overflow-wrap: break-word;">${vm.differentials}</span></p>
        </div>

        <div style="margin-top: 20px;">
          <h4 style="background: #f4f4f4; padding: 10px; border-radius: 4px; font-size: 14px;">Terápia / utasítások</h4>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Utasítások:</strong> <span style="display: block; margin-left: 10px; white-space: normal; overflow-wrap: break-word;">${vm.planText}</span></p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Vörös zászlók megbeszélve:</strong> <span style="display: block; margin-left: 10px;">${vm.redFlags ? 'Igen' : 'Nem'}</span></p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Beteg tájékoztatása megtörtént:</strong> <span style="display: block; margin-left: 10px;">${vm.informed ? 'Igen' : 'Nem'}</span></p>
        </div>
      </div>
    `;
  }

  async downloadPdf(diagnosis: MyDiagnosis) {
    this.buildSummaryVM(diagnosis);
    const htmlContent = this.generatePdfHtml(this.vm);

    const tempElement = this.renderer.createElement('div');

    this.renderer.setStyle(tempElement, 'width', '210mm');
    this.renderer.setStyle(tempElement, 'position', 'absolute');
    this.renderer.setStyle(tempElement, 'top', '-9999px');
    this.renderer.setProperty(tempElement, 'innerHTML', htmlContent);

    this.renderer.appendChild(this.document.body, tempElement);

    const loading = await this.loadingCtrl.create({
      message: 'Diagnózis letöltése PDF-ként...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const canvas = await html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `Diagnózis_${this.vm.patientName}_${diagnosis.diagnosis_date}.pdf`;
      pdf.save(filename);
      this.toast.show('A PDF sikeresen letöltve.', 'success');

    } catch (error) {
      console.error('PDF generálási hiba:', error);
      this.toast.show('Hiba történt a PDF generálása során.', 'danger');
    } finally {
      this.renderer.removeChild(this.document.body, tempElement);
      await loading.dismiss();
    }
  }

  protected readonly formatTimestamp = formatTimestamp;
}
