export interface StockMaterial {
  id: number;
  nombre: string;
  cantidad_actual: number;
  umbral_minimo?: number;
  is_low_stock?: boolean;
  unidad: string;
  fecha_ultima_reposicion?: string;
}

export interface StockMaterialCreateDTO {
  nombre: string;
  cantidad_actual: number;
  unidad: string;
  umbral_minimo?: number;
}

export interface StockMaterialUpdateDTO {
  nombre?: string;
  cantidad_actual?: number;
  unidad?: string;
  umbral_minimo?: number;
}

export interface StockMaterialListResult {
  items: StockMaterial[];
  total: number;
}

export interface StockMaterialListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  lowStockOnly?: boolean;
}

// Threshold for low stock alert
export const LOW_STOCK_THRESHOLD = 10;
