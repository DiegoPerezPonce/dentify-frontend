import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PatientService } from '../patient.service';
import { Patient } from '../models/patient.models';
import { getPacienteIdFromRoute } from '../patient-route-id.util';
import { ActivatedRoute } from '@angular/router';
import {
  medicalFlagLabels,
  patientMedicalSeverity,
  type MedicalAlertSeverity
} from '../medical-flags.constants';

@Component({
  selector: 'app-patient-record',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-record.html',
  styleUrl: './patient-record.scss'
})
export class PatientRecordComponent implements OnInit {
  private patientService = inject(PatientService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly patient = signal<Patient | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly showDeleteModal = signal(false);
  readonly deleting = signal(false);

  readonly patientId = signal<number | null>(null);

  readonly displayName = computed(() => {
    const p = this.patient();
    if (!p) return '';
    return `${p.nombre} ${p.apellidos}`.trim();
  });

  readonly medicalSeverity = computed((): MedicalAlertSeverity | null => {
    const p = this.patient();
    if (!p) return null;
    return patientMedicalSeverity(p.medical_flags) || null;
  });

  readonly medicalTitle = computed(() => {
    const p = this.patient();
    if (!p?.medical_flags?.length) return '';
    return medicalFlagLabels(p.medical_flags).join(', ');
  });

  ngOnInit(): void {
    const idStr = getPacienteIdFromRoute(this.route);
    if (!idStr || !/^\d+$/.test(idStr)) {
      this.error.set('Paciente no válido.');
      this.loading.set(false);
      return;
    }
    const id = Number(idStr);
    this.patientId.set(id);
    this.loadPatient(id);
  }

  private loadPatient(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.patientService.getById(id).subscribe({
      next: (p) => {
        this.patient.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.patient.set(null);
        this.loading.set(false);
        this.error.set('No se pudo cargar la ficha del paciente.');
      }
    });
  }

  goBackToList(): void {
    this.router.navigate(['/app/pacientes']);
  }

  goToRadiografias(): void {
    const id = this.patientId();
    if (id) this.router.navigate(['/app/pacientes', id, 'radiografias']);
  }

  goToOdontograma(): void {
    const id = this.patientId();
    if (id) this.router.navigate(['/app/pacientes', id, 'odontograma']);
  }

  goToFirstVisit(): void {
    const id = this.patientId();
    if (id) this.router.navigate(['/app/pacientes', id, 'primera-visita']);
  }

  goToHistory(): void {
    const id = this.patientId();
    if (id) this.router.navigate(['/app/pacientes', id, 'historial']);
  }

  goToEdit(): void {
    const id = this.patientId();
    if (id) this.router.navigate(['/app/pacientes', id, 'editar']);
  }

  confirmDelete(): void {
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.deleting.set(false);
  }

  deletePatient(): void {
    const id = this.patientId();
    if (!id) return;

    this.deleting.set(true);
    this.patientService.delete(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.router.navigate(['/app/pacientes']);
      },
      error: () => {
        this.deleting.set(false);
        this.showDeleteModal.set(false);
        this.error.set('Error al eliminar el paciente. Es posible que tenga datos relacionados.');
      }
    });
  }
}
