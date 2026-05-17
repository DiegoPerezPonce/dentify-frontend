export interface Dentist {
  id: number;
  nombre: string;
  apellidos: string;
  especialidad: string;
  email: string;
  boxes?: string[];
}

export interface DentistCreateDTO {
  nombre: string;
  apellidos: string;
  especialidad: string;
  email: string;
}

export interface DentistUpdateDTO {
  nombre?: string;
  apellidos?: string;
  especialidad?: string;
  email?: string;
}

export interface DentistListResult {
  items: Dentist[];
  total: number;
}

// Common specialties for dentists
export const DENTIST_SPECIALTIES = [
  'Limpieza dental',
  'Odontología General',
  'Ortodoncia',
  'Endodoncia',
  'Periodoncia',
  'Odontopediatría',
  'Cirugía Oral y Maxilofacial',
  'Prostodoncia',
  'Estética Dental',
  'Implantología'
] as const;
