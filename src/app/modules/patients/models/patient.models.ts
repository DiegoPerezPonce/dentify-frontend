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
  /** Etiquetas críticas (VIH, Hepatitis_B, …). */
  medical_flags?: string[] | null;
  medical_notes?: string | null;
  /** Consentimiento RGPD y términos generales aceptados. */
  terminos_generales_aceptados?: boolean;
  /** true si falta firma/aceptación (recepción). */
  terminos_pendientes?: boolean;
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
  medical_flags?: string[];
  medical_notes?: string;
  terminos_generales_aceptados?: boolean;
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
  medical_flags?: string[];
  medical_notes?: string;
  terminos_generales_aceptados?: boolean;
}
