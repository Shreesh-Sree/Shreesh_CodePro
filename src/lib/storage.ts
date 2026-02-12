/**
 * Session storage keys and helpers. All cached data is cleared on logout.
 * Use for: user snapshot, frequently used reference data (departments, assignable roles).
 */
const PREFIX = 'flow_';
export const STORAGE_KEYS = {
  USER: `${PREFIX}user`,
  CACHE_DEPARTMENTS: `${PREFIX}cache_departments`,
  CACHE_ROLES_ASSIGNABLE: `${PREFIX}cache_roles_assignable`,
} as const;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage;
}

export function getStoredUser(): { id: string; name: string; email: string; role: string; permissions: string[]; departmentId?: string; collegeId?: string; studentId?: string } | null {
  const raw = getStorage()?.getItem(STORAGE_KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReturnType<typeof getStoredUser> extends null ? never : NonNullable<ReturnType<typeof getStoredUser>>;
  } catch {
    return null;
  }
}

export function setStoredUser(user: { id: string; name: string; email: string; role: string; permissions: string[]; departmentId?: string; collegeId?: string; studentId?: string } | null): void {
  const s = getStorage();
  if (!s) return;
  if (user == null) {
    s.removeItem(STORAGE_KEYS.USER);
    return;
  }
  s.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

interface Cached<T> {
  data: T;
  ts: number;
}

function getCached<T>(key: string): T | null {
  const raw = getStorage()?.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Cached<T>;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setCached<T>(key: string, data: T): void {
  getStorage()?.setItem(key, JSON.stringify({ data, ts: Date.now() }));
}

export function getCachedDepartments(): unknown[] | null {
  return getCached(STORAGE_KEYS.CACHE_DEPARTMENTS);
}

export function setCachedDepartments(list: unknown[]): void {
  setCached(STORAGE_KEYS.CACHE_DEPARTMENTS, list);
}

export function getCachedRolesAssignable(): unknown[] | null {
  return getCached(STORAGE_KEYS.CACHE_ROLES_ASSIGNABLE);
}

export function setCachedRolesAssignable(list: unknown[]): void {
  setCached(STORAGE_KEYS.CACHE_ROLES_ASSIGNABLE, list);
}

/** Invalidate cached reference data (e.g. after create/update/delete on Departments). */
export function invalidateDepartmentsCache(): void {
  getStorage()?.removeItem(STORAGE_KEYS.CACHE_DEPARTMENTS);
}

export function invalidateRolesAssignableCache(): void {
  getStorage()?.removeItem(STORAGE_KEYS.CACHE_ROLES_ASSIGNABLE);
}

/** Clear all app storage (call on logout). */
export function clearAppStorage(): void {
  const s = getStorage();
  if (!s) return;
  Object.values(STORAGE_KEYS).forEach((key) => s.removeItem(key));
}
