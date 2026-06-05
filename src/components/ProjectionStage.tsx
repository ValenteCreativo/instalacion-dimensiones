"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useBodyPose } from "@/hooks/useBodyPose";
import { Phase } from "./BodyPortal";
import PhaseControls from "./PhaseControls";
import PortalGallery from "./PortalGallery";
import { works } from "@/data/works";

// Dynamically import BodyPortal to avoid SSR issues with canvas
const BodyPortal = dynamic(() => import("./BodyPortal"), { ssr: false });

const PHASE_LABELS: Record<Phase, string> = {
    1: "Apertura · Poesía",
    2: "Set Electrónico",
    3: "Jamboteo Final",
    4: "Gallery · Rest",
};

const PHASE_COLORS: Record<Phase, string> = {
    1: "#7dd3fc",
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

    const { keypoints, isLoaded, isSimulated, error } = useBodyPose(
        videoRef,
        canvasRef
    );

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

            {/* Portal canvas — full stage */}
            <div className="absolute inset-0 z-0 flex items-center justify-center">
                {/* Organic oval portal mask */}
                <div
                    className="relative"
                    style={{
                        width: "58vw",
                        height: "90vh",
                        clipPath: "ellipse(49% 48% at 50% 50%)",
                    }}
                >
                    {/* Subtle background gradient inside portal */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `radial-gradient(ellipse at 50% 40%, rgba(${phase === 1 ? "56,189,248" : phase === 2 ? "52,211,153" : phase === 3 ? "232,121,249" : "100,116,139"
                                },0.06) 0%, transparent 70%)`,
                            transition: "background 1.5s ease",
                        }}
                    />
                    <BodyPortal
                        keypoints={keypoints}
                        phase={phase}
                        mirrored={mirrored}
                        width={dimensions.w}
                        height={dimensions.h}
                    />
                </div>
            </div>

            {/* Portal border ring — decorative oval around the portal area */}
            <div
                className="absolute inset-0 z-[5] pointer-events-none flex items-center justify-center"
            >
                <svg
                    viewBox="0 0 100 100"
                    className="absolute"
                    style={{
                        width: "60vw",
                        height: "92vh",
                        filter: `drop-shadow(0 0 12px ${phaseColor})`,
                        transition: "filter 1.5s ease",
                    }}
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <ellipse
                        cx="50"
                        cy="50"
                        rx="49"
                        ry="48"
                        fill="none"
                        stroke={phaseColor}
                        strokeWidth="0.4"
                        opacity="0.45"
                    />
                    <ellipse
                        cx="50"
                        cy="50"
                        rx="48"
                        ry="47"
                        fill="none"
                        stroke={phaseColor}
                        strokeWidth="0.15"
                        opacity="0.2"
                        strokeDasharray="2,3"
                    />
                </svg>
            </div>

            {/* Gallery frames */}
            <PortalGallery
                visible={galleryVisible}
                phase={phase}
                activeWorkIndex={activeWorkIndex}
            />

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

            {/* Phase indicator — bottom center */}
            <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 text-center"
                style={{ transition: "color 1s ease", color: phaseColor }}
            >
                <div
                    className="text-xs uppercase tracking-[0.25em] opacity-60"
                    style={{ fontSize: "9px" }}
                >
                    {PHASE_LABELS[phase]}
                </div>
                <div className="flex gap-2 mt-1 justify-center">
                    {([1, 2, 3, 4] as Phase[]).map((p) => (
                        <div
                            key={p}
                            className="rounded-full transition-all duration-500"
                            style={{
                                width: p === phase ? "16px" : "6px",
                                height: "4px",
                                background: p === phase ? phaseColor : "rgba(255,255,255,0.2)",
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Status pill — top left */}
            <div className="absolute top-4 left-4 z-30 flex flex-col gap-1">
                {isSimulated && (
                    <div
                        className="text-[9px] uppercase tracking-widest opacity-40 px-2 py-0.5 border rounded"
                        style={{ borderColor: "rgba(255,255,255,0.15)", color: "#94a3b8" }}
                    >
                        Modo Simulado
                    </div>
                )}
                {error && (
                    <div
                        className="text-[9px] opacity-30 px-2 py-0.5 "
                        style={{ color: "#94a3b8" }}
                    >
                        {error}
                    </div>
                )}
                {mirrored && (
                    <div
                        className="text-[9px] uppercase tracking-widest opacity-40 px-2 py-0.5 border rounded"
                        style={{ borderColor: "rgba(255,255,255,0.15)", color: "#94a3b8" }}
                    >
                        Espejo ↔
                    </div>
                )}
            </div>

            {/* Title — top center */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 text-center pointer-events-none">
                <div
                    className="text-[10px] uppercase tracking-[0.4em]"
                    style={{ color: `${phaseColor}80`, letterSpacing: "0.35em" }}
                >
                    Dimensiones Jamboteo
                </div>
            </div>

            {/* Help overlay */}
            <div
                className="absolute inset-0 z-40 flex items-end justify-center pb-16 pointer-events-none transition-opacity duration-700"
                style={{ opacity: helpVisible ? 1 : 0 }}
            >
                <div
                    className="rounded-xl px-6 py-4 text-[10px] uppercase tracking-widest grid grid-cols-2 gap-x-8 gap-y-1"
                    style={{
                        background: "rgba(0,0,0,0.75)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.45)",
                    }}
                >
                    <span><span className="text-white">1 2 3 4</span> · Fases</span>
                    <span><span className="text-white">Espacio</span> · Siguiente fase</span>
                    <span><span className="text-white">← →</span> · Obra anterior/siguiente</span>
                    <span><span className="text-white">F</span> · Pantalla completa</span>
                    <span><span className="text-white">M</span> · Espejo</span>
                    <span><span className="text-white">G</span> · Galería show/hide</span>
                    <span><span className="text-white">H</span> · Esta ayuda</span>
                </div>
            </div>

            {/* Loading state */}
            {!isLoaded && (
                <div className="absolute inset-0 z-50 flex items-center justify-center">
                    <div className="text-center">
                        <div
                            className="text-sm uppercase tracking-[0.4em] animate-pulse"
                            style={{ color: "#38bdf8" }}
                        >
                            Iniciando portal…
                        </div>
                        <div
                            className="mt-2 text-[9px] uppercase tracking-widest opacity-40"
                            style={{ color: "#94a3b8" }}
                        >
                            Dimensiones Jamboteo
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
