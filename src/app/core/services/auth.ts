import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);

  private readonly TOKEN_KEY = 'auth_token';
  public readonly apiUrl = 'YOUR_API_BASE_URL'; // Update with real API URL

  currentUser = signal<any>(null);

  constructor() { }

  // Guarda el token que recibes de Symfony
  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  // Recupera el token para el Interceptor
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Borra el token al cerrar sesión
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUser.set(null);
  }

  // Comprueba si el usuario está logueado
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  login(credentials: { email?: string | null; password?: string | null }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((response: any) => {
        if (response && response.token) {
          this.setToken(response.token);
          this.currentUser.set(response.user);
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, userData);
  }
}