import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // TODO: Move to environment configuration
  private readonly API_URL = 'http://localhost:8080/api/auth';
  private readonly TOKEN_KEY = 'dentify_token';

  private isAuthenticatedSignal = signal<boolean>(!!this.getToken());

  loginWithGoogle(): void {
    // Redirect to backend OAuth endpoint
    window.location.href = `${this.API_URL}/google`;
  }

  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.isAuthenticatedSignal.set(true);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.isAuthenticatedSignal.set(false);
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSignal();
  }

  getUserRoles(): string[] {
    const token = this.getToken();
    if (!token) return [];

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Assuming roles are in 'roles' or 'authorities' or 'role' claim
      const roles = payload.roles || payload.authorities || payload.role || [];
      return Array.isArray(roles) ? roles : [roles];
    } catch (e) {
      console.error('Error decoding token', e);
      return [];
    }
  }

  hasRole(role: string): boolean {
    return this.getUserRoles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.getUserRoles();
    return roles.some(role => userRoles.includes(role));
  }
}

