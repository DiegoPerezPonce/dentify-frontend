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
  selector: 'app-register',
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
    <div class="register-container">
      <div class="glass-card">
        <div class="logo-section">
          <mat-icon class="app-logo">person_add</mat-icon>
          <h1>Create Account</h1>
          <p class="subtitle">Join Dentify today and manage your dental health.</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Full Name</mat-label>
            <input matInput formControlName="fullName" placeholder="John Doe">
            <mat-icon matSuffix>person</mat-icon>
            @if (registerForm.get('fullName')?.hasError('required')) {
              <mat-error>Full name is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" placeholder="name@example.com">
            <mat-icon matSuffix>email</mat-icon>
            @if (registerForm.get('email')?.hasError('required')) {
              <mat-error>Email is required</mat-error>
            }
            @if (registerForm.get('email')?.hasError('email')) {
              <mat-error>Enter a valid email</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Password</mat-label>
            <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="password">
            <button mat-icon-button matSuffix (click)="togglePassword($event)" type="button">
              <mat-icon>{{hidePassword() ? 'visibility_off' : 'visibility'}}</mat-icon>
            </button>
            @if (registerForm.get('password')?.hasError('required')) {
              <mat-error>Password is required</mat-error>
            }
            @if (registerForm.get('password')?.hasError('minlength')) {
              <mat-error>Minimum 6 characters required</mat-error>
            }
          </mat-form-field>

          <div class="actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="registerForm.invalid" class="submit-btn" [class.loading]="isLoading()">
              @if (isLoading()) {
                Creating Account...
              } @else {
                REGISTER
              }
            </button>
          </div>
        </form>

        <div class="footer">
          <span>Already have an account?</span>
          <a routerLink="/login">Login here</a>
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

    .register-container {
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
      max-width: 450px;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
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
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a1a;
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

    .submit-btn {
      width: 100%;
      padding: 24px !important;
      border-radius: 12px !important;
      font-weight: 600 !important;
      background-color: #008080 !important;
      color: white !important;
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

    ::ng-deep .mat-mdc-text-field-wrapper {
      background-color: rgba(255, 255, 255, 0.5) !important;
    }
  `
})
export class RegisterComponent {
  registerForm: FormGroup;
  hidePassword = signal(true);
  isLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  togglePassword(event: MouseEvent) {
    this.hidePassword.set(!this.hidePassword());
    event.stopPropagation();
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading.set(true);
      
      // Simulate API call
      setTimeout(() => {
        this.isLoading.set(false);
        this.snackBar.open('Account created successfully! You can now login.', 'Close', {
          duration: 4000,
          panelClass: ['success-snackbar']
        });
        this.router.navigate(['/login']);
      }, 2000);
    }
  }
}
