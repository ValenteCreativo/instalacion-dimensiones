"use client";

/**
 * BodyPoseSketch — Fase 3: Portal interdimensional multi-persona
 *
 * Arquitectura: p5 instance mode montado en un <div>.
 * Usa MoveNet MultiPose para detectar hasta 6 personas simultáneamente.
 * Cada persona genera su propio portal con color único.
 * Cuando hay varias personas, se dibujan conexiones energéticas entre ellas.
 */

import { useEffect, useRef } from "react";
import { AudioData } from "@/hooks/useAudioReactive";

interface BodyPoseSketchProps {
    audio: AudioData;
    mirrored: boolean;
    active: boolean;
}

// MoveNet skeleton connections (fallback si getSkeleton() falla)
const CONNECTIONS: [number, number][] = [
    [0, 1], [0, 2], [1, 3], [2, 4],
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
    [5, 11], [6, 12], [11, 12],
    [11, 13], [13, 15], [12, 14], [14, 16],
];

// Un hue base distinto para cada persona detectada (hasta 6)
const PERSON_HUES = [280, 180, 30, 120, 0, 60];

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
    const audioRef = useRef<AudioData>(audio);
    const mirroredRef = useRef<boolean>(mirrored);
    const sketchRef = useRef<any>(null);

    useEffect(() => { audioRef.current = audio; }, [audio]);
    useEffect(() => { mirroredRef.current = mirrored; }, [mirrored]);

    useEffect(() => {
        if (!active) return;
        let stopped = false;

        async function mountSketch() {
            const ready = await waitForLibs(12000);
            if (!ready || stopped) {
                console.error("[BodyPoseSketch] p5 or ml5 not available after 12s");
                return;
            }

            const container = containerRef.current;
            if (!container || stopped) return;

            // @ts-ignore
            const p5Constructor = window.p5;
            // @ts-ignore
            const ml5lib = window.ml5;

            const sketch = (p: any) => {
                let video: any;
                let bodyPose: any;
                let poses: any[] = [];
                let connections: [number, number][] = CONNECTIONS;

                // Trails per-person: Map de index → array de keypoint snapshots
                const personTrails: Map<number, any[][]> = new Map();
                const MAX_TRAILS = 6;

                // Pool global de partículas
                interface Pt {
                    x: number; y: number;
                    vx: number; vy: number;
                    life: number; maxLife: number;
                    hue: number; size: number;
                }
                const particles: Pt[] = [];
                const MAX_PARTICLES = 900;

                function gotPoses(results: any[]) {
                    poses = results || [];
                }

                p.preload = () => {
                    // MultiPose.Lightning: hasta 6 personas, más rápido que MultiPose.Thunder
                    bodyPose = ml5lib.bodyPose("MoveNetMultiPose", { flipped: false });
                };

                p.setup = () => {
                    const cnv = p.createCanvas(window.innerWidth, window.innerHeight);
                    cnv.parent(container);
                    cnv.style("position", "absolute");
                    cnv.style("top", "0");
                    cnv.style("left", "0");

                    video = p.createCapture(p.VIDEO);
                    video.size(640, 480);
                    video.hide();

                    bodyPose.detectStart(video, gotPoses);

                    try {
                        const s = bodyPose.getSkeleton();
                        if (Array.isArray(s) && s.length > 0) connections = s;
                    } catch { /* usa fallback CONNECTIONS */ }

                    p.background(0);
                };

                p.windowResized = () => {
                    p.resizeCanvas(window.innerWidth, window.innerHeight);
                };

                // ── Utilidades de coordenadas ──────────────────────────────

                // ml5 MultiPose entrega coordenadas absolutas del video (640×480).
                // Las escalamos al canvas completo.
                function kpX(kp: any): number {
                    const raw = (kp.x / 640) * p.width;
                    return mirroredRef.current ? p.width - raw : raw;
                }
                function kpY(kp: any): number {
                    return (kp.y / 480) * p.height;
                }
                function kpConf(kp: any): number {
                    return kp.score ?? kp.confidence ?? 0;
                }

                function bodyCenter(kps: any[]): [number, number] {
                    const valid = kps.filter(k => kpConf(k) > 0.2);
                    if (valid.length === 0) return [p.width / 2, p.height / 2];
                    return [
                        valid.reduce((s: number, k: any) => s + kpX(k), 0) / valid.length,
                        valid.reduce((s: number, k: any) => s + kpY(k), 0) / valid.length,
                    ];
                }

                // ── Dibujo de skeleton ─────────────────────────────────────

                function drawSkeleton(kps: any[], alpha: number, hue: number, lw: number, glowStrength = 0) {
                    p.strokeWeight(lw);
                    if (glowStrength > 0) {
                        p.drawingContext.shadowBlur = glowStrength;
                        p.drawingContext.shadowColor = `hsl(${hue}, 100%, 70%)`;
                    } else {
                        p.drawingContext.shadowBlur = 0;
                    }
                    p.noFill();
                    for (const [ai, bi] of connections) {
                        const a = kps[ai]; const b = kps[bi];
                        if (!a || !b) continue;
                        if (kpConf(a) < 0.15 || kpConf(b) < 0.15) continue;
                        p.stroke(hue, 90, 95, alpha * 255);
                        p.line(kpX(a), kpY(a), kpX(b), kpY(b));
                    }
                    p.drawingContext.shadowBlur = 0;
                }

                // ── Partículas ─────────────────────────────────────────────

                function spawnParticles(kps: any[], rate: number, hue: number) {
                    for (const kp of kps) {
                        if (kpConf(kp) < 0.25 || Math.random() > rate) continue;
                        for (let i = 0; i < 2; i++) {
                            const angle = Math.random() * Math.PI * 2;
                            const speed = 0.5 + Math.random() * 3.5;
                            particles.push({
                                x: kpX(kp), y: kpY(kp),
                                vx: Math.cos(angle) * speed,
                                vy: Math.sin(angle) * speed,
                                life: 1,
                                maxLife: 25 + Math.random() * 55,
                                hue: hue + (Math.random() - 0.5) * 40,
                                size: 2 + Math.random() * 5,
                            });
                        }
                    }
                    while (particles.length > MAX_PARTICLES) particles.shift();
                }

                function tickParticles() {
                    p.noStroke();
                    for (let i = particles.length - 1; i >= 0; i--) {
                        const pt = particles[i];
                        pt.x += pt.vx; pt.y += pt.vy;
                        pt.vx *= 0.97; pt.vy *= 0.97;
                        pt.life -= 1;
                        if (pt.life <= 0) { particles.splice(i, 1); continue; }
                        const a = (pt.life / pt.maxLife) * 210;
                        p.fill(pt.hue, 90, 95, a);
                        p.drawingContext.shadowBlur = 10;
                        p.drawingContext.shadowColor = `hsl(${pt.hue}, 100%, 80%)`;
                        p.ellipse(pt.x, pt.y, pt.size);
                    }
                    p.drawingContext.shadowBlur = 0;
                }

                // ── Conexión energética entre personas ─────────────────────

                function drawInterPersonConnections(centers: [number, number][], t: number, audio: AudioData) {
                    if (centers.length < 2) return;
                    for (let i = 0; i < centers.length; i++) {
                        for (let j = i + 1; j < centers.length; j++) {
                            const [ax, ay] = centers[i];
                            const [bx, by] = centers[j];

                            // Línea base con pulso
                            const hue = (200 + t * 20) % 360;
                            const alpha = 0.15 + audio.volume * 0.2;
                            p.stroke(hue, 80, 90, alpha * 255);
                            p.strokeWeight(0.8);
                            p.drawingContext.shadowBlur = 12;
                            p.drawingContext.shadowColor = `hsl(${hue}, 100%, 70%)`;
                            p.line(ax, ay, bx, by);

                            // Pulso viajando a lo largo de la línea
                            const progress = (t * 0.6) % 1;
                            const px = p.lerp(ax, bx, progress);
                            const py = p.lerp(ay, by, progress);
                            p.noStroke();
                            p.fill(hue, 60, 100, 180);
                            p.drawingContext.shadowBlur = 20;
                            p.drawingContext.shadowColor = `hsl(${hue}, 100%, 90%)`;
                            p.ellipse(px, py, 8 + audio.bass * 12);

                            p.drawingContext.shadowBlur = 0;
                        }
                    }
                }

                // ── Anillos císmicos por persona ───────────────────────────

                function drawPortalRings(cx: number, cy: number, hue: number, t: number, personIndex: number, audio: AudioData) {
                    const offset = personIndex * 1.3; // fase distinta por persona
                    for (let r = 0; r < 4; r++) {
                        const radius = (35 + r * 42) + Math.sin(t * 2.5 + r + offset) * 14 + audio.bass * 38;
                        const rHue = (hue + r * 15 + t * 20) % 360;
                        const a = (1 - r / 4) * (70 + audio.volume * 55);
                        p.noFill();
                        p.stroke(rHue, 100, 85, a);
                        p.strokeWeight(1.5);
                        p.drawingContext.shadowBlur = 22;
                        p.drawingContext.shadowColor = `hsl(${rHue}, 100%, 70%)`;
                        p.ellipse(cx, cy, radius * 2);
                    }
                    p.drawingContext.shadowBlur = 0;
                }

                // ── Draw loop principal ────────────────────────────────────

                p.draw = () => {
                    const audio = audioRef.current;
                    const t = p.frameCount * 0.016;

                    // Fade oscuro — crea trails de movimiento
                    p.colorMode(p.RGB);
                    p.background(0, 0, 0, 28);
                    p.colorMode(p.HSB, 360, 100, 100, 255);

                    // ── Sin personas: portal ambiental ─────────────────────
                    if (poses.length === 0) {
                        const cx = p.width / 2;
                        const cy = p.height / 2;
                        p.noFill();
                        for (let r = 0; r < 5; r++) {
                            const radius = 55 + r * 50 + Math.sin(t * 1.8 + r) * 18 + audio.bass * 35;
                            const hue = (260 + r * 22 + t * 12) % 360;
                            p.stroke(hue, 80, 75, 70 - r * 10);
                            p.strokeWeight(1.2);
                            p.drawingContext.shadowBlur = 18;
                            p.drawingContext.shadowColor = `hsl(${hue}, 100%, 65%)`;
                            p.ellipse(cx, cy, radius * 2);
                        }
                        p.drawingContext.shadowBlur = 0;
                        tickParticles();
                        return;
                    }

                    // ── Centros de cada persona (para conexiones inter-persona)
                    const centers: [number, number][] = [];

                    // ── Dibujar cada persona ───────────────────────────────
                    poses.forEach((pose, personIndex) => {
                        const kps = pose.keypoints;
                        if (!kps || kps.length === 0) return;

                        const hue = PERSON_HUES[personIndex % PERSON_HUES.length];

                        // Acumular trails por persona
                        if (!personTrails.has(personIndex)) personTrails.set(personIndex, []);
                        const trails = personTrails.get(personIndex)!;
                        if (p.frameCount % 2 === 0) {
                            trails.push(kps);
                            if (trails.length > MAX_TRAILS) trails.shift();
                        }

                        // Ghost trails (fantasmas del movimiento)
                        for (let ti = 0; ti < trails.length; ti++) {
                            const age = (ti + 1) / trails.length;
                            drawSkeleton(trails[ti], age * 0.2, (hue + ti * 8) % 360, 0.7);
                        }

                        // Centro del cuerpo
                        const [cx, cy] = bodyCenter(kps);
                        centers.push([cx, cy]);

                        // Anillos de portal
                        drawPortalRings(cx, cy, hue, t, personIndex, audio);

                        // Glitch en beat
                        if (audio.beat || Math.sin(t * 8 + personIndex) > 0.8) {
                            const gx = (Math.random() - 0.5) * 22;
                            const gy = (Math.random() - 0.5) * 12;
                            p.push();
                            p.translate(gx, gy);
                            drawSkeleton(kps, 0.22, (hue + 40) % 360, 1);
                            p.pop();
                        }

                        // Skeleton principal — brillante
                        drawSkeleton(kps, 0.92, hue, 2, 18);

                        // Keypoint dots
                        p.noStroke();
                        for (const kp of kps) {
                            if (kpConf(kp) < 0.2) continue;
                            const x = kpX(kp); const y = kpY(kp);
                            const size = (4 + kpConf(kp) * 7) * (1 + audio.bass * 0.5);
                            const dotHue = (hue + Math.sin(t * 2 + x * 0.008) * 30 + 360) % 360;
                            p.fill(dotHue, 70, 100, 210);
                            p.drawingContext.shadowBlur = 18;
                            p.drawingContext.shadowColor = `hsl(${dotHue}, 100%, 85%)`;
                            p.ellipse(x, y, size);
                        }
                        p.drawingContext.shadowBlur = 0;

                        // Espirales en muñecas levantadas
                        const lw = kps[9]; const rw = kps[10];
                        const ls = kps[5]; const rs = kps[6];
                        if (lw && ls && kpConf(lw) > 0.2 && lw.y < ls.y) {
                            const angle = t * 8;
                            const rad = 22 + Math.sin(t * 3) * 8;
                            particles.push({
                                x: kpX(lw) + Math.cos(angle) * rad,
                                y: kpY(lw) + Math.sin(angle) * rad,
                                vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2,
                                life: 1, maxLife: 45,
                                hue: (hue + 30) % 360, size: 3 + Math.random() * 4,
                            });
                        }
                        if (rw && rs && kpConf(rw) > 0.2 && rw.y < rs.y) {
                            const angle = -t * 8;
                            const rad = 22 + Math.sin(t * 3) * 8;
                            particles.push({
                                x: kpX(rw) + Math.cos(angle) * rad,
                                y: kpY(rw) + Math.sin(angle) * rad,
                                vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2,
                                life: 1, maxLife: 45,
                                hue: (hue - 30 + 360) % 360, size: 3 + Math.random() * 4,
                            });
                        }

                        // Partículas del cuerpo
                        spawnParticles(kps, 0.28 + audio.volume * 0.38, hue);
                    });

                    // Limpiar trails de personas que ya no están detectadas
                    personTrails.forEach((_, idx) => {
                        if (idx >= poses.length) personTrails.delete(idx);
                    });

                    // Conexiones energéticas entre personas
                    drawInterPersonConnections(centers, t, audio);

                    // Partículas
                    tickParticles();
                };
            };

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
