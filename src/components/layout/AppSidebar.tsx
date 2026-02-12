import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Buildings, SquaresFour, Users, BookOpen, ChartBar,
  GraduationCap, CaretLeft, CaretRight, SignOut,
  House, Shield, Briefcase, CalendarCheck, ClipboardText,
  NotePencil, Bell, Question, X
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/contexts/PermissionContext';
import { Permission } from '@/types/auth';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

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
  mobileOpen?: boolean;
  setMobileOpen?: (v: boolean) => void;
}

export function AppSidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: AppSidebarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const { user, logout } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermission();
  const location = useLocation();

  useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024);
      if (width < 1200 && width >= 1024) {
        setCollapsed(true);
      }
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    if (isMobile && mobileOpen) {
      setMobileOpen?.(false);
    }
  }, [location.pathname]);

  const filteredNavItems = useMemo(() => navItems.filter(item => {
    if (item.superAdminOnly) return user?.role === 'SUPERADMIN';
    if (item.studentOnly) return user?.role === 'STUDENT';
    if (item.permissions) return hasAnyPermission(item.permissions);
    if (item.permission) return hasPermission(item.permission);
    return true;
  }), [user?.role, hasAnyPermission, hasPermission]);

  const label = (item: NavItem) =>
    item.path === '/users' && user?.role === 'DEPARTMENT' ? 'Mentors' : item.title;

  const sidebarContent = (
    <>
      {/* Navigation Top Padding */}
      <div className="h-2" />

      {/* User Profile */}
      <div className="relative z-10 p-4 pb-2">
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-lg transition-all duration-300",
          "hover:bg-muted/50 group cursor-default"
        )}>
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-md flex items-center justify-center bg-primary/10 text-primary font-bold">
              {user?.name?.charAt(0) || 'C'}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {(!collapsed || isMobile) && (
              <motion.div
                initial={{ opacity: 0, x: -10, filter: 'blur(5px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -10, filter: 'blur(5px)' }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="min-w-0 flex-1"
              >
                <p className="text-base font-semibold text-foreground truncate">{user?.name || 'User'}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-muted-foreground truncate uppercase tracking-wider">{user?.role || 'Admin'}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-3 custom-scrollbar relative z-10">
        <LayoutGroup>
          <ul className="space-y-1">
            {filteredNavItems.map(item => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <li key={item.path}>
                  <NavLink to={item.path} className="relative block group">
                    {isActive && (
                      <motion.div
                        layoutId={isMobile ? "activeNavMobile" : "activeNav"}
                        className="absolute inset-0 rounded-md bg-accent/15 border border-accent/20"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <div className={cn(
                      "relative flex items-center h-11 px-0 rounded-md transition-all duration-200 overflow-hidden",
                      isActive ? "text-accent" : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      (!isMobile && collapsed) ? "justify-center" : "gap-0"
                    )}>
                      {/* Fixed Square Icon Container */}
                      <div className="w-11 h-11 shrink-0 flex items-center justify-center">
                        <Icon className={cn(
                          "h-6 w-6 transition-transform duration-300",
                          isActive && "scale-110",
                          !isActive && "group-hover:scale-110"
                        )} weight={isActive ? "fill" : "regular"} />
                      </div>

                      <AnimatePresence mode="wait">
                        {(!collapsed || isMobile) && (
                          <motion.span
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5 }}
                            transition={{ duration: 0.2 }}
                            className="text-[15px] font-medium truncate pr-4"
                          >
                            {label(item)}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </LayoutGroup>
      </div>

      {/* Footer / Toggle */}
      <div className="relative z-10 p-3 mt-auto border-t border-border/40">
        <div className="flex flex-col gap-1">
          {!isMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center justify-center w-full h-9 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {collapsed ? <CaretRight size={18} /> : (
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest">
                  <CaretLeft size={16} /> Hide Sidebar
                </div>
              )}
            </button>
          )}

          {(!collapsed || isMobile) && <div className="h-px bg-border mx-2 my-1" />}

          <button
            onClick={logout}
            className={cn(
              "flex items-center justify-center gap-2 w-full h-9 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
              (!isMobile && collapsed) && "h-10 w-full"
            )}
            title="Logout"
          >
            <SignOut size={18} />
            {(!collapsed || isMobile) && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </div>
    </>
  );

  // Mobile: slide-out drawer with backdrop
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen?.(false)}
            />
          )}
        </AnimatePresence>

        {/* Drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-card text-card-foreground border-r border-border shadow-2xl"
            >
              {/* Mobile header with close button */}
              <div className="flex items-center justify-between px-4 h-16 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
                  <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>CodePro</span>
                </div>
                <button
                  onClick={() => setMobileOpen?.(false)}
                  className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {sidebarContent}
            </motion.aside>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <motion.aside
      initial={false}
      animate={{
        width: collapsed ? 80 : 300,
        transition: {
          type: "spring",
          damping: 30,
          stiffness: 300,
          mass: 0.8
        }
      }}
      className={cn(
        "fixed top-20 bottom-4 left-4 z-40 flex flex-col rounded-xl overflow-hidden border border-border",
        "bg-card text-card-foreground shadow-sm"
      )}
    >
      {sidebarContent}
    </motion.aside>
  );
}
