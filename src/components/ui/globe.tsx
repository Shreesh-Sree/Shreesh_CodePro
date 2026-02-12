"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Globe({ className }: { className?: string }) {
    return (
        <div className={cn("relative flex items-center justify-center overflow-hidden", className)}>
            <div className="relative w-full aspect-square max-w-[500px]">
                {/* Atmosphere Glow */}
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-[100px] animate-pulse" />

                {/* Main Globe Sphere */}
                <div className="absolute inset-4 rounded-full border border-primary/20 bg-gradient-to-b from-primary/10 via-background to-background backdrop-blur-3xl shadow-[0_0_50px_rgba(var(--primary),0.1)] overflow-hidden">
                    {/* Lat/Long Grid lines (Simplified) */}
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-1/2 left-0 w-full h-px bg-primary/40" />
                        <div className="absolute top-0 left-1/2 w-px h-full bg-primary/40" />
                        <div className="absolute inset-0 rounded-full border border-primary/30 scale-75" />
                        <div className="absolute inset-0 rounded-full border border-primary/30 scale-50" />
                    </div>

                    {/* Glowing Points / Map Simulation */}
                    <div className="absolute inset-0">
                        {[...Array(12)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),1)]"
                                initial={{ opacity: 0.2 }}
                                animate={{
                                    opacity: [0.2, 1, 0.2],
                                    scale: [1, 1.5, 1]
                                }}
                                transition={{
                                    duration: 2 + Math.random() * 3,
                                    repeat: Infinity,
                                    delay: Math.random() * 2
                                }}
                                style={{
                                    top: `${20 + Math.random() * 60}%`,
                                    left: `${20 + Math.random() * 60}%`
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Rotating Rings */}
                <motion.div
                    className="absolute inset-0 rounded-full border-t border-b border-primary/30"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className="absolute inset-[10%] rounded-full border-l border-r border-primary/20"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                />

                {/* Outer Orbit marker */}
                <motion.div
                    className="absolute top-0 left-1/2 -ml-1 w-2 h-2 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),1)]"
                    animate={{
                        rotate: 360,
                        transformOrigin: "50% 250px"
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
            </div>
        </div>
    );
}
