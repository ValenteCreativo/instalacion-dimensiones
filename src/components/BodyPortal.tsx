"use client";

import { useEffect, useRef, useCallback } from "react";
import { Keypoint } from "@/hooks/useBodyPose";
import { AudioData } from "@/hooks/useAudioReactive";

export type Phase = 1 | 2 | 3 | 4;

interface BodyPortalProps {
    keypoints: Keypoint[];
    connections: [number, number][];
    phase: Phase;
    mirrored: boolean;
    audio: AudioData;
    width: number;
    height: number;
}

// ─── Particle pool ────────────────────────────────────────────────
interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    life: number; maxLife: number;
    hue: number; size: number;
}
const particles: Particle[] = [];

function spawnParticles(
    kps: Keypoint[], w: number, h: number,
    rate: number, hueBase: number
) {
    for (const kp of kps) {
        if (kp.confidence < 0.25 || Math.random() > rate) continue;
        for (let i = 0; i < 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 2.5;
            particles.push({
                x: kp.x * w, y: kp.y * h,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1, maxLife: 30 + Math.random() * 50,
                hue: hueBase + Math.random() * 40,
                size: 1.5 + Math.random() * 3,
            });
        }
    }
    while (particles.length > 500) particles.shift();
}

function tickParticles(ctx: CanvasRenderingContext2D) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.97; p.vy *= 0.97;
        p.life -= 1;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = (p.life / p.maxLife) * 0.85;
        ctx.fillStyle = `hsl(${p.hue}, 100%, 68%)`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `hsl(${p.hue}, 100%, 80%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ─── Trail history (Phase 3) ──────────────────────────────────────
const trailHistory: Keypoint[][] = [];
const MAX_TRAILS = 8;

// ─── Connection line drawing ──────────────────────────────────────
function drawConnections(
    ctx: CanvasRenderingContext2D,
    kps: Keypoint[],
    connections: [number, number][],
    w: number, h: number,
    color: string,
    alpha: number,
    lineWidth: number,
    glow?: string
) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.shadowBlur = glow ? 12 : 0;
    ctx.shadowColor = glow ?? "transparent";

    for (const [ai, bi] of connections) {
        const a = kps[ai];
        const b = kps[bi];
        if (!a || !b) continue;
        if (a.confidence < 0.15 || b.confidence < 0.15) continue;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(a.x * w, a.y * h);
        ctx.lineTo(b.x * w, b.y * h);
        ctx.stroke();
    }
}

// ─── Body center ──────────────────────────────────────────────────
function bodyCenter(kps: Keypoint[]): [number, number] {
    if (kps.length === 0) return [0.5, 0.5];
    const conf = kps.filter((k) => k.confidence > 0.2);
    if (conf.length === 0) return [0.5, 0.5];
    return [
        conf.reduce((s, k) => s + k.x, 0) / conf.length,
        conf.reduce((s, k) => s + k.y, 0) / conf.length,
    ];
}

// ─── Phase 1: Apertura / Poesía ──────────────────────────────────
function drawPhase1(
    ctx: CanvasRenderingContext2D,
    kps: Keypoint[], connections: [number, number][],
    w: number, h: number,
    t: number, audio: AudioData
) {
    const pulse = 0.6 + Math.sin(t * 1.2) * 0.2 + audio.volume * 0.3;

    // Skeleton — constellation silver-blue
    drawConnections(ctx, kps, connections, w, h, "#7dd3fc", pulse * 0.55, 0.8, "#38bdf8");

    // Dots on keypoints
    for (const kp of kps) {
        if (kp.confidence < 0.2) continue;
        const size = (2 + kp.confidence * 3.5) * (1 + audio.bass * 0.6);
        const p = Math.sin(t * 2 + kp.x * 10) * 0.3 + 0.7;
        ctx.globalAlpha = pulse * p * 0.85;
        ctx.fillStyle = "#e0f2fe";
        ctx.shadowBlur = 14;
        ctx.shadowColor = "#7dd3fc";
        ctx.beginPath();
        ctx.arc(kp.x * w, kp.y * h, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Portal ring (audio-reactive radius)
    const [cx, cy] = bodyCenter(kps);
    const ringR = (0.14 * h) + Math.sin(t * 0.5) * 5 + audio.bass * 30;
    ctx.globalAlpha = 0.12 + audio.volume * 0.15;
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#38bdf8";
    ctx.beginPath();
    ctx.arc(cx * w, cy * h, ringR, 0, Math.PI * 2);
    ctx.stroke();
}

// ─── Phase 2: Set Electrónico ────────────────────────────────────
function drawPhase2(
    ctx: CanvasRenderingContext2D,
    kps: Keypoint[], connections: [number, number][],
    w: number, h: number,
    t: number, audio: AudioData
) {
    const spawnRate = 0.25 + audio.volume * 0.5;
    spawnParticles(kps, w, h, spawnRate, 180 + audio.mid * 60);
    tickParticles(ctx);

    // Wave rings from each keypoint
    for (const kp of kps) {
        if (kp.confidence < 0.3) continue;
        const wR = 15 + Math.sin(t * 3 + kp.x * 5) * 12 + audio.bass * 25;
        ctx.globalAlpha = 0.18 + audio.volume * 0.12;
        ctx.strokeStyle = `hsl(${180 + t * 20}, 100%, 65%)`;
        ctx.lineWidth = 0.8;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#38bdf8";
        ctx.beginPath();
        ctx.arc(kp.x * w, kp.y * h, wR, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Cyan skeleton base
    drawConnections(ctx, kps, connections, w, h, "#a5f3fc", 0.35 + audio.mid * 0.2, 1, "#67e8f9");
}

// ─── Phase 3: Jamboteo Final ─────────────────────────────────────
function drawPhase3(
    ctx: CanvasRenderingContext2D,
    kps: Keypoint[], connections: [number, number][],
    w: number, h: number,
    t: number, audio: AudioData
) {
    // Accumulate trails
    if (kps.length > 0 && Math.floor(t * 30) % 2 === 0) {
        trailHistory.push([...kps]);
        if (trailHistory.length > MAX_TRAILS) trailHistory.shift();
    }

    // Ghost trails
    for (let ti = 0; ti < trailHistory.length; ti++) {
        const age = (ti + 1) / trailHistory.length;
        drawConnections(
            ctx, trailHistory[ti], connections, w, h,
            `hsl(${300 + ti * 10}, 80%, 60%)`,
            age * 0.22, 0.7
        );
    }

    // Cymatic rings (bass-reactive)
    const [cx, cy] = bodyCenter(kps);
    for (let r = 0; r < 5; r++) {
        const ringR = (35 + r * 40) + Math.sin(t * 3 + r) * 12 + audio.bass * 35;
        ctx.globalAlpha = (1 - r / 5) * (0.3 + audio.volume * 0.2);
        ctx.strokeStyle = `hsl(${270 + r * 18 + t * 25}, 100%, 70%)`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 22;
        ctx.shadowColor = `hsl(${270 + r * 18}, 100%, 70%)`;
        ctx.beginPath();
        ctx.arc(cx * w, cy * h, ringR, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Glitch echo on beat
    if (audio.beat || Math.sin(t * 8) > 0.75) {
        const gx = (Math.random() - 0.5) * 18;
        const gy = (Math.random() - 0.5) * 8;
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = "#f0abfc";
        ctx.lineWidth = 1;
        ctx.shadowBlur = 4;
        for (const [ai, bi] of connections) {
            const a = kps[ai]; const b = kps[bi];
            if (!a || !b || a.confidence < 0.2 || b.confidence < 0.2) continue;
            ctx.beginPath();
            ctx.moveTo(a.x * w + gx, a.y * h + gy);
            ctx.lineTo(b.x * w + gx, b.y * h + gy);
            ctx.stroke();
        }
    }

    // Main skeleton — bright white-purple
    drawConnections(ctx, kps, connections, w, h, "#ffffff", 0.88, 1.5, "#e879f9");

    // Particle burst
    spawnParticles(kps, w, h, 0.35 + audio.volume * 0.4, 270);
    tickParticles(ctx);
}

// ─── Phase 4: Gallery / Rest ──────────────────────────────────────
function drawPhase4(
    ctx: CanvasRenderingContext2D,
    kps: Keypoint[], connections: [number, number][],
    w: number, h: number,
    t: number, audio: AudioData
) {
    ctx.shadowBlur = 0;
    // Ghost skeleton — very subtle
    drawConnections(
        ctx, kps, connections, w, h,
        "#64748b",
        0.12 + Math.sin(t * 0.5) * 0.04 + audio.volume * 0.06,
        0.6
    );

    // Tiny dots
    for (const kp of kps) {
        if (kp.confidence < 0.2) continue;
        ctx.globalAlpha = 0.1 + Math.sin(t + kp.x * 5) * 0.04;
        ctx.fillStyle = "#94a3b8";
        ctx.shadowBlur = 2;
        ctx.beginPath();
        ctx.arc(kp.x * w, kp.y * h, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ─── Main component ───────────────────────────────────────────────
export default function BodyPortal({
    keypoints, connections, phase, mirrored, audio, width, height,
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

        ctx.clearRect(0, 0, width, height);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        if (mirrored) {
            ctx.save();
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
        }

        // Shift keypoints when mirrored
        const kps: Keypoint[] = mirrored
            ? keypoints.map((k) => ({ ...k, x: 1 - k.x }))
            : keypoints;

        if (phase === 1) drawPhase1(ctx, kps, connections, width, height, t, audio);
        else if (phase === 2) drawPhase2(ctx, kps, connections, width, height, t, audio);
        else if (phase === 3) drawPhase3(ctx, kps, connections, width, height, t, audio);
        else drawPhase4(ctx, kps, connections, width, height, t, audio);

        if (mirrored) ctx.restore();

        animRef.current = requestAnimationFrame(draw);
    }, [keypoints, connections, phase, mirrored, audio, width, height]);

    useEffect(() => {
        animRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animRef.current);
    }, [draw]);

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
