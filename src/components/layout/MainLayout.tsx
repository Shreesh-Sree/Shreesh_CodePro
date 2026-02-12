import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { AppSidebar } from './AppSidebar';
import PageTransition from './PageTransition';

import { cn } from '@/lib/utils';

interface HeaderLogo {
  id: string;
  url: string;
  name: string;
}

export function MainLayout() {
  const location = useLocation();
  const hideSidebar = /^\/tests\/[^/]+\/attempt\/?$/.test(location.pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [logos, setLogos] = useState<HeaderLogo[]>([]);

  useEffect(() => {
    // Load logos from local storage
    const loadLogos = () => {
      const savedLogos = localStorage.getItem('headerLogos');
      if (savedLogos) {
        try {
          setLogos(JSON.parse(savedLogos));
        } catch (e) {
          console.error("Failed to parse header logos", e);
        }
      } else {
        setLogos([]);
      }
    };

    loadLogos();

    // Listen for updates
    const handleUpdate = () => loadLogos();
    window.addEventListener('headerLogosUpdated', handleUpdate);
    return () => window.removeEventListener('headerLogosUpdated', handleUpdate);
  }, []);

  // Removed Lenis for instant native scrolling

  return (
    <div className="flex min-h-screen w-full bg-background relative selection:bg-primary/30">
      {/* Apple Liquid Glass Header */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-6 border-b border-white/5 backdrop-blur-md bg-black/40 select-none">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain drop-shadow-sm" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
            CodePro
          </h1>
        </div>

        {/* Right: Logos */}
        <div className="flex items-center gap-6">
          {logos.map((logo, index) => (
            <div key={logo.id} className="flex items-center gap-6">
              {index >= 0 && <div className="h-8 w-px bg-white/10" />}
              <img
                src={logo.url}
                alt={logo.name}
                className="h-10 w-auto object-contain drop-shadow-md opacity-80 hover:opacity-100 transition-opacity"
              />
            </div>
          ))}
          {logos.length === 0 && (
            /* Fallback if no logos are set yet, or keep empty if strict */
            <>
              <img
                src="/header-logo-1.png"
                alt="St. Joseph's Group"
                className="h-10 w-auto object-contain drop-shadow-md opacity-80 hover:opacity-100 transition-opacity"
              />
              <div className="h-8 w-px bg-white/10" />
              <img
                src="/header-logo-2.png"
                alt="St. Joseph's College"
                className="h-10 w-auto object-contain drop-shadow-md opacity-80 hover:opacity-100 transition-opacity"
              />
            </>
          )}
        </div>
      </header>

      {!hideSidebar && (
        <>
          <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        </>
      )}
      <div className={cn(
        "flex-1 relative flex flex-col min-h-screen transition-all duration-300",
        hideSidebar ? "w-full" : (collapsed ? "pl-[96px]" : "pl-[312px]")
      )}>
        {/* Scrollable Content Area */}
        <main className="flex-1 pt-24 pb-6 px-6 relative" id="lenis-scroll-content">

          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
