import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PatientService } from '../patient.service';
import { PatientCreateDTO, PatientUpdateDTO } from '../models/patient.models';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './patient-form.html',
  styleUrl: './patient-form.scss'
})
export class PatientFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private patientService = inject(PatientService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isEditMode = signal(false);
  readonly patientId = signal<number | null>(null);

  patientForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellidos: ['', [Validators.required, Validators.minLength(2)]],
    dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}[A-Z]$/)]],
    nss: [''],
    telefono: ['', [Validators.pattern(/^[0-9]{9}$/)]],
    email: ['', [Validators.email]],
    enfermedades: [''],
    alergias: [''],
    historial_clinico: [''],
    datos_facturacion: ['']
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.isEditMode.set(true);
      this.patientId.set(Number(id));
      this.loadPatient(Number(id));
    }
  }

  loadPatient(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.patientService.getById(id).subscribe({
      next: (patient) => {
        this.patientForm.patchValue({
          nombre: patient.nombre,
          apellidos: patient.apellidos,
          dni: patient.dni,
          nss: patient.nss ?? '',
          telefono: patient.telefono ?? '',
          email: patient.email ?? '',
          enfermedades: patient.enfermedades ?? '',
          alergias: patient.alergias ?? '',
          historial_clinico: patient.historial_clinico ?? '',
          datos_facturacion: patient.datos_facturacion ?? ''
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el paciente. Verifica que el ID sea correcto.');
        console.error('Error loading patient:', err);
      }
    });
  }

  onSubmit(): void {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formValue = this.patientForm.getRawValue();

    if (this.isEditMode()) {
      const dto: PatientUpdateDTO = {
        nombre: formValue.nombre!,
        apellidos: formValue.apellidos!,
        dni: formValue.dni!,
        nss: formValue.nss || undefined,
        telefono: formValue.telefono || undefined,
        email: formValue.email || undefined,
        enfermedades: formValue.enfermedades || undefined,
        alergias: formValue.alergias || undefined,
        historial_clinico: formValue.historial_clinico || undefined,
        datos_facturacion: formValue.datos_facturacion || undefined
      };

      this.patientService.update(this.patientId()!, dto).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/app/pacientes']);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set('Error al actualizar el paciente. Revisa los datos e intenta de nuevo.');
          console.error('Error updating patient:', err);
        }
      });
    } else {
      const dto: PatientCreateDTO = {
        nombre: formValue.nombre!,
        apellidos: formValue.apellidos!,
        dni: formValue.dni!,
        nss: formValue.nss || undefined,
        telefono: formValue.telefono || undefined,
        email: formValue.email || undefined,
        enfermedades: formValue.enfermedades || undefined,
        alergias: formValue.alergias || undefined,
        historial_clinico: formValue.historial_clinico || undefined,
        datos_facturacion: formValue.datos_facturacion || undefined
      };

      this.patientService.create(dto).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/app/pacientes']);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set('Error al crear el paciente. Revisa los datos e intenta de nuevo.');
          console.error('Error creating patient:', err);
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/app/pacientes']);
  }

  goToHistory(): void {
    if (this.patientId()) {
      this.router.navigate(['/app/pacientes', this.patientId(), 'historial']);
    }
  }

  hasError(field: string): boolean {
    const control = this.patientForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  getErrorMessage(field: string): string {
    const control = this.patientForm.get(field);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    if (control.errors['pattern']) {
      if (field === 'dni') return 'Formato: 8 dígitos + letra (ej: 12345678A)';
      if (field === 'telefono') return 'Formato: 9 dígitos (ej: 612345678)';
    }
    if (control.errors['email']) return 'Email no válido';

    return 'Campo inválido';
  }
}
