import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import { Specialty } from './models/clinical-catalog.models';

@Injectable({ providedIn: 'root' })
export class SpecialtyService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/specialties`;

  list(): Observable<Specialty[]> {
    return this.http.get<unknown>(this.base).pipe(map((raw) => normalizeSpecialties(raw)));
  }
}

function normalizeSpecialties(raw: unknown): Specialty[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((item) => {
    const o = item as Record<string, unknown>;
    return {
      id: Number(o['id']),
      name: String(o['name'] ?? ''),
      active: Boolean(o['active'] ?? true)
    };
  });
}
