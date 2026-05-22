export interface Box {
  id: number;
  nombre: string;
  estado: string;
  descripcion?: string | null;
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
}

/** Cuerpo PUT/PATCH — `BoxUpdateDTO` del backend. */
export interface BoxUpdatePayload {
  nombre?: string;
  descripcion?: string | null;
  estado?: string;
}
