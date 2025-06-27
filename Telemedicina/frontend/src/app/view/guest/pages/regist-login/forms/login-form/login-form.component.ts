import {Component, ComponentRef, Injector, ViewContainerRef} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CustomToastComponent } from '../../../../../../shared/toast/toast.component';

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
export class LoginFormComponent {
  validEmail: boolean = false;
  invalidEmail: boolean = false;
  email: string = '';
  password: string = '';
  showPassword = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private viewContainerRef: ViewContainerRef,
    private injector: Injector,
    private route: ActivatedRoute
    ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const toast = params['toast'];
      const type = params['type'] as 'success' | 'warning' | 'danger';
      const successfulRegist = params['successfulRegist'] === 'true'; // konvertáljuk stringből

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

  onLogin() {

    // Üres mezők ellenőrzése
    if (!this.email || !this.password){
      this.showCustomToast('Kérlek, tölts ki minden kötelező mezőt!', 'warning');
      return;
    } else {

      // Email ellenőrzése
      if (!this.email.includes('@')) {
        this.invalidEmail = true;
        this.validEmail = false;
        this.showCustomToast('Hibás e-mail cím!', 'danger');
        return;
      } else {
        this.invalidEmail = false;
        this.validEmail = true;
      }
    }

    const credentials = {
      email: this.email,
      password: this.password
    };

    this.http.post<any>('http://localhost:3000/api/auth/login', credentials)
      .subscribe({
        next: res => {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          this.showCustomToast('Sikeresen bejelentkeztél!', 'success');

          // Iranyitas szerepkor szerint
          switch (res.user.role) {
            case 'doctor':
              void this.router.navigate(['/dashboard/doctor']);
              break;
            case 'patient':
              void this.router.navigate(['/dashboard/patient']);
              break;
            case 'admin':
              void this.router.navigate(['/dashboard/admin']);
              break;
          }
        },
        error: err => {
          console.error(err);
          this.showCustomToast('Hibás email cím vagy jelszó!', 'danger');
        }
      });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  backToDash() {
    void this.router.navigate(['/']);
  }

  showCustomToast(message: string, type: 'success' | 'warning' | 'danger') {
    const toastRef: ComponentRef<CustomToastComponent> = this.viewContainerRef.createComponent(CustomToastComponent, {
      injector: this.injector
    });

    toastRef.instance.message = message;
    toastRef.instance.type = type;

    setTimeout(() => toastRef.destroy(), 4000);
  }
}

