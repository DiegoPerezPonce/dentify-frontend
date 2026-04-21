import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PatientService } from '../patient.service';
import { ClinicalHistory, HISTORY_TYPE_COLORS, HISTORY_TYPE_LABELS } from '../models/clinical-history.models';
import { Patient } from '../models/patient.models';

@Component({
  selector: 'app-medical-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './medical-history.html',
  styleUrl: './medical-history.scss'
})
export class MedicalHistoryComponent implements OnInit {
  private patientService = inject(PatientService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly patient = signal<Patient | null>(null);
  readonly history = signal<ClinicalHistory[]>([]);

  readonly typeColors = HISTORY_TYPE_COLORS;
  readonly typeLabels = HISTORY_TYPE_LABELS;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.loadPatientAndHistory(Number(id));
    } else {
      this.error.set('ID de paciente no válido');
    }
  }

  loadPatientAndHistory(patientId: number): void {
    this.loading.set(true);
    this.error.set(null);

    // Cargar datos del paciente primero
    this.patientService.getById(patientId).subscribe({
      next: (patient) => {
        this.patient.set(patient);
        this.loadHistory(patientId);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('No se pudo cargar los datos del paciente.');
        console.error('Error loading patient:', err);
      }
    });
  }

  loadHistory(patientId: number): void {
    this.patientService.getHistory(patientId).subscribe({
      next: (history) => {
        // Ordenar cronológicamente (más reciente primero)
        const sorted = history.sort((a, b) => {
          return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
        });
        this.history.set(sorted);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el historial clínico.');
        console.error('Error loading history:', err);
      }
    });
  }

  getTypeColor(tipo: string): string {
    return this.typeColors[tipo.toLowerCase()] || this.typeColors['otro'];
  }

  getTypeLabel(tipo: string): string {
    return this.typeLabels[tipo.toLowerCase()] || tipo;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Hoy';
    if (diffInDays === 1) return 'Ayer';
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    if (diffInDays < 30) return `Hace ${Math.floor(diffInDays / 7)} semanas`;
    if (diffInDays < 365) return `Hace ${Math.floor(diffInDays / 30)} meses`;
    return `Hace ${Math.floor(diffInDays / 365)} años`;
  }

  goBack(): void {
    this.router.navigate(['/app/pacientes']);
  }

  goToPatientEdit(): void {
    const id = this.patient()?.id;
    if (id) {
      this.router.navigate(['/app/pacientes', id]);
    }
  }

  goToFirstVisit(): void {
    const id = this.patient()?.id;
    if (id) {
      this.router.navigate(['/app/pacientes', id, 'primera-visita']);
    }
  }

  goToOdontograma(): void {
    const id = this.patient()?.id;
    if (id) {
      this.router.navigate(['/app/pacientes', id, 'odontograma']);
    }
  }
}
