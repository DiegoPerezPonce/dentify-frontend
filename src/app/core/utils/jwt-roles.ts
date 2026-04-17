/** Symfony-style application roles (JWT `roles` claim, string[]). */
export const ROLE_USER = 'ROLE_USER';
export const ROLE_ADMIN = 'ROLE_ADMIN';

/**
 * Lee el array `roles` del payload JWT (sin verificar firma; solo UI / guards de conveniencia).
 */
export function parseRolesFromJwt(token: string | null): string[] {
  if (!token?.trim()) return [];
  const parts = token.split('.');
  if (parts.length < 2) return [];
  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    const json = atob(base64);
    const payload = JSON.parse(json) as Record<string, unknown>;
    const raw = payload['roles'] ?? payload['role'];
    const list = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
    return [...new Set(list.map((r) => String(r)))];
  } catch {
    return [];
  }
}
