"use client";

import { Work, moodColors, works } from "@/data/works";
import { AudioData } from "@/hooks/useAudioReactive";

interface ArtworkGalleryProps {
    activeWorkIndex: number;
    phase: number;
    audio: AudioData;
}

// Composición para la pared de museo (Fase 2)
// Diseño estético sin sobreposiciones, garantizando que el CodePen se vea nítido y grande.
// Rejilla imaginaria de 5 columnas x 2 filas, con tamaños asimétricos pero controlados.
const MUSEUM_SLOTS = [
    { top: "5%", left: "3%", width: "17vw", height: "35vh" },
    { top: "12%", left: "22%", width: "16vw", height: "30vh" },
    { top: "6%", left: "41%", width: "18vw", height: "38vh" },
    { top: "15%", left: "62%", width: "15vw", height: "28vh" },
    { top: "8%", left: "80%", width: "17vw", height: "34vh" },
    { bottom: "8%", left: "4%", width: "16vw", height: "32vh" },
    { bottom: "14%", left: "23%", width: "18vw", height: "26vh" },
    { bottom: "6%", left: "44%", width: "15vw", height: "35vh" },
    { bottom: "10%", left: "62%", width: "16vw", height: "30vh" },
    { bottom: "5%", left: "80%", width: "17vw", height: "38vh" },
];

export default function ArtworkGallery({ activeWorkIndex, phase, audio }: ArtworkGalleryProps) {
    // Solo se muestra en Fase 1 y Fase 2
    if (phase > 2) return null;

    const isSoloShowcase = phase === 1; // Fase 1: Showcase central enorme
    const isMuseum = phase === 2;       // Fase 2: Muro de museo estético

    return (
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
            <div className="relative w-full h-full">
                {works.map((work, index) => {
                    const isActive = index === activeWorkIndex;
                    const color = moodColors[work.mood];

                    // --- FASE 1: Showcase ---
                    // Opacidad y escalado. Absoluto en el centro.
                    const soloOpacity = isActive ? 1 : 0;
                    const soloTransform = isActive ? `scale(1)` : "scale(0.8) translateY(20px)";
                    const soloZ = isActive ? 10 : 0;
                    const soloLayout = {
                        width: "65vw",
                        height: "65vh",
                        top: "0", bottom: "0", left: "0", right: "0", margin: "auto"
                    };

                    // --- FASE 2: Muro de Museo ---
                    const museumOpacity = 1;
                    const museumTransform = `scale(1)`;
                    const museumLayout = MUSEUM_SLOTS[index % MUSEUM_SLOTS.length];
                    const museumZ = index;

                    const opacity = isSoloShowcase ? soloOpacity : museumOpacity;
                    const transform = isSoloShowcase ? soloTransform : museumTransform;
                    const zIndex = isSoloShowcase ? soloZ : museumZ;
                    const layout = isSoloShowcase ? soloLayout : museumLayout;

                    return (
                        <div
                            key={work.title}
                            className="absolute transition-all duration-[1200ms] ease-[cubic-bezier(0.2,1,0.2,1)]"
                            style={{
                                opacity,
                                transform,
                                zIndex,
                                ...layout,
                                ...(isSoloShowcase && !isActive ? { pointerEvents: "none" } : {})
                            }}
                        >
                            {/* Marco CodePen */}
                            <div
                                className={`relative w-full h-full overflow-hidden transition-all duration-[400ms] ${isMuseum ? 'rounded-md shadow-2xl' : 'rounded-xl'}`}
                                style={{
                                    border: isSoloShowcase ? `1px solid ${color}80` : `1px solid rgba(255,255,255,0.15)`,
                                    boxShadow: isSoloShowcase ? `0 0 ${20 + audio.bass * 60}px ${color}60` : `0 0 ${10 + audio.volume * 30}px ${color}30`
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
                                        transform: "scale(0.5)",
                                        transformOrigin: "top left"
                                    }}
                                    loading="lazy"
                                    sandbox="allow-scripts allow-same-origin allow-popups"
                                />
                            </div>

                            {/* Textos debajo de la obra */}
                            <div
                                className={`text-center transition-all duration-1000 ${isSoloShowcase ? 'absolute -bottom-20 w-full' : 'absolute -bottom-6 w-full'}`}
                                style={{ opacity: isActive || isMuseum ? 1 : 0 }}
                            >
                                <h2
                                    className={`${isSoloShowcase ? 'text-xl md:text-2xl' : 'text-[8px] truncate px-2'} font-light tracking-[0.2em] uppercase mb-1 drop-shadow-md`}
                                    style={{ color: "#fff" }}
                                >
                                    {work.title}{work.subtitle ? `: ${work.subtitle}` : ""}
                                </h2>
                                <div
                                    className={`${isSoloShowcase ? 'text-sm mb-4' : 'text-[6px] truncate'} tracking-[0.15em] opacity-60 font-mono`}
                                    style={{ color: isSoloShowcase ? color : "#ccc" }}
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
