"use client";

import { useRef, useEffect } from "react";
import { AudioData } from "@/hooks/useAudioReactive";

interface CodeDrop {
    x: number;
    y: number;
    speed: number;
    chars: string[];
    fontSize: number;
    alpha: number;
    glitchPhase: number;
}

const DIMENSIONAL_CHARS = "010101+-×÷=::||∆∇≈∫∬∭∮∯∰※⊕⊗⊘⊙⊚⊛⊜⊝".split("");

export default function ParticlesBackground({ audio, phase }: { audio: AudioData; phase: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dropsRef = useRef<CodeDrop[]>([]);
    const reqRef = useRef<number>(0);

    useEffect(() => {
        if (phase !== 1) return;

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

        const createDrop = (resetY: boolean = false): CodeDrop => {
            const length = Math.floor(Math.random() * 5) + 3;
            const chars = [];
            for (let i = 0; i < length; i++) {
                chars.push(DIMENSIONAL_CHARS[Math.floor(Math.random() * DIMENSIONAL_CHARS.length)]);
            }
            return {
                x: Math.random() * canvas.width,
                y: resetY ? (Math.random() * -100) : Math.random() * canvas.height, // Si es nuevo comienza arriba, si no, se esparce
                speed: Math.random() * 1.5 + 0.5,
                chars,
                fontSize: Math.floor(Math.random() * 6) + 10, // 10 a 16 px
                alpha: Math.random() * 0.3 + 0.05,
                glitchPhase: Math.random() * Math.PI * 2,
            };
        };

        // Initialize 100 drops
        for (let i = 0; i < 150; i++) {
            dropsRef.current.push(createDrop(false));
        }

        const render = () => {
            // Fondo ligeramente negro para crear "trail" (motion blur sutil)
            ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const { bass, volume } = audio;
            const currentDrops = dropsRef.current;

            // Audio reaction
            const isGlitchy = bass > 0.4;
            const theGlow = bass * 15;

            ctx.shadowBlur = theGlow;
            ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
            ctx.textAlign = "center";

            for (let i = 0; i < currentDrops.length; i++) {
                const drop = currentDrops[i];

                drop.y += drop.speed * (1 + bass); // cae ligeramente más rápido con el beat

                // Reiniciar si pasa del borde
                if (drop.y - (drop.chars.length * drop.fontSize) > canvas.height) {
                    currentDrops[i] = createDrop(true);
                    continue;
                }

                drop.glitchPhase += 0.1;

                ctx.font = `300 ${drop.fontSize}px 'JetBrains Mono', monospace`;

                // Dibujar caracteres en columna
                for (let c = 0; c < drop.chars.length; c++) {
                    const charY = drop.y - (c * drop.fontSize); // el primer char es el de más abajo (cabeza), los siguientes están arriba (cola)

                    let charX = drop.x;
                    // Efecto glitch audioreactivo
                    if (isGlitchy && Math.sin(drop.glitchPhase + c) > 0.8) {
                        charX += (Math.random() - 0.5) * 10;
                        // Ocasionalmente cambiar letra en el glitch
                        if (Math.random() < 0.1) {
                            drop.chars[c] = DIMENSIONAL_CHARS[Math.floor(Math.random() * DIMENSIONAL_CHARS.length)];
                        }
                    }

                    // La letra cabeza (c=0) es la más brillante, la cola se va haciendo opaca
                    const headBoost = c === 0 ? 0.3 : 0;
                    const charAlpha = Math.max(0.01, drop.alpha - (c * 0.05) + headBoost + (bass * 0.2));

                    ctx.fillStyle = `rgba(255, 255, 255, ${charAlpha})`;
                    ctx.fillText(drop.chars[c], charX, charY);
                }
            }

            // Restore shadow
            ctx.shadowBlur = 0;

            reqRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(reqRef.current);
            dropsRef.current = [];
        };
    }, [audio, phase]);

    if (phase !== 1) return null;

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ opacity: 0.7 }}
        />
    );
}
