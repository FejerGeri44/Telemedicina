import {Component, OnInit} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {NgForOf, NgIf, NgSwitch, NgSwitchCase} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {ToastService} from '../../../../shared/toast/toast.service';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {formatPhoneNumber, formatTaj, formatTimestamp} from '../../../../utils/formatProfileData';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {Appointment} from '../../../../utils/interfaces/appointment.inteface';
import {environment} from '../../../../../../enviroment';
import {delay, filter, firstValueFrom, Observable, take} from 'rxjs';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {UserService} from '../../../../services/user/user.service';
import {Diagnosis} from '../../../../utils/interfaces/diagnosis.interface';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';

@Component({
  selector: 'app-new-diagnosis',
  imports: [
    ...IONIC_COMPONENTS,
    ReactiveFormsModule,
    NgIf,
    NgForOf,
    NgSwitchCase,
    NgSwitch,
    FormsModule
  ],
  templateUrl: './new-diagnosis.component.html',
  standalone: true,
  styleUrl: './new-diagnosis.component.scss'
})

export class NewDiagnosisComponent implements OnInit{
  user!: Observable<DoctorItem | null>;
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
  isLoading = true;

  draft: Diagnosis = {
    appointmentId: null,
    patientId: null,
    status: 'draft',
    diagnosis_date: '',
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
    chief_complaint: '',
    onset_date: '',
    history: null,
    bp_sys: null,
    bp_dia: null,
    heart_rate: null,
    temp_c: null,
    spo2: null,
    weight_kg: null,
    height_cm: null,
    bmi: null,
    exam_summary: null,
    primary_text: '',
    code_system: 'ICD-10',
    code: null,
    certainty_pct: 50,
    severity: 'moderate',
    differentials: null,
    assessment: null,
    plan_text: null,
    red_flags: false,
    informed: false
  };

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private toast: ToastService,
    private alert: AlertService
  ) {
    this.user = this.userService.doctor$();

    (async () => {
      const userValue = await firstValueFrom(
        this.userService.doctor$().pipe(
          filter((u): u is DoctorItem => !!u),
          take(1),
          delay(50)
        )
      );

      await this.loadAppointments();
    })();
  }

  ngOnInit() {
    this.buildSummaryVM();
  }

  private async getDoctorId(): Promise<number | null> {
    const user = await firstValueFrom(this.user);
    return user?.doctor.id ?? null;
  }

  async loadAppointments(): Promise<Appointment[] | null> {
    const doctorId = await this.getDoctorId();
    if (!doctorId) {
      this.toast.show('Hiányzik az orvos azonosító.', 'danger');
      return null;
    }

    return new Promise<Appointment[] | null>((resolve) => {
      this.http.post<Appointment[]>(
        `${environment.apiUrl}/doctor/getMyAppointments`,
        { id: doctorId  },
        { withCredentials: true }
      ).subscribe({
        next: async (appointments) => {
          this.appointments = this.filterTodayUpcomingAppointments(appointments);
          await this.loadUsersForDiagnosis(appointments);
          resolve(appointments);
        },
        error: (err) => {
          console.error('❌ Hiba az időpontok lekérésekor:', err);
          this.toast.show('Nem sikerült betölteni az időpontokat.', 'danger');
          resolve(null);
        }
      });
    });
  }

  async loadUsersForDiagnosis(appointments: Appointment[]): Promise<PatientItem[] | null> {
    const doctorId = await this.getDoctorId();
    if (!doctorId) {
      this.toast.show('Hiányzik az orvos azonosító.', 'danger');
      return null;
    }

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
      return [];
    }

    this.isLoadingUsers = true;

    return new Promise<PatientItem[] | null>((resolve) => {
      this.http.post<PatientItem[]>(
        `${environment.apiUrl}/doctor/getUserDataForDiagnosis`,
        { patientIds },
        { withCredentials: true }
      ).subscribe({
        next: (users) => {
          this.patients = users;
          this.isLoadingUsers = false;
          resolve(users);
        },
        error: (err) => {
          console.error('❌ Hiba a beteg/ user adatok lekérésekor:', err);
          this.isLoadingUsers = false;
          resolve(null);
        }
      });
    });
  }

  private pad(n: number) { return String(n).padStart(2, '0'); }

  private localDateKey(d: Date): string {
    return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
  }

  private parseApptStart(appt: Appointment): Date | null {
    try {
      return appt?.starts_at ? new Date(appt.starts_at) : null;
    } catch {
      return null;
    }
  }

  private filterTodayUpcomingAppointments(list: Appointment[]): Appointment[] {
    const now = new Date();
    const todayKey = this.localDateKey(now);

    return (list || [])
      .filter(a => a?.patient_id !== null && a?.patient_id !== undefined)
      .filter(a => Number.isFinite(Number(a.patient_id)))
      .filter(a => String(a?.status ?? '').toLowerCase().trim() !== 'done')
      .map(a => ({ a, start: this.parseApptStart(a) }))
      .filter(x => x.start instanceof Date && !isNaN(x.start.getTime()))
      .filter(x => this.localDateKey(x.start!) === todayKey)
      .filter(x => x.start! > now)
      .sort((x, y) => x.start!.getTime() - y.start!.getTime())
      .map(x => x.a);
  }

  get slideTransform(): string {
    return `translateX(-${this.currentStep * 100}%)`;
  }

  private patientsList(): PatientItem[] {
    return Array.isArray(this.patients) ? this.patients : Object.values(this.patients ?? {});
  }

    getUserNameByPatientId(patient_id: number | null): string {
    const id = Number(patient_id);
    if (!Number.isFinite(id)) return '';

    const item = this.patientsList()
      .find(it => Number(it?.patient?.id) === id);

    return item?.user?.name ?? '';
  }

  formatTime(iso: any): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  recomputeBmi() {
    const w = Number(this.draft?.weight_kg);
    const hCm = Number(this.draft?.height_cm);
    if (w > 0 && hCm > 0) {
      const hM = hCm / 100;
      this.draft.bmi = +(w / (hM * hM)).toFixed(1);
    } else {
      this.draft.bmi = null;
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

    const item = this.patientsList().find(it => String(it?.patient?.id) === String(appt.patient_id));
    const u = item?.user;
    const p = item?.patient;

    this.draft.appointmentId = appt.id ?? null;
    this.draft.patientId     = appt.patient_id ?? null;

    this.draft.patient.id    = appt.patient_id ?? null;
    this.draft.patient.taj   = p?.taj ?? '';

    this.draft.patient.name      = u?.name ?? '';
    this.draft.patient.email     = u?.email ?? '';
    this.draft.patient.phone     = u?.phoneNumber ?? '';
    this.draft.patient.address   = u?.address ?? '';
    this.draft.patient.gender    = String(p?.gender ?? '');
    this.draft.patient.homePhone = p?.homePhone ?? '';
  }

  buildSummaryVM() {
    const p = this.draft.patient
    const s = { chiefComplaint: this.draft.chief_complaint, onsetDate: this.draft.onset_date, history: this.draft.history };
    const e = { bpSys: this.draft.bp_sys, bpDia: this.draft.bp_dia, heartRate: this.draft.heart_rate, tempC: this.draft.temp_c, spo2: this.draft.spo2, weightKg: this.draft.weight_kg, heightCm: this.draft.height_cm, bmi: this.draft.bmi, examSummary: this.draft.exam_summary };
    const d = { primaryText: this.draft.primary_text, codeSystem: this.draft.code_system, code: this.draft.code, certaintyPct: this.draft.certainty_pct, severity: this.draft.severity, differentials: this.draft.differentials };
    const plan = { assessment: this.draft.assessment, planText: this.draft.plan_text, redFlags: this.draft.red_flags, informed: this.draft.informed };

    const appt = (this.appointments || []).find(a => a.id === this.selectedAppointmentId);

    const taj = this.formatTaj ? this.formatTaj(p.taj) : (p.taj || '');
    const phone = this.formatPhoneNumber ? this.formatPhoneNumber(p.phone) : (p.phone || '');
    const apptTime = appt ? this.formatTime(appt.starts_at) : '';

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
      patientName: p.name || '',
      taj,
      phone,
      email: p.email || '',
      appointmentTime: apptTime,

      diagnosisDate: formatTimestamp(this.draft.diagnosis_date),

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

  async save(): Promise<void> {
    this.isLoading = true;

    const doctorId = await this.getDoctorId();
    if (!doctorId) {
      this.toast.show('Hiányzik az orvos azonosító.', 'danger');
      this.isLoading = false;
      return;
    }

    const appt = (this.appointments || []).find(a => a.id === this.draft.appointmentId);
    if (!appt?.patient_id) {
      this.toast.show('Hiányzik a beteg (patient_id) az időponthoz.', 'danger');
      this.isLoading = false;
      return;
    }

    const chiefComplaint= this.draft?.chief_complaint?.trim() || '';
    const primaryText= this.draft?.primary_text?.trim() || '';
    const onsetDate= this.draft?.onset_date?.trim() || '';

    const redFlags= this.draft?.red_flags;
    const informed= this.draft?.informed;

    if (!chiefComplaint || !primaryText || !onsetDate) {
      this.toast.show('Kérlek tölts ki minden kötelező mezőt!', 'warning');
      this.isLoading = false;
      return;
    }

    if (!redFlags || !informed) {
      this.toast.show('Kérlek pipáld ki a kötelező elemeket!', 'warning');
      this.isLoading = false;
      return;
    }

    const body = {
      patient: appt.patient_id,
      appointmentId: this.draft.appointmentId,
      symptoms: {
        chiefComplaint,
        onsetDate: this.draft?.onset_date ?? null,
        history:   this.draft?.history ?? null
      },
      exam: {
        bpSys:     this.draft?.bp_sys ?? null,
        bpDia:     this.draft?.bp_dia ?? null,
        heartRate: this.draft?.heart_rate ?? null,
        tempC:     this.draft?.temp_c ?? null,
        spo2:      this.draft?.spo2 ?? null,
        weightKg:  this.draft?.weight_kg ?? null,
        heightCm:  this.draft?.height_cm ?? null,
        bmi:       this.draft?.bmi ?? null,
        summary:   this.draft?.exam_summary ?? null
      },
      diagnosis: {
        primaryText,
        codeSystem:    this.draft?.code_system ?? null,
        code:          this.draft?.code ?? null,
        certaintyPct:  this.draft?.certainty_pct ?? null,
        severity:      this.draft?.severity ?? null,
        differentials: this.draft?.differentials ?? null
      },
      plan: {
        assessment: this.draft?.assessment ?? null,
        planText:   this.draft?.plan_text ?? null,
        redFlags:   !!this.draft?.red_flags,
        informed:   !!this.draft?.informed
      }
    };

    this.http.post(
      `${environment.apiUrl}/doctor/newDiagnosis`,
      body,
      {withCredentials: true}
    ).subscribe({
      next: async () => {
        await this.markAppointmentDoneAndRefresh(this.draft.appointmentId!);
        this.isLoading = false;
        this.reset();
        this.toast.show('Sikeres adat felvitel!', 'success');
      },
      error: (err) => {
        console.error('❌ Hiba diagnózis mentésekor:', err);
        const msg = err?.error?.error || err?.error?.message || 'Sikertelen adat felvitel!';
        this.toast.show(msg, 'danger');
        this.isLoading = false;
      }
    });
  }

  private async markAppointmentDoneAndRefresh(appointmentId: number): Promise<void> {
    const updated = (this.appointments || []).map(a =>
      a.id === appointmentId ? { ...a, status: 'done' as any } : a
    );

    const filtered = this.filterTodayUpcomingAppointments(updated);

    this.appointments = filtered;

    await this.loadUsersForDiagnosis(filtered);

    this.selectedAppointmentId = null;
    this.draft.appointmentId = null;
    this.buildSummaryVM();
  }

  reset() {
    this.draft = {
      appointmentId: null,
      patientId: null,
      status: 'draft',
      diagnosis_date: '',
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
      chief_complaint: '',
      onset_date: '',
      history: null,
      bp_sys: null,
      bp_dia: null,
      heart_rate: null,
      temp_c: null,
      spo2: null,
      weight_kg: null,
      height_cm: null,
      bmi: null,
      exam_summary: null,
      primary_text: '',
      code_system: 'ICD-10',
      code: null,
      certainty_pct: 50,
      severity: 'moderate',
      differentials: null,
      assessment: null,
      plan_text: null,
      red_flags: false,
      informed: false
    };
    this.goTo(0);
  }

  public isFormValid(): boolean {
    const d = this.draft;

    return !!(
      d?.appointmentId &&
      (d?.patient?.id || (d?.patient?.name && d?.patient?.taj)) &&
      d?.chief_complaint && d?.chief_complaint.trim() &&
      d?.primary_text && d?.primary_text.trim() &&
      (typeof d?.informed === 'boolean') &&
      (typeof d?.red_flags === 'boolean')
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
