"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface Keypoint {
    x: number;        // normalized 0-1
    y: number;        // normalized 0-1
    confidence: number;
    name: string;
}

export interface BodyPoseState {
    keypoints: Keypoint[];
    connections: [number, number][];   // skeleton connection index pairs
    isLoaded: boolean;
    isSimulated: boolean;
    error: string | null;
}

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ml5: any;
    }
}

// ─── Simulated body fallback ─────────────────────────────────────────
// Keypoint names matching MoveNet order (index 0-16)
const KP_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
];

// MoveNet skeleton connections (index pairs)
const MOVENET_CONNECTIONS: [number, number][] = [
    [0, 1], [0, 2], [1, 3], [2, 4],           // head
    [5, 6],                                     // shoulders
    [5, 7], [7, 9],                             // left arm
    [6, 8], [8, 10],                            // right arm
    [5, 11], [6, 12],                           // torso sides
    [11, 12],                                   // hips
    [11, 13], [13, 15],                         // left leg
    [12, 14], [14, 16],                         // right leg
];

function generateSimulatedKeypoints(t: number): Keypoint[] {
    const cx = 0.5;
    const cy = 0.5;
    const breathe = Math.sin(t * 0.8) * 0.012;
    const sway = Math.sin(t * 0.4) * 0.03;
    const armL = Math.sin(t * 0.6) * 0.06;
    const armR = Math.sin(t * 0.6 + 1.2) * 0.06;
    const legL = Math.sin(t * 0.5) * 0.025;
    const legR = Math.sin(t * 0.5 + Math.PI) * 0.025;

    const pts: [number, number][] = [
        [cx + sway, cy - 0.28 + breathe],               // 0 nose
        [cx - 0.018 + sway, cy - 0.295 + breathe],      // 1 left_eye
        [cx + 0.018 + sway, cy - 0.295 + breathe],      // 2 right_eye
        [cx - 0.04 + sway, cy - 0.285 + breathe],       // 3 left_ear
        [cx + 0.04 + sway, cy - 0.285 + breathe],       // 4 right_ear
        [cx - 0.08 + sway, cy - 0.18 + breathe],        // 5 left_shoulder
        [cx + 0.08 + sway, cy - 0.18 + breathe],        // 6 right_shoulder
        [cx - 0.13 + armL + sway, cy - 0.05],           // 7 left_elbow
        [cx + 0.13 - armR + sway, cy - 0.05],           // 8 right_elbow
        [cx - 0.17 + armL * 1.4 + sway, cy + 0.07],    // 9 left_wrist
        [cx + 0.17 - armR * 1.4 + sway, cy + 0.07],    // 10 right_wrist
        [cx - 0.055 + sway * 0.5, cy + 0.06 + breathe * 0.5], // 11 left_hip
        [cx + 0.055 + sway * 0.5, cy + 0.06 + breathe * 0.5], // 12 right_hip
        [cx - 0.06 + legL, cy + 0.19],                  // 13 left_knee
        [cx + 0.06 + legR, cy + 0.19],                  // 14 right_knee
        [cx - 0.06 + legL * 0.5, cy + 0.33],            // 15 left_ankle
        [cx + 0.06 + legR * 0.5, cy + 0.33],            // 16 right_ankle
    ];

    return pts.map(([x, y], i) => ({
        x, y,
        confidence: 0.92,
        name: KP_NAMES[i],
    }));
}

// ─── Hook ────────────────────────────────────────────────────────────
export function useBodyPose(
    videoRef: React.RefObject<HTMLVideoElement | null>
): BodyPoseState {
    const [state, setState] = useState<BodyPoseState>({
        keypoints: [],
        connections: MOVENET_CONNECTIONS,
        isLoaded: false,
        isSimulated: false,
        error: null,
    });

    const rafRef = useRef<number>(0);
    const isSimulating = useRef(false);

    const startSimulation = useCallback(() => {
        if (isSimulating.current) return;
        isSimulating.current = true;
        let t = 0;

        const loop = () => {
            t += 0.016;
            setState((prev) => ({
                ...prev,
                keypoints: generateSimulatedKeypoints(t),
                connections: MOVENET_CONNECTIONS,
                isLoaded: true,
                isSimulated: true,
            }));
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
    }, []);

    useEffect(() => {
        let stopped = false;

        async function init() {
            // Wait for ml5 CDN script to load (up to 3s)
            let waited = 0;
            while (!window.ml5 && waited < 3000) {
                await new Promise((r) => setTimeout(r, 200));
                waited += 200;
            }

            if (!window.ml5) {
                console.warn("ml5 not loaded — using simulation");
                if (!stopped) startSimulation();
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: "user" },
                });

                const video = videoRef.current;
                if (!video || stopped) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }

                video.srcObject = stream;
                await video.play();

                // ml5 v1 API: ml5.bodyPose(model?, options?, callback?)
                const bp = window.ml5.bodyPose("MoveNet");

                // Wait for model to be ready before starting detection
                // getSkeleton() returns [[indexA, indexB], ...] pairs
                let skeleton: [number, number][] = MOVENET_CONNECTIONS;
                try {
                    skeleton = bp.getSkeleton() ?? MOVENET_CONNECTIONS;
                } catch {
                    // getSkeleton sometimes only works after first detection
                }

                // detectStart(input, callback) — callback receives pose results array
                bp.detectStart(video, (results: {
                    keypoints: { x: number; y: number; score?: number; confidence?: number; name?: string }[];
                }[]) => {
                    if (stopped) return;
                    if (!results || results.length === 0) return;

                    const pose = results[0];
                    const w = video.videoWidth || 640;
                    const h = video.videoHeight || 480;

                    // Try to get skeleton from live result if not yet retrieved
                    try {
                        const s = bp.getSkeleton();
                        if (s && s.length > 0) skeleton = s;
                    } catch { /* ignore */ }

                    const kps: Keypoint[] = pose.keypoints.map((kp, i) => ({
                        x: kp.x / w,
                        y: kp.y / h,
                        confidence: kp.score ?? kp.confidence ?? 0,
                        name: kp.name ?? KP_NAMES[i] ?? `kp_${i}`,
                    }));

                    setState((prev) => ({
                        ...prev,
                        keypoints: kps,
                        connections: skeleton,
                        isLoaded: true,
                        isSimulated: false,
                    }));
                });

                setState((prev) => ({ ...prev, isLoaded: true, isSimulated: false }));
            } catch (err) {
                console.warn("Webcam/ml5 init failed — using simulation:", err);
                if (!stopped) {
                    setState((prev) => ({
                        ...prev,
                        error: "Webcam unavailable — modo simulado",
                    }));
                    startSimulation();
                }
            }
        }

        init();

        return () => {
            stopped = true;
            cancelAnimationFrame(rafRef.current);
            isSimulating.current = false;
            if (videoRef.current?.srcObject) {
                const s = videoRef.current.srcObject as MediaStream;
                s.getTracks().forEach((t) => t.stop());
            }
        };
    }, [startSimulation, videoRef]);

    return state;
}
