import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.authService.setToken(token);
        // Opcionalmente podrías obtener el usuario aquí
        this.router.navigate(['/']);
      }
    });
  }

  hidePassword = signal(true);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  togglePasswordVisibility() {
    this.hidePassword.update(v => !v);
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.loading.set(true);
      this.errorMessage.set(null);
      
      this.authService.login(this.loginForm.getRawValue()).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/']);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.message || 'Invalid email or password. Please try again.');
        }
      });
    }
  }

  loginWithGoogle() {
    // Redirigir al endpoint de OAuth del backend
    window.location.href = `${this.authService.apiUrl}/auth/google`;
  }
}
