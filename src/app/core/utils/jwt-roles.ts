/** Symfony-style application roles (JWT `roles` claim, string[]). */
export const ROLE_USER = 'ROLE_USER';
export const ROLE_ADMIN = 'ROLE_ADMIN';

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Lee el array `roles` del payload JWT (sin verificar firma; solo UI / guards de conveniencia).
 */
export function parseRolesFromJwt(token: string | null): string[] {
  if (!token?.trim()) return [];
  const payload = decodeJwtPayload(token);
  if (!payload) return [];
  const raw = payload['roles'] ?? payload['role'];
  const list = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  return [...new Set(list.map((r) => String(r)))];
}

/**
 * True si el JWT tiene `exp` y ya pasó (margen `skewSec` para relojes descuadrados).
 * Si el token no se puede leer, se considera caducado o inválido para la UI.
 * Sin claim `exp`, devuelve false y deja que el API valide la firma.
 */
export function isJwtExpired(token: string | null, skewSec = 30): boolean {
  if (!token?.trim()) return true;
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  const exp = payload['exp'];
  if (typeof exp !== 'number') return false;
  return Date.now() >= (exp - skewSec) * 1000;
}

/** Instantánea de caducidad del JWT (`exp` en ms), o null si no hay claim / token ilegible. */
export function getJwtExpMs(token: string | null): number | null {
  if (!token?.trim()) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const exp = payload['exp'];
  if (typeof exp !== 'number') return null;
  return exp * 1000;
}

/** Milisegundos hasta `exp`, o null si no aplica. Puede ser negativo si ya caducó. */
export function getSessionRemainingMs(token: string | null): number | null {
  const expMs = getJwtExpMs(token);
  if (expMs === null) return null;
  return expMs - Date.now();
}

export type SessionRemainingParts =
  | { kind: 'none' }
  | { kind: 'expired' }
  | { kind: 'ok'; hours: number; minutes: number; seconds: number };

/** Partes numéricas para i18n (ngx-translate); `none` si no hay `exp` en el token. */
export function getSessionRemainingParts(token: string | null): SessionRemainingParts {
  const rem = getSessionRemainingMs(token);
  if (rem === null) return { kind: 'none' };
  if (rem <= 0) return { kind: 'expired' };
  const totalSeconds = Math.floor(rem / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { kind: 'ok', hours, minutes, seconds };
}

/** Payload JWT decodificado (sin verificar firma). */
export function getJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token?.trim()) return null;
  return decodeJwtPayload(token);
}

/**
 * Nombre legible para saludos UI: `name`, `given_name`, parte local de `email` (antes que `username`
 * por si el token lleva el login tipo `dr_odontologo` en `username`), luego `username`, `sub`.
 */
export function getJwtDisplayName(token: string | null): string | null {
  const p = getJwtPayload(token);
  if (!p) return null;
  const pick = (k: string): string | null => {
    const v = p[k];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };
  const emailLocal = (() => {
    const em = pick('email');
    if (!em) return null;
    const at = em.indexOf('@');
    return at > 0 ? em.slice(0, at) : em;
  })();
  return (
    pick('name') ??
    pick('given_name') ??
    pick('preferred_username') ??
    emailLocal ??
    pick('username') ??
    pick('sub')
  );
}

export function getJwtEmail(token: string | null): string | null {
  const p = getJwtPayload(token);
  if (!p) return null;
  const v = p['email'];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Id de odontólogo vinculado al usuario (JWT emitido tras login; requiere email coincidente con `Dentist`). */
export function getJwtDentistId(token: string | null): number | null {
  const p = getJwtPayload(token);
  if (!p) return null;
  const raw = p['dentistId'] ?? p['dentist_id'];
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && /^\d+$/.test(raw)) {
    return Number(raw);
  }
  return null;
}

export function formatSessionRemainingLabel(token: string | null): string | null {
  const parts = getSessionRemainingParts(token);
  if (parts.kind === 'none') return null;
  if (parts.kind === 'expired') {
    return 'caducada; vuelve a iniciar sesión';
  }
  const { hours: h, minutes: m, seconds: s } = parts;
  if (h > 0) {
    return `${h} h ${m} min`;
  }
  if (m > 0) {
    return `${m} min ${s} s`;
  }
  return `${s} s`;
}
