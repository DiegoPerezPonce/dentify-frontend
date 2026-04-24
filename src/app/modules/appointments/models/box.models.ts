export interface Box {
  id: number;
  nombre: string;
  estado: string;
  descripcion?: string;
}

export interface BoxListResult {
  items: Box[];
  total: number;
}
