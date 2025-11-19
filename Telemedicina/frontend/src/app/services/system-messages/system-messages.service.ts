import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {SystemMessage} from '../../utils/interfaces/system-message.interface';
import {environment} from '../../../../enviroment';
import {BehaviorSubject, Observable} from 'rxjs';

type AudienceType = 'patient' | 'doctor';

@Injectable({
  providedIn: 'root'
})
export class SystemMessageService {
  private systemMessages: SystemMessage[] | undefined;

  private allSystemMessagesSubject = new BehaviorSubject<SystemMessage[]>([]);
  public allSystemMessages$: Observable<SystemMessage[]> = this.allSystemMessagesSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$: Observable<number> = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
  ) {}

  public loadSystemMessagesOnceAfterLogin(audienceType: AudienceType): void {
    const key = `System-Messages-Loaded`;

    const audiences = ['all', audienceType];
    const payload = { audiences };

    this.http.post<SystemMessage[]>(
      `${environment.apiUrl}/messages/system-messages-for-me`,
      payload,
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        this.systemMessages = res;
        this.allSystemMessagesSubject.next(res);
        const unreadCount = res.filter(message => !this.isMessageSeen(message.id)).length;
        this.unreadCountSubject.next(unreadCount);

        sessionStorage.setItem(key, '1');
      },
      error: (err) => console.error('❌ Rendszerüzenetek hiba:', err)
    });
  }

  public isMessageSeen(messageId: number): boolean {
    return sessionStorage.getItem(`System-Messages-${messageId}`) === '1';
  }

  public markMessageAsSeen(messageId: number): void {
    if (!this.isMessageSeen(messageId)) {
      sessionStorage.setItem(`System-Messages-${messageId}`, '1');

      const currentCount = this.unreadCountSubject.value;
      if (currentCount > 0) {
        this.unreadCountSubject.next(currentCount - 1);
      }
    }
  }
}
