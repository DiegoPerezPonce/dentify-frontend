import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PatientService } from '../patient.service';
import { PatientListQuery, PatientRow } from '../models/patient-list.models';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './patient-list.html',
  styleUrl: './patient-list.scss'
})
export class PatientListComponent implements OnInit {
  private patientService = inject(PatientService);
  private router = inject(Router);

  readonly search = new FormControl('', { nonNullable: true });
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 20, 50] as const;

  readonly items = signal<PatientRow[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  
  readonly showDeleteModal = signal(false);
  readonly patientToDelete = signal<PatientRow | null>(null);
  readonly deleting = signal(false);

  readonly totalPages = computed(() => {
    const t = this.total();
    const ps = this.pageSize();
    return Math.max(1, Math.ceil(t / ps) || 1);
  });

  readonly rangeLabel = computed(() => {
    const t = this.total();
    const p = this.page();
    const ps = this.pageSize();
    if (t === 0) return '';
    const from = (p - 1) * ps + 1;
    const to = Math.min(p * ps, t);
    return `Mostrando ${from}–${to} de ${t}`;
  });

  ngOnInit(): void {
    this.search.valueChanges.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
      this.page.set(1);
      this.load();
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const q: PatientListQuery = {
      page: this.page(),
      pageSize: this.pageSize(),
      search: this.search.getRawValue()
    };
    this.patientService.list(q).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.items.set([]);
        this.total.set(0);
        this.loading.set(false);
        this.error.set(listLoadErrorMessage(err));
      }
    });
  }

  setPage(n: number): void {
    const max = this.totalPages();
    const next = Math.min(Math.max(1, n), max);
    this.page.set(next);
    this.load();
  }

  setPageSize(n: number): void {
    this.pageSize.set(n);
    this.page.set(1);
    this.load();
  }

  displayName(p: PatientRow): string {
    const parts = [p.nombre, p.apellidos ?? p.apellido].filter(Boolean);
    return parts.join(' ').trim() || '(Sin nombre)';
  }

  contactLine(p: PatientRow): string {
    const phone = p.telefono ?? p.telefon ?? '';
    const mail = p.email ?? p.mail ?? '';
    return [phone, mail].filter(Boolean).join(' · ') || '—';
  }

  dniLine(p: PatientRow): string {
    return String(p.dni ?? p.nif ?? '—');
  }

  trackById(_i: number, p: PatientRow): string {
    return String(p.id ?? p['@id'] ?? _i);
  }

  goToNewPatient(): void {
    this.router.navigate(['/app/pacientes', 'nuevo']);
  }

  goToEditPatient(p: PatientRow): void {
    const id = p.id ?? (p['@id'] ? extractIdFromIri(p['@id']) : null);
    if (id) {
      this.router.navigate(['/app/pacientes', id]);
    }
  }

  goToHistory(p: PatientRow): void {
    const id = p.id ?? (p['@id'] ? extractIdFromIri(p['@id']) : null);
    if (id) {
      this.router.navigate(['/app/pacientes', id, 'historial']);
    }
  }

  goToFirstVisit(p: PatientRow): void {
    const id = p.id ?? (p['@id'] ? extractIdFromIri(p['@id']) : null);
    if (id) {
      this.router.navigate(['/app/pacientes', id, 'primera-visita']);
    }
  }

  confirmDelete(p: PatientRow): void {
    this.patientToDelete.set(p);
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.patientToDelete.set(null);
    this.deleting.set(false);
  }

  deletePatient(): void {
    const patient = this.patientToDelete();
    if (!patient) return;

    const id = patient.id ?? (patient['@id'] ? extractIdFromIri(patient['@id']) : null);
    if (!id) {
      this.error.set('No se pudo identificar el paciente a eliminar.');
      this.cancelDelete();
      return;
    }

    this.deleting.set(true);
    this.error.set(null);

    this.patientService.delete(Number(id)).subscribe({
      next: () => {
        this.deleting.set(false);
        this.cancelDelete();
        // Recargar la lista
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.cancelDelete();
        this.error.set('Error al eliminar el paciente. Es posible que tenga datos relacionados.');
        console.error('Error deleting patient:', err);
      }
    });
  }
}

/** Extrae ID numérico de IRI de API Platform (ej: /api/patients/5 → 5). */
function extractIdFromIri(iri: string): number | null {
  const match = iri.match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function listLoadErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 401) {
      return 'El servidor rechazó el token (401). Vuelve a iniciar sesión. Si acabas de regenerar las claves JWT del backend, todas las sesiones anteriores dejan de ser válidas.';
    }
    if (err.status === 403) {
      return 'No tienes permiso para ver la lista de pacientes (403).';
    }
    if (err.status === 0) {
      return 'No hay conexión con el API (red o CORS). Comprueba que Symfony esté en marcha y que la URL base sea correcta (GET /api/patients).';
    }
    return `Error al cargar pacientes (HTTP ${err.status}). Revisa el API y la consola de red.`;
  }
  return 'No se pudo cargar la lista de pacientes. Comprueba que el API esté en marcha y la ruta GET /api/patients.';
}
