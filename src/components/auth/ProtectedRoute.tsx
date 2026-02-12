import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import BallBouncingLoader from '@/components/ui/BallBouncingLoader';
import { usePermission } from '@/contexts/PermissionContext';
import { Permission, Role } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  role?: Role;
  requireAll?: boolean;
}

export function ProtectedRoute({
  children,
  permission,
  permissions,
  role: requiredRole,
  requireAll = false
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <BallBouncingLoader />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role or permissions if specified
  let hasAccess = true;
  if (requiredRole) {
    hasAccess = user?.role === requiredRole;
  } else if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  }

  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
