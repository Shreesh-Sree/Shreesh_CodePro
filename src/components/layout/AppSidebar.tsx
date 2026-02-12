import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Buildings, SquaresFour, Users, BookOpen, ChartBar,
  GraduationCap, CaretLeft, CaretRight, SignOut,
  House, Shield, Briefcase, CalendarCheck, ClipboardText,
  NotePencil, Bell, Question
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/contexts/PermissionContext';
import { Permission } from '@/types/auth';

interface NavItem {
  title: string;
  path: string;
  icon: React.ElementType;
  permission?: Permission;
  permissions?: Permission[];
  superAdminOnly?: boolean;
  studentOnly?: boolean;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', path: '/dashboard', icon: House },
  { title: 'Colleges', path: '/colleges', icon: Buildings, permissions: ['college:read', 'college:create', 'college:update', 'college:delete'] },
  { title: 'Departments', path: '/departments', icon: SquaresFour, permissions: ['department:read', 'department:read_own', 'department:create', 'department:update', 'department:delete'] },
  { title: 'Users', path: '/users', icon: Users, permissions: ['user:read', 'user:create', 'user:update', 'user:delete', 'mentor:read', 'mentor:create', 'mentor:update', 'mentor:delete'] },
  { title: 'Students', path: '/students', icon: BookOpen, permissions: ['student:read', 'student:create', 'student:update', 'student:delete', 'student:bulk_create'] },
  { title: 'Placement', path: '/placements', icon: Briefcase, permissions: ['placement:read', 'placement:create', 'placement:update', 'placement:delete'] },
  { title: 'Schedule', path: '/schedule', icon: CalendarCheck, permissions: ['test:create', 'test:schedule'] },
  { title: 'Tests', path: '/tests-management', icon: ClipboardText, permissions: ['result:read', 'test:view_results'] },
  { title: 'My Tests', path: '/tests', icon: ClipboardText, studentOnly: true },
  { title: 'Result', path: '/my-results', icon: ChartBar, studentOnly: true },
  { title: 'Add Questions', path: '/questions', icon: NotePencil, permission: 'question:create' },
  { title: 'Results', path: '/results', icon: ChartBar, permissions: ['result:read', 'test:view_results'] },
  { title: 'Roles', path: '/roles', icon: Shield, superAdminOnly: true },
  { title: 'Analytics', path: '/analytics', icon: ChartBar, permission: 'analytics:read' },
  { title: 'My Progress', path: '/progress', icon: GraduationCap, studentOnly: true },
  { title: 'Notifications', path: '/notifications', icon: Bell },
  { title: 'FAQ & Guides', path: '/faq', icon: Question },
];

interface AppSidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export function AppSidebar({ collapsed, setCollapsed }: AppSidebarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const { user, logout } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermission();
  const location = useLocation();

  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 1200 && window.innerWidth >= 768) {
        setCollapsed(true);
      }
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  if (isMobile) return null;

  const filteredNavItems = navItems.filter(item => {
    if (item.superAdminOnly) return user?.role === 'SUPERADMIN';
    if (item.studentOnly) return user?.role === 'STUDENT';
    if (item.permissions) return hasAnyPermission(item.permissions);
    if (item.permission) return hasPermission(item.permission);
    return true;
  });

  const label = (item: NavItem) =>
    item.path === '/users' && user?.role === 'DEPARTMENT' ? 'Mentors' : item.title;

  return (
    <aside
      className={cn(
        "fixed top-[76px] bottom-4 left-4 z-40 flex flex-col transition-all duration-150 rounded-lg overflow-visible bg-card border border-border",
        collapsed ? "w-[64px]" : "w-[280px]"
      )}
      style={{ padding: collapsed ? '16px 8px' : '20px 14px' }}
    >


      {/* User */}
      <div className="flex items-center gap-3 mb-1 px-1">
        <div className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center bg-primary/15 text-primary">
          <span className="text-sm font-semibold">
            {user?.name?.charAt(0) || 'C'}
          </span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-muted-foreground truncate capitalize">{user?.role?.toLowerCase() || 'admin'}</p>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-5 -right-3 w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-150 cursor-pointer z-50 bg-card border border-border hover:border-primary/30"
      >
        {collapsed ? (
          <CaretRight className="h-3 w-3 text-muted-foreground" />
        ) : (
          <CaretLeft className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {/* Divider */}
      <div className="h-px w-full bg-border my-3" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-0.5">
          {filteredNavItems.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 h-9 rounded-md px-2.5 transition-colors duration-150 cursor-pointer",
                    "text-muted-foreground hover:text-foreground hover:bg-secondary",
                    isActive && "bg-primary/10 text-primary",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Icon className="h-[17px] w-[17px] shrink-0" />
                  {!collapsed && (
                    <span className="text-[13px] font-medium truncate">{label(item)}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom: Logout */}
      <div className="mt-auto pt-3">
        <div className="h-px w-full bg-border mb-3" />
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 w-full h-9 rounded-md px-2.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/8 transition-colors duration-150 cursor-pointer",
            collapsed && "justify-center px-0"
          )}
        >
          <SignOut className="h-[17px] w-[17px] shrink-0" />
          {!collapsed && <span className="text-[13px] font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
