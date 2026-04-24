export interface User {
  id: number;
  email: string;
  nombre_usuario: string;
  roles: string[];
  ultimo_acceso?: string;
}

export interface UserCreateDTO {
  email: string;
  password: string;
  nombre_usuario: string;
  roles: string[];
}

export interface UserUpdateDTO {
  email?: string;
  password?: string;
  nombre_usuario?: string;
  roles?: string[];
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
