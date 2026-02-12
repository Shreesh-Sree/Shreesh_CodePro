"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface BentoGridProps {
    children: React.ReactNode;
    className?: string;
}

export const BentoGrid = ({ children, className }: BentoGridProps) => {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren: 0.1,
                    },
                },
            }}
            className={cn(
                "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4",
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
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                    opacity: 1,
                    y: 0,
                    transition: { type: "spring", damping: 20, stiffness: 100 },
                },
            }}
            onClick={onClick}
            className={cn(
                "group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 flex flex-col justify-between transition-all duration-500 hover:border-primary/40 hover:bg-white/10 cursor-pointer shadow-xl",
                size === "large" ? "md:col-span-4" : size === "medium" ? "md:col-span-3" : "md:col-span-2",
                className
            )}
        >
            {/* Background Pattern */}
            <div className="absolute top-0 -right-1/2 z-0 size-full cursor-pointer bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-[size:24px_24px] pointer-events-none" />

            {/* Icon floating background */}
            {icon && (
                <div className="absolute right-2 bottom-4 text-white/5 scale-[5] group-hover:scale-[5.5] transition-all duration-700 pointer-events-none opacity-20">
                    {icon}
                </div>
            )}

            <div className="relative z-10">
                {header && <div className="mb-4">{header}</div>}
                <div className="flex items-center gap-3 mb-2">
                    {icon && (
                        <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 flex items-center justify-center">
                            {icon}
                        </div>
                    )}
                    <h3 className="font-bold text-white text-lg tracking-tight group-hover:text-primary transition-colors duration-300">
                        {title}
                    </h3>
                </div>
                <div className="text-muted-foreground text-sm line-clamp-2 group-hover:text-white/80 transition-colors duration-300">
                    {description}
                </div>
            </div>

            {/* Hover glow */}
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-primary/60 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
        </motion.div>
    );
};
