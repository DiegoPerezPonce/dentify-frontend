export type BoxEstado = 'disponible' | 'mantenimiento';

export const BOX_ESTADO_OPTIONS: ReadonlyArray<{ value: BoxEstado; label: string }> = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'mantenimiento', label: 'En mantenimiento' }
] as const;

export function normalizeBoxEstado(estado: string | null | undefined): BoxEstado {
  const e = (estado ?? '').trim().toLowerCase();
  if (e === 'mantenimiento' || e.includes('manten') || e === 'fuera de servicio') {
    return 'mantenimiento';
  }
  return 'disponible';
}

export function boxEstadoLabel(estado: string | null | undefined): string {
  const normalized = normalizeBoxEstado(estado);
  return BOX_ESTADO_OPTIONS.find((o) => o.value === normalized)?.label ?? 'Disponible';
}

export interface Box {
  id: number;
  nombre: string;
  estado: BoxEstado | string;
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
