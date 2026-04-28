import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import {
  PedagogicalNotice,
  PedagogicalNoticeCreateDTO,
  PedagogicalNoticeListResult,
  PedagogicalNoticeUpdateDTO
} from './models/pedagogical-notice.models';

@Injectable({
  providedIn: 'root'
})
export class PedagogicalNoticeService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/pedagogical-notices`;

  list(page = 1, pageSize = 20): Observable<PedagogicalNoticeListResult> {
    let params = new HttpParams();
    params = params.set('page', String(page));
    params = params.set('itemsPerPage', String(pageSize));

    return this.http.get<unknown>(this.base, { params, observe: 'response' }).pipe(
      map((resp: HttpResponse<unknown>) => {
        const body = resp.body;
        const headerTotal = resp.headers.get('X-Total-Count');
        const parsed = normalizeListResponse(body);
        if (headerTotal && !Number.isNaN(Number(headerTotal))) {
          return { ...parsed, total: Number(headerTotal) };
        }
        return parsed;
      })
    );
  }

  listManage(page = 1, pageSize = 50, search?: string, active?: boolean): Observable<PedagogicalNoticeListResult> {
    let params = new HttpParams();
    params = params.set('page', String(page));
    params = params.set('itemsPerPage', String(pageSize));
    if (search && search.trim().length > 0) {
      params = params.set('search', search.trim());
    }
    if (active !== undefined) {
      params = params.set('active', String(active));
    }

    return this.http.get<unknown>(`${this.base}/manage`, { params, observe: 'response' }).pipe(
      map((resp: HttpResponse<unknown>) => {
        const body = resp.body;
        const headerTotal = resp.headers.get('X-Total-Count');
        const parsed = normalizeListResponse(body);
        if (headerTotal && !Number.isNaN(Number(headerTotal))) {
          return { ...parsed, total: Number(headerTotal) };
        }
        return parsed;
      })
    );
  }

  create(dto: PedagogicalNoticeCreateDTO): Observable<PedagogicalNotice> {
    return this.http.post<PedagogicalNotice>(this.base, dto);
  }

  update(id: number, dto: PedagogicalNoticeUpdateDTO): Observable<PedagogicalNotice> {
    return this.http.patch<PedagogicalNotice>(`${this.base}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

function normalizeListResponse(res: unknown): PedagogicalNoticeListResult {
  if (res == null) return { items: [], total: 0 };
  if (Array.isArray(res)) {
    return { items: res as PedagogicalNotice[], total: res.length };
  }

  const r = res as Record<string, unknown>;
  if (Array.isArray(r['items'])) {
    const items = r['items'] as PedagogicalNotice[];
    const total = Number(r['total'] ?? r['totalCount'] ?? items.length);
    return { items, total: Number.isFinite(total) ? total : items.length };
  }

  return { items: [], total: 0 };
}
