import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NotificationComponent } from '../../../../../../shared/notification/notification.component';

@Component({
  selector: 'app-login-form',
  standalone: true,
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css'],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    NotificationComponent
  ]
})
export class LoginFormComponent {
  isMobile: boolean = false;
  private resizeListener!: () => void;

  email: string = '';
  password: string = '';

  notificationMessage = '';
  notificationType: 'success' | 'error' = 'success';
  showNotification = false;

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.updateScreenSize();
    this.resizeListener = () => this.updateScreenSize();
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeListener);
  }

  updateScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  onLogin() {
    // Üres mezők ellenőrzése
    if (!this.email || !this.password){
      this.showCustomNotification('Kérlek tölts ki minden mezőt.', 'error');
      return;
    }

    const credentials = {
      email: this.email,
      password: this.password
    };

    this.http.post<any>('http://localhost:3000/api/auth/login', credentials)
      .subscribe({
        next: res => {
          localStorage.setItem('token', res.token);
          localStorage.setItem('role', res.user.role);

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
            default:
              void this.router.navigate(['/']);
          }
        },
        error: err => {
          this.showCustomNotification('Hibás bejelentkezés.', 'error');
        }
      });
  }

  backToDash() {
    void this.router.navigate(['/']);
  }

  showCustomNotification(message: string, type: 'success' | 'error' = 'success') {
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotification = true;

    setTimeout(() => {
      this.showNotification = false;
    }, 3000);
  }
}

