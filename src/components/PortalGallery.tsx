"use client";

import { useMemo } from "react";
import { works } from "@/data/works";
import CodepenFrame from "./CodepenFrame";
import { Phase } from "./BodyPortal";

interface PortalGalleryProps {
    visible: boolean;
    phase: Phase;
    activeWorkIndex: number;
}

// Positions for floating frames — around the edges of the stage
// Values are percentages + sizing in vw/vh
const FRAME_SLOTS = [
    // Top-left
    { top: "4%", left: "1%", width: "18vw", height: "14vw", rotate: "-2deg" },
    // Top-right
    { top: "4%", right: "1%", width: "18vw", height: "14vw", rotate: "2deg" },
    // Bottom-left
    { bottom: "4%", left: "1%", width: "18vw", height: "14vw", rotate: "2deg" },
    // Bottom-right
    { bottom: "4%", right: "1%", width: "18vw", height: "14vw", rotate: "-2deg" },
    // Mid-left
    { top: "38%", left: "0.5%", width: "14vw", height: "11vw", rotate: "-1deg" },
    // Mid-right
    { top: "38%", right: "0.5%", width: "14vw", height: "11vw", rotate: "1deg" },
];

export default function PortalGallery({
    visible,
    phase,
    activeWorkIndex,
}: PortalGalleryProps) {
    // Cycle through works to fill slots
    const slots = useMemo(() => {
        return FRAME_SLOTS.map((slot, i) => {
            const workIndex = (activeWorkIndex + i) % works.length;
            return { slot, work: works[workIndex] };
        });
    }, [activeWorkIndex]);

    if (!visible) return null;

    // Phase 4: highlight the active work, dim others
    const isGalleryFocus = phase === 4;
    const isPulsing = phase === 2;

    return (
        <div className="absolute inset-0 pointer-events-none z-10">
            {slots.map(({ slot, work }, i) => {
                const isActive = isGalleryFocus && i === 0;
                const opacity = isGalleryFocus ? (isActive ? 1 : 0.45) : 0.75;
                const scale = isGalleryFocus && isActive ? "scale(1.05)" : "scale(1)";
                const transition =
                    "opacity 0.8s ease, transform 0.8s ease, filter 0.8s ease";

                return (
                    <CodepenFrame
                        key={`${work.title}-${i}`}
                        work={work}
                        phase={phase}
                        pulsing={isPulsing}
                        style={{
                            ...slot,
                            position: "absolute",
                            transform: `rotate(${slot.rotate}) ${scale}`,
                            transition,
                            opacity,
                            borderRadius: "10px",
                            filter: isGalleryFocus && !isActive ? "brightness(0.7)" : "none",
                        }}
                    />
                );
            })}
        </div>
    );
}
