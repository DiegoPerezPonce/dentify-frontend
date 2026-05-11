export interface User {
  id: number;
  email: string;
  nombre_usuario: string;
  roles: string[];
  ultimo_acceso?: string;
  /** Odontólogo vinculado en BD; define `dentistId` en el JWT tras login. */
  dentistId?: number | null;
  /** Relleno en listados API cuando existe ficha `Dentist`. */
  dentistNombre?: string | null;
  dentistApellidos?: string | null;
  dentistEspecialidad?: string | null;
  dentistBoxes?: string[];
}

export interface UserCreateDTO {
  email: string;
  password: string;
  nombre_usuario: string;
  roles: string[];
  dentistNombre?: string | null;
  dentistApellidos?: string | null;
  dentistEspecialidad?: string | null;
}

export interface UserUpdateDTO {
  email?: string;
  password?: string;
  nombre_usuario?: string;
  roles?: string[];
  dentistId?: number | null;
}

export interface UserListResult {
  items: User[];
  total: number;
}

// Available roles in the system
export const AVAILABLE_ROLES = [
  { value: 'ROLE_USER', label: 'Usuario (Alumno)' },
  { value: 'ROLE_ADMIN', label: 'Administrador' }
] as const;
