import {Component, OnInit} from '@angular/core';
import {IonicModule, ModalController} from '@ionic/angular';
import {HttpClient} from '@angular/common/http';
import {NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {PatientRegistComponent} from '../../../guest/pages/regist-login/forms/patient-regist/patient-regist.component';
import {DoctorRegistComponent} from '../../../guest/pages/regist-login/forms/doctor-regist/doctor-regist.component';
import {AdminRegistComponent} from '../../../guest/pages/regist-login/forms/admin-regist/admin-regist.component';
import {AdminItem} from '../../../../utils/interfaces/admin.interface';

@Component({
  selector: 'app-add-user',
  imports: [
    IonicModule,
    FormsModule,
    PatientRegistComponent,
    DoctorRegistComponent,
    NgIf,
    AdminRegistComponent,
  ],
  templateUrl: './add-user.component.html',
  standalone: true,
  styleUrl: './add-user.component.scss'
})
export class AddUserComponent implements OnInit{
  user!: AdminItem;
  selectedRole: 'patient' | 'doctor' | 'admin' = 'patient';

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.getMyData();

  }

  getMyData () {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<AdminItem>('http://localhost:3000/api/getAdminMe', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe((res: any) => {
      this.user = res;
    });
  }

  dismiss() {
    void this.modalCtrl.dismiss();
  }
}
