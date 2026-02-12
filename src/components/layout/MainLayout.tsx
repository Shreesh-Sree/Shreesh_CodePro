import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import PageTransition from './PageTransition';

import { cn } from '@/lib/utils';

export function MainLayout() {
  const location = useLocation();
  const hideSidebar = /^\/tests\/[^/]+\/attempt\/?$/.test(location.pathname);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background relative">
      {!hideSidebar && (
        <>
          <div className={cn(
            "fixed top-6 left-6 z-50 flex items-center gap-3 transition-all duration-300",
            collapsed ? "w-[64px] justify-center left-4" : "w-[280px]"
          )}>
            <div className="w-8 h-8 shrink-0 flex items-center justify-center">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain drop-shadow-sm" />
            </div>
            {!collapsed && (
              <span className="text-lg font-semibold tracking-tight text-foreground transition-opacity duration-300" style={{ fontFamily: 'var(--font-serif)' }}>
                CodePro Flow
              </span>
            )}
          </div>
          <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        </>
      )}
      <div className={cn(
        "flex-1 relative flex flex-col h-screen overflow-hidden bg-background/50 transition-all duration-300",
        hideSidebar ? "w-full" : (collapsed ? "pl-[90px]" : "pl-[328px]")
      )}>
        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto scroll-smooth py-6 px-6 custom-scrollbar relative">

          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
