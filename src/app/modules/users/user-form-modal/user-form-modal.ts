import { Component, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../user.service';
import { User, UserCreateDTO, UserUpdateDTO, AVAILABLE_ROLES } from '../models/user.models';
import { HttpErrorResponse } from '@angular/common/http';
import { DENTIST_SPECIALTIES } from '../../dentists/models/dentist.models';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form-modal.html',
  styleUrl: './user-form-modal.scss'
})
export class UserFormModalComponent implements OnChanges {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);

  @Input() isOpen = false;
  @Input() user: User | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly form: FormGroup;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly specialties = DENTIST_SPECIALTIES;
  readonly availableRoles = AVAILABLE_ROLES;

  constructor() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', []],
      nombre_usuario: ['', Validators.required],
      role: ['ROLE_USER', Validators.required],
      dentistNombre: [''],
      dentistApellidos: [''],
      dentistEspecialidad: ['']
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] || changes['isOpen']) {
      if (this.isOpen) {
        this.resetForm();
      }
    }
  }

  resetForm(): void {
    this.error.set(null);

    if (this.user) {
      // Edit mode
      const primaryRole = this.user.roles.find(r => r === 'ROLE_ADMIN') || 'ROLE_USER';
      
      this.form.patchValue({
        email: this.user.email,
        password: '',
        nombre_usuario: this.user.nombre_usuario,
        role: primaryRole,
        dentistNombre: '',
        dentistApellidos: '',
        dentistEspecialidad: ''
      });
      
      // Password is optional when editing
      this.form.get('password')?.clearValidators();
      this.setDentistValidators(false);
    } else {
      // Create mode
      this.form.reset({
        email: '',
        password: '',
        nombre_usuario: '',
        role: 'ROLE_USER',
        dentistNombre: '',
        dentistApellidos: '',
        dentistEspecialidad: ''
      });
      
      // Password is required when creating
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.setDentistValidators(true);
    }
    
    this.form.get('password')?.updateValueAndValidity();
  }

  get isEditMode(): boolean {
    return this.user !== null;
  }

  get modalTitle(): string {
    return this.isEditMode ? 'Editar Usuario' : 'Crear Nuevo Usuario';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const formValue = this.form.value;
    const selectedRole = formValue.role;

    if (this.isEditMode && this.user) {
      // Update existing user
      const dto: UserUpdateDTO = {
        email: formValue.email,
        nombre_usuario: formValue.nombre_usuario,
        roles: [selectedRole]
      };

      // Only include password if it was changed
      if (formValue.password && formValue.password.trim() !== '') {
        dto.password = formValue.password;
      }

      this.userService.update(this.user.id, dto).subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.error.set(this.getErrorMessage(err));
        }
      });
    } else {
      // Create new user
      const dto: UserCreateDTO = {
        email: formValue.email,
        password: formValue.password,
        nombre_usuario: formValue.nombre_usuario,
        roles: [selectedRole],
        dentistNombre: formValue.dentistNombre,
        dentistApellidos: formValue.dentistApellidos,
        dentistEspecialidad: formValue.dentistEspecialidad
      };

      this.userService.create(dto).subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.error.set(this.getErrorMessage(err));
        }
      });
    }
  }

  onClose(): void {
    if (!this.saving()) {
      this.form.reset();
      this.error.set(null);
      this.close.emit();
    }
  }

  private setDentistValidators(required: boolean): void {
    const requiredValidator = required ? [Validators.required] : [];
    this.form.get('dentistNombre')?.setValidators(requiredValidator);
    this.form.get('dentistApellidos')?.setValidators(requiredValidator);
    this.form.get('dentistEspecialidad')?.setValidators(requiredValidator);
    this.form.get('dentistNombre')?.updateValueAndValidity();
    this.form.get('dentistApellidos')?.updateValueAndValidity();
    this.form.get('dentistEspecialidad')?.updateValueAndValidity();
  }

  getFieldError(fieldName: string): string | null {
    const control = this.form.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return null;
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio';
    }
    if (control.errors['email']) {
      return 'Ingresa un email válido';
    }
    if (control.errors['minlength']) {
      const minLength = control.errors['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }

    return 'Campo inválido';
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 400) {
        const message = err.error?.message;
        if (message && typeof message === 'string') {
          return message;
        }
        return 'Datos inválidos. Verifica los campos del formulario.';
      }
      if (err.status === 401) {
        return 'No estás autenticado. Vuelve a iniciar sesión.';
      }
      if (err.status === 403) {
        return 'No tienes permisos para realizar esta acción.';
      }
      if (err.status === 409) {
        return 'El email o nombre de usuario ya está en uso.';
      }
      return `Error del servidor (${err.status}): ${err.error?.message || err.statusText}`;
    }
    return 'Error al guardar el usuario. Intenta nuevamente.';
  }
}
