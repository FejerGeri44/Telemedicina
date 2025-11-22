import {Component, ElementRef, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {DatePipe, DecimalPipe, NgForOf, NgIf, NgOptimizedImage, NgSwitch, NgSwitchCase} from '@angular/common';
import {delay, filter, firstValueFrom, Observable, take} from 'rxjs';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {UserService} from '../../../../services/user/user.service';
import {ToastService} from '../../../../shared/toast/toast.service';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {environment} from '../../../../../../enviroment';
import {HttpClient} from '@angular/common/http';
import {formatTaj} from '../../../../utils/formatProfileData';
import {Appointment} from '../../../../utils/interfaces/appointment.inteface';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';

export type DocType = 'recept' | 'beutalo' | 'teszteredmeny' | 'egyeb';

interface UploadedFile extends File {
  docType: DocType | null;
}

@Component({
  selector: 'app-upload-document',
  templateUrl: './document-upload.component.html',
  standalone: true,
  imports: [
    ...IONIC_COMPONENTS,
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
    { value: 'beutalo' as DocType,       label: 'Beutaló',        icon: 'send-outline' },
    { value: 'teszteredmeny' as DocType, label: 'Teszteredmény',  icon: 'flask-outline' },
    { value: 'egyeb' as DocType,         label: 'Egyéb',          icon: 'folder-outline' },
  ];

  files: UploadedFile[] = [];
  activeFileIndex: number | null = null;

  previewKind: 'pdf' | 'image' | 'text' | 'other' | null = null;
  previewUrl: string | null = null;
  safePreviewUrl: SafeResourceUrl | null = null;
  textPreview: string | null = null;
  searchTerm = '';

  isDragging = false;
  readonly maxFileSizeMb = 20;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

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

  onSelectFiles(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const pickedFiles = Array.from(input.files);

    for (const picked of pickedFiles) {
      if (picked.size > this.maxFileSizeMb * 1024 * 1024) {
        this.toast.show(`Túl nagy file méret: ${picked.name} (${this.maxFileSizeMb} MB felett)!`, "warning");
        continue;
      }

      const newFile = picked as UploadedFile;
      newFile.docType = null;
      this.files.push(newFile);
    }

    if (this.files.length > 0) {
      this.setActiveFile(this.files.length - 1);
    }

    input.value = '';
  }

  private async handleFile(file: File) {
    this.clearPreview();

    const type = (file.type ?? '').toLowerCase();
    const name = (file.name ?? '').toLowerCase();

    const isPdf = type === 'application/pdf' || name.endsWith('.pdf');

    const isImage = type.startsWith('image/') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png');
    const isText = type.startsWith('text/') || /\.(txt|csv|log)$/i.test(name);


    if (isPdf) {
      this.previewKind = 'pdf';
      this.previewUrl = URL.createObjectURL(file);
      this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl);
    } else if (isImage) {
      this.previewKind = 'image';
      this.previewUrl = URL.createObjectURL(file);
      this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl);
    } else if (isText) {
      this.previewKind = 'text';
      this.textPreview = await this.readTextHead(file, 6000);
    } else {
      this.previewKind = 'other';
    }
  }

  protected clearPreview() {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewKind = null;
    this.previewUrl = null;
    this.safePreviewUrl = null;
    this.textPreview = null;
  }

  private readTextHead(file: File, maxBytes: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const rdr = new FileReader();
      rdr.onload = () => resolve((rdr.result as string) || '');
      rdr.onerror = reject;
      rdr.readAsText(file.slice(0, maxBytes), 'utf-8');
    });
  }

  removeFile(index: number) {
    this.files.splice(index, 1);

    if (this.activeFileIndex === index) {
      this.clearPreview();
      this.activeFileIndex = null;

      if (this.files.length > 0) {
        this.setActiveFile(0);
      }
    } else if (this.activeFileIndex !== null && index < this.activeFileIndex) {
      this.activeFileIndex--;
    }
  }

  setActiveFile(index: number) {
    if (this.activeFileIndex === index) return;

    this.activeFileIndex = index;
    const file = this.files[index];

    if (file) {
      void this.handleFile(file);
    } else {
      this.clearPreview();
    }
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
    const files = ev.dataTransfer?.files;
    if (files && files.length > 0) {
      const pickedFiles = Array.from(files);
      for (const picked of pickedFiles) {
        if (picked.size <= this.maxFileSizeMb * 1024 * 1024) {
          const newFile = picked as UploadedFile;
          newFile.docType = null;
          this.files.push(newFile);
        } else {
          this.toast.show(`Túl nagy file méret: ${picked.name} (${this.maxFileSizeMb} MB felett)!`, "warning");
        }
      }
      if (this.files.length > 0) {
        this.setActiveFile(this.files.length - 1);
      }
    }
  }

  onDragOver(ev: DragEvent) { ev.preventDefault(); this.isDragging = true; }

  onDragLeave() { this.isDragging = false; }

  async submit() {
    this.uploading = true;

    if (this.files.length === 0) {
      this.toast.show('Válassz legalább egy fájlt!', 'warning');
      this.uploading = false;
      return;
    }

    if (this.files.some(f => !f.docType)) {
      this.toast.show('Minden feltöltött fájlhoz válassz dokumentumtípust!', 'warning');
      this.uploading = false;
      return;
    }

    const doctorId = await this.getDoctorId();
    if (!doctorId) {
      this.toast.show('Hiányzik az orvos azonosító.', 'danger');
      this.uploading = false;
      return;
    }

    this.uploading = true;

    const formData = new FormData();

    for (const file of this.files) {
      formData.append('files', file, file.name);
    }

    const docTypesJson = JSON.stringify(this.files.map(f => f.docType));
    formData.append('docTypes', docTypesJson);
    formData.append('patient_id', String(this.form.value.patientId));
    formData.append('doctor_id', String(doctorId));
    formData.append('appointment_id', String(this.form.value.appointmentId));

    try {
      const res = await firstValueFrom(this.http.post(
        `${environment.apiUrl}/doctor/uploadUserFile`,
        formData,
        { withCredentials: true }
      ));

      this.toast.show(`Sikeresen feltöltve ${this.files.length} dokumentum.`, "success");
      this.reset();
    } catch (err) {
      console.error('Feltöltés hiba:', err);
      this.toast.show('Hiba történt a feltöltés során.', "danger");
    } finally {
      this.uploading = false;
    }
  }

  reset() {
    this.form.reset();
    this.clearPreview();
    this.files = [];
    this.activeFileIndex = null;
  }

  getDocTypeIcon(docType: DocType | null): string {
    if (!docType) return 'help-circle-outline';
    return this.docTypes.find(t => t.value === docType)?.icon || 'help-circle-outline';
  }

  onDocTypeSelected(file: UploadedFile, value: DocType) {
    file.docType = value;
  }

  isUploadDisabled(): boolean {
    const isFormInvalid = this.form.invalid;
    const hasNoFiles = this.files.length === 0;
    const hasMissingDocType = this.files.length > 0 && this.files.some(f => !f.docType);
    const isUploading = this.uploading;

    return isFormInvalid || hasNoFiles || hasMissingDocType || isUploading;
  }

  protected readonly formatTaj = formatTaj;
}
