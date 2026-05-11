import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-base';
import { getJwtDisplayName, getJwtDentistId, getJwtEmail, parseRolesFromJwt } from '../utils/jwt-roles';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly TOKEN_KEY = 'auth_token';
  private readonly API_URL = `${API_BASE_URL}/login`;

  login(credentials: unknown): Observable<{ token?: string }> {
    return this.http.post<{ token?: string }>(this.API_URL, credentials).pipe(
      tap((response) => {
        if (response.token) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
        }
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    const t = this.getToken();
    return !!t && t.trim().length > 0;
  }

  /** Roles del JWT (`roles` en payload; sin validar firma). */
  getRoles(): string[] {
    return parseRolesFromJwt(this.getToken());
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const mine = this.getRoles();
    return roles.some((r) => mine.includes(r));
  }

  /** Nombre para saludos (claims del JWT; sin verificar firma). */
  getDisplayName(): string | null {
    return getJwtDisplayName(this.getToken());
  }

  /** Email del JWT si existe. */
  getEmail(): string | null {
    return getJwtEmail(this.getToken());
  }

  /** Id de ficha odontólogo si el email del usuario coincide con `Dentist.email` (claim en JWT). */
  getDentistId(): number | null {
    return getJwtDentistId(this.getToken());
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }
}
