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
    // Ref para el audio — evita que el effect se re-ejecute en cada tick de audio
    const audioRef = useRef<AudioData>(audio);
    useEffect(() => { audioRef.current = audio; }, [audio]);

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

        const createDrop = (resetY = false): CodeDrop => {
            const length = Math.floor(Math.random() * 3) + 2; // 2–4 chars
            const chars = Array.from({ length }, () =>
                DIMENSIONAL_CHARS[Math.floor(Math.random() * DIMENSIONAL_CHARS.length)]
            );
            return {
                x: Math.random() * canvas.width,
                y: resetY ? Math.random() * -200 : Math.random() * canvas.height,
                speed: Math.random() * 0.3 + 0.08, // muy lento: 0.08–0.38 px/frame
                chars,
                fontSize: Math.floor(Math.random() * 4) + 7, // 7–10px
                alpha: Math.random() * 0.12 + 0.04, // muy tenue: 0.04–0.16
                glitchPhase: Math.random() * Math.PI * 2,
            };
        };

        // 28 drops — presencia discreta, no invasiva
        dropsRef.current = Array.from({ length: 28 }, () => createDrop(false));

        const render = () => {
            // Trail largo → los caracteres se desvanecen suavemente, no se acumulan
            ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const { bass } = audioRef.current;

            // Glow muy sutil — solo un leve halo en beats fuertes
            ctx.shadowBlur = bass > 0.5 ? bass * 8 : 0;
            ctx.shadowColor = "rgba(200, 200, 255, 0.3)";
            ctx.textAlign = "center";

            for (let i = 0; i < dropsRef.current.length; i++) {
                const drop = dropsRef.current[i];

                // Bass acelera muy levemente la caída (máx +30%)
                drop.y += drop.speed * (1 + bass * 0.3);

                if (drop.y - drop.chars.length * drop.fontSize > canvas.height) {
                    dropsRef.current[i] = createDrop(true);
                    continue;
                }

                drop.glitchPhase += 0.08;

                ctx.font = `300 ${drop.fontSize}px 'JetBrains Mono', monospace`;

                for (let c = 0; c < drop.chars.length; c++) {
                    const charY = drop.y - c * drop.fontSize;

                    let charX = drop.x;
                    // Glitch muy ocasional — solo si bass es alto y la prob es baja
                    if (bass > 0.55 && Math.sin(drop.glitchPhase + c) > 0.92) {
                        charX += (Math.random() - 0.5) * 6;
                        if (Math.random() < 0.06) {
                            drop.chars[c] = DIMENSIONAL_CHARS[
                                Math.floor(Math.random() * DIMENSIONAL_CHARS.length)
                            ];
                        }
                    }

                    // Cabeza ligeramente más visible, cola se desvanece rápido
                    const headBoost = c === 0 ? 0.08 : 0;
                    const charAlpha = Math.max(
                        0.01,
                        drop.alpha - c * 0.04 + headBoost + bass * 0.06
                    );

                    ctx.fillStyle = `rgba(220, 220, 255, ${charAlpha})`;
                    ctx.fillText(drop.chars[c], charX, charY);
                }
            }

            ctx.shadowBlur = 0;
            reqRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(reqRef.current);
            dropsRef.current = [];
        };
    // Solo depende de phase — audio se lee via ref
    }, [phase]);

    if (phase !== 1) return null;

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ opacity: 0.5 }}
        />
    );
}
