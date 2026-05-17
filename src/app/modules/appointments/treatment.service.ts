import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import { CatalogTreatment, CatalogTreatmentCreateDTO } from './models/clinical-catalog.models';

export interface TreatmentListQuery {
  categoryId?: number;
  appointmentKind?: string;
}

@Injectable({ providedIn: 'root' })
export class TreatmentService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/treatments`;

  list(query: TreatmentListQuery = {}): Observable<CatalogTreatment[]> {
    let params = new HttpParams();
    if (query.categoryId != null) {
      params = params.set('categoryId', String(query.categoryId));
    }
    if (query.appointmentKind) {
      params = params.set('appointmentKind', query.appointmentKind);
    }
    return this.http.get<unknown>(this.base, { params }).pipe(map((raw) => normalizeTreatments(raw)));
  }

  create(dto: CatalogTreatmentCreateDTO): Observable<CatalogTreatment> {
    return this.http
      .post<unknown>(this.base, {
        name: dto.name,
        categoryId: dto.categoryId,
        dentistSpecialtyId: dto.dentistSpecialtyId,
        defaultDurationMinutes: dto.defaultDurationMinutes ?? 30,
        allowsUrgency: dto.allowsUrgency ?? true,
        forFirstVisit: dto.forFirstVisit ?? false
      })
      .pipe(map((raw) => normalizeTreatment(raw)));
  }
}

function normalizeTreatments(raw: unknown): CatalogTreatment[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((item) => normalizeTreatment(item));
}

function normalizeTreatment(raw: unknown): CatalogTreatment {
  const o = raw as Record<string, unknown>;
  return {
    id: Number(o['id']),
    name: String(o['name'] ?? ''),
    categoryId: Number(o['categoryId'] ?? 0),
    categoryName: String(o['categoryName'] ?? ''),
    dentistSpecialtyId: Number(o['dentistSpecialtyId'] ?? o['specialtyId'] ?? 0),
    dentistSpecialtyName: String(o['dentistSpecialtyName'] ?? o['specialtyName'] ?? ''),
    specialtyId: Number(o['dentistSpecialtyId'] ?? o['specialtyId'] ?? 0),
    specialtyName: String(o['dentistSpecialtyName'] ?? o['specialtyName'] ?? ''),
    defaultDurationMinutes: Number(o['defaultDurationMinutes'] ?? 30) || 30,
    allowsUrgency: Boolean(o['allowsUrgency'] ?? true),
    forFirstVisit: Boolean(o['forFirstVisit'] ?? false),
    isCustom: Boolean(o['isCustom'] ?? false),
    active: Boolean(o['active'] ?? true)
  };
}
