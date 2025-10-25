import { Injectable } from '@angular/core';
import {
  getAuth,
  onIdTokenChanged,
  User,
  browserSessionPersistence,
  setPersistence
} from 'firebase/auth';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = getAuth();
  private userSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public readonly ready: Promise<void>;
  private resolveReady!: (value?: void) => void;
  private initialized = false;

  user$ = this.userSubject.asObservable();
  token$ = this.tokenSubject.asObservable();

  constructor() {
    setPersistence(this.auth, browserSessionPersistence).catch(() => {  });

    this.ready = new Promise<void>(res => {
      this.resolveReady = res;
    });
    onIdTokenChanged(this.auth, async (user) => {
      this.userSubject.next(user);

      const token = user ? await user.getIdToken() : null;
      this.tokenSubject.next(token);

      if (!this.initialized) {
        this.initialized = true;
        this.resolveReady();
      }
    });
  }

  getIdTokenSync(): string | null {
    return this.tokenSubject.getValue();
  }

  async getIdToken(): Promise<string | null> {
    const t = this.tokenSubject.getValue();
    if (t) return t;

    await this.ready;

    const after = this.tokenSubject.getValue();
    if (after) return after;

    try {
      return await firstValueFrom(this.token$.pipe(
        filter((v): v is string => !!v),
        take(1)
      ));
    } catch {
      return null;
    }
  }
}
