/** Modelo completo de paciente (aligned con backend DTOs). */
export interface Patient {
  id?: number;
  nombre: string;
  apellidos: string;
  dni: string;
  nss?: string;
  telefono?: string;
  email?: string;
  enfermedades?: string;
  alergias?: string;
  historial_clinico?: string;
  datos_facturacion?: string;
}

/** DTO para crear paciente (campos requeridos según backend). */
export interface PatientCreateDTO {
  nombre: string;
  apellidos: string;
  dni: string;
  nss?: string;
  telefono?: string;
  email?: string;
  enfermedades?: string;
  alergias?: string;
  historial_clinico?: string;
  datos_facturacion?: string;
}

/** DTO para actualizar paciente (todos opcionales). */
export interface PatientUpdateDTO {
  nombre?: string;
  apellidos?: string;
  dni?: string;
  nss?: string;
  telefono?: string;
  email?: string;
  enfermedades?: string;
  alergias?: string;
  historial_clinico?: string;
  datos_facturacion?: string;
}
