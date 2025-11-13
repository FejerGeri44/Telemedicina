import {Component, Input, OnInit, Renderer2, Inject} from '@angular/core';
import {DOCUMENT, NgForOf, NgOptimizedImage} from '@angular/common';
import {DocumentItem} from '../../../../../../utils/interfaces/document.interface';
import {IonicModule, ModalController} from '@ionic/angular';
import {DoctorItem} from '../../../../../../utils/interfaces/doctor.interface';
import {
  DoctorProfileCardComponent
} from '../../../../../doctor/components/doctor-profile-card/doctor-profile-card.component';
import {formatTimestamp} from '../../../../../../utils/formatProfileData';
import {environment} from '../../../../../../../../enviroment';
import {HttpClient} from '@angular/common/http';

@Component({
  selector: 'app-document-table',
  imports: [
    IonicModule,
    NgForOf,
    NgOptimizedImage
  ],
  templateUrl: './document-table.component.html',
  standalone: true,
  styleUrl: './document-table.component.scss'
})
export class DocumentTableComponent implements OnInit {
  @Input({ required: true }) myDocuments!: DocumentItem[];

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  private async getSignedUrl(storagePath: string): Promise<string | null> {
    try {
      const response = await this.http.post<{ signedUrl: string }>(
        `${environment.apiUrl}/patient/getSignedDocumentUrl`,
        { storagePath },
        { withCredentials: true }
      ).toPromise();

      return response?.signedUrl || null;

    } catch (error) {
      console.error('❌ Hiba az aláírt URL lekérésekor:', error);
      return null;
    }
  }

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

  async viewDocument(document: DocumentItem) {
    const signedUrl = await this.getSignedUrl(document.storage_path);

    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  }

  async downloadDocument(document: DocumentItem) {
    const signedUrl = await this.getSignedUrl(document.storage_path);

    if (signedUrl) {
      const downloadLink = this.renderer.createElement('a');
      this.renderer.setAttribute(downloadLink, 'href', signedUrl);
      this.renderer.setAttribute(
        downloadLink,
        'download',
        document.storage_path.split('/').pop() || 'document.pdf'
      );
      this.renderer.appendChild(this.document.body, downloadLink);
      downloadLink.click();
      this.renderer.removeChild(this.document.body, downloadLink);
    }
  }

  protected readonly formatTimestamp = formatTimestamp;

  ngOnInit(): void {
    console.log(this.myDocuments)
  }
}
