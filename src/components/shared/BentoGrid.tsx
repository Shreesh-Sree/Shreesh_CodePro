import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const BentoGrid = ({
    className,
    children,
}: {
    className?: string;
    children?: React.ReactNode;
}) => {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: {
                        staggerChildren: 0.05,
                    },
                },
            }}
            className={cn(
                "grid md:auto-rows-[9rem] grid-cols-1 md:grid-cols-4 gap-3 max-w-7xl mx-auto",
                className
            )}
        >
            {children}
        </motion.div>
    );
};

interface BentoGridItemProps {
    title: string | React.ReactNode;
    description: string | React.ReactNode;
    header?: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
    size?: "small" | "medium" | "large";
    onClick?: () => void;
}

export const BentoGridItem = ({
    title,
    description,
    header,
    icon,
    className,
    size = "small",
    onClick,
}: BentoGridItemProps) => {
    return (
        <motion.div
            layout
            variants={{
                hidden: { opacity: 0, y: 10, scale: 0.98 },
                visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { type: "spring", damping: 25, stiffness: 300 },
                },
            }}
            whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.99 }}
            onClick={onClick}
            className={cn(
                "group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 flex flex-col justify-between transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 cursor-pointer",
                size === "large" ? "col-span-1 md:col-span-2 lg:col-span-4" : size === "medium" ? "col-span-1 md:col-span-2 lg:col-span-2" : "col-span-1 md:col-span-1 lg:col-span-1",
                className
            )}
            style={{ willChange: 'transform, opacity' }}
        >
            {/* Subtle Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 h-full flex flex-col">
                {header && <div className="mb-3">{header}</div>}

                <div className="mt-auto">
                    <div className="flex items-center gap-2 mb-1">
                        {icon && (
                            <div className="text-primary/70 group-hover:text-primary transition-colors duration-300">
                                {icon}
                            </div>
                        )}
                        <h3 className="font-semibold text-foreground text-[0.95rem] tracking-tight group-hover:text-primary transition-colors duration-300">
                            {title}
                        </h3>
                    </div>
                    <div className="text-muted-foreground text-xs line-clamp-2 md:line-clamp-none group-hover:text-foreground/80 transition-colors duration-300 pl-0.5">
                        {description}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
