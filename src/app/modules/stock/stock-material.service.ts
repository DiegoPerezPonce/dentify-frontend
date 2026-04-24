import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import {
  StockMaterial,
  StockMaterialCreateDTO,
  StockMaterialListResult
} from './models/stock-material.models';

@Injectable({
  providedIn: 'root'
})
export class StockMaterialService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/stock-materials`;

  list(): Observable<StockMaterialListResult> {
    return this.http.get<unknown>(this.base, { observe: 'response' }).pipe(
      map((resp: HttpResponse<unknown>) => {
        const body = resp.body;
        return normalizeListResponse(body);
      })
    );
  }

  getById(id: number): Observable<StockMaterial> {
    return this.http.get<StockMaterial>(`${this.base}/${id}`);
  }

  create(dto: StockMaterialCreateDTO): Observable<StockMaterial> {
    return this.http.post<StockMaterial>(this.base, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  addQuantity(id: number, cantidad: number): Observable<StockMaterial> {
    return this.http.put<StockMaterial>(`${this.base}/${id}/add`, { cantidad });
  }

  reduceQuantity(id: number, cantidad: number): Observable<StockMaterial> {
    return this.http.put<StockMaterial>(`${this.base}/${id}/reduce`, { cantidad });
  }
}

function normalizeListResponse(res: unknown): StockMaterialListResult {
  if (res == null) return { items: [], total: 0 };
  if (Array.isArray(res)) {
    return { items: res as StockMaterial[], total: res.length };
  }
  const r = res as Record<string, unknown>;
  if (Array.isArray(r['items'])) {
    const total = Number(r['total'] ?? (r['items'] as StockMaterial[]).length);
    return { items: r['items'] as StockMaterial[], total: Number.isFinite(total) ? total : 0 };
  }
  return { items: [], total: 0 };
}
