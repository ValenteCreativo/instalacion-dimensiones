"use client";

import { useRef, useEffect } from "react";
import { AudioData } from "@/hooks/useAudioReactive";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    baseSize: number;
    alpha: number;
    life: number;
    maxLife: number;
}

export default function ParticlesBackground({ audio, phase }: { audio: AudioData; phase: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const reqRef = useRef<number>(0);

    // Only render in phase 1 and 2
    useEffect(() => {
        if (phase > 2) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const createParticle = (): Particle => {
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                baseSize: Math.random() * 2 + 1,
                size: 0,
                alpha: Math.random() * 0.5 + 0.1,
                life: 0,
                maxLife: Math.random() * 200 + 100,
            };
        };

        // Initialize some particles
        for (let i = 0; i < 150; i++) {
            particlesRef.current.push(createParticle());
        }

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const { bass, volume } = audio;
            const currentParticles = particlesRef.current;

            // Add particles randomly, more with higher volume
            if (Math.random() < volume * 0.5) {
                currentParticles.push(createParticle());
            }

            for (let i = currentParticles.length - 1; i >= 0; i--) {
                const p = currentParticles[i];
                p.life++;
                if (p.life >= p.maxLife) {
                    currentParticles.splice(i, 1);
                    currentParticles.push(createParticle()); // replace
                    continue;
                }

                // Audio reactive behavior
                p.x += p.vx * (1 + bass * 2);
                p.y += p.vy * (1 + bass * 2);

                // Audio reactive size
                p.size = p.baseSize + (bass * 3);

                // Wrap around
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                // Draw
                const fade = Math.sin((p.life / p.maxLife) * Math.PI);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * fade * (0.5 + volume)})`;
                ctx.fill();
            }

            reqRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(reqRef.current);
            particlesRef.current = [];
        };
    }, [audio, phase]);

    if (phase > 2) return null;

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ opacity: 0.8 }}
        />
    );
}
