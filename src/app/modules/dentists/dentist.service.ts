import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import {
  Dentist,
  DentistCreateDTO,
  DentistUpdateDTO,
  DentistListResult
} from './models/dentist.models';

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

  create(dto: DentistCreateDTO): Observable<Dentist> {
    return this.http.post<Dentist>(this.base, dto);
  }

  update(id: number, dto: DentistUpdateDTO): Observable<Dentist> {
    return this.http.put<Dentist>(`${this.base}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

function normalizeListResponse(res: unknown): DentistListResult {
  if (res == null) return { items: [], total: 0 };
  if (Array.isArray(res)) {
    return { items: res as Dentist[], total: res.length };
  }
  const r = res as Record<string, unknown>;
  if (Array.isArray(r['items'])) {
    const total = Number(r['total'] ?? (r['items'] as Dentist[]).length);
    return { items: r['items'] as Dentist[], total: Number.isFinite(total) ? total : 0 };
  }
  return { items: [], total: 0 };
}
