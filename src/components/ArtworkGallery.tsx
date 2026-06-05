"use client";

import { Work, moodColors, works } from "@/data/works";
import { AudioData } from "@/hooks/useAudioReactive";

interface ArtworkGalleryProps {
    activeWorkIndex: number;
    phase: number;
    audio: AudioData;
}

// Composición para la pared de museo (Fase 2) ELIMINADA por rendimiento
export default function ArtworkGallery({ activeWorkIndex, phase, audio }: ArtworkGalleryProps) {
    const isSoloShowcase = phase === 1; // Fase 1: Showcase central enorme

    // En Fase 3 el contenedor padre lo pondrá en opacity 0,
    // pero internamente usaremos visibility: hidden para pausar los iframes y ahorrar recursos.
    const isHiddenPhase = phase !== 1;

    return (
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
            <div className="relative w-full h-full">
                {works.map((work, index) => {
                    const isActive = index === activeWorkIndex;
                    const color = moodColors[work.mood];

                    // --- FASE 1: Showcase ---
                    const opacity = isActive ? 1 : 0;
                    const transform = isActive ? `scale(1)` : "scale(0.8) translateY(20px)";
                    const zIndex = isActive ? 10 : 0;
                    const layout = {
                        width: "65vw",
                        height: "65vh",
                        top: "0", bottom: "0", left: "0", right: "0", margin: "auto"
                    };

                    // Optimización: Solo renderizamos el activo. Fase 3 oculta todo.
                    const isVisible = isHiddenPhase ? false : isActive;

                    return (
                        <div
                            key={work.title}
                            className={`absolute transition-all duration-[1200ms] ease-[cubic-bezier(0.2,1,0.2,1)]`}
                            style={{
                                opacity,
                                transform,
                                zIndex,
                                visibility: isVisible ? "visible" : "hidden",
                                willChange: "transform, opacity",
                                ...layout,
                                ...(isSoloShowcase && !isActive ? { pointerEvents: "none" } : {})
                            }}
                        >
                            {/* Marco CodePen */}
                            <div
                                className={`relative w-full h-full overflow-hidden transition-all duration-[400ms] rounded-xl`}
                                style={{
                                    border: `1px solid rgba(255,255,255,0.15)`,
                                    boxShadow: `0 0 ${20 + audio.bass * 60}px ${color}80`
                                }}
                            >
                                <div className="absolute inset-0 bg-black z-0" />
                                {/* Hack de zoom out: hacemos el iframe del doble de tamaño y lo escalamos al 50% con transform origin arriba izquierda */}
                                <iframe
                                    src={work.url}
                                    title={work.title}
                                    className="border-0 relative z-10"
                                    style={{
                                        pointerEvents: "none",
                                        width: "200%",
                                        height: "200%",
                                        transform: "scale(0.5) translateZ(0)",
                                        transformOrigin: "top left",
                                    }}
                                    sandbox="allow-scripts allow-same-origin allow-popups"
                                />
                            </div>

                            {/* Textos debajo de la obra */}
                            <div
                                className={`text-center transition-all duration-1000 absolute -bottom-20 w-full`}
                                style={{ opacity: isActive ? 1 : 0 }}
                            >
                                <h2
                                    className={`text-xl md:text-2xl font-light tracking-[0.2em] uppercase mb-1 drop-shadow-md`}
                                    style={{ color: "#fff" }}
                                >
                                    {work.title}{work.subtitle ? `: ${work.subtitle}` : ""}
                                </h2>
                                <div
                                    className={`text-sm mb-4 tracking-[0.15em] opacity-60 font-mono`}
                                    style={{ color: color }}
                                >
                                    {work.author} &middot; {work.year}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
