import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    RouterLink
  ],
  template: `
    <div class="login-container">
      <div class="glass-card">
        <div class="logo-section">
          <mat-icon class="app-logo">health_and_safety</mat-icon>
          <h1>Dentify</h1>
          <p class="subtitle">Welcome back! Please login to your account.</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" placeholder="name@example.com">
            <mat-icon matSuffix>email</mat-icon>
            @if (loginForm.get('email')?.hasError('required')) {
              <mat-error>Email is required</mat-error>
            }
            @if (loginForm.get('email')?.hasError('email')) {
              <mat-error>Enter a valid email</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Password</mat-label>
            <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="password">
            <button mat-icon-button matSuffix (click)="togglePassword($event)" [attr.aria-label]="'Hide password'" [attr.aria-pressed]="hidePassword()">
              <mat-icon>{{hidePassword() ? 'visibility_off' : 'visibility'}}</mat-icon>
            </button>
            @if (loginForm.get('password')?.hasError('required')) {
              <mat-error>Password is required</mat-error>
            }
          </mat-form-field>

          <div class="actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="loginForm.invalid" class="submit-btn" [class.loading]="isLoading()">
              @if (isLoading()) {
                Loading...
              } @else {
                LOGIN
              }
            </button>
          </div>
        </form>

        <div class="footer">
          <span>Don't have an account?</span>
          <a routerLink="/register">Register here</a>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
    }

    .login-container {
      height: 100%;
      width: 100%;
      background: url('/login-bg.png') no-repeat center center fixed;
      background-size: cover;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: 'Outfit', sans-serif;
    }

    .glass-card {
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 24px;
      padding: 40px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
      transition: transform 0.3s ease;
    }

    .glass-card:hover {
      transform: translateY(-5px);
    }

    .logo-section {
      text-align: center;
      margin-bottom: 30px;
    }

    .app-logo {
      font-size: 48px;
      height: 48px;
      width: 48px;
      color: #008080;
      margin-bottom: 10px;
    }

    h1 {
      margin: 0;
      font-size: 2.5rem;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: -1px;
    }

    .subtitle {
      color: #555;
      font-size: 0.9rem;
      margin-top: 5px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 10px;
    }

    .actions {
      margin-top: 20px;
    }

    .submit-btn {
      width: 100%;
      padding: 24px !important;
      border-radius: 12px !important;
      font-weight: 600 !important;
      letter-spacing: 1px !important;
      background-color: #008080 !important;
      color: white !important;
      transition: background-color 0.3s ease;
    }

    .submit-btn:hover {
      background-color: #006666 !important;
    }

    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 0.9rem;
      color: #444;
    }

    .footer a {
      color: #008080;
      text-decoration: none;
      font-weight: 600;
      margin-left: 5px;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    /* Angular Material Theme Overrides for Glassmorphism */
    ::ng-deep .mat-mdc-form-field-focus-overlay {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }

    ::ng-deep .mat-mdc-text-field-wrapper {
      background-color: rgba(255, 255, 255, 0.5) !important;
    }
  `
})
export class LoginComponent {
  loginForm: FormGroup;
  hidePassword = signal(true);
  isLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  togglePassword(event: MouseEvent) {
    this.hidePassword.set(!this.hidePassword());
    event.stopPropagation();
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      
      // Simulate API call
      setTimeout(() => {
        this.isLoading.set(false);
        const { email, password } = this.loginForm.value;
        
        if (email === 'admin@dentify.com' && password === 'admin123') {
          this.snackBar.open('Login Successful! Welcome to Dentify.', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          // this.router.navigate(['/dashboard']);
        } else {
          this.snackBar.open('Invalid credentials. Please try again.', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      }, 1500);
    }
  }
}
