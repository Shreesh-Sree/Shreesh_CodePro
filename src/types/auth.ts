/** Role and permission values come from the database (roles + role_permissions). No hardcoded unions. */
export type Role = string;
export type Permission = string;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
  studentId?: string;
  departmentId?: string;
  collegeId?: string;
  placementId?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface JWTPayload {
  userId: string;
  role: Role;
  permissions: Permission[];
  iat: number;
  exp: number;
}
