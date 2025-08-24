import {Component, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {DoctorNavbarComponent} from '../../components/doctor-navbar/doctor-navbar.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {DatePipe, NgForOf, NgIf, NgSwitch, NgSwitchCase} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';

@Component({
  selector: 'app-new-diagnosis',
  imports: [
    IonicModule,
    DoctorNavbarComponent,
    ReactiveFormsModule,
    NgIf,
    NgForOf,
    NgSwitchCase,
    NgSwitch,
    DatePipe,
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
  appointments: any[] = [];
  users: any = {};
  isLoadingUsers = false;
  selectedAppointmentId: any = null;
  locale = 'hu-HU';
  selectedDate: string = new Date().toISOString().split('T')[0];
  showExam = false;
  vm: any = {};

  draft: any = {
    appointmentId: null,
    patientId: null,
    status: 'draft',
    patient: {
      name: '',
      gender: '',
      phone: '',
      homePhone: '',
      email: '',
      address: '',
      taj: ''
    },
    // 1) Tünetek
    symptoms: {
      chiefComplaint: '',
      onsetDate: '',
      history: ''
    },
    // 2) Vizsgálat
    exam: {
      bpSys: null,
      bpDia: null,
      heartRate: null,
      tempC: null,
      spo2: null,
      weightKg: null,
      heightCm: null,
      bmi: null,
      summary: ''
    },
    // 3) Diagnózis
    diagnosis: {
      primaryText: '',
      codeSystem: 'ICD-10',
      code: '',
      certaintyPct: 50,
      severity: 'moderate',
      differentials: ''
    },
    // 4) Terv / Összegzés
    plan: {
      planText: '',
      redFlags: false,
      informed: false
    }
  };

  constructor(private http: HttpClient, private toast: ToastService) {}

  ngOnInit() {
    this.loadAppointments();
    this.buildSummaryVM();
  }

  ionViewDidEnter() {
    this.buildSummaryVM();
  }

  loadAppointments() {
    const token = localStorage.getItem('token');
    this.http.get<any[]>('http://localhost:3000/api/myAppointments', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (appointments) => {
        this.appointments = appointments;
        this.loadUsersForDiagnosis(this.appointments);
      },
      error: (err) => console.error('❌ Hiba az időpontok lekérésekor:', err)
    });
  }

  loadUsersForDiagnosis(appointments?: any[]) {
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
      this.users = {};
      return;
    }

    this.isLoadingUsers = true;

    this.http.post<any>(
      'http://localhost:3000/api/getUserDataForDiagnosis',
      { patientIds },
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: (users: any) => {
        this.users = users;
        this.isLoadingUsers = false;
        console.log(this.users)
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

  getUserNameByPatientId(pid: any): string {
    return this.users?.[String(pid)]?.user?.name;
  }

  formatTime(iso: any): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  formatPhoneNumber(phone?: string): string {
    if (!phone || phone.length !== 11 || !phone.startsWith('06')) return phone ?? '';
    return `${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }

  formatTaj(taj?: string | number): string {
    if (!taj) return 'N/A';
    const clean = String(taj).replace(/\D/g, '');
    return clean.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  }

  recomputeBmi() {
    const w = Number(this.draft?.exam?.weightKg);
    const hCm = Number(this.draft?.exam?.heightCm);
    if (w > 0 && hCm > 0) {
      const hM = hCm / 100;
      this.draft.exam.bmi = +(w / (hM * hM)).toFixed(1);
    } else {
      this.draft.exam.bmi = undefined;
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

  onSelectAppointment(id: any) {
    this.selectedAppointmentId = id;

    const appt = (this.appointments || []).find(a => a?.id === id);
    if (!appt) return;

    const key = String(appt.patient_id);
    const u = this.users?.[key]?.user || null;
    const p = this.users?.[key]?.patient || null;

    this.draft.appointmentId = appt.id;
    this.draft.patientId = appt.patient_id;
    this.draft.patient.name = u?.name || '';
    this.draft.patient.email = u?.email || '';
    this.draft.patient.phone = u?.phoneNumber || '';
    this.draft.patient.address = u?.address || '';
    this.draft.patient.gender = p?.gender || '';
    this.draft.patient.homePhone = p?.homePhone || '';
    this.draft.patient.taj = p?.taj || '';
  }

  buildSummaryVM() {
    const p = this.draft?.patient || {};
    const s = this.draft?.symptoms || {};
    const e = this.draft?.exam || {};
    const d = this.draft?.diagnosis || {};
    const plan = this.draft?.plan || {};

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

    const certainty = (typeof d.certaintyPct === 'number') ? `${d.certaintyPct}%` : '';
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
      examSummary: e.summary || '',

      // Diagnózis
      diagnosisMain: d.primaryText || '',
      diagnosisCodeSystem: d.codeSystem || '',
      diagnosisCode: d.code || '',
      certainty, severity,
      differentials: d.differentials || '',

      // Plan
      planText: plan.planText || '',
      redFlags: !!plan.redFlags,
      informed: !!plan.informed,
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

  save() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // robusztus patientId felderítés
    const appt = (this.appointments || []).find(a => a.id === this.draft.appointmentId);
    const patientId =
      this.draft?.patient?.id ??
      appt?.patient_id ?? null;

    if (!patientId) {
      console.error('Hiányzik a patientId a mentéshez');
      return;
    }

    const payload = {
      appointmentId: this.draft.appointmentId,
      patientId,
      diagnosis: this.draft.diagnosis,
      plan: this.draft.plan,
      exam: this.draft.exam,
      symptoms: this.draft.symptoms,
    };

    this.http.post('http://localhost:3000/api/newDiagnosis', payload, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        console.log('✅ Diagnózis mentve:', res);
        // TODO: siker toast + esetleg navigáció
      },
      error: (err) => {
        console.error('❌ Hiba diagnózis mentésekor:', err);
        // TODO: error toast
      }
    });
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
}
