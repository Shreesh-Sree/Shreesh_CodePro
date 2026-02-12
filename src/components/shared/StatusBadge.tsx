import { cn } from '@/lib/utils';

type Status = 'active' | 'inactive' | 'graduated' | 'dropped' | 'in-progress' | 'completed';

const statusStyles: Record<Status, string> = {
  active: 'bg-success/10 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-muted-foreground/20',
  graduated: 'bg-primary/10 text-primary border-primary/20',
  dropped: 'bg-destructive/10 text-destructive border-destructive/20',
  'in-progress': 'bg-warning/10 text-warning border-warning/20',
  completed: 'bg-success/10 text-success border-success/20',
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize",
        statusStyles[status] || statusStyles.inactive,
        className
      )}
    >
      {status.replace('-', ' ')}
    </span>
  );
}
