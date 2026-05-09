/** Symfony-style application roles (JWT `roles` claim, string[]). */
export const ROLE_USER = 'ROLE_USER';
export const ROLE_ADMIN = 'ROLE_ADMIN';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
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

/**
 * Texto corto para UI (p. ej. barra lateral). Null si el token no trae `exp`.
 */
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
