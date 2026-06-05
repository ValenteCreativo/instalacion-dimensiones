"use client";

import { useEffect } from "react";
import { Phase } from "./BodyPortal";

interface PhaseControlsProps {
    phase: Phase;
    setPhase: (p: Phase) => void;
    mirrored: boolean;
    setMirrored: (m: boolean) => void;
    galleryVisible: boolean;
    setGalleryVisible: (v: boolean) => void;
    helpVisible: boolean;
    setHelpVisible: (v: boolean) => void;
    activeWorkIndex: number;
    setActiveWorkIndex: (i: number) => void;
    totalWorks: number;
}

export default function PhaseControls({
    phase,
    setPhase,
    mirrored,
    setMirrored,
    galleryVisible,
    setGalleryVisible,
    helpVisible,
    setHelpVisible,
    activeWorkIndex,
    setActiveWorkIndex,
    totalWorks,
}: PhaseControlsProps) {
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            switch (e.key) {
                case "1": setPhase(1); break;
                case "2": setPhase(2); break;
                case "3": setPhase(3); break;
                case "4": setPhase(4); break;
                case " ":
                    e.preventDefault();
                    setPhase(((phase % 4) + 1) as Phase);
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    setActiveWorkIndex((activeWorkIndex + 1) % totalWorks);
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    setActiveWorkIndex((activeWorkIndex - 1 + totalWorks) % totalWorks);
                    break;
                case "f":
                case "F":
                    if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen().catch(() => { });
                    } else {
                        document.exitFullscreen().catch(() => { });
                    }
                    break;
                case "h":
                case "H":
                    setHelpVisible(!helpVisible);
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
    }, [
        phase,
        mirrored,
        galleryVisible,
        helpVisible,
        activeWorkIndex,
        totalWorks,
        setPhase,
        setMirrored,
        setGalleryVisible,
        setHelpVisible,
        setActiveWorkIndex,
    ]);

    return null; // purely logic, no UI
}
