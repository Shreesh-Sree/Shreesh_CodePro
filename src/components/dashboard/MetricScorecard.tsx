import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "@phosphor-icons/react";

interface MetricScorecardProps {
    title: string;
    value: string | number;
    trend?: {
        value: number;
        isPositive?: boolean;
        neutral?: boolean;
        label?: string;
    };
    icon: React.ElementType;
    description?: string;
    color?: string;
    className?: string;
}

const iconColorMap: Record<string, string> = {
    primary: "bg-primary/20 text-primary",
    secondary: "bg-secondary/20 text-secondary",
    accent: "bg-primary/20 text-primary",
    success: "bg-emerald-500/20 text-emerald-400",
    warning: "bg-amber-500/20 text-amber-400",
    blue: "bg-blue-500/20 text-blue-400",
    teal: "bg-teal-500/20 text-teal-400",
    slate: "bg-slate-500/20 text-slate-400",
    orange: "bg-orange-500/20 text-orange-400",
};

export function MetricScorecard({
    title,
    value,
    trend,
    icon: Icon,
    description,
    color = "primary",
    className,
}: MetricScorecardProps) {
    const isPositive = trend?.isPositive ?? (trend?.value && trend.value > 0);
    const isNeutral = trend?.neutral;

    return (
        <div className={cn("neo-card group", className)}>
            <div className="grid-c-title">
                <h3 className="grid-c-title-text text-sm">{title}</h3>
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", iconColorMap[color] || iconColorMap.primary)}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>

            <div className="flex items-baseline gap-3 mt-2">
                <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                        isNeutral ? "bg-muted text-muted-foreground" :
                            isPositive ? "bg-emerald-500/15 text-emerald-400" :
                                "bg-red-500/15 text-red-400"
                    )}>
                        {isNeutral ? <Minus className="h-3 w-3" /> : isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        <span>{Math.abs(trend.value)}%</span>
                    </div>
                )}
            </div>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
    );
}
