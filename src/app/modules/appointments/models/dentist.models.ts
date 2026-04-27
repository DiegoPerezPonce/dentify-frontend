export interface Dentist {
  id: number;
  nombre: string;
  apellidos: string;
  especialidad?: string;
  telefono?: string;
  email?: string;
}

export interface DentistListResult {
  items: Dentist[];
  total: number;
}
