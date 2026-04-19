import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  protected authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  /** Controla si la contraseña es visible */
  showPassword = false;

  /** Controla el estado de carga del botón */
  isLoading = false;

  /** Mensaje de error proveniente del servidor */
  serverError = '';

  /** Aviso cuando el guard redirige por JWT caducado. */
  readonly sessionExpiredNotice = signal<string | null>(null);

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

  ngOnInit(): void {
    const motivo = this.route.snapshot.queryParamMap.get('motivo');
    if (motivo === 'sesion-expirada') {
      this.sessionExpiredNotice.set('Tu sesión ha caducado. Vuelve a iniciar sesión.');
    }
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
        this.router.navigate(['/app/dashboard']);
      },
      error: (err: any) => {
        //console.error('Error en el login', err);
        this.isLoading = false;
        this.serverError = 'Credenciales incorrectas. Inténtalo de nuevo.';
      }
    });
  }
}