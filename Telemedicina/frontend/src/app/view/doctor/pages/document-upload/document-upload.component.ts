import {Component} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {IonicModule} from '@ionic/angular';
import {DatePipe, DecimalPipe, NgForOf, NgIf, NgOptimizedImage, NgSwitch, NgSwitchCase} from '@angular/common';
import {delay, filter, firstValueFrom, Observable, take} from 'rxjs';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {UserService} from '../../../../shared/user.service';
import {ToastService} from '../../../../shared/toast/toast.service';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {environment} from '../../../../../../../backend/config/enviroment';
import {HttpClient} from '@angular/common/http';
import {formatTaj} from '../../../../utils/formatProfileData';
import {Appointment} from '../../../../utils/interfaces/appointment.inteface';

export type DocType = 'recept' | 'beutalo' | 'teszteredmeny' | 'egyeb';

@Component({
  selector: 'app-upload-document',
  templateUrl: './document-upload.component.html',
  standalone: true,
  imports: [
    IonicModule,
    ReactiveFormsModule,
    NgForOf,
    NgIf,
    DecimalPipe,
    NgSwitch,
    NgSwitchCase,
    NgOptimizedImage,
    FormsModule,
    DatePipe
  ],
  styleUrls: ['./document-upload.component.scss']
})
export class UploadDocumentComponent {
  user: Observable<DoctorItem | null>;
  isLoading = true;
  uploading= false;
  patients: PatientItem[] = [];
  appointments: Appointment[] = [];
  form: FormGroup;

  docTypes = [
    { value: 'recept' as DocType,        label: 'Recept',         icon: 'document-text-outline' },
    { value: 'beutalo' as DocType,       label: 'Beutaló',        icon: 'trail-sign-outline' },
    { value: 'teszteredmeny' as DocType, label: 'Teszteredmény',  icon: 'flask-outline' },
    { value: 'egyeb' as DocType,         label: 'Egyéb',          icon: 'folder-outline' },
  ];

  file: File | null = null;
  previewKind: 'pdf' | 'image' | 'text' | 'other' | null = null;
  previewUrl: string | null = null;
  safePreviewUrl: SafeResourceUrl | null = null;
  textPreview: string | null = null;
  searchTerm = '';

