"use client";

/**
 * BodyPoseSketch — Fase 3: Portal corporal con p5.js + ml5.js
 *
 * Arquitectura: p5 instance mode montado en un <div>.
 * Todo el ciclo de vida (video, ml5, detección, dibujo) vive dentro del sketch.
 * No depende de hooks externos para poses — elimina los problemas de timing.
 */

import { useEffect, useRef } from "react";
import { AudioData } from "@/hooks/useAudioReactive";

interface BodyPoseSketchProps {
    audio: AudioData;
    mirrored: boolean;
    active: boolean;
}

// MoveNet skeleton connections
const CONNECTIONS: [number, number][] = [
    [0, 1], [0, 2], [1, 3], [2, 4],
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
    [5, 11], [6, 12], [11, 12],
    [11, 13], [13, 15], [12, 14], [14, 16],
];

// Wait for window.p5 and window.ml5 to be available
function waitForLibs(maxMs = 12000): Promise<boolean> {
    return new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
            if (typeof window === "undefined") { resolve(false); return; }
            // @ts-ignore
            if (window.p5 && window.ml5) { resolve(true); return; }
            if (Date.now() - start >= maxMs) { resolve(false); return; }
            setTimeout(check, 200);
        };
        check();
    });
}

export default function BodyPoseSketch({ audio, mirrored, active }: BodyPoseSketchProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    // Keep audio accessible inside the p5 sketch via ref (avoids stale closures)
    const audioRef = useRef<AudioData>(audio);
    const mirroredRef = useRef<boolean>(mirrored);
    const sketchRef = useRef<any>(null);

    // Sync audio/mirrored into refs so the p5 draw loop always has fresh values
    useEffect(() => { audioRef.current = audio; }, [audio]);
    useEffect(() => { mirroredRef.current = mirrored; }, [mirrored]);

    useEffect(() => {
        if (!active) return;
        let stopped = false;

        async function mountSketch() {
            const ready = await waitForLibs(12000);

            if (!ready || stopped) {
                console.error("[BodyPoseSketch] p5 or ml5 not available");
                return;
            }

            const container = containerRef.current;
            if (!container || stopped) return;

            // @ts-ignore
            const p5Constructor = window.p5;
            // @ts-ignore
            const ml5lib = window.ml5;

            // ── p5 instance mode sketch ──────────────────────────────────────
            const sketch = (p: any) => {
                let video: any;
                let bodyPose: any;
                let poses: any[] = [];
                let connections: [number, number][] = CONNECTIONS;

                // Trail history for ghost effect
                const trailHistory: any[][] = [];
                const MAX_TRAILS = 8;

                // Particle pool
                interface P { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; hue: number; size: number; }
                const particles: P[] = [];

                function gotPoses(results: any[]) {
                    poses = results || [];
                }

                p.preload = () => {
                    bodyPose = ml5lib.bodyPose("MoveNet", { flipped: false });
                };

                p.setup = () => {
                    const cnv = p.createCanvas(window.innerWidth, window.innerHeight);
                    cnv.parent(container);
                    cnv.style("position", "absolute");
                    cnv.style("top", "0");
                    cnv.style("left", "0");

                    // Create video capture — hidden, used only as ML input
                    video = p.createCapture(p.VIDEO);
                    video.size(640, 480);
                    video.hide();

                    // Start detection and get skeleton connections
                    bodyPose.detectStart(video, gotPoses);
                    try {
                        const s = bodyPose.getSkeleton();
                        if (Array.isArray(s) && s.length > 0) connections = s;
                    } catch { /* use fallback */ }

                    p.background(0);
                };

                p.windowResized = () => {
                    p.resizeCanvas(window.innerWidth, window.innerHeight);
                };

                // ── Helpers ────────────────────────────────────────────────

                function drawConnections(kps: any[], alpha: number, col: string, lw: number, glowCol?: string) {
                    p.strokeWeight(lw);
                    if (glowCol) {
                        p.drawingContext.shadowBlur = 18;
                        p.drawingContext.shadowColor = glowCol;
                    } else {
                        p.drawingContext.shadowBlur = 0;
                    }
                    for (const [ai, bi] of connections) {
                        const a = kps[ai]; const b = kps[bi];
                        if (!a || !b) continue;
                        const confA = a.score ?? a.confidence ?? 0;
                        const confB = b.score ?? b.confidence ?? 0;
                        if (confA < 0.15 || confB < 0.15) continue;
                        const ax = mirroredRef.current ? p.width - a.x * (p.width / 640) : a.x * (p.width / 640);
                        const ay = a.y * (p.height / 480);
                        const bx = mirroredRef.current ? p.width - b.x * (p.width / 640) : b.x * (p.width / 640);
                        const by = b.y * (p.height / 480);
                        p.stroke(p.color(col + Math.round(alpha * 255).toString(16).padStart(2, "0")));
                        p.line(ax, ay, bx, by);
                    }
                    p.drawingContext.shadowBlur = 0;
                }

                function kpX(kp: any) {
                    const raw = kp.x * (p.width / 640);
                    return mirroredRef.current ? p.width - raw : raw;
                }
                function kpY(kp: any) { return kp.y * (p.height / 480); }
                function kpConf(kp: any) { return kp.score ?? kp.confidence ?? 0; }

                function bodyCenter(kps: any[]): [number, number] {
                    const valid = kps.filter(k => kpConf(k) > 0.2);
                    if (valid.length === 0) return [p.width / 2, p.height / 2];
                    return [
                        valid.reduce((s: number, k: any) => s + kpX(k), 0) / valid.length,
                        valid.reduce((s: number, k: any) => s + kpY(k), 0) / valid.length,
                    ];
                }

                function spawnParticles(kps: any[], rate: number, hueBase: number) {
                    for (const kp of kps) {
                        if (kpConf(kp) < 0.25 || Math.random() > rate) continue;
                        for (let i = 0; i < 2; i++) {
                            const angle = Math.random() * Math.PI * 2;
                            const speed = 0.5 + Math.random() * 3;
                            particles.push({
                                x: kpX(kp), y: kpY(kp),
                                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                                life: 1, maxLife: 30 + Math.random() * 50,
                                hue: hueBase + Math.random() * 40,
                                size: 2 + Math.random() * 4,
                            });
                        }
                    }
                    while (particles.length > 600) particles.shift();
                }

                function tickParticles() {
                    p.noStroke();
                    for (let i = particles.length - 1; i >= 0; i--) {
                        const pt = particles[i];
                        pt.x += pt.vx; pt.y += pt.vy;
                        pt.vx *= 0.97; pt.vy *= 0.97;
                        pt.life -= 1;
                        if (pt.life <= 0) { particles.splice(i, 1); continue; }
                        const a = (pt.life / pt.maxLife) * 220;
                        p.fill(pt.hue, 100, 68, a);
                        p.drawingContext.shadowBlur = 8;
                        p.drawingContext.shadowColor = `hsl(${pt.hue}, 100%, 80%)`;
                        p.ellipse(pt.x, pt.y, pt.size);
                    }
                    p.drawingContext.shadowBlur = 0;
                }

                // ── Draw loop ──────────────────────────────────────────────
                p.draw = () => {
                    const audio = audioRef.current;
                    const t = p.frameCount * 0.016;

                    // Dark fade — creates motion trails
                    p.colorMode(p.RGB);
                    p.background(0, 0, 0, 30);

                    p.colorMode(p.HSB, 360, 100, 100, 255);
                    p.noFill();

                    if (poses.length === 0) {
                        // No person detected — draw an ambient portal
                        const cx = p.width / 2;
                        const cy = p.height / 2;
                        for (let r = 0; r < 4; r++) {
                            const radius = 60 + r * 55 + Math.sin(t * 2 + r) * 15 + audio.bass * 40;
                            const hue = (270 + r * 20 + t * 15) % 360;
                            p.stroke(hue, 80, 70, 80 - r * 15);
                            p.strokeWeight(1.5);
                            p.drawingContext.shadowBlur = 20;
                            p.drawingContext.shadowColor = `hsl(${hue}, 100%, 60%)`;
                            p.ellipse(cx, cy, radius * 2);
                        }
                        p.drawingContext.shadowBlur = 0;
                        return;
                    }

                    for (const pose of poses) {
                        const kps = pose.keypoints;
                        if (!kps || kps.length === 0) continue;

                        // Accumulate trails every other frame
                        if (p.frameCount % 2 === 0) {
                            trailHistory.push(kps);
                            if (trailHistory.length > MAX_TRAILS) trailHistory.shift();
                        }

                        // Ghost trails (older = more transparent)
                        for (let ti = 0; ti < trailHistory.length; ti++) {
                            const age = (ti + 1) / trailHistory.length;
                            const hue = 300 + ti * 10;
                            drawConnections(trailHistory[ti], age * 0.25, `hsl(${hue},70%,60%)`, 0.8);
                        }

                        // Cymatic rings from body center
                        const [cx, cy] = bodyCenter(kps);
                        for (let r = 0; r < 5; r++) {
                            const radius = (40 + r * 45) + Math.sin(t * 3 + r) * 14 + audio.bass * 40;
                            const hue = (270 + r * 18 + t * 25) % 360;
                            const a = (1 - r / 5) * (80 + audio.volume * 60);
                            p.stroke(hue, 100, 80, a);
                            p.strokeWeight(1.5);
                            p.drawingContext.shadowBlur = 24;
                            p.drawingContext.shadowColor = `hsl(${hue}, 100%, 70%)`;
                            p.ellipse(cx, cy, radius * 2);
                        }
                        p.drawingContext.shadowBlur = 0;

                        // Glitch echo on beat
                        if (audio.beat || Math.sin(t * 8) > 0.78) {
                            const gx = (Math.random() - 0.5) * 20;
                            const gy = (Math.random() - 0.5) * 10;
                            p.push();
                            p.translate(gx, gy);
                            drawConnections(kps, 0.25, "hsl(300,80%,75%)", 1);
                            p.pop();
                        }

                        // Main skeleton — white with purple glow
                        drawConnections(kps, 0.9, "#ffffff", 2, "#e879f9");

                        // Keypoint dots
                        for (const kp of kps) {
                            if (kpConf(kp) < 0.2) continue;
                            const x = kpX(kp); const y = kpY(kp);
                            const size = (4 + kpConf(kp) * 6) * (1 + audio.bass * 0.5);
                            const hue = (280 + Math.sin(t * 2 + x * 0.01) * 40 + 360) % 360;
                            p.fill(hue, 80, 100, 200);
                            p.noStroke();
                            p.drawingContext.shadowBlur = 16;
                            p.drawingContext.shadowColor = `hsl(${hue}, 100%, 80%)`;
                            p.ellipse(x, y, size);
                        }
                        p.drawingContext.shadowBlur = 0;

                        // Wrist spirals when hands are raised above shoulders
                        const leftWrist = kps[9];
                        const rightWrist = kps[10];
                        const leftShoulder = kps[5];
                        const rightShoulder = kps[6];

                        if (leftWrist && leftShoulder && kpConf(leftWrist) > 0.2 && leftWrist.y < leftShoulder.y) {
                            const angle = t * 8;
                            const r = 20 + Math.sin(t * 3) * 8;
                            const sx = kpX(leftWrist) + Math.cos(angle) * r;
                            const sy = kpY(leftWrist) + Math.sin(angle) * r;
                            particles.push({ x: sx, y: sy, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2, life: 1, maxLife: 40, hue: 200 + Math.random() * 60, size: 3 + Math.random() * 4 });
                        }
                        if (rightWrist && rightShoulder && kpConf(rightWrist) > 0.2 && rightWrist.y < rightShoulder.y) {
                            const angle = -t * 8;
                            const r = 20 + Math.sin(t * 3) * 8;
                            const sx = kpX(rightWrist) + Math.cos(angle) * r;
                            const sy = kpY(rightWrist) + Math.sin(angle) * r;
                            particles.push({ x: sx, y: sy, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2, life: 1, maxLife: 40, hue: 300 + Math.random() * 60, size: 3 + Math.random() * 4 });
                        }

                        // Particle burst
                        spawnParticles(kps, 0.3 + audio.volume * 0.4, 270);
                    }

                    tickParticles();
                };
            };

            // Mount the sketch
            sketchRef.current = new p5Constructor(sketch);
        }

        mountSketch();

        return () => {
            stopped = true;
            if (sketchRef.current) {
                try { sketchRef.current.remove(); } catch { /* ignore */ }
                sketchRef.current = null;
            }
        };
    }, [active]);

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full"
            style={{ background: "black" }}
        />
    );
}
