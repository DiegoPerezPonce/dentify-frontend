import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import { PatientListQuery, PatientListResult, PatientRow } from './models/patient-list.models';
import { Patient, PatientCreateDTO, PatientUpdateDTO } from './models/patient.models';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/patients`;

  /**
   * GET colección. Query típica: page, limit|itemsPerPage, search|name|dni.
   * Normaliza JSON plano, API Platform (hydra:member) o array simple.
   */
  list(query: PatientListQuery): Observable<PatientListResult> {
    // Ajustar nombres de query (`itemsPerPage` vs `limit`) según el controlador Symfony.
    let params = new HttpParams()
      .set('page', String(query.page))
      .set('itemsPerPage', String(query.pageSize));

    const q = query.search.trim();
    if (q) {
      params = params.set('search', q);
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

  /**
   * GET paciente por ID.
   */
  getById(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.base}/${id}`);
  }

  /**
   * POST crear nuevo paciente.
   */
  create(dto: PatientCreateDTO): Observable<Patient> {
    return this.http.post<Patient>(this.base, dto);
  }

  /**
   * PUT actualizar paciente existente.
   */
  update(id: number, dto: PatientUpdateDTO): Observable<Patient> {
    return this.http.put<Patient>(`${this.base}/${id}`, dto);
  }

  /**
   * DELETE eliminar paciente.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

function normalizeListResponse(res: unknown): PatientListResult {
  if (res == null) return { items: [], total: 0 };
  if (Array.isArray(res)) {
    return { items: res as PatientRow[], total: res.length };
  }
  const r = res as Record<string, unknown>;
  const hydraMember = r['hydra:member'];
  if (Array.isArray(hydraMember)) {
    const total = Number(r['hydra:totalItems'] ?? hydraMember.length);
    return { items: hydraMember as PatientRow[], total: Number.isFinite(total) ? total : hydraMember.length };
  }
  if (Array.isArray(r['items'])) {
    const total = Number(r['total'] ?? r['totalCount'] ?? (r['items'] as PatientRow[]).length);
    return { items: r['items'] as PatientRow[], total: Number.isFinite(total) ? total : 0 };
  }
  if (Array.isArray(r['data'])) {
    const total = Number(r['total'] ?? r['totalCount'] ?? (r['data'] as PatientRow[]).length);
    return { items: r['data'] as PatientRow[], total: Number.isFinite(total) ? total : 0 };
  }
  if (Array.isArray(r['members'])) {
    const total = Number(r['totalItems'] ?? (r['members'] as PatientRow[]).length);
    return { items: r['members'] as PatientRow[], total: Number.isFinite(total) ? total : 0 };
  }
  return { items: [], total: 0 };
}
