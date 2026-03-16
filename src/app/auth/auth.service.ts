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
}
