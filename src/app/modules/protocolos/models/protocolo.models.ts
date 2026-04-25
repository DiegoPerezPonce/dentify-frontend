import { StockMaterial } from '../../stock/models/stock-material.models';

export interface ProtocoloTratamiento {
  id: number;
  nombre_tratamiento: string;
  material: StockMaterial;
  cantidad_necesaria: number;
  notas_paso_a_paso?: string | null;
}

export interface ProtocoloListResult {
  items: ProtocoloTratamiento[];
  total: number;
}

export interface ProtocoloCreatePayload {
  nombre_tratamiento: string;
  material_id: number;
  cantidad_necesaria: number;
  notas_paso_a_paso?: string | null;
}

export interface ProtocoloUpdatePayload {
  nombre_tratamiento?: string;
  material_id?: number;
  cantidad_necesaria?: number;
  notas_paso_a_paso?: string | null;
}
