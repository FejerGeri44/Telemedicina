import {Component} from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import {AsyncPipe, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {PatientRegistComponent} from '../../../guest/pages/regist-login/forms/patient-regist/patient-regist.component';
import {DoctorRegistComponent} from '../../../guest/pages/regist-login/forms/doctor-regist/doctor-regist.component';
import {AdminRegistComponent} from '../../../guest/pages/regist-login/forms/admin-regist/admin-regist.component';
import {AdminItem} from '../../../../utils/interfaces/admin.interface';
import {UserService} from '../../../../services/user/user.service';
import {delay, filter, firstValueFrom, Observable, take} from 'rxjs';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';

@Component({
  selector: 'app-add-user',
  imports: [
    ...IONIC_COMPONENTS,
    FormsModule,
    PatientRegistComponent,
    DoctorRegistComponent,
    NgIf,
    AdminRegistComponent,
    AsyncPipe,
  ],
  templateUrl: './add-user.component.html',
  standalone: true,
  styleUrl: './add-user.component.scss'
})
export class AddUserComponent {
  user!: Observable<AdminItem | null>;
  selectedRole: 'patient' | 'doctor' | 'admin' = 'patient';

  constructor(
    private modalCtrl: ModalController,
    protected userService: UserService
  ) {
    this.user = this.userService.admin$();

    (async () => {
      const userValue = await firstValueFrom(
        this.userService.admin$().pipe(
          filter((u): u is AdminItem => !!u),
          take(1),
          delay(50)
        )
      );
    })();
  }

  close() {
    void this.modalCtrl.dismiss();
  }
}
