export interface Specialty {
  id: number;
  name: string;
  active: boolean;
}

export interface CatalogTreatment {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  dentistSpecialtyId: number;
  dentistSpecialtyName: string;
  /** @deprecated use dentistSpecialtyId */
  specialtyId?: number;
  /** @deprecated use dentistSpecialtyName */
  specialtyName?: string;
  defaultDurationMinutes: number;
  allowsUrgency: boolean;
  forFirstVisit: boolean;
  isCustom: boolean;
  active: boolean;
}

export interface TreatmentCategoryGroup {
  id: number;
  name: string;
  sortOrder: number;
  treatments: CatalogTreatment[];
}

export interface CatalogTreatmentCreateDTO {
  name: string;
  categoryId: number;
  dentistSpecialtyId: number;
  defaultDurationMinutes?: number;
  allowsUrgency?: boolean;
  forFirstVisit?: boolean;
}

export enum AppointmentKind {
  PRIMERA_VISITA = 'primera_visita',
  URGENCIA = 'urgencia',
  TRATAMIENTO = 'tratamiento',
  REVISION = 'revision'
}

/** Opciones visibles en el formulario de cita (sin `revision`, cubierta por primera visita / catálogo). */
export const APPOINTMENT_KIND_OPTIONS: readonly { value: AppointmentKind; label: string }[] = [
  { value: AppointmentKind.PRIMERA_VISITA, label: 'Primera visita' },
  { value: AppointmentKind.URGENCIA, label: 'Urgencia' },
  { value: AppointmentKind.TRATAMIENTO, label: 'Tratamiento' }
] as const;

export function getAppointmentKindLabel(kind: AppointmentKind | string | null | undefined): string {
  const found = APPOINTMENT_KIND_OPTIONS.find((o) => o.value === kind);
  return found?.label ?? String(kind ?? '—');
}

/** Texto de ayuda bajo el selector de tratamiento según tipo de cita. */
export function getAppointmentKindTreatmentHint(kind: AppointmentKind | string | null | undefined): string {
  switch (kind) {
    case AppointmentKind.PRIMERA_VISITA:
      return 'Solo procedimientos de Revisión dental (evaluación, limpieza, fluorización…).';
    case AppointmentKind.REVISION:
      return 'Solo procedimientos de Revisión dental.';
    case AppointmentKind.URGENCIA:
      return 'Solo tratamientos que admiten cita urgente.';
    case AppointmentKind.TRATAMIENTO:
      return 'Tratamientos clínicos (sin procedimientos exclusivos de primera visita).';
    default:
      return '';
  }
}

function normSpecialty(s: string | null | undefined): string {
  return (s ?? '').trim().toLocaleLowerCase('es');
}

/** Filtra odontólogos cuya `especialidad` coincide con la especialidad requerida del tratamiento. */
export function filterDentistsBySpecialtyName<T extends { id: number; especialidad?: string }>(
  dentists: T[],
  specialtyName: string | null | undefined
): T[] {
  if (!specialtyName?.trim()) return [];
  const required = normSpecialty(specialtyName);
  return dentists.filter((d) => normSpecialty(d.especialidad) === required);
}

export function findCatalogTreatmentInGroups(
  groups: TreatmentCategoryGroup[],
  treatmentId: number | null | undefined
): CatalogTreatment | null {
  if (treatmentId == null) return null;
  for (const g of groups) {
    const t = g.treatments.find((x) => x.id === treatmentId);
    if (t) return t;
  }
  return null;
}

export function flattenCatalogTreatments(groups: TreatmentCategoryGroup[]): CatalogTreatment[] {
  return groups.flatMap((g) => g.treatments);
}