  isDragging = false;
  readonly maxFileSizeMb = 20;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private userService: UserService,
    private toast: ToastService
  ) {
    this.user = this.userService.doctor$();

    this.form = fb.group({
      patientId: ['', Validators.required],
      docType:   ['', Validators.required],
      file:      [null, Validators.required],
      appointmentId: ['', Validators.required]
    });

    (async () => {
      const userValue = await firstValueFrom(
        this.userService.doctor$().pipe(
          filter((u): u is DoctorItem => !!u),
          take(1),
          delay(50)
        )
      );

      await this.loadMyPatients();
    })();
  }

  private async getDoctorId(): Promise<number | null> {
    const user = await firstValueFrom(this.user);
    return user?.doctor.id ?? null;
  }

  async loadMyPatients() {
    this.isLoading = true;

    const doctorId = await this.getDoctorId();
    if (!doctorId) {
      this.toast.show('Hiányzik az orvos azonosító.', 'danger');
      return null;
    }

    return new Promise<PatientItem[] | null>((resolve) => {
      this.http.post<PatientItem[]>(
        `${environment.apiUrl}/doctor/getAllMyPatients`,
        { id: doctorId },
        { withCredentials: true }
      ).subscribe({
        next: (res) => {
          this.patients = res;
          this.isLoading = false;
          resolve(res);
        },
        error: (err) => {
          console.error('❌ Nem sikerült lekérni a pácienseket:', err);
          this.isLoading = false;
          this.patients = [];
          resolve(null);
        }
      });
    });
  }

  onPatientSelected(patient_id: number) {
    this.form.patchValue({ appointmentId: null }, { emitEvent: false });
    this.appointments = [];
    if (!patient_id) return;
    void this.loadPatientAppointments(patient_id);
  }

  async loadPatientAppointments(patient_id: number) {
    const doctor_id = await this.getDoctorId();
    if (!doctor_id) {
      this.toast.show('Hiányzik az orvos azonosító.', 'danger');
      return null;
    }

    const payload = {
      patient_id: patient_id,
      doctor_id: doctor_id
    }

    return new Promise<Appointment[] | null>((resolve) => {
      this.http.post<Appointment[]>(
        `${environment.apiUrl}/doctor/appointmentsByPatient`,
        { payload },
        { withCredentials: true }
      ).subscribe({
        next: (res) => {
          console.log(res)
          this.appointments = res;
          resolve(res);
        },
        error: (err) => {
          console.error('❌ Nem sikerült lekérni a pácienseket:', err);
          this.appointments = [];
          resolve(null);
        }
      });
    });
  }

  onSelectFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const picked = input?.files[0];

    if (picked.size > this.maxFileSizeMb * 1024 * 1024) {
      this.toast.show("Túl nagy file méret!", "warning");
      input.value = '';
      return;
    }

    void this.handleFile(picked);
    input.value = '';
  }

  private async handleFile(file: File) {
    this.clearFile();
    this.file = file;
    this.form.patchValue({ file });

    const type = (file.type || '').toLowerCase();

    if (type.includes('pdf')) {
      this.previewKind = 'pdf';
      this.previewUrl = URL.createObjectURL(file);
      this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl);
    } else if (type.startsWith('image/')) {
      this.previewKind = 'image';
      this.previewUrl = URL.createObjectURL(file);
      this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl);
    } else if (type.startsWith('text/') || /\.(txt|csv|log)$/i.test(file.name)) {
      this.previewKind = 'text';
      this.textPreview = await this.readTextHead(file, 6000);
    } else {
      this.previewKind = 'other';
    }
  }

  private readTextHead(file: File, maxBytes: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const rdr = new FileReader();
      rdr.onload = () => resolve((rdr.result as string) || '');
      rdr.onerror = reject;
      rdr.readAsText(file.slice(0, maxBytes), 'utf-8');
    });
  }

  protected clearFile() {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.file = null;
    this.previewKind = null;
    this.previewUrl = null;
    this.safePreviewUrl = null;
    this.textPreview = null;
    this.form.patchValue({ file: null });
  }

  get filteredPatients(): PatientItem[] {
    const list = this.patients;
    const term = this.searchTerm?.trim();
    if (!term) return list;

    const q = this.normalize(term);
    return list.filter(p => {
      const name = this.normalize(p.user.name);
      const taj  = this.normalize(p.patient.taj ?? '');
      return name.includes(q) || taj.includes(q);
    });
  }

  private normalize(v: string): string {
    return v
      .toLocaleLowerCase('hu')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  clearSearch() {
    this.searchTerm = '';
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault(); this.isDragging = false;
    const f = ev.dataTransfer?.files?.[0]; if (f) this.handleFile(f);
  }
  onDragOver(ev: DragEvent) { ev.preventDefault(); this.isDragging = true; }
  onDragLeave() { this.isDragging = false; }

  async submit() {
    this.uploading = true;

    const doctorId = await this.getDoctorId();
    if (!doctorId) {
      this.toast.show('Hiányzik az orvos azonosító.', 'danger');
      return null;
    }

    if (!this.file) {
      this.toast.show('Válassz egy fájlt!', 'warning');
      this.uploading = false;
      return;
    }

    const formData = new FormData();
    formData.append('file', this.file, this.file.name);
    formData.append('patient_id', String(this.form.value.patientId));
    formData.append('doctor_id', String(doctorId));
    formData.append('appointment_id', String(this.form.value.appointmentId));
    formData.append('docType', String(this.form.value.docType));

    return new Promise<void>((resolve) => {
      this.http.post(
        `${environment.apiUrl}/doctor/uploadUserFile`,
        formData,
        { withCredentials: true }
      ).subscribe({
        next: () => {
          this.toast.show("Sikeres fájl feltöltés!", "success");
          this.uploading = false;
          this.reset();
          resolve();
        },
        error: (err) => {
          console.error('❌ Sikertelen fájl feltöltés:', err);
          this.uploading = false;
          resolve();
        }
      });
    });
  }

  reset() {
    this.form.reset(); this.clearFile();
  }

  protected readonly formatTaj = formatTaj;
}
