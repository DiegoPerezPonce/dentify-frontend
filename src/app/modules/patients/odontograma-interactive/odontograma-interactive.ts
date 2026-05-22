import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  QueryList,
  signal,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OdontogramaService } from '../odontograma.service';
import { PatientService } from '../patient.service';
import {
  Odontograma,
  OdontogramaBridgeDTO,
  OdontogramaToothStatusDTO,
  FDI_TEETH,
  TOOTH_STATES,
  TOOTH_LEVEL_STATES,
  TOOTH_LEVEL_FACE,
  TOOTH_ENDODONCIA_FACE,
  ENDODONCIA_TOOTH_STATES,
  TOOTH_CORONA_FACE,
  CORONA_TOOTH_STATES,
  BRIDGE_STATES,
  FACE_LABELS,
  ToothFaceStatus,
  ToothLevelStatus,
  DentalBridge,
  OdontogramaColor,
  isOdontogramaFaceKey,
  isUpperJawTooth,
  normalizeBridgePair
} from '../models/odontograma.models';
import { Patient } from '../models/patient.models';
import { getPacienteIdFromRoute } from '../patient-route-id.util';
import { OdontogramaToothChartComponent } from '../odontograma-tooth-chart/odontograma-tooth-chart';
import { AppIconComponent } from '../../../shared/app-icon/app-icon.component';

interface ToothSelection {
  toothId: string;
  face: string | null;
}

interface BridgeLineCoords {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

@Component({
  selector: 'app-odontograma-interactive',
  standalone: true,
  imports: [CommonModule, FormsModule, OdontogramaToothChartComponent, AppIconComponent],
  templateUrl: './odontograma-interactive.html',
  styleUrl: './odontograma-interactive.scss'
})
export class OdontogramaInteractiveComponent implements OnInit, AfterViewInit, OnDestroy {
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
  readonly selectedState = signal<string>('CARIES');
  readonly selectedToothLevelState = signal<string>('EXTRACCION_FUTURA');
  readonly selectedEndoState = signal<string>('ENDODONCIA_FUTURA');
  readonly selectedCoronaState = signal<string>('CORONA_FUTURA');
  readonly bridgePillarA = signal<string | null>(null);
  readonly bridgePillarB = signal<string | null>(null);
  readonly selectedBridgeState = signal<string>('PUENTE_FUTURO');
  readonly upperBridgeLines = signal<BridgeLineCoords[]>([]);
  readonly lowerBridgeLines = signal<BridgeLineCoords[]>([]);

  @ViewChild('upperRow') upperRowRef?: ElementRef<HTMLElement>;
  @ViewChild('lowerRow') lowerRowRef?: ElementRef<HTMLElement>;
  @ViewChildren('toothSlot') toothSlotRefs?: QueryList<ElementRef<HTMLElement>>;

  private resizeObserver?: ResizeObserver;
  private refreshBridgeLinesScheduled = false;

  readonly FDI_TEETH = FDI_TEETH;
  readonly TOOTH_STATES = TOOTH_STATES;
  readonly TOOTH_LEVEL_STATES = TOOTH_LEVEL_STATES;
  readonly toothLevelStateOptions = Object.entries(TOOTH_LEVEL_STATES);
  readonly endoStateOptions = Object.entries(ENDODONCIA_TOOTH_STATES);
  readonly coronaStateOptions = Object.entries(CORONA_TOOTH_STATES);
  readonly bridgeStateOptions = Object.entries(BRIDGE_STATES);
  readonly FACE_LABELS = FACE_LABELS;
  readonly faces = ['V', 'L', 'O', 'M', 'D'];

  readonly stateGroups = computed(() => {
    const states = Object.entries(TOOTH_STATES);
    return {
      patologias: states.filter(([_, s]) => s.tipo === 'patologia'),
      tratamientos: states.filter(([_, s]) => s.tipo === 'tratamiento'),
      estados: states.filter(([_, s]) => s.tipo === 'estado'),
      prevencionVerde: states.filter(
        ([_, s]) => s.tipo === 'prevencion' && s.color === OdontogramaColor.GREEN
      ),
      prevencionAmarilla: states.filter(
        ([_, s]) => s.tipo === 'prevencion' && s.color === OdontogramaColor.YELLOW
      )
    };
  });

  constructor() {
    effect(() => {
      this.odontograma()?.puentes;
      this.scheduleBridgeLinesRefresh();
    });
  }

