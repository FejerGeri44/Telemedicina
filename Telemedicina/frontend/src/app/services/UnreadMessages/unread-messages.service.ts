import { Injectable } from '@angular/core';
import {BehaviorSubject, firstValueFrom, Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../../enviroment';

@Injectable({
  providedIn: 'root'
})
export class UnreadMessageService {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$: Observable<number> = this.unreadCountSubject.asObservable();
  private summaryMapSubject = new BehaviorSubject<Map<number, number>>(new Map());
  public summaryMap$: Observable<Map<number, number>> = this.summaryMapSubject.asObservable();
  private totalCountSubject = new BehaviorSubject<number>(0);
  public totalCount$: Observable<number> = this.totalCountSubject.asObservable();


  constructor(private http: HttpClient) { }

  async fetchUnreadSummary(): Promise<Map<number, number>> {
    try {
      const summary: Array<{ partnerId: number, unreadCount: number }> = await firstValueFrom(
        this.http.get<any>(
          `${environment.apiUrl}/messages/unreadSummary`,
          { withCredentials: true }
        )
      );

      const newMap = new Map(summary.map(s => [s.partnerId, s.unreadCount]));
      const totalUnread = Array.from(newMap.values()).reduce((sum, count) => sum + count, 0);

      this.summaryMapSubject.next(newMap);
      this.totalCountSubject.next(totalUnread);

      return newMap;

    } catch (err) {
      console.error('❌ Olvasatlan összegzés lekérése sikertelen a Service-ben:', err);
      return new Map();
    }
  }

  setUnreadCount(count: number): void {
    this.unreadCountSubject.next(count);
  }

  getCurrentCount(): number {
    return this.unreadCountSubject.value;
  }

  decrementTotalCount(amount: number): void {
    const currentCount = this.totalCountSubject.value;
    const newCount = Math.max(0, currentCount - amount);
    this.totalCountSubject.next(newCount);
  }
}
