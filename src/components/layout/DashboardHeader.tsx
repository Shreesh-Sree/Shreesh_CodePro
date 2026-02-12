import { Bell, MagnifyingGlass, List } from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';

const getPageTitle = (pathname: string): string => {
    const segment = pathname.split('/').filter(Boolean)[0] || 'dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
};

export function DashboardHeader() {
    const location = useLocation();
    const title = getPageTitle(location.pathname);

    return (
        <header
            className="flex items-center justify-between gap-4 h-14 px-6 w-full rounded-lg transition-colors duration-150 bg-card border border-border"
        >
            {/* Left — Page Title */}
            <div className="flex items-center gap-4">
                <button className="flex md:hidden items-center justify-center h-9 w-9 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    <List className="h-5 w-5" />
                </button>
                <h1 className="text-lg font-medium text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
                    {title}
                </h1>
            </div>

            {/* Right — Search & Notification */}
            <div className="flex items-center gap-2">
                <div className="relative hidden md:flex items-center">
                    <MagnifyingGlass className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        className="pl-9 h-9 w-52 rounded-lg bg-secondary border-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/30 transition-colors duration-150"
                    />
                </div>

                <button className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    <MagnifyingGlass className="h-5 w-5" />
                </button>

                <div className="h-5 w-px bg-border hidden sm:block" />

                <button className="relative flex items-center justify-center h-9 w-9 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
                </button>
            </div>
        </header>
    );
}
