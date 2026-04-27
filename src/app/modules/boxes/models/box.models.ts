export interface Box {
  id: number;
  nombre: string;
  estado: string;
  descripcion?: string | null;
  dentistId?: number | null;
  dentistNombre?: string | null;
}

export interface BoxListResult {
  items: Box[];
  total: number;
}

/** Cuerpo POST — nombres alineados con `BoxCreateDTO` del backend. */
export interface BoxCreatePayload {
  nombre: string;
  descripcion?: string | null;
  estado: string;
  dentist_id?: number | null;
}

/** Cuerpo PUT/PATCH — `BoxUpdateDTO` del backend. */
export interface BoxUpdatePayload {
  nombre?: string;
  descripcion?: string | null;
  estado?: string;
  clear_dentist?: boolean;
  dentist_id?: number | null;
}
