import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient); // Inyectamos HttpClient para hacer peticiones
  private readonly TOKEN_KEY = 'auth_token';
  private readonly API_URL = 'http://localhost:8000/api/login'; // Tu URL de Symfony
  private readonly GOOGLE_AUTH_URL = 'http://localhost:8000/api/login/google'; // URL para iniciar el flujo de Google

  // ESTA ES LA FUNCIÓN QUE TE FALTA:
  login(credentials: any): Observable<any> {
    return this.http.post<any>(this.API_URL, credentials).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
        }
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }
}