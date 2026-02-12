'use client';

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';

export default function PageTransition({ children }: { children: React.ReactNode }) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;

        // Simple fade-in and slide-up animation on route change
        gsap.fromTo(el,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
        );

    }, [location.pathname]);

    return (
        <div ref={wrapperRef} className="w-full h-full">
            {children}
        </div>
    );
}
