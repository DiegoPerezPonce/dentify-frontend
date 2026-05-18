import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FACE_LABELS } from '../models/odontograma.models';

const FACES = ['V', 'M', 'O', 'D', 'L'] as const;

@Component({
  selector: 'app-odontograma-tooth-chart',
  standalone: true,
  templateUrl: './odontograma-tooth-chart.html',
  styleUrl: './odontograma-tooth-chart.scss'
})
export class OdontogramaToothChartComponent {
  @Input({ required: true }) toothNumber!: number;
  @Input() selected = false;
  @Input() selectedFace: string | null = null;
  /** Colores por cara: V, M, O, D, L */
  @Input() faceColors: Record<string, string> = {};
  /** Color de la X de estado del diente (extracción / ausencia). */
  @Input() toothMarkColor: string | null = null;
  /** Círculo de puente (pilastro). */
  @Input() bridgeRingColor: string | null = null;
  /** Color de la «E» de endodoncia (centro del diente). */
  @Input() endoMarkColor: string | null = null;
  /** Color de corona: rellena toda la figura del diente. */
  @Input() coronaFillColor: string | null = null;

  @Output() toothSelect = new EventEmitter<number>();
  @Output() faceSelect = new EventEmitter<string>();

  readonly faces = FACES;
  readonly faceLabels = FACE_LABELS;

  colorFor(face: string): string {
    if (this.coronaFillColor) {
      return this.coronaFillColor;
    }
    return this.faceColors[face] ?? '#ffffff';
  }

  isFaceSelected(face: string): boolean {
    return this.selectedFace === face;
  }

  onToothClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.tooth-face')) return;
    this.toothSelect.emit(this.toothNumber);
  }

  onFaceClick(face: string, event: MouseEvent): void {
    event.stopPropagation();
    this.toothSelect.emit(this.toothNumber);
    this.faceSelect.emit(face);
  }
}
