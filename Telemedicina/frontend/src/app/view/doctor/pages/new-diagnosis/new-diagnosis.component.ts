import {Component, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {NgForOf, NgIf, NgSwitch, NgSwitchCase} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {Appointment, Draft, PatientItem} from '../../../../utils/interfaces/commonInterfaces';
import {formatPhoneNumber, formatTaj} from '../../../../utils/formatProfileData';

@Component({
  selector: 'app-new-diagnosis',
  imports: [
    IonicModule,
    ReactiveFormsModule,
    NgIf,
    NgForOf,
    NgSwitchCase,
    NgSwitch,
    FormsModule
  ],
  templateUrl: './new-diagnosis.component.html',
  standalone: true,
  styleUrl: './new-diagnosis.component.css'
})

export class NewDiagnosisComponent implements OnInit{
  steps = [
    { key: 'ids',           label: 'Alapok',            icon: 'person' },
    { key: 'exam',          label: 'Vizsgálat',         icon: 'medkit' },
    { key: 'diagnosis',     label: 'Diagnózis',         icon: 'document-text' },
    { key: 'plan',          label: 'Összegzés',         icon: 'checkmark-circle' },
  ];
  currentStep = 0;
  appointments: Appointment[] = [];
  patients!: PatientItem[];
  isLoadingUsers = false;
  selectedAppointmentId: any = null;
  locale = 'hu-HU';
  selectedDate: string = new Date().toISOString().split('T')[0];
  showExam = false;
  vm: any = {};

  draft: Draft = {
    appointmentId: null,
    patientId: null,
    status: 'draft',
    patient: {
      id: null,
      name: '',
      gender: '',
      phone: '',
      homePhone: '',
      email: '',
      address: '',
      taj: ''
    },
    symptoms: {
      chiefComplaint: '',
      onsetDate: '',
      history: null
    },
    exam: {
      bpSys: null,
      bpDia: null,
      heartRate: null,
      tempC: null,
      spo2: null,
      weightKg: null,
      heightCm: null,
      bmi: null,
      examSummary: null
    },
    diagnosis: {
      primaryText: '',
      codeSystem: 'ICD-10',
      code: null,
      certaintyPct: 50,
      severity: 'moderate',
      differentials: null
    },
    plan: {
      assessment: null,
      planText: null,
      redFlags: false,
      informed: false
    }
  };

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private alert: AlertService
  ) {}

  ngOnInit() {
    this.loadAppointments();
    this.buildSummaryVM();
  }

  loadAppointments() {
    const token = localStorage.getItem('token');
    this.http.get<any[]>('http://localhost:3000/api/myAppointments', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (appointments) => {
        const today = new Date().toISOString().split('T')[0];

        this.appointments = appointments.filter(appt => {
          const apptDate = new Date(appt.from).toISOString().split('T')[0];
          return apptDate === today && appt.status !== 'done';
        });

        this.loadUsersForDiagnosis(this.appointments);
      },
      error: (err) => console.error('❌ Hiba az időpontok lekérésekor:', err)
    });
  }

  loadUsersForDiagnosis(appointments: Appointment[]) {
    const token = localStorage.getItem('token');
    if (!token) return;

    const list = appointments ?? this.appointments ?? [];

    const patientIds = Array.from(
      new Set(
        (list || [])
          .map(a => a?.patient_id)
          .filter((id: any) => id !== null && id !== undefined)
          .map((id: any) => Number(id))
          .filter((id: number) => Number.isFinite(id))
      )
    );

    if (patientIds.length === 0) {
      this.patients = [];
      return;
    }

    this.isLoadingUsers = true;

    this.http.post<PatientItem[]>(
      'http://localhost:3000/api/getUserDataForDiagnosis',
      { patientIds },
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: (users: any) => {
        this.patients = users;
        this.isLoadingUsers = false;
      },
      error: (err) => {
        console.error('❌ Hiba a beteg/ user adatok lekérésekor:', err);
        this.isLoadingUsers = false;
      }
    });
  }

  get slideTransform(): string {
    return `translateX(-${this.currentStep * 100}%)`;
  }

  private patientsList(): PatientItem[] {
    return Array.isArray(this.patients) ? this.patients : Object.values(this.patients ?? {});
  }

  getUserNameByPatientId(uid: number): string {
    const id = Number(uid);
    if (!Number.isFinite(id)) return '';
    return this.patientsList().find(it => it?.user?.id === id)?.user?.name ?? '';
  }

  formatTime(iso: any): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  recomputeBmi() {
    const w = Number(this.draft?.exam?.weightKg);
    const hCm = Number(this.draft?.exam?.heightCm);
    if (w > 0 && hCm > 0) {
      const hM = hCm / 100;
      this.draft.exam.bmi = +(w / (hM * hM)).toFixed(1);
    } else {
      this.draft.exam.bmi = null;
    }
  }

  onDateChange(event: any): void {
    const value = event.detail?.value;
    if (!value) {
      console.error('Nincs dátum érték.');
      return;
    }

    this.selectedDate = value.split('T')[0];
  }

  onSelectAppointment(id: number | string): void {
    const selId = Number(id);
    this.selectedAppointmentId = selId;

    const appt = (this.appointments ?? []).find(a => Number(a?.id) === selId);
    if (!appt) return;

    const item = this.patientsList()
      .find(it => Number(it?.patient?.id) === Number(appt.patient_id));

    const u = item?.user;
    const p = item?.patient;

    this.draft.appointmentId      = appt.id ?? null;
    this.draft.patientId          = appt.patient_id ?? null;
    this.draft.patient.name       = u?.name ?? '';
    this.draft.patient.email      = u?.email ?? '';
    this.draft.patient.phone      = u?.phoneNumber ?? '';
    this.draft.patient.address    = u?.address ?? '';
    this.draft.patient.gender     = String(p?.gender ?? '');
    this.draft.patient.homePhone  = p?.homePhone ?? '';
    this.draft.patient.taj        = p?.taj ?? '';
  }

  buildSummaryVM() {
    const p = this.draft.patient
    const s = this.draft.symptoms;
    const e = this.draft.exam;
    const d = this.draft.diagnosis;
    const plan = this.draft.plan;

    const appt = (this.appointments || []).find(a => a.id === this.selectedAppointmentId);

    // helper formázók (ha már vannak ilyenjeid, használd azokat)
    const taj = this.formatTaj ? this.formatTaj(p.taj) : (p.taj || '');
    const phone = this.formatPhoneNumber ? this.formatPhoneNumber(p.phone) : (p.phone || '');
    const apptTime = appt ? this.formatTime(appt.from) : '';

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
      // Páciens
      patientName: p.name || '',
      taj,
      phone,
      email: p.email || '',
      appointmentTime: apptTime,

      // Tünetek
      onsetDate: s.onsetDate ? new Date(s.onsetDate).toLocaleDateString('hu-HU') : '',
      chiefComplaint: s.chiefComplaint || '',
      history: s.history || '',

      // Vitálok
      bp, hr, temp, spo2, weight, height, bmi,
      examSummary: e.examSummary || '',

      // Diagnózis
      diagnosisMain: d.primaryText || '',
      diagnosisCodeSystem: d.codeSystem || '',
      diagnosisCode: d.code || '',
      certainty, severity,
      differentials: d.differentials || '',

      // Plan
      planText: plan.planText || '',
      redFlags: plan.redFlags,
      informed: plan.informed,
    };
  }

  trackByAppointmentId = (_: number, a: any) => a?.id;

  get progressValue(): number {
    return this.steps.length > 1 ? this.currentStep / (this.steps.length - 1) : 0;
  }
  goTo(value: string | number | null | undefined) {
    const idx = Number(value ?? 0);
    if (Number.isFinite(idx) && idx >= 0 && idx < this.steps.length) {
      this.currentStep = idx;
    }
  }
  next() {
    if (this.currentStep < this.steps.length - 1) this.currentStep++;
    this.buildSummaryVM();
  }
  back() {
    if (this.currentStep > 0) this.currentStep--;
    this.buildSummaryVM();
  }

  confirmSave() {
    void this.alert.show(
      'Diagnózis mentése',
      'Biztosan el akarod menteni a diagnózist?',
      () => this.save()
    )
  }

  save() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const appt = (this.appointments || []).find(a => a.id === this.draft.appointmentId);

    if (!appt?.patient_id) {
      console.error('Hiányzik a patientId a mentéshez');
      return;
    }

    const chiefComplaint = this.draft?.symptoms?.chiefComplaint?.trim();
    const primaryText    = this.draft?.diagnosis?.primaryText?.trim();

    const body = {
      patient: appt?.patient_id,
      appointmentId: this.selectedAppointmentId,

      symptoms: {
        chiefComplaint: chiefComplaint,
        onsetDate: this.draft?.symptoms?.onsetDate ?? null,
        history: this.draft?.symptoms?.history ?? null
      },

      exam: {
        bpSys: this.draft?.exam?.bpSys ?? null,
        bpDia: this.draft?.exam?.bpDia ?? null,
        heartRate: this.draft?.exam?.heartRate ?? null,
        tempC: this.draft?.exam?.tempC ?? null,
        spo2: this.draft?.exam?.spo2 ?? null,
        weightKg: this.draft?.exam?.weightKg ?? null,
        heightCm: this.draft?.exam?.heightCm ?? null,
        bmi: this.draft?.exam?.bmi ?? null,
        summary: this.draft?.exam?.examSummary ?? null
      },

      diagnosis: {
        primaryText: primaryText,
        codeSystem: this.draft?.diagnosis?.codeSystem ?? null,
        code: this.draft?.diagnosis?.code ?? null,
        certaintyPct: this.draft?.diagnosis?.certaintyPct ?? null,
        severity: this.draft?.diagnosis?.severity ?? null,
        differentials: this.draft?.diagnosis?.differentials ?? null
      },

      plan: {
        assessment: this.draft?.plan?.assessment ?? null,
        planText: this.draft?.plan?.planText ?? null,
        redFlags: !!this.draft?.plan?.redFlags,
        informed: !!this.draft?.plan?.informed
      }
    };

    this.http.post('http://localhost:3000/api/newDiagnosis', body, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.toast.show("Sikeres adat felvitel!", "success");
        setTimeout(() => this.reset(), 100);
        },
      error: (err) => {
        console.error('❌ Hiba diagnózis mentésekor:', err);
        this.toast.show("Sikertelen adat felvitel!", "danger");
      }
    });
  }

  reset() {
    this.draft = {
      appointmentId: null,
      patientId: null,
      status: 'draft',
      patient: {
        id: null,
        name: '',
        gender: '',
        phone: '',
        homePhone: '',
        email: '',
        address: '',
        taj: ''
      },
      symptoms: {
        chiefComplaint: '',
        onsetDate: null,
        history: null
      },
      exam: {
        bpSys: null,
        bpDia: null,
        heartRate: null,
        tempC: null,
        spo2: null,
        weightKg: null,
        heightCm: null,
        bmi: null,
        examSummary: null
      },
      diagnosis: {
        primaryText: '',
        codeSystem: 'ICD-10',
        code: null,
        certaintyPct: 50,
        severity: 'moderate',
        differentials: null
      },
      plan: {
        assessment: null,
        planText: null,
        redFlags: false,
        informed: false
      }
    };
    this.goTo(0);
  }

  public isFormValid(): boolean {
    const d = this.draft;

    return !!(
      d?.appointmentId &&
      (d?.patient?.id || (d?.patient?.name && d?.patient?.taj)) &&
      d?.symptoms?.chiefComplaint && d?.symptoms?.chiefComplaint.trim() &&
      d?.diagnosis?.primaryText && d?.diagnosis?.primaryText.trim() &&
      (typeof d?.plan?.informed === 'boolean') &&
      (typeof d?.plan?.redFlags === 'boolean')
    );
  }

  printSummary() {
    const src = document.getElementById('summaryPrint');
    if (!src) return;

    const overlay = document.createElement('div');
    overlay.id = 'printOverlay';
    overlay.innerHTML = src.outerHTML;

    overlay.querySelectorAll('.summary-actions, .card-footer, ion-button').forEach(el => el.remove());

    document.body.classList.add('overlay-print');
    document.body.appendChild(overlay);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('overlay-print');
        overlay.remove();
      }, 0);
    }, 0);
  }

  protected readonly String = String;
  protected readonly formatPhoneNumber = formatPhoneNumber;
  protected readonly formatTaj = formatTaj;
}
