import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  /** Controla si la contraseña es visible */
  showPassword = false;

  /** Controla el estado de carga del botón */
  isLoading = false;

  /** Mensaje de error proveniente del servidor */
  serverError = '';

  /** Mensaje de éxito */
  successMessage = '';

  registerForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, {
    validators: this.passwordMatchValidator
  });

  /** Validador para asegurar que las contraseñas coinciden */
  passwordMatchValidator(g: any) {
    return g.get('password').value === g.get('confirmPassword').value
      ? null : { 'mismatch': true };
  }

  /** Alterna la visibilidad de la contraseña */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Devuelve true si el campo tiene errores Y ha sido tocado.
   */
  showError(field: string): boolean {
    const control = this.registerForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  /**
   * Devuelve true si el campo es válido y ha sido tocado.
   */
  isValid(field: string): boolean {
    const control = this.registerForm.get(field);
    return !!(control && control.valid && control.touched);
  }

  onSubmit(): void {
    this.registerForm.markAllAsTouched();

    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.serverError = '';
    this.successMessage = '';

    const { username, email, password } = this.registerForm.getRawValue();

    const userData = {
      username: username!,
      email: email!,
      password: password!
    };

    this.authService.register(userData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.successMessage = 'Registro completado con éxito. Redirigiendo al login...';
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 3000);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.serverError = err.error?.message || 'Error al registrar el usuario. Inténtalo de nuevo.';
      }
    });
  }
}
