import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OdontogramaService } from '../odontograma.service';
import { PatientService } from '../patient.service';
import {
  Odontograma,
  OdontogramaToothStatusDTO,
  FDI_TEETH,
  TOOTH_STATES,
  FACE_LABELS,
  ToothFaceStatus,
  OdontogramaColor
} from '../models/odontograma.models';
import { Patient } from '../models/patient.models';

interface ToothSelection {
  toothId: string;
  face: string | null;
}

@Component({
  selector: 'app-odontograma-interactive',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './odontograma-interactive.html',
  styleUrl: './odontograma-interactive.scss'
})
export class OdontogramaInteractiveComponent implements OnInit {
  private odontogramaService = inject(OdontogramaService);
  private patientService = inject(PatientService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly patient = signal<Patient | null>(null);
  readonly odontograma = signal<Odontograma | null>(null);
  
  readonly selectedTooth = signal<ToothSelection | null>(null);
  readonly selectedState = signal<string>('SANO');
  
  readonly FDI_TEETH = FDI_TEETH;
  readonly TOOTH_STATES = TOOTH_STATES;
  readonly FACE_LABELS = FACE_LABELS;
  readonly faces = ['V', 'L', 'O', 'M', 'D'];

  readonly stateGroups = computed(() => {
    const states = Object.entries(TOOTH_STATES);
    return {
      patologias: states.filter(([_, s]) => s.tipo === 'patologia'),
      tratamientos: states.filter(([_, s]) => s.tipo === 'tratamiento'),
      estados: states.filter(([_, s]) => s.tipo === 'estado'),
      prevencion: states.filter(([_, s]) => s.tipo === 'prevencion')
    };
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.loadPatientAndOdontograma(Number(id));
    } else {
      this.error.set('ID de paciente no válido');
    }
  }

  loadPatientAndOdontograma(patientId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.patientService.getById(patientId).subscribe({
      next: (patient) => {
        this.patient.set(patient);
        this.loadOdontograma(patientId);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('No se pudo cargar los datos del paciente.');
        console.error('Error loading patient:', err);
      }
    });
  }

  loadOdontograma(patientId: number): void {
    this.odontogramaService.getByPatientId(patientId).subscribe({
      next: (odontogramas) => {
        if (odontogramas && odontogramas.length > 0) {
          // Ya existe un odontograma, usar el primero
          this.odontograma.set(odontogramas[0]);
          this.loading.set(false);
        } else {
          // No existe odontograma, crear uno nuevo
          this.createOdontograma(patientId);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el odontograma.');
        console.error('Error loading odontograma:', err);
      }
    });
  }

  createOdontograma(patientId: number): void {
    this.odontogramaService.create(patientId).subscribe({
      next: (odontograma) => {
        this.odontograma.set(odontograma);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('No se pudo crear el odontograma.');
        console.error('Error creating odontograma:', err);
      }
    });
  }

  selectTooth(toothId: number): void {
    this.selectedTooth.set({ toothId: String(toothId), face: null });
  }

  selectFace(face: string): void {
    const current = this.selectedTooth();
    if (current) {
      this.selectedTooth.set({ ...current, face });
    }
  }

  applyState(): void {
    const selection = this.selectedTooth();
    const state = this.selectedState();
    const odonto = this.odontograma();

    if (!selection || !selection.face || !odonto) {
      this.error.set('Selecciona un diente y una cara primero.');
      return;
    }

    const stateData = TOOTH_STATES[state as keyof typeof TOOTH_STATES];
    if (!stateData) {
      this.error.set('Estado no válido.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const dto: OdontogramaToothStatusDTO = {
      diente: selection.toothId,
      cara: selection.face,
      estado: state,
      color: stateData.color,
      tipo: stateData.tipo
    };

    this.odontogramaService.updateToothStatus(odonto.id, dto).subscribe({
      next: (updated) => {
        this.odontograma.set(updated);
        this.saving.set(false);
        // Mantener selección para aplicar a otra cara si se desea
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set('Error al actualizar el odontograma.');
        console.error('Error updating tooth status:', err);
      }
    });
  }

  getToothStatus(toothId: string, face: string): ToothFaceStatus | null {
    const odonto = this.odontograma();
    if (!odonto || !odonto.dientes) return null;
    
    const tooth = odonto.dientes[toothId];
    if (!tooth) return null;
    
    return tooth[face] || null;
  }

  getToothStateLabel(estado: string): string {
    const stateKey = estado as keyof typeof TOOTH_STATES;
    return TOOTH_STATES[stateKey]?.label || 'Desconocido';
  }

  getToothColor(toothId: string): string {
    const odonto = this.odontograma();
    if (!odonto || !odonto.dientes) return '#fff';
    
    const tooth = odonto.dientes[toothId];
    if (!tooth) return '#fff';
    
    // Si tiene alguna cara con estado, usar el color más crítico (prioridad: rojo > azul > verde > negro)
    const colors = Object.values(tooth).map((status: ToothFaceStatus) => status.color);
    if (colors.includes(OdontogramaColor.RED)) return OdontogramaColor.RED;
    if (colors.includes(OdontogramaColor.BLUE)) return OdontogramaColor.BLUE;
    if (colors.includes(OdontogramaColor.GREEN)) return OdontogramaColor.GREEN;
    if (colors.includes(OdontogramaColor.BLACK)) return OdontogramaColor.BLACK;
    
    return '#fff';
  }

  getFaceColor(toothId: string, face: string): string {
    const status = this.getToothStatus(toothId, face);
    return status ? status.color : '#e2e8f0';
  }

  isToothSelected(toothId: number): boolean {
    const selection = this.selectedTooth();
    return selection?.toothId === String(toothId);
  }

  isFaceSelected(face: string): boolean {
    const selection = this.selectedTooth();
    return selection?.face === face;
  }

  clearSelection(): void {
    this.selectedTooth.set(null);
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
}
