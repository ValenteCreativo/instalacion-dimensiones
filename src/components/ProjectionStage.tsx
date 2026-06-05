"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useBodyPose } from "@/hooks/useBodyPose";
import { useAudioReactive } from "@/hooks/useAudioReactive";
import { Phase } from "./BodyPortal";
import ArtworkGallery from "./ArtworkGallery";
import ParticlesBackground from "./ParticlesBackground";
import { works } from "@/data/works";

// Dynamically import BodyPortal
const BodyPortal = dynamic(() => import("./BodyPortal"), { ssr: false });

export default function ProjectionStage() {
    const [phase, setPhase] = useState<Phase>(1);
    const [mirrored, setMirrored] = useState(false);
    const [galleryVisible, setGalleryVisible] = useState(true);
    const [activeWorkIndex, setActiveWorkIndex] = useState(0);
    const [dimensions, setDimensions] = useState({ w: 1280, h: 720 });

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const { keypoints, connections } = useBodyPose(videoRef);
    const audio = useAudioReactive();

    // Screen dimensions resize
    useEffect(() => {
        const update = () => setDimensions({ w: window.innerWidth, h: window.innerHeight });
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // Keyboard Navigation
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            switch (e.key) {
                case "1": setPhase(1); break;
                case "2": setPhase(2); break;
                case "3": setPhase(3); break;
                // Solo 3 fases para la V3.
                case " ":
                    e.preventDefault();
                    setPhase(((phase % 3) + 1) as Phase);
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    setActiveWorkIndex((activeWorkIndex + 1) % works.length);
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    setActiveWorkIndex((activeWorkIndex - 1 + works.length) % works.length);
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
                    setMirrored(!mirrored);
                    break;
                case "g":
                case "G":
                    setGalleryVisible(!galleryVisible);
                    break;
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [phase, mirrored, galleryVisible, activeWorkIndex]);

    // 30 seconds auto-changer logic
    useEffect(() => {
        // Solo rotar auto-mágicamente en la Fase 1
        if (phase !== 1) return;

        const interval = setInterval(() => {
            setActiveWorkIndex(prev => (prev + 1) % works.length);
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [phase]);

    // Fase 1: Showcase Individual
    // Fase 2: Museo (Todas las obras, diseño estático)
    // Fase 3: BodyPose Portal interactivo sin marcos.

    const isPortalPhase = phase === 3;

    return (
        <div
            className="relative w-screen h-screen overflow-hidden bg-black"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
            <video
                ref={videoRef}
                className="absolute opacity-0 pointer-events-none"
                style={{ width: 1, height: 1 }}
                autoPlay
                muted
                playsInline
            />

            {/* ART PARTICLES (Fases 1 y 2) */}
            <ParticlesBackground audio={audio} phase={phase} />

            {/* GALERÍA DE ARTE VISUAL (Fases 1 y 2) */}
            <div
                className="absolute inset-0 transition-opacity duration-1000 z-10"
                style={{ opacity: isPortalPhase ? 0 : 1 }}
            >
                <ArtworkGallery
                    activeWorkIndex={activeWorkIndex}
                    phase={phase}
                    audio={audio}
                />
            </div>

            {/* EXPERIENCIA PORTAL BODYPOSE (Fase 3) */}
            <div
                className="absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-1000"
                style={{ opacity: isPortalPhase ? 1 : 0 }}
            >
                <div className="relative" style={{ width: "100%", height: "100%" }}>
                    {isPortalPhase && (
                        <BodyPortal
                            keypoints={keypoints}
                            connections={connections}
                            // Pasamos fase 3 real para los visuales reactivos (jamboteo final)
                            phase={3}
                            mirrored={mirrored}
                            audio={audio}
                            width={dimensions.w}
                            height={dimensions.h}
                        />
                    )}
                </div>
            </div>

            {/* MARCA DE AGUA (Visible en fase 1 y 3. Esquina inferior derecha) */}
            {(phase === 1 || phase === 3) && (
                <div
                    className="absolute bottom-6 right-6 z-40 pointer-events-none opacity-60 text-right"
                >
                    <div
                        className="text-sm md:text-md text-white font-mono tracking-widest uppercase flex flex-col gap-1"
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
