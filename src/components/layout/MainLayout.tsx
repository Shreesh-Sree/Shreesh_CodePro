import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { List } from '@phosphor-icons/react';

import { AppSidebar } from './AppSidebar';
import PageTransition from './PageTransition';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

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
  const [mobileOpen, setMobileOpen] = useState(false);
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

  return (
    <div className="flex min-h-screen w-full bg-background relative selection:bg-primary/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-4 sm:px-6 border-b border-border backdrop-blur-md bg-background/80 select-none">
        {/* Left: Hamburger + Branding */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!hideSidebar && (
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Open menu"
            >
              <List size={22} weight="bold" />
            </button>
          )}
          <div className="w-8 h-8 shrink-0 flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain drop-shadow-sm" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
            CodePro
          </h1>
        </div>

        {/* Right: Logos — hidden on very small screens */}
        <div className="hidden sm:flex items-center gap-6">
          {logos.map((logo, index) => (
            <div key={logo.id} className="flex items-center gap-6">
              {index >= 0 && <div className="h-8 w-px bg-border" />}
              <img
                src={logo.url}
                alt={logo.name}
                className="h-10 w-auto object-contain drop-shadow-md opacity-80 hover:opacity-100 transition-opacity"
              />
            </div>
          ))}
          {logos.length === 0 && (
            <>
              <img
                src="/header-logo-1.png"
                alt="St. Joseph's Group"
                className="h-10 w-auto object-contain drop-shadow-md opacity-80 hover:opacity-100 transition-opacity"
              />
              <div className="h-8 w-px bg-border" />
              <img
                src="/header-logo-2.png"
                alt="St. Joseph's College"
                className="h-10 w-auto object-contain drop-shadow-md opacity-80 hover:opacity-100 transition-opacity"
              />
            </>
          )}
          <ThemeToggle />
        </div>
      </header>

      {!hideSidebar && (
        <AppSidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
      )}

      <div className={cn(
        "flex-1 relative flex flex-col min-h-screen transition-all duration-300",
        hideSidebar
          ? "w-full"
          : collapsed
            ? "pl-0 lg:pl-[96px]"
            : "pl-0 lg:pl-[312px]"
      )}>
        {/* Scrollable Content Area */}
        <main className="flex-1 pt-20 sm:pt-24 pb-6 px-2 sm:px-6 relative" id="lenis-scroll-content">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
