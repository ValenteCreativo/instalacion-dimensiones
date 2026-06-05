"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useBodyPose } from "@/hooks/useBodyPose";
import { useAudioReactive } from "@/hooks/useAudioReactive";
import { Phase } from "./BodyPortal";
import PhaseControls from "./PhaseControls";
import PortalGallery from "./PortalGallery";
import GalleryShowcase from "./GalleryShowcase";
import { works } from "@/data/works";

// Dynamically import BodyPortal to avoid SSR issues with canvas
const BodyPortal = dynamic(() => import("./BodyPortal"), { ssr: false });

const PHASE_LABELS: Record<Phase, string> = {
    1: "Exposición Global",
    2: "Ruptura del Portal",
    3: "Set Electrónico",
    4: "Caleidoscopio",
};

const PHASE_COLORS: Record<Phase, string> = {
    1: "#ffffff",
    2: "#34d399",
    3: "#e879f9",
    4: "#94a3b8",
};

export default function ProjectionStage() {
    const [phase, setPhase] = useState<Phase>(1);
    const [mirrored, setMirrored] = useState(false);
    const [galleryVisible, setGalleryVisible] = useState(true);
    const [helpVisible, setHelpVisible] = useState(true);
    const [activeWorkIndex, setActiveWorkIndex] = useState(0);
    const [dimensions, setDimensions] = useState({ w: 1280, h: 720 });

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const { keypoints, connections, isLoaded, isSimulated, error } = useBodyPose(videoRef);
    const audio = useAudioReactive();

    // Track screen dimensions for canvas
    useEffect(() => {
        const update = () =>
            setDimensions({ w: window.innerWidth, h: window.innerHeight });
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // Hide help after 5s on first load
    useEffect(() => {
        const t = setTimeout(() => setHelpVisible(false), 5000);
        return () => clearTimeout(t);
    }, []);

    const phaseColor = PHASE_COLORS[phase];
    const activeWork = works[activeWorkIndex];

    return (
        <div
            className="relative w-screen h-screen overflow-hidden bg-black"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
            {/* Hidden video element for webcam */}
            <video
                ref={videoRef}
                className="absolute opacity-0 pointer-events-none"
                style={{ width: 1, height: 1 }}
                autoPlay
                muted
                playsInline
            />

            {/* Obra Principal: Showcase (Fase 1 la hace central, el resto la encoge) */}
            <GalleryShowcase work={activeWork} visible={galleryVisible} phase={phase} />

            {/* Portal canvas — Body Pose Overlay */}
            {/* El body pose solo es totalmente visible en las fases 2, 3, 4 */}
            <div
                className="absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-1000"
                style={{ opacity: phase === 1 ? 0.05 : 1 }}
            >
                <div
                    className="relative"
                    style={{ width: "100%", height: "100%" }}
                >
                    <BodyPortal
                        keypoints={keypoints}
                        connections={connections}
                        phase={phase}
                        mirrored={mirrored}
                        audio={audio}
                        width={dimensions.w}
                        height={dimensions.h}
                    />
                </div>
            </div>

            {/* Gallery frames: Obras secundarias flotando alrededor (fase 2, 3, 4) */}
            <div
                className="transition-opacity duration-1000 z-[5]"
                style={{ opacity: phase === 1 ? 0 : 1 }}
            >
                <PortalGallery
                    visible={galleryVisible}
                    phase={phase}
                    activeWorkIndex={activeWorkIndex}
                />
            </div>

            {/* Keyboard controls */}
            <PhaseControls
                phase={phase}
                setPhase={setPhase}
                mirrored={mirrored}
                setMirrored={setMirrored}
                galleryVisible={galleryVisible}
                setGalleryVisible={setGalleryVisible}
                helpVisible={helpVisible}
                setHelpVisible={setHelpVisible}
                activeWorkIndex={activeWorkIndex}
                setActiveWorkIndex={setActiveWorkIndex}
                totalWorks={works.length}
            />

            {/* Controles y UI Overlay ────────────────────────────────────── */}
            <div className="absolute inset-0 z-30 pointer-events-none">

                {/* Phase indicator — bottom center */}
                <div
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center"
                    style={{ transition: "color 1s ease", color: phaseColor }}
                >
                    <div className="text-xs uppercase tracking-[0.3em] opacity-80" style={{ fontSize: "10px" }}>
                        {PHASE_LABELS[phase]}
                    </div>
                    <div className="flex gap-3 mt-2 justify-center">
                        {([1, 2, 3, 4] as Phase[]).map((p) => (
                            <div
                                key={p}
                                className="rounded-full transition-all duration-500"
                                style={{
                                    width: p === phase ? "20px" : "8px",
                                    height: "4px",
                                    background: p === phase ? phaseColor : "rgba(255,255,255,0.15)",
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Status pill & Mic Indicator — top left */}
                <div className="absolute top-6 left-6 flex flex-col gap-2">
                    {isSimulated && (
                        <div
                            className="text-[10px] uppercase tracking-widest opacity-60 px-2 py-1 border rounded"
                            style={{ borderColor: "rgba(255,255,255,0.15)", color: "#94a3b8" }}
                        >
                            Modo Simulado
                        </div>
                    )}
                    {error && (
                        <div className="text-[10px] opacity-40 px-2 py-1 text-red-300">
                            {error}
                        </div>
                    )}
                    {mirrored && (
                        <div
                            className="text-[10px] uppercase tracking-widest opacity-60 px-2 py-1 border rounded"
                            style={{ borderColor: "rgba(255,255,255,0.15)", color: "#94a3b8" }}
                        >
                            Espejo ↔
                        </div>
                    )}
                    {audio.isActive ? (
                        <div className="flex items-center gap-2 mt-2 px-2">
                            <div
                                className="w-2 h-2 rounded-full bg-green-400 transition-all duration-75"
                                style={{ transform: `scale(${1 + audio.volume * 2})`, opacity: 0.5 + audio.volume * 0.5 }}
                            />
                            <span className="text-[9px] uppercase tracking-widest text-green-400 opacity-60">MIC ACTIVE</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 mt-2 px-2">
                            <div className="w-2 h-2 rounded-full bg-red-400 opacity-30" />
                            <span className="text-[9px] uppercase tracking-widest text-red-300 opacity-40">MIC OFF</span>
                        </div>
                    )}
                </div>

                {/* Title — top center */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center shadow-lg">
                    <div
                        className="text-[11px] uppercase tracking-[0.5em]"
                        style={{ color: `rgba(255,255,255,0.5)`, letterSpacing: "0.4em" }}
                    >
                        Dimensiones Jamboteo
                    </div>
                </div>

                {/* Artista y Navegación — bottom right */}
                <div className="absolute bottom-6 right-6 text-right opacity-40 hover:opacity-100 transition-opacity">
                    <div className="text-[10px] uppercase tracking-[0.2em] mb-1">Galería de Dimensiones</div>
                    <div className="text-[9px] font-mono tracking-widest">[{activeWorkIndex + 1} / {works.length}]</div>
                </div>
            </div>

            {/* Help overlay */}
            <div
                className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none transition-opacity duration-700 bg-black/40 backdrop-blur-sm"
                style={{ opacity: helpVisible ? 1 : 0 }}
            >
                <div
                    className="rounded-xl px-10 py-8 text-[11px] uppercase tracking-widest grid grid-cols-2 gap-x-12 gap-y-3"
                    style={{
                        background: "rgba(10,10,10,0.85)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.5)",
                        boxShadow: "0 0 50px rgba(0,0,0,0.5)"
                    }}
                >
                    <span><span className="text-white">1 2 3 4</span> · Fases</span>
                    <span><span className="text-white">Espacio</span> · Siguiente Fase</span>
                    <span><span className="text-white">← →</span> · Navegar Obras</span>
                    <span><span className="text-white">F</span> · Pantalla Completa</span>
                    <span><span className="text-white">M</span> · Modo Espejo</span>
                    <span><span className="text-white">G</span> · Ocultar Obras</span>
                    <span className="col-span-2 text-center mt-4"><span className="text-white">H</span> · Cerrar Ayuda</span>
                </div>
            </div>

            {/* Loading state */}
            {!isLoaded && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
                    <div className="text-center">
                        <div
                            className="text-sm uppercase tracking-[0.4em] animate-pulse"
                            style={{ color: "#ffffff" }}
                        >
                            Cargando Portal...
                        </div>
                        <div
                            className="mt-3 text-[10px] uppercase tracking-widest opacity-40"
                            style={{ color: "#94a3b8" }}
                        >
                            Conectando cámara y micrófono
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
