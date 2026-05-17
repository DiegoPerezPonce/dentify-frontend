import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import { CatalogTreatment, TreatmentCategoryGroup } from './models/clinical-catalog.models';

export interface TreatmentCategoryListQuery {
  /** Filtra el catálogo según reglas de negocio por tipo de cita. */
  appointmentKind?: string;
}

@Injectable({ providedIn: 'root' })
export class TreatmentCategoryService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/treatment-categories`;

  listGrouped(query: TreatmentCategoryListQuery = {}): Observable<TreatmentCategoryGroup[]> {
    let params = new HttpParams();
    if (query.appointmentKind) {
      params = params.set('appointmentKind', query.appointmentKind);
    }
    return this.http.get<unknown>(this.base, { params }).pipe(map((raw) => normalizeGroups(raw)));
  }
}

function normalizeGroups(raw: unknown): TreatmentCategoryGroup[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((item) => {
    const o = item as Record<string, unknown>;
    const treatmentsRaw = o['treatments'];
    const treatments = Array.isArray(treatmentsRaw)
      ? treatmentsRaw.map((t) => normalizeTreatment(t))
      : [];
    return {
      id: Number(o['id']),
      name: String(o['name'] ?? ''),
      sortOrder: Number(o['sortOrder'] ?? 0),
      treatments
    };
  });
}

function normalizeTreatment(raw: unknown): CatalogTreatment {
  const o = raw as Record<string, unknown>;
  const dentistSpecialtyId = Number(o['dentistSpecialtyId'] ?? o['specialtyId'] ?? 0);
  const dentistSpecialtyName = String(o['dentistSpecialtyName'] ?? o['specialtyName'] ?? '');
  return {
    id: Number(o['id']),
    name: String(o['name'] ?? ''),
    categoryId: Number(o['categoryId'] ?? 0),
    categoryName: String(o['categoryName'] ?? ''),
    dentistSpecialtyId,
    dentistSpecialtyName,
    specialtyId: dentistSpecialtyId,
    specialtyName: dentistSpecialtyName,
    defaultDurationMinutes: Number(o['defaultDurationMinutes'] ?? 30) || 30,
    allowsUrgency: Boolean(o['allowsUrgency'] ?? true),
    forFirstVisit: Boolean(o['forFirstVisit'] ?? false),
    isCustom: Boolean(o['isCustom'] ?? false),
    active: Boolean(o['active'] ?? true)
  };
}
