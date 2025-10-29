import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';

import { FrontendUser, LoggedUser, mapLoggedToItem, isPatientItem, isDoctorItem, isAdminItem } from './user.mapper';
import {AdminItem} from '../utils/interfaces/admin.interface';
import {DoctorItem} from '../utils/interfaces/doctor.interface';
import {PatientItem} from '../utils/interfaces/patient.interface';
import {environment} from '../../../../backend/config/enviroment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly _user$ = new BehaviorSubject<FrontendUser | null>(null);

  constructor(private http: HttpClient) {}

  user$(): Observable<FrontendUser | null> {
    return this._user$.asObservable();
  }

  snapshot(): FrontendUser | null {
    return this._user$.value;
  }

  setUser(u: FrontendUser | null): void {
    this._user$.next(u);
  }

  setUserFromBackend(u: LoggedUser | null): void {
    this._user$.next(u ? mapLoggedToItem(u) : null);
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
      .pipe(tap(() => this._user$.next(null)));
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
}
