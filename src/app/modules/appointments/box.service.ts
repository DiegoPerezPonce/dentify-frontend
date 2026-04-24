import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import { Box, BoxListResult } from './models/box.models';

@Injectable({
  providedIn: 'root'
})
export class BoxService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/boxes`;

  list(): Observable<BoxListResult> {
    return this.http.get<unknown>(this.base, { observe: 'response' }).pipe(
      map((resp: HttpResponse<unknown>) => {
        const body = resp.body;
        return normalizeListResponse(body);
      })
    );
  }

  getById(id: number): Observable<Box> {
    return this.http.get<Box>(`${this.base}/${id}`);
  }
}

function normalizeListResponse(res: unknown): BoxListResult {
  if (res == null) return { items: [], total: 0 };
  if (Array.isArray(res)) {
    return { items: res as Box[], total: res.length };
  }
  const r = res as Record<string, unknown>;
  const hydraMember = r['hydra:member'];
  if (Array.isArray(hydraMember)) {
    const total = Number(r['hydra:totalItems'] ?? hydraMember.length);
    return {
      items: hydraMember as Box[],
      total: Number.isFinite(total) ? total : hydraMember.length
    };
  }
  if (Array.isArray(r['items'])) {
    const total = Number(r['total'] ?? r['totalCount'] ?? (r['items'] as Box[]).length);
    return { items: r['items'] as Box[], total: Number.isFinite(total) ? total : 0 };
  }
  if (Array.isArray(r['data'])) {
    const total = Number(r['total'] ?? r['totalCount'] ?? (r['data'] as Box[]).length);
    return { items: r['data'] as Box[], total: Number.isFinite(total) ? total : 0 };
  }
  return { items: [], total: 0 };
}
