import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FACE_LABELS } from '../models/odontograma.models';

const FACES = ['V', 'M', 'O', 'D', 'L'] as const;

const FACE_POINTS: Record<(typeof FACES)[number], string> = {
  V: '10,10 90,10 65,35 35,35',
  M: '10,10 35,35 35,65 10,90',
  O: '35,35 65,35 65,65 35,65',
  D: '90,10 65,35 65,65 90,90',
  L: '10,90 35,65 65,65 90,90'
};

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
  readonly facePoints = FACE_POINTS;
  readonly faceLabels = FACE_LABELS;

  colorFor(face: string): string {
    if (this.coronaFillColor) {
      return this.coronaFillColor;
    }
    return this.faceColors[face] ?? '#ffffff';
  }

  /** Sin atributo fill cuando la cara está seleccionada y vacía: el CSS anima el parpadeo. */
  faceFill(face: string): string | undefined {
    if (this.coronaFillColor) {
      return this.coronaFillColor;
    }
    const color = this.faceColors[face];
    if (color) {
      return color;
    }
    if (this.isFaceSelected(face)) {
      return undefined;
    }
    return '#ffffff';
  }

  hasFaceColor(face: string): boolean {
    return !this.coronaFillColor && !!this.faceColors[face];
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
