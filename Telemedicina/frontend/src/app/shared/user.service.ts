import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {LoggedUser} from '../utils/interfaces/logged-user.interface';
import * as CryptoJS from 'crypto-js';
import {environment} from '../../../../backend/config/enviroment';
import {Patient, PatientItem} from '../utils/interfaces/patient.interface';
import {Doctor, DoctorItem} from '../utils/interfaces/doctor.interface';
import {Admin, AdminItem} from '../utils/interfaces/admin.interface';
import {User} from '../utils/interfaces/user.interface';
import {Router} from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class UserService {
  private userSubject = new BehaviorSubject<LoggedUser | null>(null);
  user$ = this.userSubject.asObservable();

  private readonly STORAGE_KEY = 'loggedUser';
  private readonly SECRET_KEY = environment.cryptoKey;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    const saved = sessionStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      const decrypted = this.decrypt(saved);
      if (decrypted) {
        this.userSubject.next(decrypted);
      }
    }
  }

  setUser(userData: LoggedUser) {
    this.userSubject.next(userData);

    const encrypted = this.encrypt(userData);
    sessionStorage.setItem(this.STORAGE_KEY, encrypted);
  }

  getUser(): LoggedUser | null {
    const current = this.userSubject.value;
    if (current) return current;

    const saved = sessionStorage.getItem(this.STORAGE_KEY);
    if (!saved) return null;

    const decrypted = this.decrypt(saved);
    if (decrypted) {
      this.userSubject.next(decrypted);
      return decrypted;
    }
    return null;
  }

  private isPatient(user: LoggedUser): user is { user: User; related: Patient } {
    return user.user.role === 'patient' && !!user.related;
  }
  private isDoctor(user: LoggedUser): user is { user: User; related: Doctor } {
    return user.user.role === 'doctor' && !!user.related;
  }
  private isAdmin(user: LoggedUser): user is { user: User; related: Admin } {
    return user.user.role === 'admin' && !!user.related;
  }

  getUserAsPatient(): PatientItem | null {
    const base = this.getUser();
    if (base && this.isPatient(base)) return { user: base.user, patient: base.related };
    return null;
  }

  getUserAsDoctor(): DoctorItem | null {
    const base = this.getUser();
    if (base && this.isDoctor(base)) return { user: base.user, doctor: base.related };
    return null;
  }

  getUserAsAdmin(): AdminItem | null {
    const base = this.getUser();
    if (base && this.isAdmin(base)) return { user: base.user, admin: base.related };
    return null;
  }

  async logout(): Promise<void> {
    try {
      await this.http.post(
        `${environment.apiUrl}/auth/logout`,
        {},
        { withCredentials: true }
      ).toPromise();
    } catch (e) {
      console.warn('Logout request failed or skipped:', e);
    }

    this.userSubject.next(null);
    sessionStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('System-Messages');

    await this.router.navigate(
      ['/regist-login'],
      { queryParams: { tab: 'login' } }
    );
  }

  private encrypt(data: LoggedUser): string {
    try {
      return CryptoJS.AES.encrypt(
        JSON.stringify(data),
        this.SECRET_KEY
      ).toString();
    } catch (error) {
      console.error('Titkosítási hiba:', error);
      return '';
    }
  }

  private decrypt(ciphertext: string): LoggedUser | null {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, this.SECRET_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted ? JSON.parse(decrypted) : null;
    } catch (error) {
      console.error('Visszafejtési hiba:', error);
      return null;
    }
  }
}
