import {Component, Injector, OnInit, ViewContainerRef} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CustomToastComponent } from '../../../../../../shared/toast/toast.component';
import {ToastService} from '../../../../../../shared/toast/toast.service';
import {UserService} from '../../../../../../shared/user.service';
import {LoggedUser} from '../../../../../../utils/interfaces/logged-user.interface';
import { createClient } from '@supabase/supabase-js';
import {environment} from '../../../../../../../../../backend/config/enviroment';
import {FrontendUser} from '../../../../../../shared/user.mapper';
const supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);

@Component({
  selector: 'app-login-form',
  standalone: true,
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss'],
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

  async login() {
    if (!this.email || !this.password) { this.toast.show('Kötelező mezők!', 'warning'); return; }
    const email = String(this.email).trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email, password: String(this.password)
    });
    if (error || !data?.session?.access_token) {
      this.toast.show(error?.message || 'Hibás belépési adatok.', 'danger');
      return;
    }
    const accessToken = data.session.access_token;

    this.http.post<{ message: string, user: LoggedUser }>(
      `${environment.apiUrl}/auth/login`,
      { accessToken },
      { withCredentials: true }
    ).subscribe({
      next: (resp) => {
        this.userService.setUserFromBackend(resp.user);
        const role = resp.user.user.role;
        switch (role) {
          case 'doctor':  void this.router.navigate(['/doctor/doctor-home']); break;
          case 'patient': void this.router.navigate(['/patient/patient-home']); break;
          case 'admin':   void this.router.navigate(['/admin/admin-home']); break;
          default:        void this.router.navigate(['/']);
        }
      },
      error: (err) => {
        if (err?.status === 403 && err?.error?.code === 'DOCTOR_PENDING') {
          this.toast.show('A regisztráció még nincs jóváhagyva!', 'warning'); return;
        }
        const serverMsg = err?.error?.message || `Hiba (${err?.status ?? '?'}) a bejelentkezésnél.`;
        this.toast.show(serverMsg, 'danger');
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  backToDash() {
    void this.router.navigate(['/']);
  }
}

