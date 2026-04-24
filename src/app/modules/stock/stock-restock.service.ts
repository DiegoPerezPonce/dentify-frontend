import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import {
  StockRestock,
  StockRestockCreateDTO,
  StockRestockListResult
} from './models/stock-restock.models';

@Injectable({
  providedIn: 'root'
})
export class StockRestockService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/stock-restocks`;

  list(filters?: {
    materialId?: number;
    startDate?: string;
    endDate?: string;
  }): Observable<StockRestockListResult> {
    let params = new HttpParams();

    if (filters?.materialId) {
      params = params.set('materialId', String(filters.materialId));
    }
    if (filters?.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params = params.set('endDate', filters.endDate);
    }

    return this.http.get<unknown>(this.base, { params, observe: 'response' }).pipe(
      map((resp: HttpResponse<unknown>) => {
        const body = resp.body;
        return normalizeListResponse(body);
      })
    );
  }

  getById(id: number): Observable<StockRestock> {
    return this.http.get<StockRestock>(`${this.base}/${id}`);
  }

  getByMaterial(materialId: number): Observable<StockRestock[]> {
    return this.http.get<StockRestock[]>(`${this.base}/material/${materialId}/history`);
  }

  create(dto: StockRestockCreateDTO): Observable<StockRestock> {
    return this.http.post<StockRestock>(this.base, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

function normalizeListResponse(res: unknown): StockRestockListResult {
  if (res == null) return { items: [], total: 0 };
  if (Array.isArray(res)) {
    return { items: res as StockRestock[], total: res.length };
  }
  const r = res as Record<string, unknown>;
  if (Array.isArray(r['items'])) {
    const total = Number(r['total'] ?? (r['items'] as StockRestock[]).length);
    return { items: r['items'] as StockRestock[], total: Number.isFinite(total) ? total : 0 };
  }
  return { items: [], total: 0 };
}
