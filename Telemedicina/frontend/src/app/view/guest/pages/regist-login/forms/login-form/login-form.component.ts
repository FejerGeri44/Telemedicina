import {Component, Injector, OnInit, ViewContainerRef} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { CommonModule } from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CustomToastComponent } from '../../../../../../shared/toast/toast.component';
import {ToastService} from '../../../../../../shared/toast/toast.service';
import {UserService} from '../../../../../../services/user/user.service';
import {LoggedUser} from '../../../../../../utils/interfaces/logged-user.interface';
import { createClient } from '@supabase/supabase-js';
import {environment} from '../../../../../../../../enviroment';
import {firstValueFrom} from 'rxjs';
import {PlatformService} from '../../../../../../services/platform/platform.service';
import {IONIC_COMPONENTS} from '../../../../../../shared/ionic-imports';
const supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);

@Component({
  selector: 'app-login-form',
  standalone: true,
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss'],
  imports: [
    ...IONIC_COMPONENTS,
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class LoginFormComponent implements OnInit{
  loginForm: FormGroup;
  showPassword = false;
  loading = false;

  constructor(
    protected platform: PlatformService,
    private http: HttpClient,
    private router: Router,
    private fb: FormBuilder,
    private viewContainerRef: ViewContainerRef,
    private injector: Injector,
    private userService: UserService,
    private route: ActivatedRoute,
    private toast: ToastService
    ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required,
        //Validators.pattern(PASSWORD_PATTERN)
      ]],
    });
  }

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

  async login(): Promise<void> {
    if (this.loading) { return; }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.toast.show('Kérjük, töltsd ki helyesen az e-mail és jelszó mezőket!', 'warning');
      return;
    }

    const rawEmail = (this.loginForm.value.email ?? '') as string;
    const password = (this.loginForm.value.password ?? '') as string;
    const email = rawEmail.trim().toLowerCase();

    this.loading = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: String(password) });

      if (error || !data?.session?.access_token) {
        let errorMsg = 'Sikertelen bejelentkezés.';

        if (error?.message.includes('Invalid login credentials')) {
          errorMsg = 'Helytelen e-mail cím vagy jelszó.';
        } else if (error?.message.includes('Email not confirmed')) {
          errorMsg = 'Az e-mail cím még nincs megerősítve.';
        }

        this.toast.show(errorMsg, 'danger');
        return;
      }

      const accessToken = data.session.access_token;

      const resp = await firstValueFrom(
        this.http.post<{ message: string; user: LoggedUser; expiresIn: number }>(
          `${environment.apiUrl}/auth/login`,
          { accessToken },
          { withCredentials: true }
        )
      );

      this.userService.setUserFromBackend(resp.user, resp.expiresIn);
      const role = resp.user.user.role;

      this.toast.show(`Üdvözlünk újra, ${resp.user.user.name}!`, 'success');

      switch (role) {
        case 'doctor':  void this.router.navigate(['/doctor/doctor-home']); break;
        case 'patient': void this.router.navigate(['/patient/patient-home']); break;
        case 'admin':   void this.router.navigate(['/admin/admin-home']); break;
        default:        void this.router.navigate(['/']);
      }
    } catch (err: any) {
      if (err?.status === 403 && err?.error?.code === 'DOCTOR_PENDING') {
        this.toast.show('A fiókod még jóváhagyásra vár. Kérlek, légy türelemmel!', 'warning');
        return;
      }

      if (err?.status === 0) {
        this.toast.show('Nem sikerült kapcsolódni a szerverhez. Ellenőrizd az internetkapcsolatot!', 'danger');
      } else {
        const serverMsg = err?.error?.message || 'Váratlan hiba történt a bejelentkezés során. Próbáld újra később!';
        this.toast.show(serverMsg, 'danger');
      }
    } finally {
      this.loading = false;
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  backToDash() {
    void this.router.navigate(['/']);
  }
}

