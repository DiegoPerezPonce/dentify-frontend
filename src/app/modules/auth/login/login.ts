import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  /** Controla si la contraseña es visible */
  showPassword = false;

  /** Controla el estado de carga del botón */
  isLoading = false;

  /** Mensaje de error proveniente del servidor */
  serverError = '';

  loginForm = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  /** Alterna la visibilidad de la contraseña */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Devuelve true si el campo tiene errores Y ha sido tocado (para mostrar el error).
   */
  showError(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  /**
   * Devuelve true si el campo es válido y ha sido tocado (para mostrar el check verde).
   */
  isValid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.valid && control.touched);
  }

  onSubmit(): void {
    // Marcar todos los campos como tocados para mostrar errores si los hay
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.serverError = '';

    const { identifier, password } = this.loginForm.getRawValue();

    // Enviamos 'identifier' como 'email' para compatibilidad con el backend existente
    const credentials = { login: identifier!, password: password! };

    this.authService.login(credentials).subscribe({
      next: (response: any) => {
        //console.log('Login exitoso', response);
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        //console.error('Error en el login', err);
        this.isLoading = false;
        this.serverError = 'Credenciales incorrectas. Inténtalo de nuevo.';
      }
    });
  }
}