import React, { createContext, useContext, useCallback } from 'react';
import { Permission } from '@/types/auth';
import { useAuth } from './AuthContext';

/**
 * Permission Context
 *
 * Available permissions include:
 * - placement:read, placement:create, placement:update, placement:delete
 * - college:read, college:create, college:update, college:delete
 * - department:read, department:read_own, department:create, department:update, department:delete
 * - user:read, user:create, user:update, user:delete
 * - mentor:read, mentor:create, mentor:update, mentor:delete
 * - student:read, student:create, student:update, student:delete, student:bulk_create
 * - analytics:read, progress:read
 *
 * TEST CRUD: test:create, test:read, test:update, test:delete
 * RESULTS CRUD: result:read, result:create, result:update, result:delete
 *
 * Legacy aliases: test:schedule (create), test:view_results (result:read). Permissions are stored
 * in the database and checked via the existing permission system.
 */

interface PermissionContextType {
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const hasPermission = useCallback((permission: Permission): boolean => {
    return user?.permissions.includes(permission) ?? false;
  }, [user]);

  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    return permissions.some(p => user?.permissions.includes(p));
  }, [user]);

  const hasAllPermissions = useCallback((permissions: Permission[]): boolean => {
    return permissions.every(p => user?.permissions.includes(p));
  }, [user]);

  return (
    <PermissionContext.Provider value={{ hasPermission, hasAnyPermission, hasAllPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
}

// Helper component for conditional rendering based on permissions
interface CanProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ permission, permissions, requireAll = false, children, fallback = null }: CanProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

  let allowed = false;

  if (permission) {
    allowed = hasPermission(permission);
  } else if (permissions) {
    allowed = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  }

  return <>{allowed ? children : fallback}</>;
}
