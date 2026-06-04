export type AppointmentSessionStatus = 'in_progress' | 'completed';

export interface AppointmentSessionMaterialLine {
  id?: number;
  stock_material_id: number;
  material_nombre: string;
  unidad: string;
  cantidad_planificada: number;
  cantidad_usada: number;
  stock_disponible: number;
  from_protocol: boolean;
  protocol_notes?: string | null;
}

export interface AppointmentSession {
  id: number;
  appointment_id: number;
  status: AppointmentSessionStatus;
  started_at: string;
  completed_at?: string | null;
  notes?: string | null;
  treatment_name?: string | null;
  materials: AppointmentSessionMaterialLine[];
}

export interface SessionMaterialInput {
  stock_material_id: number;
  cantidad_usada: number;
  cantidad_planificada?: number;
}

export interface SessionMaterialLineUpdate {
  id?: number;
  stock_material_id: number;
  cantidad_usada: number;
  cantidad_planificada?: number;
}
