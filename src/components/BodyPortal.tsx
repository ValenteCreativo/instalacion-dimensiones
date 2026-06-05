"use client";

import { useEffect, useRef, useCallback } from "react";
import { Keypoint, SKELETON_CONNECTIONS } from "@/hooks/useBodyPose";

export type Phase = 1 | 2 | 3 | 4;

interface BodyPortalProps {
    keypoints: Keypoint[];
    phase: Phase;
    mirrored: boolean;
    width: number;
    height: number;
}

// ─── Drawing utilities ───────────────────────────────────────────

function getKP(keypoints: Keypoint[], name: string): Keypoint | undefined {
    return keypoints.find((k) => k.name === name && k.confidence > 0.2);
}

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

// ─── Phase 1: Constellation / Apertura ──────────────────────────

function drawPhase1(
    ctx: CanvasRenderingContext2D,
    kps: Keypoint[],
    w: number,
    h: number,
    t: number
) {
    const alpha = 0.7 + Math.sin(t * 1.5) * 0.15;

    // Skeleton lines — thin, silver-blue constellation
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 0.8;
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#38bdf8";

    for (const [a, b] of SKELETON_CONNECTIONS) {
        const kpA = getKP(kps, a);
        const kpB = getKP(kps, b);
        if (!kpA || !kpB) continue;
        ctx.beginPath();
        ctx.moveTo(kpA.x * w, kpA.y * h);
        ctx.lineTo(kpB.x * w, kpB.y * h);
        ctx.stroke();
    }

    // Keypoint dots — glowing stars
    for (const kp of kps) {
        if (kp.confidence < 0.2) continue;
        const size = 2 + kp.confidence * 3;
        const pulse = Math.sin(t * 2 + kp.x * 10) * 0.3 + 0.7;
        ctx.globalAlpha = alpha * pulse;
        ctx.fillStyle = "#e0f2fe";
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#7dd3fc";
        ctx.beginPath();
        ctx.arc(kp.x * w, kp.y * h, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Subtle portal ring around body center
    const cx = kps.reduce((s, k) => s + k.x, 0) / (kps.length || 1);
    const cy = kps.reduce((s, k) => s + k.y, 0) / (kps.length || 1);
    const ringR = 0.15 * h + Math.sin(t * 0.5) * 5;
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(cx * w, cy * h, ringR, 0, Math.PI * 2);
    ctx.stroke();
}

// ─── Phase 2: Set Electrónico ────────────────────────────────────

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    hue: number;
    size: number;
}

const particles: Particle[] = [];

function spawnParticles(kps: Keypoint[], w: number, h: number) {
    for (const kp of kps) {
        if (kp.confidence < 0.3 || Math.random() > 0.3) continue;
        for (let i = 0; i < 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 2;
            particles.push({
                x: kp.x * w,
                y: kp.y * h,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                maxLife: 40 + Math.random() * 40,
                hue: 180 + Math.random() * 60,
                size: 1.5 + Math.random() * 3,
            });
        }
    }
    // Cap particle count for performance
    while (particles.length > 400) particles.shift();
}

function drawPhase2(
    ctx: CanvasRenderingContext2D,
    kps: Keypoint[],
    w: number,
    h: number,
    t: number
) {
    spawnParticles(kps, w, h);

    // Draw and update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.life -= 1;
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        const alpha = (p.life / p.maxLife) * 0.8;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `hsl(${p.hue}, 100%, 70%)`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `hsl(${p.hue}, 100%, 80%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Wave lines from keypoints
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = `hsl(${190 + Math.sin(t) * 30}, 100%, 65%)`;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#38bdf8";

    for (const kp of kps) {
        if (kp.confidence < 0.3) continue;
        const waveR = 20 + Math.sin(t * 3 + kp.x * 5) * 15;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(kp.x * w, kp.y * h, waveR, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Skeleton at lower opacity
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "#a5f3fc";
    ctx.lineWidth = 1;
    ctx.shadowBlur = 5;
    for (const [a, b] of SKELETON_CONNECTIONS) {
        const kpA = getKP(kps, a);
        const kpB = getKP(kps, b);
        if (!kpA || !kpB) continue;
        ctx.beginPath();
        ctx.moveTo(kpA.x * w, kpA.y * h);
        ctx.lineTo(kpB.x * w, kpB.y * h);
        ctx.stroke();
    }
}

// ─── Phase 3: Jamboteo Final ─────────────────────────────────────

const trailHistory: Keypoint[][] = [];
const MAX_TRAILS = 8;

function drawPhase3(
    ctx: CanvasRenderingContext2D,
    kps: Keypoint[],
    w: number,
    h: number,
    t: number
) {
    // Add trail frame
    if (kps.length > 0 && Math.floor(t * 30) % 3 === 0) {
        trailHistory.push([...kps]);
        if (trailHistory.length > MAX_TRAILS) trailHistory.shift();
    }

    // Draw trails (echoes of past positions)
    for (let ti = 0; ti < trailHistory.length; ti++) {
        const age = (ti + 1) / trailHistory.length;
        const trailKps = trailHistory[ti];
        ctx.globalAlpha = age * 0.25;
        ctx.strokeStyle = `hsl(${300 + ti * 10}, 80%, 60%)`;
        ctx.lineWidth = 0.8;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `hsl(${300 + ti * 10}, 80%, 60%)`;
        for (const [a, b] of SKELETON_CONNECTIONS) {
            const kpA = trailKps.find((k) => k.name === a);
            const kpB = trailKps.find((k) => k.name === b);
            if (!kpA || !kpB) continue;
            ctx.beginPath();
            ctx.moveTo(kpA.x * w, kpA.y * h);
            ctx.lineTo(kpB.x * w, kpB.y * h);
            ctx.stroke();
        }
    }

    // Cymatic rings from body center
    const cx = kps.reduce((s, k) => s + k.x, 0) / (kps.length || 1);
    const cy = kps.reduce((s, k) => s + k.y, 0) / (kps.length || 1);
    for (let r = 0; r < 5; r++) {
        const ringR = (40 + r * 40) + Math.sin(t * 3 + r) * 15;
        const alpha = (1 - r / 5) * 0.35;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = `hsl(${280 + r * 15 + t * 30}, 100%, 70%)`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 20;
        ctx.shadowColor = `hsl(${280 + r * 15}, 100%, 70%)`;
        ctx.beginPath();
        ctx.arc(cx * w, cy * h, ringR, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Glitch echo — duplicate skeleton offset
    const glitch = Math.sin(t * 8) > 0.7;
    if (glitch) {
        const offsetX = (Math.random() - 0.5) * 15;
        const offsetY = (Math.random() - 0.5) * 8;
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = "#f0abfc";
        ctx.lineWidth = 1;
        ctx.shadowBlur = 3;
        for (const [a, b] of SKELETON_CONNECTIONS) {
            const kpA = getKP(kps, a);
            const kpB = getKP(kps, b);
            if (!kpA || !kpB) continue;
            ctx.beginPath();
            ctx.moveTo(kpA.x * w + offsetX, kpA.y * h + offsetY);
            ctx.lineTo(kpB.x * w + offsetX, kpB.y * h + offsetY);
            ctx.stroke();
        }
    }

    // Main skeleton — bright, sharp
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#e879f9";
    for (const [a, b] of SKELETON_CONNECTIONS) {
        const kpA = getKP(kps, a);
        const kpB = getKP(kps, b);
        if (!kpA || !kpB) continue;
        ctx.beginPath();
        ctx.moveTo(kpA.x * w, kpA.y * h);
        ctx.lineTo(kpB.x * w, kpB.y * h);
        ctx.stroke();
    }

    // Particle burst on joints
    spawnParticles(kps, w, h);
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = (p.life / p.maxLife) * 0.9;
        ctx.fillStyle = `hsl(${p.hue + 100}, 100%, 75%)`;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ─── Phase 4: Gallery / Rest ─────────────────────────────────────

function drawPhase4(
    ctx: CanvasRenderingContext2D,
    kps: Keypoint[],
    w: number,
    h: number,
    t: number
) {
    // Very subtle ghost skeleton
    ctx.globalAlpha = 0.15 + Math.sin(t * 0.5) * 0.05;
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 0.6;
    ctx.shadowBlur = 4;
    ctx.shadowColor = "#64748b";
    for (const [a, b] of SKELETON_CONNECTIONS) {
        const kpA = getKP(kps, a);
        const kpB = getKP(kps, b);
        if (!kpA || !kpB) continue;
        ctx.beginPath();
        ctx.moveTo(kpA.x * w, kpA.y * h);
        ctx.lineTo(kpB.x * w, kpB.y * h);
        ctx.stroke();
    }

    // Soft dot markers
    for (const kp of kps) {
        if (kp.confidence < 0.2) continue;
        ctx.globalAlpha = 0.1 + Math.sin(t + kp.x * 5) * 0.05;
        ctx.fillStyle = "#cbd5e1";
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc(kp.x * w, kp.y * h, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ─── Main component ──────────────────────────────────────────────

export default function BodyPortal({
    keypoints,
    phase,
    mirrored,
    width,
    height,
}: BodyPortalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tRef = useRef(0);
    const animRef = useRef<number>(0);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        tRef.current += 0.016;
        const t = tRef.current;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Apply mirror transform
        if (mirrored) {
            ctx.save();
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
        }

        // Reset shadow defaults
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Mirror keypoints if needed
        const kps: Keypoint[] = mirrored
            ? keypoints.map((k) => ({ ...k, x: 1 - k.x }))
            : keypoints;

        // Render phase
        if (phase === 1) drawPhase1(ctx, kps, width, height, t);
        else if (phase === 2) drawPhase2(ctx, kps, width, height, t);
        else if (phase === 3) drawPhase3(ctx, kps, width, height, t);
        else if (phase === 4) drawPhase4(ctx, kps, width, height, t);

        if (mirrored) ctx.restore();

        animRef.current = requestAnimationFrame(draw);
    }, [keypoints, phase, mirrored, width, height]);

    useEffect(() => {
        animRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animRef.current);
    }, [draw]);

    // Clear trail history when phase changes to avoid bleed-through
    useEffect(() => {
        trailHistory.length = 0;
        particles.length = 0;
    }, [phase]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ mixBlendMode: "screen" }}
        />
    );
}
