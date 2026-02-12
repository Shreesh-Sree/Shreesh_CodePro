'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function GrainEffect() {
    const grainRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = grainRef.current;
        if (!el) return;

        // Animate the grain position to create a "film noise" effect
        const content = el.querySelector('.grain-texture');
        if (!content) return;

        // Swiftly move the background to create noise
        const tl = gsap.timeline({ repeat: -1 });

        tl.to(content, {
            x: '-10%',
            y: '-10%',
            duration: 0.5,
            ease: 'steps(3)',
        }).to(content, {
            x: '10%',
            y: '10%',
            duration: 0.2, // fast twitch
            ease: 'steps(4)',
        }).to(content, {
            x: '-5%',
            y: '5%',
            duration: 0.4,
            ease: 'steps(2)',
        }).to(content, {
            x: '5%',
            y: '-5%',
            duration: 0.3,
            ease: 'steps(5)',
        }).to(content, {
            x: 0,
            y: 0,
            duration: 0.2,
            ease: 'steps(3)',
        });

        return () => {
            tl.kill();
        };
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.07] overflow-hidden mix-blend-overlay">
            <div
                className="grain-texture absolute -top-[50%] -left-[50%] w-[200%] h-[200%]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat',
                }}
            />
        </div>
    );
}