  ngOnInit(): void {
    const id = getPacienteIdFromRoute(this.route);
    if (id && id !== 'nuevo' && /^\d+$/.test(id)) {
      this.loadPatientAndOdontograma(Number(id));
    } else {
      this.error.set('ID de paciente no válido');
    }
  }

  ngAfterViewInit(): void {
    this.toothSlotRefs?.changes.subscribe(() => this.scheduleBridgeLinesRefresh());

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleBridgeLinesRefresh());
      const upper = this.upperRowRef?.nativeElement;
      const lower = this.lowerRowRef?.nativeElement;
      if (upper) this.resizeObserver.observe(upper);
      if (lower) this.resizeObserver.observe(lower);
    }

    this.scheduleBridgeLinesRefresh();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
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
          this.scheduleBridgeLinesRefresh();
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
        this.scheduleBridgeLinesRefresh();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('No se pudo crear el odontograma.');
        console.error('Error creating odontograma:', err);
      }
    });
  }

  selectTooth(toothId: number): void {
    const id = String(toothId);
    const current = this.selectedTooth();
    if (current?.toothId === id && !current.face) return;
    this.selectedTooth.set({ toothId: id, face: null });
    const level = this.getToothLevelStatus(id);
    if (level?.estado) {
      this.selectedToothLevelState.set(level.estado);
    } else {
      this.selectedToothLevelState.set('EXTRACCION_FUTURA');
    }
    const endo = this.getEndodonciaStatus(id);
    if (endo?.estado) {
      this.selectedEndoState.set(endo.estado);
    } else {
      this.selectedEndoState.set('ENDODONCIA_FUTURA');
    }
    const corona = this.getCoronaStatus(id);
    if (corona?.estado) {
      this.selectedCoronaState.set(corona.estado);
    } else {
      this.selectedCoronaState.set('CORONA_FUTURA');
    }
  }

  onFaceSelect(toothId: number, face: string): void {
    this.selectedTooth.set({ toothId: String(toothId), face });
    const status = this.getToothStatus(String(toothId), face);
    if (status?.estado) {
      this.selectedState.set(status.estado);
    } else {
      this.selectedState.set('CARIES');
    }
  }

  hasFaceStatus(): boolean {
    const selection = this.selectedTooth();
    if (!selection?.face) return false;
    return this.getToothStatus(selection.toothId, selection.face) !== null;
  }

  hasToothLevelStatus(): boolean {
    const selection = this.selectedTooth();
    if (!selection) return false;
    return this.getToothLevelStatus(selection.toothId) !== null;
  }

  getToothMarkColor(toothId: number): string | null {
    return this.getToothLevelStatus(String(toothId))?.color ?? null;
  }

  getEndoMarkColor(toothId: number): string | null {
    return this.getEndodonciaStatus(String(toothId))?.color ?? null;
  }

  hasEndodonciaMark(): boolean {
    const selection = this.selectedTooth();
    if (!selection) return false;
    return this.getEndodonciaStatus(selection.toothId) !== null;
  }

  applyEndodonciaMark(): void {
    const selection = this.selectedTooth();
    const state = this.selectedEndoState();
    const odonto = this.odontograma();

    if (!selection || !odonto) {
      this.error.set('Selecciona un diente primero.');
      return;
    }

    const stateData = ENDODONCIA_TOOTH_STATES[state as keyof typeof ENDODONCIA_TOOTH_STATES];
    if (!stateData) {
      this.error.set('Estado de endodoncia no válido.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const dto: OdontogramaToothStatusDTO = {
      diente: selection.toothId,
      cara: TOOTH_ENDODONCIA_FACE,
      estado: state,
      color: stateData.color,
      tipo: stateData.tipo
    };

    this.odontogramaService.updateToothStatus(odonto.id, dto).subscribe({
      next: (updated) => {
        this.odontograma.set(updated);
        this.saving.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set('Error al marcar la endodoncia.');
        console.error('Error updating endodoncia mark:', err);
      }
    });
  }

  clearEndodonciaMark(): void {
    const selection = this.selectedTooth();
    const odonto = this.odontograma();

    if (!selection || !odonto) {
      this.error.set('Selecciona un diente primero.');
      return;
    }

    if (!this.getEndodonciaStatus(selection.toothId)) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.odontogramaService
      .clearToothStatus(odonto.id, selection.toothId, TOOTH_ENDODONCIA_FACE)
      .subscribe({
        next: (updated) => {
          this.odontograma.set(updated);
          this.saving.set(false);
          this.selectedEndoState.set('ENDODONCIA_FUTURA');
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set('Error al quitar la marca de endodoncia.');
          console.error('Error clearing endodoncia mark:', err);
        }
      });
  }

  getEndodonciaStateLabel(estado: string): string {
    const key = estado as keyof typeof ENDODONCIA_TOOTH_STATES;
    return ENDODONCIA_TOOTH_STATES[key]?.label ?? 'Endodoncia';
  }

  getCoronaFillColor(toothId: number): string | null {
    return this.getCoronaStatus(String(toothId))?.color ?? null;
  }

  hasCoronaMark(): boolean {
    const selection = this.selectedTooth();
    if (!selection) return false;
    return this.getCoronaStatus(selection.toothId) !== null;
  }

  applyCoronaMark(): void {
    const selection = this.selectedTooth();
    const state = this.selectedCoronaState();
    const odonto = this.odontograma();

    if (!selection || !odonto) {
      this.error.set('Selecciona un diente primero.');
      return;
    }

    const stateData = CORONA_TOOTH_STATES[state as keyof typeof CORONA_TOOTH_STATES];
    if (!stateData) {
      this.error.set('Estado de corona no válido.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const dto: OdontogramaToothStatusDTO = {
      diente: selection.toothId,
      cara: TOOTH_CORONA_FACE,
      estado: state,
      color: stateData.color,
      tipo: stateData.tipo
    };

    this.odontogramaService.updateToothStatus(odonto.id, dto).subscribe({
      next: (updated) => {
        this.odontograma.set(updated);
        this.saving.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set('Error al marcar la corona.');
        console.error('Error updating corona mark:', err);
      }
    });
  }

  clearCoronaMark(): void {
    const selection = this.selectedTooth();
    const odonto = this.odontograma();

    if (!selection || !odonto) {
      this.error.set('Selecciona un diente primero.');
      return;
    }

    if (!this.getCoronaStatus(selection.toothId)) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.odontogramaService
      .clearToothStatus(odonto.id, selection.toothId, TOOTH_CORONA_FACE)
      .subscribe({
        next: (updated) => {
          this.odontograma.set(updated);
          this.saving.set(false);
          this.selectedCoronaState.set('CORONA_FUTURA');
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set('Error al quitar la corona.');
          console.error('Error clearing corona mark:', err);
        }
      });
  }

  getCoronaStateLabel(estado: string): string {
    const key = estado as keyof typeof CORONA_TOOTH_STATES;
    return CORONA_TOOTH_STATES[key]?.label ?? 'Corona';
  }

  getBridgeRingColor(toothId: number): string | null {
    const id = String(toothId);
    const bridges = this.odontograma()?.puentes ?? [];
    for (const bridge of bridges) {
      if (bridge.diente_inicio === id || bridge.diente_fin === id) {
        return bridge.color;
      }
    }
    return null;
  }

  assignBridgePillar(which: 'a' | 'b'): void {
    const selection = this.selectedTooth();
    if (!selection) {
      this.error.set('Selecciona un diente en el odontograma primero.');
      return;
    }
    this.error.set(null);
    if (which === 'a') {
      this.bridgePillarA.set(selection.toothId);
    } else {
      this.bridgePillarB.set(selection.toothId);
    }
  }

  canApplyBridge(): boolean {
    const a = this.bridgePillarA();
    const b = this.bridgePillarB();
    if (!a || !b || a === b) return false;
    return isUpperJawTooth(a) === isUpperJawTooth(b);
  }

  applyBridge(): void {
    const odonto = this.odontograma();
    const a = this.bridgePillarA();
    const b = this.bridgePillarB();
    const state = this.selectedBridgeState();

    if (!odonto || !a || !b) {
      this.error.set('Indica los dos dientes pilastro del puente.');
      return;
    }

    if (a === b) {
      this.error.set('Los pilares deben ser dientes distintos.');
      return;
    }

    if (isUpperJawTooth(a) !== isUpperJawTooth(b)) {
      this.error.set('El puente debe estar en la misma arcada (superior o inferior).');
      return;
    }

    const stateData = BRIDGE_STATES[state as keyof typeof BRIDGE_STATES];
    if (!stateData) {
      this.error.set('Estado de puente no válido.');
      return;
    }

    const [inicio, fin] = normalizeBridgePair(a, b);
    const dto: OdontogramaBridgeDTO = { diente_inicio: inicio, diente_fin: fin, estado: state };

    this.saving.set(true);
    this.error.set(null);

    this.odontogramaService.addBridge(odonto.id, dto).subscribe({
      next: (updated) => {
        this.odontograma.set(updated);
        this.saving.set(false);
        this.bridgePillarA.set(null);
        this.bridgePillarB.set(null);
        this.scheduleBridgeLinesRefresh();
      },
      error: (err) => {
        this.saving.set(false);
        const msg =
          err?.error?.message ?? err?.error?.detail ?? 'Error al registrar el puente.';
        this.error.set(typeof msg === 'string' ? msg : 'Error al registrar el puente.');
        console.error('Error adding bridge:', err);
      }
    });
  }

  removeBridge(bridge: DentalBridge): void {
    const odonto = this.odontograma();
    if (!odonto) return;

    this.saving.set(true);
    this.error.set(null);

    this.odontogramaService.deleteBridge(odonto.id, bridge.id).subscribe({
      next: (updated) => {
        this.odontograma.set(updated);
        this.saving.set(false);
        this.scheduleBridgeLinesRefresh();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set('Error al eliminar el puente.');
        console.error('Error deleting bridge:', err);
      }
    });
  }

  getBridgeStateLabel(estado: string): string {
    const key = estado as keyof typeof BRIDGE_STATES;
    return BRIDGE_STATES[key]?.label ?? 'Puente';
  }

  private scheduleBridgeLinesRefresh(): void {
    if (this.refreshBridgeLinesScheduled) return;
    this.refreshBridgeLinesScheduled = true;
    requestAnimationFrame(() => {
      this.refreshBridgeLinesScheduled = false;
      this.refreshBridgeLines();
    });
  }

  private refreshBridgeLines(): void {
    const puentes = this.odontograma()?.puentes ?? [];
    const upperRow = this.upperRowRef?.nativeElement;
    const lowerRow = this.lowerRowRef?.nativeElement;

    this.upperBridgeLines.set(
      upperRow ? this.computeBridgeLines(puentes, upperRow, true) : []
    );
    this.lowerBridgeLines.set(
      lowerRow ? this.computeBridgeLines(puentes, lowerRow, false) : []
    );
  }

  private computeBridgeLines(
    bridges: DentalBridge[],
    row: HTMLElement,
    upper: boolean
  ): BridgeLineCoords[] {
    const rowRect = row.getBoundingClientRect();
    const lines: BridgeLineCoords[] = [];

    for (const bridge of bridges) {
      if (isUpperJawTooth(bridge.diente_inicio) !== upper) continue;

      const elA = this.findToothSlot(bridge.diente_inicio);
      const elB = this.findToothSlot(bridge.diente_fin);
      if (!elA || !elB || !row.contains(elA) || !row.contains(elB)) continue;

      const rA = elA.getBoundingClientRect();
      const rB = elB.getBoundingClientRect();

      lines.push({
        id: bridge.id,
        x1: rA.left + rA.width / 2 - rowRect.left,
        y1: rA.top + rA.height * 0.38 - rowRect.top,
        x2: rB.left + rB.width / 2 - rowRect.left,
        y2: rB.top + rB.height * 0.38 - rowRect.top,
        color: bridge.color
      });
    }

    return lines;
  }

  private findToothSlot(toothId: string): HTMLElement | null {
    const slots = this.toothSlotRefs?.toArray() ?? [];
    for (const ref of slots) {
      if (ref.nativeElement.dataset['tooth'] === toothId) {
        return ref.nativeElement;
      }
    }
    return null;
  }

  applyToothLevelState(): void {
    const selection = this.selectedTooth();
    const state = this.selectedToothLevelState();
    const odonto = this.odontograma();

    if (!selection || !odonto) {
      this.error.set('Selecciona un diente primero.');
      return;
    }

    const stateData = TOOTH_LEVEL_STATES[state as keyof typeof TOOTH_LEVEL_STATES];
    if (!stateData) {
      this.error.set('Estado del diente no válido.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const dto: OdontogramaToothStatusDTO = {
      diente: selection.toothId,
      cara: TOOTH_LEVEL_FACE,
      estado: state,
      color: stateData.color,
      tipo: stateData.tipo
    };

    this.odontogramaService.updateToothStatus(odonto.id, dto).subscribe({
      next: (updated) => {
        this.odontograma.set(updated);
        this.saving.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set('Error al actualizar el estado del diente.');
        console.error('Error updating tooth level status:', err);
      }
    });
  }

  clearToothLevelState(): void {
    const selection = this.selectedTooth();
    const odonto = this.odontograma();

    if (!selection || !odonto) {
      this.error.set('Selecciona un diente primero.');
      return;
    }

    if (!this.getToothLevelStatus(selection.toothId)) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.odontogramaService
      .clearToothStatus(odonto.id, selection.toothId, TOOTH_LEVEL_FACE)
      .subscribe({
        next: (updated) => {
          this.odontograma.set(updated);
          this.saving.set(false);
          this.selectedToothLevelState.set('EXTRACCION_FUTURA');
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set('Error al quitar el estado del diente.');
          console.error('Error clearing tooth level status:', err);
        }
      });
  }

  getToothLevelStateLabel(estado: string): string {
    const key = estado as keyof typeof TOOTH_LEVEL_STATES;
    return TOOTH_LEVEL_STATES[key]?.label ?? 'Desconocido';
  }

  getToothFaceColors(toothId: number): Record<string, string> {
    const id = String(toothId);
    const result: Record<string, string> = {};
    for (const face of this.faces) {
      result[face] = this.getFaceColor(id, face);
    }
    return result;
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

  clearFace(): void {
    const selection = this.selectedTooth();
    const odonto = this.odontograma();

    if (!selection?.face || !odonto) {
      this.error.set('Selecciona un diente y una cara primero.');
      return;
    }

    if (!this.getToothStatus(selection.toothId, selection.face)) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.odontogramaService
      .clearToothStatus(odonto.id, selection.toothId, selection.face)
      .subscribe({
        next: (updated) => {
          this.odontograma.set(updated);
          this.saving.set(false);
          this.selectedState.set('CARIES');
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set('Error al limpiar la cara del diente.');
          console.error('Error clearing tooth status:', err);
        }
      });
  }

  getToothStatus(toothId: string, face: string): ToothFaceStatus | null {
    const odonto = this.odontograma();
    if (!odonto || !odonto.dientes || !isOdontogramaFaceKey(face)) return null;

    const tooth = odonto.dientes[toothId];
    if (!tooth) return null;

    return tooth[face] || null;
  }

  getToothLevelStatus(toothId: string): ToothLevelStatus | null {
    const odonto = this.odontograma();
    if (!odonto?.dientes) return null;

    const tooth = odonto.dientes[toothId];
    if (!tooth) return null;

    const status = tooth[TOOTH_LEVEL_FACE];
    return status ?? null;
  }

  getEndodonciaStatus(toothId: string): ToothLevelStatus | null {
    const odonto = this.odontograma();
    if (!odonto?.dientes) return null;

    const tooth = odonto.dientes[toothId];
    if (!tooth) return null;

    const status = tooth[TOOTH_ENDODONCIA_FACE];
    return status ?? null;
  }

  getCoronaStatus(toothId: string): ToothLevelStatus | null {
    const odonto = this.odontograma();
    if (!odonto?.dientes) return null;

    const tooth = odonto.dientes[toothId];
    if (!tooth) return null;

    const status = tooth[TOOTH_CORONA_FACE];
    return status ?? null;
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
    const colors = Object.entries(tooth)
      .filter(([face]) => isOdontogramaFaceKey(face))
      .map(([, status]) => status.color);
    if (colors.includes(OdontogramaColor.RED)) return OdontogramaColor.RED;
    if (colors.includes(OdontogramaColor.BLUE)) return OdontogramaColor.BLUE;
    if (colors.includes(OdontogramaColor.YELLOW)) return OdontogramaColor.YELLOW;
    if (colors.includes(OdontogramaColor.GREEN)) return OdontogramaColor.GREEN;
    if (colors.includes(OdontogramaColor.BLACK)) return OdontogramaColor.BLACK;
    
    return '#fff';
  }

  getFaceColor(toothId: string, face: string): string {
    const status = this.getToothStatus(toothId, face);
    return status ? status.color : '#ffffff';
  }

  selectedFaceForTooth(toothId: number): string | null {
    const sel = this.selectedTooth();
    if (sel?.toothId === String(toothId)) return sel.face;
    return null;
  }

  isToothSelected(toothId: number): boolean {
    const selection = this.selectedTooth();
    return selection?.toothId === String(toothId);
  }

  clearSelection(): void {
    this.selectedTooth.set(null);
  }

  goBack(): void {
    const id = this.patient()?.id;
    if (id) {
      this.router.navigate(['/app/pacientes', id]);
    } else {
      this.router.navigate(['/app/pacientes']);
    }
  }

  goToPatientEdit(): void {
    const id = this.patient()?.id;
    if (id) {
      this.router.navigate(['/app/pacientes', id, 'editar']);
    }
  }
}
