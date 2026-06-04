import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import {
  StockMaterial,
  StockMaterialCreateDTO,
  StockMaterialListQuery,
  StockMaterialListResult,
  StockMaterialUpdateDTO
} from './models/stock-material.models';

@Injectable({
  providedIn: 'root'
})
export class StockMaterialService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/stock-materials`;

  list(query: StockMaterialListQuery = {}): Observable<StockMaterialListResult> {
    let params = new HttpParams();
    if (query.page) {
      params = params.set('page', String(query.page));
    }
    if (query.pageSize) {
      params = params.set('itemsPerPage', String(query.pageSize));
    }
    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.lowStockOnly) {
      params = params.set('lowStockOnly', 'true');
    }

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

  getById(id: number): Observable<StockMaterial> {
    return this.http.get<StockMaterial>(`${this.base}/${id}`);
  }

  create(dto: StockMaterialCreateDTO): Observable<StockMaterial> {
    return this.http.post<StockMaterial>(this.base, dto);
  }

  update(id: number, dto: StockMaterialUpdateDTO): Observable<StockMaterial> {
    return this.http.put<StockMaterial>(`${this.base}/${id}`, dto);
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
    return { items: res.map((row) => normalizeMaterial(row)), total: res.length };
  }
  const r = res as Record<string, unknown>;
  if (Array.isArray(r['items'])) {
    const items = (r['items'] as unknown[]).map((row) => normalizeMaterial(row));
    const total = Number(r['total'] ?? items.length);
    return { items, total: Number.isFinite(total) ? total : 0 };
  }
  return { items: [], total: 0 };
}

function normalizeMaterial(raw: unknown): StockMaterial {
  const o = raw as Record<string, unknown>;
  const cantidad = Number(o['cantidad_actual'] ?? 0);
  const umbral = Number(o['umbral_minimo'] ?? 10);
  const umbralRounded = Number.isFinite(umbral) ? umbral : 10;
  const isLow =
    o['is_low_stock'] != null
      ? Boolean(o['is_low_stock'])
      : cantidad <= umbralRounded;
  return {
    id: Number(o['id']),
    nombre: String(o['nombre'] ?? ''),
    cantidad_actual: Number.isFinite(cantidad) ? cantidad : 0,
    umbral_minimo: umbralRounded,
    is_low_stock: isLow,
    unidad: String(o['unidad'] ?? ''),
    fecha_ultima_reposicion: (o['fecha_ultima_reposicion'] as string | undefined) ?? undefined
  };
}
