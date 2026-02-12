import { motion, Variants } from 'framer-motion';

interface StaggerTextProps {
    text: string;
    className?: string;
    delay?: number;
}

export default function StaggerText({ text, className = "", delay = 0 }: StaggerTextProps) {
    const container: Variants = {
        hidden: { opacity: 0 },
        visible: (i = 1) => ({
            opacity: 1,
            transition: { staggerChildren: 0.03, delayChildren: delay }
        })
    };

    const child: Variants = {
        visible: {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            transition: {
                type: "spring",
                damping: 12,
                stiffness: 200,
            },
        },
        hidden: {
            opacity: 0,
            y: 10,
            filter: 'blur(4px)',
            transition: {
                type: "spring",
                damping: 12,
                stiffness: 200,
            },
        },
    };

    return (
        <motion.div
            className={className}
            variants={container}
            initial="hidden"
            animate="visible"
            aria-label={text}
        >
            {text.split('').map((char, index) => (
                <motion.span
                    key={index}
                    variants={child}
                    className="inline-block"
                    style={{ whiteSpace: 'pre' }}
                >
                    {char}
                </motion.span>
            ))}
        </motion.div>
    );
}
