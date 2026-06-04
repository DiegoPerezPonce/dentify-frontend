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

/** Valor por defecto al crear material si no se indica otro umbral. */
export const DEFAULT_STOCK_THRESHOLD = 10;

/** @deprecated Usar `isMaterialLowStock` o `material.umbral_minimo`. */
export const LOW_STOCK_THRESHOLD = DEFAULT_STOCK_THRESHOLD;

/** Stock bajo cuando cantidad ≤ umbral del material (o flag del API). */
export function isMaterialLowStock(material: StockMaterial): boolean {
  if (material.is_low_stock != null) {
    return material.is_low_stock;
  }
  const umbral = material.umbral_minimo ?? DEFAULT_STOCK_THRESHOLD;
  return material.cantidad_actual <= umbral;
}
