import { Injectable } from '@angular/core';
import {BehaviorSubject, firstValueFrom, Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../../enviroment';
import {UnreadMessageData} from '../../utils/interfaces/message.interface';

@Injectable({
  providedIn: 'root'
})
export class UnreadMessageService {
  private totalCountSubject = new BehaviorSubject<number>(0);
  public totalCount$: Observable<number> = this.totalCountSubject.asObservable();
  private latestUnreadMessagesSubject = new BehaviorSubject<UnreadMessageData[]>([]);
  public latestUnreadMessages$: Observable<UnreadMessageData[]> = this.latestUnreadMessagesSubject.asObservable();

  constructor(private http: HttpClient) { }

  async fetchUnreadSummary(): Promise<UnreadMessageData[]> {
    try {
      const latestMessages: UnreadMessageData[] = await firstValueFrom(
        this.http.get<UnreadMessageData[]>(
          `${environment.apiUrl}/messages/unreadSummary`,
          { withCredentials: true }
        )
      );

      this.latestUnreadMessagesSubject.next(latestMessages);

      const totalUnread = latestMessages.length;
      this.totalCountSubject.next(totalUnread);

      return latestMessages;

    } catch (err) {
      console.error('❌ Olvasatlan összegzés lekérése sikertelen a Service-ben:', err);
      return [];
    }
  }

  decrementTotalCount(amount: number): void {
    const currentCount = this.totalCountSubject.value;
    const newCount = Math.max(0, currentCount - amount);
    this.totalCountSubject.next(newCount);
  }
}
