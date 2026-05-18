/** Puente entre dos dientes pilastro. */
export interface DentalBridge {
  id: string;
  diente_inicio: string;
  diente_fin: string;
  estado: string;
  color: string;
  fecha: string;
}

/** Odontograma completo. */
export interface Odontograma {
  id: number;
  dientes: Record<string, Record<string, ToothFaceStatus>>;
  puentes: DentalBridge[];
  fecha_creacion: string;
  fecha_modificacion: string;
}

/** DTO para crear un puente. */
export interface OdontogramaBridgeDTO {
  diente_inicio: string;
  diente_fin: string;
  estado: string;
}

/** Clave reservada en JSON para el estado global del diente (cruz X). */
export const TOOTH_LEVEL_FACE = 'DIENTE';

/** Clave reservada para la marca «E» de endodoncia en el centro del diente. */
export const TOOTH_ENDODONCIA_FACE = 'ENDODONCIA_DIENTE';

/** Clave reservada para corona (toda la figura del diente). */
export const TOOTH_CORONA_FACE = 'CORONA_DIENTE';

/** Estado de una cara de un diente. */
export interface ToothFaceStatus {
  estado: string;
  color: string;
  tipo: string;
  fecha: string;
}

/** Estado global del diente (extracción / ausencia) — se dibuja como X. */
export interface ToothLevelStatus {
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
  GREEN = '#38a169',    // Verde: prevención
  YELLOW = '#eab308'    // Amarillo: sellado de fosas y fisuras
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
  PROFILAXIS: { label: 'Profilaxis', color: OdontogramaColor.GREEN, tipo: 'prevencion' },

  // Amarillo - Prevención (fosas y fisuras)
  SELLADO_FOSAS_FISURAS: {
    label: 'Sellado de fosas y fisuras',
    color: OdontogramaColor.YELLOW,
    tipo: 'prevencion'
  }
} as const;

/** Estados del diente completo (marca con X sobre el diagrama). */
export const TOOTH_LEVEL_STATES = {
  EXTRACCION_REALIZADA: {
    label: 'Extracción ya realizada',
    color: OdontogramaColor.BLUE,
    tipo: 'estado_diente'
  },
  EXTRACCION_FUTURA: {
    label: 'Extracción a realizar (futura)',
    color: OdontogramaColor.RED,
    tipo: 'estado_diente'
  },
  AUSENCIA_NATURAL: {
    label: 'Ausencia natural del diente',
    color: OdontogramaColor.BLACK,
    tipo: 'estado_diente'
  }
} as const;

/** Marca «E» de endodoncia en el centro del diente. */
export const ENDODONCIA_TOOTH_STATES = {
  ENDODONCIA_FUTURA: {
    label: 'Endodoncia a realizar',
    color: OdontogramaColor.RED,
    tipo: 'endodoncia_diente'
  },
  ENDODONCIA_REALIZADA: {
    label: 'Endodoncia realizada',
    color: OdontogramaColor.BLUE,
    tipo: 'endodoncia_diente'
  }
} as const;

/** Corona: pinta toda la figura del diente. */
export const CORONA_TOOTH_STATES = {
  CORONA_FUTURA: {
    label: 'Corona a colocar',
    color: OdontogramaColor.RED,
    tipo: 'corona_diente'
  },
  CORONA_REALIZADA: {
    label: 'Corona colocada',
    color: OdontogramaColor.BLUE,
    tipo: 'corona_diente'
  }
} as const;

/** Puente dental (círculos en pilares + línea). */
export const BRIDGE_STATES = {
  PUENTE_REALIZADO: {
    label: 'Puente realizado',
    color: OdontogramaColor.BLUE
  },
  PUENTE_FUTURO: {
    label: 'Puente a realizar (futuro)',
    color: OdontogramaColor.RED
  }
} as const;

export const ODONTOGRAMA_FACE_KEYS = ['V', 'M', 'O', 'D', 'L', 'I'] as const;

export function isFdiToothKey(key: string): boolean {
  return /^\d{2}$/.test(key);
}

export function isUpperJawTooth(toothId: string | number): boolean {
  const quadrant = Math.floor(Number(toothId) / 10);
  return quadrant === 1 || quadrant === 2;
}

export function normalizeBridgePair(a: string, b: string): [string, string] {
  return Number(a) <= Number(b) ? [a, b] : [b, a];
}

export function isOdontogramaFaceKey(key: string): boolean {
  return (ODONTOGRAMA_FACE_KEYS as readonly string[]).includes(key);
}

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
