import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, first, Observable, Subscription, switchMap, timer, catchError, of } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { FrontendUser, LoggedUser, mapLoggedToItem, isPatientItem, isDoctorItem, isAdminItem } from './user.mapper';
import { AdminItem } from '../../utils/interfaces/admin.interface';
import { DoctorItem } from '../../utils/interfaces/doctor.interface';
import { PatientItem } from '../../utils/interfaces/patient.interface';
import { environment } from '../../../../enviroment';
import { Router } from '@angular/router';
import { ToastService } from '../../shared/toast/toast.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly _user$ = new BehaviorSubject<FrontendUser | null>(null);
  private readonly _isLoaded$ = new BehaviorSubject<boolean>(false);
  private initialLoad$!: Observable<FrontendUser | null>;
  private sessionTimer: Subscription | null = null;

  constructor(
    private http: HttpClient,
    private injector: Injector,
    private toast: ToastService
  ) {
    this.initialLoad$ = this.http
      .get<{ user: LoggedUser }>(`${environment.apiUrl}/auth/me`, { withCredentials: true })
      .pipe(
        map(payload => (payload ? mapLoggedToItem(payload.user) : null)),
        tap(user => {
          this._user$.next(user);
          this._isLoaded$.next(true);
        }),
        catchError((error) => {
          console.log('Nincs bejelentkezve vagy API hiba:', error);
          this._user$.next(null);
          this._isLoaded$.next(true);
          return of(null);
        }),
        first(),
        shareReplay(1)
      );
  }

  user$(): Observable<FrontendUser | null> {
    return this._user$.asObservable();
  }

  userWithInitialLoad$(): Observable<FrontendUser | null> {
    if (!this._isLoaded$.value) {
      return this.initialLoad$.pipe(
        switchMap(() => this.user$()),
        first()
      );
    }
    return this.user$().pipe(first());
  }

  setUser(u: FrontendUser | null): void {
    this._user$.next(u);
  }

  setUserFromBackend(u: LoggedUser | null, expiresInSeconds?: number): void {
    this.stopSessionTimer();
    this._user$.next(u ? mapLoggedToItem(u) : null);

    if (u && expiresInSeconds && expiresInSeconds > 0) {
      this.startSessionTimer(expiresInSeconds);
    }
  }

  refresh() {
    return this.http
      .get<{ user: LoggedUser }>(`${environment.apiUrl}/auth/me`, { withCredentials: true })
      .pipe(
        map(payload => (payload ? mapLoggedToItem(payload.user) : null)),
        tap(user => this._user$.next(user)),
        shareReplay(1)
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(tap(() => {
        this.stopSessionTimer();
        this._user$.next(null);
        this.clearSystemMessagesFromSessionStorage();
        this.clearDoctorRatingsFromSessionStorage();
      }));
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/auth/account`, { withCredentials: true })
      .pipe(tap(() => {
        this.stopSessionTimer();
        this._user$.next(null);
        this.clearSystemMessagesFromSessionStorage();
        this.toast.show("Fiókja véglegesen törölve!", "success");
      }));
  }

  clearSystemMessagesFromSessionStorage(): void {
    const prefix = 'System-Messages';
    const keysToRemove: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      sessionStorage.removeItem(key);
    }
  }

  clearDoctorRatingsFromSessionStorage(): void {
    const prefix = 'Doctor-ratings';
    const keysToRemove: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      sessionStorage.removeItem(key);
    }
  }

  private autoLogout(): void {
    this.stopSessionTimer();
    this._user$.next(null);

    const router = this.injector.get(Router);

    this.http.post<void>(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(first())
      .subscribe(() => {
        this.toast.show("Munkamenet lejárt, lépj be ismét!", "warning");
        void router.navigate(['/regist-login']);
      });
  }

  patient$(): Observable<PatientItem | null> {
    return this.user$().pipe(map(u => (isPatientItem(u) ? u : null)));
  }
  doctor$(): Observable<DoctorItem | null> {
    return this.user$().pipe(map(u => (isDoctorItem(u) ? u : null)));
  }
  admin$(): Observable<AdminItem | null> {
    return this.user$().pipe(map(u => (isAdminItem(u) ? u : null)));
  }

  private startSessionTimer(seconds: number): void {
    const ms = seconds * 1000;
    this.sessionTimer = timer(ms).pipe(first()).subscribe({
      next: () => {
        console.warn('Munkamenet lejárt a timer alapján. Automatikus kijelentkezés.');
        this.autoLogout();
      }
    });
  }

  private stopSessionTimer(): void {
    if (this.sessionTimer) {
      this.sessionTimer.unsubscribe();
      this.sessionTimer = null;
    }
  }
}
