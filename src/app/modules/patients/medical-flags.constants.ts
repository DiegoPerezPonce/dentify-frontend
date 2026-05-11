/** Claves permitidas (alineadas con backend `MedicalFlags::allowed()`). */
export const MEDICAL_FLAG_IDS = [
  // Nivel 1 — bioseguridad
  'VIH',
  'Hepatitis_B',
  'Hepatitis_C',
  'Tuberculosis',
  'Sifilis',
  'Herpes_activo',
  // Nivel 2 — alergias
  'Alergia_Penicilina',
  'Alergia_Latex',
  'Alergia_anestesicos_locales',
  'Alergia_metales_niquel_cobalto',
  'Alergia_aines',
  // Nivel 3 — sistémico
  'Bifosfonatos',
  'Anticoagulados',
  'Cardiopatias',
  'Diabetes',
  'Epilepsia'
] as const;

export type MedicalFlagId = (typeof MEDICAL_FLAG_IDS)[number];

export type MedicalAlertSeverity = 'biosecurity' | 'allergy' | 'systemic' | null;

/** Nivel 1 — riesgo bioseguridad (rojo). */
export const LEVEL1_BIOSECURITY_IDS: ReadonlySet<string> = new Set([
  'VIH',
  'Hepatitis_B',
  'Hepatitis_C',
  'Tuberculosis',
  'Sifilis',
  'Herpes_activo'
]);

/** Nivel 2 — alergias críticas (naranja). */
export const LEVEL2_ALLERGY_IDS: ReadonlySet<string> = new Set([
  'Alergia_Penicilina',
  'Alergia_Latex',
  'Alergia_anestesicos_locales',
  'Alergia_metales_niquel_cobalto',
  'Alergia_aines'
]);

/** Nivel 3 — riesgo sistémico / medicación (azul). */
export const LEVEL3_SYSTEMIC_IDS: ReadonlySet<string> = new Set([
  'Bifosfonatos',
  'Anticoagulados',
  'Cardiopatias',
  'Diabetes',
  'Epilepsia'
]);

/** @deprecated Usar LEVEL1_BIOSECURITY_IDS */
export const INFECTIOUS_FLAG_IDS = LEVEL1_BIOSECURITY_IDS;

export type MedicalFlagLevel = 1 | 2 | 3;

export interface MedicalFlagCategoryMeta {
  level: MedicalFlagLevel;
  /** Título corto para agrupar en UI */
  title: string;
  /** Subtítulo / descripción del grupo */
  subtitle: string;
}

export const MEDICAL_FLAG_CATEGORY_META: Record<MedicalFlagLevel, MedicalFlagCategoryMeta> = {
  1: {
    level: 1,
    title: 'Nivel 1 — Bioseguridad (infecciosas)',
    subtitle: '🔴 Riesgo de contagio; protocolos de precaución'
  },
  2: {
    level: 2,
    title: 'Nivel 2 — Alergias críticas',
    subtitle: '🟠 Materiales y fármacos frecuentes en clínica'
  },
  3: {
    level: 3,
    title: 'Nivel 3 — Riesgo sistémico / medicación',
    subtitle: '🟡 Coordinación médica y planificación'
  }
};

export interface MedicalFlagOption {
  id: MedicalFlagId;
  label: string;
  level: MedicalFlagLevel;
}

/** Opciones ordenadas por nivel y etiqueta visible. */
export const MEDICAL_FLAG_OPTIONS: MedicalFlagOption[] = [
  { id: 'VIH', label: 'VIH', level: 1 },
  { id: 'Hepatitis_B', label: 'Hepatitis B', level: 1 },
  { id: 'Hepatitis_C', label: 'Hepatitis C', level: 1 },
  { id: 'Tuberculosis', label: 'Tuberculosis (TB)', level: 1 },
  { id: 'Sifilis', label: 'Sífilis', level: 1 },
  { id: 'Herpes_activo', label: 'Herpes activo', level: 1 },
  { id: 'Alergia_Penicilina', label: 'Penicilina', level: 2 },
  { id: 'Alergia_Latex', label: 'Látex', level: 2 },
  { id: 'Alergia_anestesicos_locales', label: 'Anestésicos locales', level: 2 },
  { id: 'Alergia_metales_niquel_cobalto', label: 'Metales (níquel / cobalto)', level: 2 },
  { id: 'Alergia_aines', label: 'AINEs (aspirina / ibuprofeno)', level: 2 },
  { id: 'Bifosfonatos', label: 'Bifosfonatos (crítico)', level: 3 },
  { id: 'Anticoagulados', label: 'Anticoagulados (p. ej. Sintrom)', level: 3 },
  { id: 'Cardiopatias', label: 'Cardiopatías', level: 3 },
  { id: 'Diabetes', label: 'Diabetes', level: 3 },
  { id: 'Epilepsia', label: 'Epilepsia', level: 3 }
];

