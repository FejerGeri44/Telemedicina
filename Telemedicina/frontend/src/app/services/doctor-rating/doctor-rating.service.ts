import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import {DoctorRatingItem} from '../../utils/interfaces/doctor.interface';
import {environment} from '../../../../enviroment';

@Injectable({
  providedIn: 'root'
})
export class DoctorRatingService {
  private pendingRatingsSubject = new BehaviorSubject<DoctorRatingItem[]>([]);
  public pendingRatings$: Observable<DoctorRatingItem[]> = this.pendingRatingsSubject.asObservable();

  private pendingCountSubject = new BehaviorSubject<number>(0);
  public pendingCount$: Observable<number> = this.pendingCountSubject.asObservable();

  constructor(
    private http: HttpClient
  ) {}

  public async checkForRatingRequests(getPatientIdCallback: () => Promise<number | null>): Promise<void> {
    const key = `Doctor-ratings`;

    const patientId = await getPatientIdCallback();

    if (!patientId) {
      console.warn('❌ Hiányzik a patientId, az értékelési kérések lekérdezése kihagyva.');
      return;
    }

    const payload = {
      patientId: patientId
    }

    this.http.post<DoctorRatingItem[]>(
      `${environment.apiUrl}/patient/activeRatingRequests`,
      payload,
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        this.pendingRatingsSubject.next(res);
        this.pendingCountSubject.next(res.length);

        sessionStorage.setItem(key, '1');
      },
      error: (err) => console.error('❌ Orvosi értékelési kérés hiba:', err)
    });
  }

  public submitRating(data: { ratingId: number; doctorId: number; value: number }): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/patient/submitRating`,
      data,
      { withCredentials: true }
    );
  }

  public completeRatingRequest(ratingRequestId: number): void {
    const currentCount = this.pendingCountSubject.value;
    if (currentCount > 0) {
      this.pendingCountSubject.next(currentCount - 1);
    }

    const currentRatings = this.pendingRatingsSubject.value.filter(
      request => request.id !== ratingRequestId
    );
    this.pendingRatingsSubject.next(currentRatings);
  }
}
