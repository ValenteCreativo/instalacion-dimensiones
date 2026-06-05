"use client";

import { Work, moodColors } from "@/data/works";

interface GalleryShowcaseProps {
    work: Work;
    visible: boolean;
    phase: number;
}

export default function GalleryShowcase({ work, visible, phase }: GalleryShowcaseProps) {
    if (!visible) return null;

    const color = moodColors[work.mood];

    // En fase 1 (Galería), la obra es grande y central.
    // En otras fases, se escala o reubica.
    const isMainGallery = phase === 1;

    return (
        <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
                opacity: isMainGallery ? 1 : 0.85,
                transform: isMainGallery ? "scale(1) translateY(-2%)" : "scale(0.4) translateY(-30%)",
            }}
        >
            {/* Marco de la obra principal */}
            <div
                className="relative w-[65vw] h-[65vh] rounded-xl overflow-hidden transition-all duration-1000"
                style={{
                    boxShadow: `0 0 30px ${color}40, inset 0 0 40px ${color}20`,
                    border: `1px solid ${color}80`
                }}
            >
                <div className="absolute inset-0 bg-black/40 z-0" />
                <iframe
                    src={work.url}
                    title={work.title}
                    className="w-full h-full border-0 relative z-10"
                    style={{ pointerEvents: "none" }}
                    sandbox="allow-scripts allow-same-origin allow-popups"
                />

                {/* Glow animado interno */}
                <div
                    className="absolute inset-0 z-20 pointer-events-none transition-opacity duration-1000"
                    style={{
                        boxShadow: `inset 0 0 ${isMainGallery ? 20 : 60}px ${color}`,
                        opacity: isMainGallery ? 0.3 : 0.8
                    }}
                />
            </div>

            {/* Metadatos (título, autor, año) */}
            <div
                className="mt-8 text-center transition-all duration-1000"
                style={{
                    opacity: isMainGallery ? 1 : 0,
                    transform: isMainGallery ? "translateY(0)" : "translateY(20px)",
                }}
            >
                <h2
                    className="text-2xl md:text-4xl font-light tracking-[0.2em] uppercase mb-2"
                    style={{ color: "#fff", textShadow: `0 0 15px ${color}` }}
                >
                    {work.title}
                </h2>
                {work.subtitle && (
                    <h3
                        className="text-sm md:text-lg tracking-[0.3em] uppercase mb-4 opacity-70"
                        style={{ color: color }}
                    >
                        {work.subtitle}
                    </h3>
                )}
                <div className="text-xs md:text-sm tracking-[0.15em] opacity-50 font-mono flex items-center justify-center gap-4">
                    <span>{work.author}</span>
                    <span>&middot;</span>
                    <span>{work.year}</span>
                </div>
                {work.description && (
                    <p className="mt-6 text-xs tracking-wider opacity-40 max-w-lg mx-auto font-mono">
                        {work.description}
                    </p>
                )}
            </div>
        </div>
    );
}
