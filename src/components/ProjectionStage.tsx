"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAudioReactive } from "@/hooks/useAudioReactive";
import { Phase } from "./BodyPortal";
import ArtworkGallery from "./ArtworkGallery";
import ParticlesBackground from "./ParticlesBackground";
import { works } from "@/data/works";

// Dynamically imported to avoid SSR issues
const BodyPoseSketch = dynamic(() => import("./BodyPoseSketch"), { ssr: false });

export default function ProjectionStage() {
    const [phase, setPhase] = useState<Phase>(1);
    const [mirrored, setMirrored] = useState(false);
    const [galleryVisible, setGalleryVisible] = useState(true);
    const [activeWorkIndex, setActiveWorkIndex] = useState(0);

    const audio = useAudioReactive();

    // Keyboard Navigation
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            switch (e.key) {
                case "1": setPhase(1); break;
                case "2": setPhase(2); break;
                case "3": setPhase(3); break;
                case " ":
                    e.preventDefault();
                    setPhase(prev => ((prev % 3) + 1) as Phase);
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    setActiveWorkIndex(prev => (prev + 1) % works.length);
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    setActiveWorkIndex(prev => (prev - 1 + works.length) % works.length);
                    break;
                case "f":
                case "F":
                    if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen().catch(() => { });
                    } else {
                        document.exitFullscreen().catch(() => { });
                    }
                    break;
                case "m":
                case "M":
                    setMirrored(prev => !prev);
                    break;
                case "g":
                case "G":
                    setGalleryVisible(prev => !prev);
                    break;
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, []);

    // Auto-rotate works in Phase 1
    useEffect(() => {
        if (phase !== 1) return;
        const timeout = setTimeout(() => {
            setActiveWorkIndex(prev => (prev + 1) % works.length);
        }, 30000);
        return () => clearTimeout(timeout);
    }, [phase, activeWorkIndex]);

    const isPortalPhase = phase === 3;

    return (
        <div
            className="relative w-screen h-screen overflow-hidden bg-black"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
            {/* ART PARTICLES (Fases 1 y 2) */}
            <ParticlesBackground audio={audio} phase={phase} />

            {/* GALERÍA DE ARTE VISUAL (Fases 1 y 2) */}
            <div
                className="absolute inset-0 transition-opacity duration-1000 z-10"
                style={{ opacity: isPortalPhase ? 0 : 1, pointerEvents: isPortalPhase ? "none" : "auto" }}
            >
                <ArtworkGallery
                    activeWorkIndex={activeWorkIndex}
                    phase={phase}
                    audio={audio}
                />
            </div>

            {/* FASE 3: BodyPose Portal — p5 + ml5 sketch, self-contained */}
            <div
                className="absolute inset-0 z-20 transition-opacity duration-1000"
                style={{ opacity: isPortalPhase ? 1 : 0, pointerEvents: isPortalPhase ? "auto" : "none" }}
            >
                {/* Keep mounted so p5/ml5 don't restart on phase switch */}
                <BodyPoseSketch
                    audio={audio}
                    mirrored={mirrored}
                    active={isPortalPhase}
                />
            </div>

            {/* MARCA DE AGUA (Fase 1 y 3) */}
            {(phase === 1 || phase === 3) && (
                <div className="absolute bottom-6 right-6 z-40 pointer-events-none opacity-60 text-right">
                    <div
                        className="text-sm text-white font-mono tracking-widest uppercase flex flex-col gap-1"
                        style={{ textShadow: "0 0 10px rgba(255,255,255,0.3)" }}
                    >
                        <span>@amitla.mx</span>
                        <span>@ValeCreativo</span>
                    </div>
                </div>
            )}
        </div>
    );
}
