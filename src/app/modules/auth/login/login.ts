import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth'; // Asegúrate de que este sea el nombre real
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html', // <--- Nombre exacto de tu archivo
  styleUrl: './login.scss'      // <--- Nombre exacto y en singular para Angular 17+
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  onSubmit() {
    if (this.loginForm.valid) {
      // getRawValue() devuelve el objeto con tipos definidos, evitando el error de 'unknown'
      const credentials = this.loginForm.getRawValue();
      
      this.authService.login(credentials).subscribe({
        next: (response: any) => { // Tipamos la respuesta como 'any' para evitar quejas
          console.log('Login exitoso', response);
          this.router.navigate(['/dashboard']);
        },
        error: (err: any) => { // Tipamos el error como 'any' para solucionar el error ts(7006)
          console.error('Error en el login', err);
          alert('Credenciales incorrectas');
        }
      });
    }
  }
}