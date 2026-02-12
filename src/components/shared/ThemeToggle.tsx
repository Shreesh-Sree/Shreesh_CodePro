import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? (
                <Moon className="h-[18px] w-[18px]" weight="bold" />
            ) : (
                <Sun className="h-[18px] w-[18px]" weight="bold" />
            )}
        </Button>
    );
}
