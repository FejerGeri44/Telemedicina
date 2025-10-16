import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Audience, ChatConfig, Intent } from './chatbot.types';
import {map, Observable, throwError} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  constructor(private http: HttpClient) {}

  /**
   * getConfig(audience)
   * - Lekéri a megfelelő JSON-t a backendről.
   * - patient -> GET /patient ; doctor -> GET /doctor
   * Miért: a controller két külön handlerre bontja a két szerepkört.  */
  getConfig(audience: Audience): Observable<ChatConfig> {
    const token = localStorage.getItem('token');
    if (!token) {
      return throwError(() => new Error('AUTH_MISSING_TOKEN'));
    }
    const url = audience === 'doctor'
      ? 'http://localhost:3000/api/ai-config/doctor-assistant'
      : 'http://localhost:3000/api/ai-config/patient-assistant';
    return this.http.get<ChatConfig>(url, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      map(cfg => this.normalizeConfig(cfg))
    );
  }

  /**
   * normalizeConfig
   * - Védőkorlátok: üres mezők esetén defaultok.
   * Miért: a controller is védi ezeket mentéskor; itt is érdemes. */
  private normalizeConfig(cfg: ChatConfig | null | undefined): ChatConfig {
    return {
      greeting: {
        quickStartText: cfg?.greeting?.quickStartText ?? '',
        quickStarts: cfg?.greeting?.quickStarts ?? []
      },
      fallback: {
        suggestionText: cfg?.fallback?.suggestionText ?? 'Elnézést, nem értettem.',
        suggestions: cfg?.fallback?.suggestions ?? []
      },
      intents: (cfg?.intents ?? []).slice().sort(this.intentSorter)
    };
  }

  /** intentSorter
   * - Ha van priority, magasabb (vagy kisebb – te döntöd) érték előrébb.
   * Miért: determinisztikus találat választás. */
  private intentSorter(a: Intent, b: Intent): number {
    const pa = Number.isFinite(a.priority as any) ? (a.priority as number) : 0;
    const pb = Number.isFinite(b.priority as any) ? (b.priority as number) : 0;
    // nagyobb priority előrébb
    return pb - pa;
  }

  /**
   * matchResponse
   * - A felhasználói üzenethez megpróbál intentet találni (patterns alapján),
   *   és visszaadja az intent response-át; ha nincs találat, undefined.
   * Miért: a controller JSON-jában az intentek 'patterns' és 'response' mezőn működnek. */
  matchResponse(userText: string, cfg: ChatConfig): string | undefined {
    const text = (userText ?? '').trim();
    if (!text) return undefined;

    for (const it of cfg.intents ?? []) {
      const pats = (it.patterns ?? []).map(p => this.safeToRegExp(p));
      const hit = pats.some(re => re?.test(text));
      if (hit) return it.response;
    }
    return undefined;
  }

  /** safeToRegExp
   * - A backend lehetőséget ad egyszerű string listára (coercePatterns),
   *   itt biztonságosan RegExp-é alakítjuk (case-insensitive).
   * Miért: robust pattern matching, injection/hiba nélkül. */
  private safeToRegExp(p: unknown): RegExp | null {
    if (p instanceof RegExp) return p;
    if (typeof p === 'string') {
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i');
    }
    return null;
  }
}
