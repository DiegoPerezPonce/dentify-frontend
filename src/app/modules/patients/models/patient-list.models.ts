/** Fila flexible: nombres de campos según entidad Symfony / API Platform. */
export interface PatientRow {
  id?: number | string;
  '@id'?: string;
  nombre?: string;
  apellidos?: string;
  apellido?: string;
  dni?: string;
  nif?: string;
  telefono?: string;
  telefon?: string;
  email?: string;
  mail?: string;
  medical_flags?: string[] | null;
}

export interface PatientListQuery {
  page: number;
  pageSize: number;
  search: string;
}

export interface PatientListResult {
  items: PatientRow[];
  total: number;
}
