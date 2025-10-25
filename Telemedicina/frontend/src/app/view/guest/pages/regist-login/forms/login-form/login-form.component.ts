import {Component, Injector, OnInit, ViewContainerRef} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CustomToastComponent } from '../../../../../../shared/toast/toast.component';
import {ToastService} from '../../../../../../shared/toast/toast.service';
import {environment} from '../../../../../../../../../backend/config/enviroment';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {UserService} from '../../../../../../shared/user.service';
import { LoggedUser } from '../../../../../../utils/interfaces/logged-user.interface';

@Component({
  selector: 'app-login-form',
  standalone: true,
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css'],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule
  ]
})
export class LoginFormComponent implements OnInit{
  email: string = '';
  password: string = '';
  showPassword = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private viewContainerRef: ViewContainerRef,
    private injector: Injector,
    private userService: UserService,
    private route: ActivatedRoute,
    private toast: ToastService
    ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const toast = params['toast'];
      const type = params['type'] as 'success' | 'warning' | 'danger';
      const successfulRegist = params['successfulRegist'] === 'true';

      if (toast && type && successfulRegist) {
        const toastRef = this.viewContainerRef.createComponent(CustomToastComponent, {
          injector: this.injector
        });

        toastRef.instance.message = toast;
        toastRef.instance.type = type;

        setTimeout(() => toastRef.destroy(), 4000);

        setTimeout(() => {
          void this.router.navigate([], {
            queryParams: {
              toast: null,
              type: null,
              successfulRegist: null
            },
            queryParamsHandling: 'merge'
          });
        }, 100);
      }
    });
  }

  async onLogin() {
    if (!this.email || !this.password) {
      this.toast.show('Kérlek, tölts ki minden kötelező mezőt!', 'warning');
      return;
    }
    const email = String(this.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.toast.show('Hibás e-mail cím!', 'danger');
      return;
    }

    try {
      const auth = getAuth();
      const cred = await signInWithEmailAndPassword(auth, email, String(this.password));
      const idToken = await cred.user.getIdToken();

      const resp = await this.http.post<LoggedUser>(
        `${environment.apiUrl}/auth/login`,
        { idToken },
        { withCredentials: true }
      ).toPromise();

      if (resp) {
        this.userService.setUser(resp);
      }

      const role = resp?.user?.role;
      switch (role) {
        case 'doctor':
          void this.router.navigate(['/doctor/doctor-home']);
          break;
        case 'patient':
          void this.router.navigate(['/patient/patient-home']);
          break;
        case 'admin':
          void this.router.navigate(['/admin/admin-home']);
          break;
        default:
          void this.router.navigate(['/']);
      }

    } catch (err: any) {
      if (err?.status === 403 && err?.error?.code === 'DOCTOR_PENDING') {
        this.toast.show('A regisztráció még nincs jóváhagyva!', 'warning');
        return;
      }

      if (err?.status === 0) {
        console.error('Network/CORS error:', err);
        this.toast.show('Hálózati vagy CORS hiba a bejelentkezésnél.', 'danger');
        return;
      }

      if (typeof err?.status === 'number') {
        const serverMsg = err?.error?.message || `Hiba (${err.status}) a bejelentkezésnél.`;
        console.error('Backend login error:', err);
        this.toast.show(serverMsg, 'danger');
        return;
      }

      if (err?.code?.startsWith?.('auth/')) {
        console.error('Firebase signIn error:', err);
        this.toast.show('Hibás email vagy jelszó!', 'danger');
        return;
      }

      console.error('Unknown login error:', err);
      this.toast.show('Hiba történt a bejelentkezés során.', 'danger');
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  backToDash() {
    void this.router.navigate(['/']);
  }
}

