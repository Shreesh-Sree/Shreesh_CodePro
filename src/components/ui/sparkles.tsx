"use client";
import React, { useMemo, useRef, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { cn } from "@/lib/utils";

type ParticlesProps = {
    id?: string;
    className?: string;
    background?: string;
    minSize?: number;
    maxSize?: number;
    particleDensity?: number;
    particleColor?: string;
    speed?: number;
};

export const SparklesCore = (props: ParticlesProps) => {
    const {
        id = "sparkles",
        className,
        background = "transparent",
        minSize = 0.6,
        maxSize = 1.4,
        particleDensity = 100,
        particleColor = "#FFFFFF",
        speed = 1,
    } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<any[]>([]);
    const animationFrameId = useRef<number>();

    const initParticles = (width: number, height: number) => {
        const count = Math.floor((width * height) / (1000000 / particleDensity));
        particles.current = Array.from({ length: count }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * (maxSize - minSize) + minSize,
            speedX: (Math.random() - 0.5) * speed,
            speedY: (Math.random() - 0.5) * speed,
            opacity: Math.random(),
        }));
    };

    const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = particleColor;

        particles.current.forEach((p) => {
            ctx.globalAlpha = p.opacity;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            p.x += p.speedX;
            p.y += p.speedY;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;
        });

        animationFrameId.current = requestAnimationFrame(() => draw(ctx, width, height));
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const handleResize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            canvas.width = parent.offsetWidth;
            canvas.height = parent.offsetHeight;
            initParticles(canvas.width, canvas.height);
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        draw(ctx, canvas.width, canvas.height);

        return () => {
            window.removeEventListener("resize", handleResize);
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [particleColor, speed]);

    return (
        <div className={cn("h-full w-full", className)} style={{ background }}>
            <canvas ref={canvasRef} id={id} className="h-full w-full" />
        </div>
    );
};
