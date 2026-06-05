"use client";

import { Work, moodColors } from "@/data/works";

interface CodepenFrameProps {
    work: Work;
    style?: React.CSSProperties;
    className?: string;
    pulsing?: boolean;
    phase: number;
}

export default function CodepenFrame({
    work,
    style,
    className = "",
    pulsing = false,
    phase,
}: CodepenFrameProps) {
    const color = moodColors[work.mood];

    // Pulse animation in phase 2
    const pulseStyle =
        pulsing
            ? {
                animation: "framePulse 1.8s ease-in-out infinite",
                "--frame-color": color,
            } as React.CSSProperties
            : {};

    return (
        <div
            className={`absolute overflow-hidden ${className}`}
            style={{
                ...style,
                ...pulseStyle,
            }}
        >
            {/* Organic SVG frame border */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <filter id={`glow-${work.mood}`}>
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {/* Rounded organic border */}
                <rect
                    x="2"
                    y="2"
                    width="96"
                    height="96"
                    rx="8"
                    ry="8"
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    filter={`url(#glow-${work.mood})`}
                    opacity="0.85"
                />
                {/* Corner accents */}
                {[
                    [2, 2, 12, 2, 2, 12],   // top-left
                    [88, 2, 98, 2, 98, 12], // top-right
                    [2, 88, 2, 98, 12, 98], // bottom-left
                    [88, 98, 98, 98, 98, 88], // bottom-right
                ].map(([x1, y1, mx, my, x2, y2], i) => (
                    <polyline
                        key={i}
                        points={`${x1},${y1} ${mx},${my} ${x2},${y2}`}
                        fill="none"
                        stroke={color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity="0.9"
                    />
                ))}
            </svg>

            {/* Dark overlay to ensure contrast */}
            <div
                className="absolute inset-0 z-0"
                style={{ background: "rgba(0,0,0,0.15)" }}
            />

            {/* The CodePen iframe */}
            <iframe
                src={work.url}
                title={work.title}
                className="w-full h-full border-0 relative z-[1]"
                style={{ pointerEvents: "none" }} // prevent interaction during projection
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups"
            />

            {/* Title label */}
            <div
                className="absolute bottom-0 left-0 right-0 z-20 text-center py-1"
                style={{
                    background: `linear-gradient(to top, rgba(0,0,0,0.8), transparent)`,
                    fontSize: "10px",
                    letterSpacing: "0.12em",
                    color: color,
                    fontFamily: "'JetBrains Mono', monospace",
                    textTransform: "uppercase",
                }}
            >
                {work.title}
            </div>
        </div>
    );
}
