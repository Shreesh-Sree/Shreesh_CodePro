import { cn } from "@/lib/utils";

export const BentoGrid = ({
    className,
    children,
}: {
    className?: string;
    children?: React.ReactNode;
}) => {
    return (
        <div
            className={cn(
                "neo-grid mx-auto",
                className
            )}
        >
            {children}
        </div>
    );
};

export const BentoGridItem = ({
    className,
    title,
    description,
    header,
    icon,
}: {
    className?: string;
    title?: string | React.ReactNode;
    description?: string | React.ReactNode;
    header?: React.ReactNode;
    icon?: React.ReactNode;
}) => {
    return (
        <div
            className={cn(
                "neo-card group flex flex-col justify-between space-y-4",
                className
            )}
        >
            {header}
            <div className="neo-card-content group-hover:translate-x-1 transition duration-200">
                {icon}
                <div className="font-bold text-foreground mb-2 mt-2">
                    {title}
                </div>
                <div className="font-normal text-muted-foreground text-sm">
                    {description}
                </div>
            </div>
        </div>
    );
};
