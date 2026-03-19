import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';

  constructor() {}

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
  }

  // Comprueba si el usuario está logueado
  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}