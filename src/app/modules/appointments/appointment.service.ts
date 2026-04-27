import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import {
  Appointment,
  AppointmentCreateDTO,
  AppointmentListQuery,
  AppointmentListResult,
  AppointmentUpdateDTO
} from './models/appointment.models';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/appointments`;

  /**
   * GET colección de citas con filtros opcionales
   */
  list(query: AppointmentListQuery = {}): Observable<AppointmentListResult> {
    let params = new HttpParams();

    if (query.page) {
      params = params.set('page', String(query.page));
    }
    if (query.pageSize) {
      params = params.set('itemsPerPage', String(query.pageSize));
    }
    if (query.startDate) {
      params = params.set('startDate', query.startDate);
    }
    if (query.endDate) {
      params = params.set('endDate', query.endDate);
    }
    if (query.dentistId) {
      params = params.set('dentistId', String(query.dentistId));
    }
    if (query.boxId) {
      params = params.set('boxId', String(query.boxId));
    }
    if (query.patientId) {
      params = params.set('patientId', String(query.patientId));
    }
    if (query.status) {
      params = params.set('status', query.status);
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
   * GET cita por ID
   */
  getById(id: number): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.base}/${id}`);
  }

  /**
   * POST crear nueva cita
   */
  create(dto: AppointmentCreateDTO): Observable<Appointment> {
    return this.http.post<Appointment>(this.base, dto);
  }

  /**
   * PUT actualizar cita existente
   */
  update(id: number, dto: AppointmentUpdateDTO): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.base}/${id}`, dto);
  }

  /**
   * DELETE eliminar cita
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /**
   * POST cancelar cita (cambia el estado a CANCELLED)
   */
  cancel(id: number): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.base}/${id}/cancel`, {});
  }

  /**
   * POST reprogramar cita
   */
  reschedule(id: number, newStartDateTime: string): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.base}/${id}/reschedule`, {
      startDateTime: newStartDateTime
    });
  }
}

function normalizeListResponse(res: unknown): AppointmentListResult {
  if (res == null) return { items: [], total: 0 };
  if (Array.isArray(res)) {
    return { items: res as Appointment[], total: res.length };
  }
  const r = res as Record<string, unknown>;
  const hydraMember = r['hydra:member'];
  if (Array.isArray(hydraMember)) {
    const total = Number(r['hydra:totalItems'] ?? hydraMember.length);
    return {
      items: hydraMember as Appointment[],
      total: Number.isFinite(total) ? total : hydraMember.length
    };
  }
  if (Array.isArray(r['items'])) {
    const total = Number(r['total'] ?? r['totalCount'] ?? (r['items'] as Appointment[]).length);
    return { items: r['items'] as Appointment[], total: Number.isFinite(total) ? total : 0 };
  }
  if (Array.isArray(r['data'])) {
    const total = Number(r['total'] ?? r['totalCount'] ?? (r['data'] as Appointment[]).length);
    return { items: r['data'] as Appointment[], total: Number.isFinite(total) ? total : 0 };
  }
  if (Array.isArray(r['members'])) {
    const total = Number(r['totalItems'] ?? (r['members'] as Appointment[]).length);
    return { items: r['members'] as Appointment[], total: Number.isFinite(total) ? total : 0 };
  }
  return { items: [], total: 0 };
}
