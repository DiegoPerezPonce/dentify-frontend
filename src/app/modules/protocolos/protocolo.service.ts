import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import {
  ProtocoloCreatePayload,
  ProtocoloListResult,
  ProtocoloTratamiento,
  ProtocoloUpdatePayload
} from './models/protocolo.models';

@Injectable({
  providedIn: 'root'
})
export class ProtocoloService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/protocolos`;

  list(): Observable<ProtocoloListResult> {
    return this.http.get<unknown>(this.base, { observe: 'response' }).pipe(
      map((resp: HttpResponse<unknown>) => normalizeListResponse(resp.body))
    );
  }

  getById(id: number): Observable<ProtocoloTratamiento> {
    return this.http.get<ProtocoloTratamiento>(`${this.base}/${id}`);
  }

  create(payload: ProtocoloCreatePayload): Observable<ProtocoloTratamiento> {
    return this.http.post<ProtocoloTratamiento>(this.base, payload);
  }

  update(id: number, payload: ProtocoloUpdatePayload): Observable<ProtocoloTratamiento> {
    return this.http.put<ProtocoloTratamiento>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

function normalizeListResponse(res: unknown): ProtocoloListResult {
  if (res == null) return { items: [], total: 0 };
  if (Array.isArray(res)) {
    return { items: res as ProtocoloTratamiento[], total: res.length };
  }
  const r = res as Record<string, unknown>;
  if (Array.isArray(r['items'])) {
    const total = Number(r['total'] ?? (r['items'] as ProtocoloTratamiento[]).length);
    return { items: r['items'] as ProtocoloTratamiento[], total: Number.isFinite(total) ? total : 0 };
  }
  return { items: [], total: 0 };
}
