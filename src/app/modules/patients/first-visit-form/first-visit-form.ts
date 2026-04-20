import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PrimeraVisitaService } from '../primera-visita.service';
import { PatientService } from '../patient.service';
import { PrimeraVisitaCreateDTO, PAIN_LEVELS } from '../models/primera-visita.models';
import { Patient } from '../models/patient.models';

@Component({
  selector: 'app-first-visit-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './first-visit-form.html',
  styleUrl: './first-visit-form.scss'
})
export class FirstVisitFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private visitaService = inject(PrimeraVisitaService);
  private patientService = inject(PatientService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly patient = signal<Patient | null>(null);
  readonly patientId = signal<number | null>(null);
  
  readonly painLevels = PAIN_LEVELS;
  readonly selectedPainLevel = signal(0);

  visitForm = this.fb.group({
    motivo_consulta: ['', [Validators.required, Validators.minLength(10)]],
    nivel_dolor: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
    observaciones: ['']
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.patientId.set(Number(id));
      this.loadPatient(Number(id));
    } else {
      this.error.set('ID de paciente no válido');
    }
  }

  loadPatient(patientId: number): void {
    this.loading.set(true);
    this.patientService.getById(patientId).subscribe({
      next: (patient) => {
        this.patient.set(patient);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('No se pudo cargar los datos del paciente.');
        console.error('Error loading patient:', err);
      }
    });
  }

  selectPainLevel(level: number): void {
    this.selectedPainLevel.set(level);
    this.visitForm.patchValue({ nivel_dolor: level });
  }

  getPainLevelData(level: number) {
    return this.painLevels.find(p => p.value === level) || this.painLevels[0];
  }

  onSubmit(): void {
    if (this.visitForm.invalid) {
      this.visitForm.markAllAsTouched();
      return;
    }

    if (!this.patientId()) {
      this.error.set('No se pudo identificar al paciente.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formValue = this.visitForm.getRawValue();
    const dto: PrimeraVisitaCreateDTO = {
      patient_id: this.patientId()!,
      motivo_consulta: formValue.motivo_consulta!,
      nivel_dolor: formValue.nivel_dolor!,
      observaciones: formValue.observaciones || undefined
    };

    this.visitaService.create(dto).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/app/pacientes', this.patientId(), 'historial']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('Error al guardar la primera visita. Intenta de nuevo.');
        console.error('Error creating first visit:', err);
      }
    });
  }

  goBack(): void {
    if (this.patientId()) {
      this.router.navigate(['/app/pacientes', this.patientId()]);
    } else {
      this.router.navigate(['/app/pacientes']);
    }
  }

  hasError(field: string): boolean {
    const control = this.visitForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  getErrorMessage(field: string): string {
    const control = this.visitForm.get(field);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    if (control.errors['min']) return 'Valor mínimo: 0';
    if (control.errors['max']) return 'Valor máximo: 10';

    return 'Campo inválido';
  }
}
