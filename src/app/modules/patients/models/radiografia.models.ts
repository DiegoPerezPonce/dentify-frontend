/** Radiografía del paciente. */
export interface Radiografia {
  id: number;
  nombre_archivo: string;
  ruta_archivo: string;
  tipo_mime: string;
  fecha_subida: string;
}

/** Tipos MIME permitidos para radiografías. */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf'
] as const;

/** Extensiones permitidas. */
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'] as const;

/** Tamaño máximo por archivo (10MB). */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Helpers para validación. */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

export function isValidFileType(file: File): boolean {
  return ALLOWED_MIME_TYPES.includes(file.type as any);
}

export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
