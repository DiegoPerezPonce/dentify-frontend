import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import {
  User,
  UserCreateDTO,
  UserUpdateDTO,
  UserListResult
} from './models/user.models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/users`;

  list(): Observable<UserListResult> {
    return this.http.get<unknown>(this.base, { observe: 'response' }).pipe(
      map((resp: HttpResponse<unknown>) => {
        const body = resp.body;
        return normalizeListResponse(body);
      })
    );
  }

  /** Usuarios con ficha de odontólogo (alta unificada). */
  listClinicalProfiles(): Observable<UserListResult> {
    const url = `${this.base}?clinicalProfiles=1`;
    return this.http.get<unknown>(url, { observe: 'response' }).pipe(
      map((resp: HttpResponse<unknown>) => normalizeListResponse(resp.body))
    );
  }

  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.base}/${id}`);
  }

  create(dto: UserCreateDTO): Observable<User> {
    return this.http.post<User>(this.base, dto);
  }

  update(id: number, dto: UserUpdateDTO): Observable<User> {
    return this.http.put<User>(`${this.base}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

function normalizeListResponse(res: unknown): UserListResult {
  if (res == null) return { items: [], total: 0 };
  if (Array.isArray(res)) {
    return { items: res as User[], total: res.length };
  }
  const r = res as Record<string, unknown>;
  if (Array.isArray(r['items'])) {
    const total = Number(r['total'] ?? (r['items'] as User[]).length);
    return { items: r['items'] as User[], total: Number.isFinite(total) ? total : 0 };
  }
  return { items: [], total: 0 };
}
