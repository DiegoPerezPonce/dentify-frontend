/** Primera visita del paciente. */
export interface PrimeraVisita {
  id: number;
  motivo_consulta: string;
  nivel_dolor: number; // 0-10
  observaciones?: string;
  fecha: string; // ISO date string
  patient_id: number;
  odontograma_id?: number;
}

/** DTO para crear primera visita. */
export interface PrimeraVisitaCreateDTO {
  patient_id: number;
  motivo_consulta: string;
  nivel_dolor: number; // 0-10
  observaciones?: string;
  odontograma_id?: number;
}

/** Niveles de dolor con iconos y colores. */
export const PAIN_LEVELS = [
  { value: 0, label: 'Sin dolor', icon: '😊', color: '#48bb78' },
  { value: 1, label: 'Muy leve', icon: '🙂', color: '#68d391' },
  { value: 2, label: 'Leve', icon: '😐', color: '#9ae6b4' },
  { value: 3, label: 'Molesto', icon: '😕', color: '#d69e2e' },
  { value: 4, label: 'Incómodo', icon: '😟', color: '#ed8936' },
  { value: 5, label: 'Moderado', icon: '😣', color: '#f6ad55' },
  { value: 6, label: 'Intenso', icon: '😖', color: '#fc8181' },
  { value: 7, label: 'Muy intenso', icon: '😫', color: '#f56565' },
  { value: 8, label: 'Severo', icon: '😭', color: '#e53e3e' },
  { value: 9, label: 'Muy severo', icon: '😱', color: '#c53030' },
  { value: 10, label: 'Insoportable', icon: '🤯', color: '#9b2c2c' }
] as const;
