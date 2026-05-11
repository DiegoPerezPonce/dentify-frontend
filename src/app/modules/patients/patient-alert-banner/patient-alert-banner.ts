import { Component, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientService } from '../patient.service';
import { medicalFlagLabels, patientMedicalSeverity } from '../medical-flags.constants';
import type { MedicalAlertSeverity } from '../medical-flags.constants';

@Component({
  selector: 'app-patient-alert-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-alert-banner.html',
  styleUrl: './patient-alert-banner.scss'
})
export class PatientAlertBannerComponent {
  private patientService = inject(PatientService);

  /** Id numérico del paciente. */
  readonly patientId = input.required<number>();

  readonly loading = signal(false);
  readonly flags = signal<string[]>([]);
  readonly notes = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly severity = signal<MedicalAlertSeverity>(null);
  readonly labels = signal<string[]>([]);

  constructor() {
    effect(() => {
      const id = this.patientId();
      this.load(id);
    });
  }

  private load(id: number): void {
    if (!id || Number.isNaN(id)) return;

    this.loading.set(true);
    this.error.set(null);
    this.patientService.getById(id).subscribe({
      next: (p) => {
        const raw = p.medical_flags;
        const list = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
        this.flags.set(list);
        this.notes.set(p.medical_notes?.trim() ? p.medical_notes : null);
        this.severity.set(patientMedicalSeverity(list));
        this.labels.set(medicalFlagLabels(list));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar la información de alerta médica.');
      }
    });
  }
}
