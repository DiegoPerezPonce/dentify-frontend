/** Historial clínico de un paciente. */
export interface ClinicalHistory {
  id: number;
  descripcion: string;
  fecha: string; // ISO date string
  tipo: string;
  observaciones?: string;
}

/** Tipos comunes de entradas en el historial. */
export enum HistoryType {
  CONSULTA = 'consulta',
  TRATAMIENTO = 'tratamiento',
  DIAGNOSTICO = 'diagnostico',
  CIRUGIA = 'cirugia',
  REVISION = 'revision',
  EMERGENCIA = 'emergencia',
  NOTA = 'nota',
  OTRO = 'otro'
}

/** Mapa de colores por tipo para visualización. */
export const HISTORY_TYPE_COLORS: Record<string, string> = {
  consulta: '#3182ce',
  tratamiento: '#38a169',
  diagnostico: '#d69e2e',
  cirugia: '#e53e3e',
  revision: '#805ad5',
  emergencia: '#c53030',
  nota: '#718096',
  otro: '#4a5568'
};

/** Etiquetas legibles por tipo. */
export const HISTORY_TYPE_LABELS: Record<string, string> = {
  consulta: 'Consulta',
  tratamiento: 'Tratamiento',
  diagnostico: 'Diagnóstico',
  cirugia: 'Cirugía',
  revision: 'Revisión',
  emergencia: 'Emergencia',
  nota: 'Nota',
  otro: 'Otro'
};
