/** Odontograma completo. */
export interface Odontograma {
  id: number;
  dientes: Record<string, Record<string, ToothFaceStatus>>; // {tooth_id: {face: status}}
  fecha_creacion: string;
  fecha_modificacion: string;
}

/** Estado de una cara de un diente. */
export interface ToothFaceStatus {
  estado: string;
  color: string;
  tipo: string;
  fecha: string;
}

/** DTO para actualizar estado de diente/cara. */
export interface OdontogramaToothStatusDTO {
  diente: string; // Ej: "11", "36"
  cara: string; // V, L, O, M, D, I
  estado: string;
  color: string;
  tipo: string;
}

/** Caras dentales según sistema estándar. */
export enum ToothFace {
  VESTIBULAR = 'V',
  LINGUAL = 'L',
  OCLUSAL = 'O',
  INCISAL = 'I',
  MESIAL = 'M',
  DISTAL = 'D'
}

/** Colores del odontograma según Odontograma.txt */
export enum OdontogramaColor {
  RED = '#e53e3e',      // Rojo: patología/tratamiento necesario
  BLUE = '#3182ce',     // Azul: tratamiento realizado
  BLACK = '#2d3748',    // Negro: estado base
  GREEN = '#38a169'     // Verde: prevención
}

/** Tipos de estado/patología. */
export const TOOTH_STATES = {
  // Rojo - Patologías / tratamiento necesario
  CARIES: { label: 'Caries', color: OdontogramaColor.RED, tipo: 'patologia' },
  FRACTURA: { label: 'Fractura', color: OdontogramaColor.RED, tipo: 'patologia' },
  EXTRAER: { label: 'A extraer', color: OdontogramaColor.RED, tipo: 'patologia' },
  RESTAURACION_DEFECTUOSA: { label: 'Restauración defectuosa', color: OdontogramaColor.RED, tipo: 'patologia' },
  
  // Azul - Tratamientos realizados
  OBTURACION: { label: 'Obturación/Empaste', color: OdontogramaColor.BLUE, tipo: 'tratamiento' },
  ENDODONCIA: { label: 'Endodoncia', color: OdontogramaColor.BLUE, tipo: 'tratamiento' },
  CORONA: { label: 'Corona', color: OdontogramaColor.BLUE, tipo: 'tratamiento' },
  PROTESIS: { label: 'Prótesis', color: OdontogramaColor.BLUE, tipo: 'tratamiento' },
  
  // Negro - Estado base
  SANO: { label: 'Sano', color: OdontogramaColor.BLACK, tipo: 'estado' },
  AUSENTE: { label: 'Ausente', color: OdontogramaColor.BLACK, tipo: 'estado' },
  
  // Verde - Prevención
  SELLANTE: { label: 'Sellante', color: OdontogramaColor.GREEN, tipo: 'prevencion' },
  PROFILAXIS: { label: 'Profilaxis', color: OdontogramaColor.GREEN, tipo: 'prevencion' }
} as const;

/** Dientes del sistema FDI (adultos - 32 piezas). */
export const FDI_TEETH = {
  quadrant1: [11, 12, 13, 14, 15, 16, 17, 18], // Superior derecho
  quadrant2: [21, 22, 23, 24, 25, 26, 27, 28], // Superior izquierdo
  quadrant3: [31, 32, 33, 34, 35, 36, 37, 38], // Inferior izquierdo
  quadrant4: [41, 42, 43, 44, 45, 46, 47, 48]  // Inferior derecho
} as const;

/** Etiquetas de caras. */
export const FACE_LABELS: Record<string, string> = {
  V: 'Vestibular',
  L: 'Lingual/Palatina',
  O: 'Oclusal',
  I: 'Incisal',
  M: 'Mesial',
  D: 'Distal'
};