/** Misma convención que `MedicalFlags::encodeCustomFlag` en PHP (base64url UTF-8). */
const CUSTOM_FLAG_RE = /^X([123]):([A-Za-z0-9_-]+)$/;

export const CUSTOM_MEDICAL_LABEL_MAX = 120;

export const CUSTOM_MEDICAL_FLAG_MAX_BYTES = 512;

export function tryDecodeCustomMedicalFlag(
  flag: string
): { level: MedicalFlagLevel; label: string } | null {
  if (flag.length > CUSTOM_MEDICAL_FLAG_MAX_BYTES) {
    return null;
  }
  const m = CUSTOM_FLAG_RE.exec(flag);
  if (!m) {
    return null;
  }
  const level = Number(m[1]) as MedicalFlagLevel;
  if (level !== 1 && level !== 2 && level !== 3) {
    return null;
  }
  let b64 = m[2].replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) {
    b64 += '='.repeat(4 - pad);
  }
  try {
    const bin = atob(b64);
    const u8 = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const label = new TextDecoder('utf-8', { fatal: true }).decode(u8).trim();
    if (!label || label.length > CUSTOM_MEDICAL_LABEL_MAX || label.includes('\0')) {
      return null;
    }
    return { level, label };
  } catch {
    return null;
  }
}

export function encodeCustomMedicalFlag(level: MedicalFlagLevel, label: string): string | null {
  const trim = label.trim();
  if (!trim || trim.length > CUSTOM_MEDICAL_LABEL_MAX) {
    return null;
  }
  const bytes = new TextEncoder().encode(trim);
  if (bytes.length > 360) {
    return null;
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const out = `X${level}:${b64}`;
  return out.length <= CUSTOM_MEDICAL_FLAG_MAX_BYTES ? out : null;
}

export function isCustomMedicalFlag(flag: string): boolean {
  return tryDecodeCustomMedicalFlag(flag) !== null;
}

export function getMedicalFlagRiskLevel(flag: string): MedicalFlagLevel | null {
  const opt = MEDICAL_FLAG_OPTIONS.find((o) => o.id === flag);
  if (opt) {
    return opt.level;
  }
  const c = tryDecodeCustomMedicalFlag(flag);
  return c?.level ?? null;
}

export function getMedicalFlagDisplayLabel(flag: string): string {
  const opt = MEDICAL_FLAG_OPTIONS.find((o) => o.id === flag);
  if (opt) {
    return opt.label;
  }
  const c = tryDecodeCustomMedicalFlag(flag);
  if (c) {
    return c.label;
  }
  return flag;
}

/** Severidad visual: prioridad 1 > 2 > 3 (incluye `X{n}:` personalizados). */
export function patientMedicalSeverity(
  flags: string[] | null | undefined
): MedicalAlertSeverity {
  if (!flags?.length) return null;
  const levels = flags
    .map((f) => getMedicalFlagRiskLevel(f))
    .filter((x): x is MedicalFlagLevel => x != null);
  if (!levels.length) return null;
  if (levels.some((l) => l === 1)) return 'biosecurity';
  if (levels.some((l) => l === 2)) return 'allergy';
  if (levels.some((l) => l === 3)) return 'systemic';
  return null;
}

export function medicalFlagLabels(flags: string[]): string[] {
  return flags.map((f) => getMedicalFlagDisplayLabel(f));
}

export function medicalFlagOptionsByLevel(level: MedicalFlagLevel): MedicalFlagOption[] {
  return MEDICAL_FLAG_OPTIONS.filter((o) => o.level === level);
}
