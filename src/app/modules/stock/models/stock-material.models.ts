export interface StockMaterial {
  id: number;
  nombre: string;
  cantidad_actual: number;
  unidad: string;
  fecha_ultima_reposicion?: string;
}

export interface StockMaterialCreateDTO {
  nombre: string;
  cantidad_actual: number;
  unidad: string;
}

export interface StockMaterialUpdateDTO {
  nombre?: string;
  cantidad_actual?: number;
  unidad?: string;
}

export interface StockMaterialListResult {
  items: StockMaterial[];
  total: number;
}

// Threshold for low stock alert
export const LOW_STOCK_THRESHOLD = 10;
