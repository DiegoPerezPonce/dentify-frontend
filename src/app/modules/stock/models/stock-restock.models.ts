import { StockMaterial } from './stock-material.models';

export interface StockRestock {
  id: number;
  material: StockMaterial;
  cantidad_recibida: number;
  proveedor: string;
  fecha: string;
}

export interface StockRestockCreateDTO {
  material_id: number;
  cantidad_recibida: number;
  proveedor: string;
  fecha: string;
}

export interface StockRestockListResult {
  items: StockRestock[];
  total: number;
}
