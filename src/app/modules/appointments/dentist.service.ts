import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import { Dentist, DentistListResult } from './models/dentist.models';

@Injectable({
  providedIn: 'root'
})
export class DentistService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/dentists`;

  list(): Observable<DentistListResult> {
    return this.http.get<unknown>(this.base, { observe: 'response' }).pipe(
      map((resp: HttpResponse<unknown>) => {
        const body = resp.body;
        return normalizeListResponse(body);
      })
    );
  }

  getById(id: number): Observable<Dentist> {
    return this.http.get<Dentist>(`${this.base}/${id}`);
  }
}

function normalizeListResponse(res: unknown): DentistListResult {
  if (res == null) return { items: [], total: 0 };
  if (Array.isArray(res)) {
    return { items: res as Dentist[], total: res.length };
  }
  const r = res as Record<string, unknown>;
  const hydraMember = r['hydra:member'];
  if (Array.isArray(hydraMember)) {
    const total = Number(r['hydra:totalItems'] ?? hydraMember.length);
    return {
      items: hydraMember as Dentist[],
      total: Number.isFinite(total) ? total : hydraMember.length
    };
  }
  if (Array.isArray(r['items'])) {
    const total = Number(r['total'] ?? r['totalCount'] ?? (r['items'] as Dentist[]).length);
    return { items: r['items'] as Dentist[], total: Number.isFinite(total) ? total : 0 };
  }
  if (Array.isArray(r['data'])) {
    const total = Number(r['total'] ?? r['totalCount'] ?? (r['data'] as Dentist[]).length);
    return { items: r['data'] as Dentist[], total: Number.isFinite(total) ? total : 0 };
  }
  return { items: [], total: 0 };
}
