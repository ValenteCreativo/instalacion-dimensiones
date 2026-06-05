"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface Keypoint {
    x: number; y: number;
    confidence: number;
    name: string;
}

export interface BodyPoseState {
    keypoints: Keypoint[];
    connections: [number, number][];
    isLoaded: boolean;
    isSimulated: boolean;
    error: string | null;
}

// Keypoint names MoveNet order
const KP_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
];

// MoveNet connections
const MOVENET_CONNECTIONS: [number, number][] = [
    [0, 1], [0, 2], [1, 3], [2, 4],
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
    [5, 11], [6, 12], [11, 12],
    [11, 13], [13, 15], [12, 14], [14, 16],
];

// --- Simulated Body Fallback ---
function generateSimulatedKeypoints(t: number): Keypoint[] {
    const cx = 0.5; const cy = 0.5;
    const breathe = Math.sin(t * 0.8) * 0.012;
    const sway = Math.sin(t * 0.4) * 0.03;
    const armL = Math.sin(t * 0.6) * 0.06;
    const armR = Math.sin(t * 0.6 + 1.2) * 0.06;
    const legL = Math.sin(t * 0.5) * 0.025;
    const legR = Math.sin(t * 0.5 + Math.PI) * 0.025;

    const pts: [number, number][] = [
        [cx + sway, cy - 0.28 + breathe],               // 0
        [cx - 0.018 + sway, cy - 0.295 + breathe],      // 1
        [cx + 0.018 + sway, cy - 0.295 + breathe],      // 2
        [cx - 0.04 + sway, cy - 0.285 + breathe],       // 3
        [cx + 0.04 + sway, cy - 0.285 + breathe],       // 4
        [cx - 0.08 + sway, cy - 0.18 + breathe],        // 5
        [cx + 0.08 + sway, cy - 0.18 + breathe],        // 6
        [cx - 0.13 + armL + sway, cy - 0.05],           // 7
        [cx + 0.13 - armR + sway, cy - 0.05],           // 8
        [cx - 0.17 + armL * 1.4 + sway, cy + 0.07],     // 9
        [cx + 0.17 - armR * 1.4 + sway, cy + 0.07],     // 10
        [cx - 0.055 + sway * 0.5, cy + 0.06 + breathe * 0.5], // 11
        [cx + 0.055 + sway * 0.5, cy + 0.06 + breathe * 0.5], // 12
        [cx - 0.06 + legL, cy + 0.19],                  // 13
        [cx + 0.06 + legR, cy + 0.19],                  // 14
        [cx - 0.06 + legL * 0.5, cy + 0.33],            // 15
        [cx + 0.06 + legR * 0.5, cy + 0.33],            // 16
    ];

    return pts.map(([x, y], i) => ({
        x, y, confidence: 0.92, name: KP_NAMES[i],
    }));
}

export function useBodyPose(videoRef: React.RefObject<HTMLVideoElement | null>): BodyPoseState {
    const [state, setState] = useState<BodyPoseState>({
        keypoints: [], connections: MOVENET_CONNECTIONS,
        isLoaded: false, isSimulated: false, error: null,
    });

    const rafRef = useRef<number>(0);
    const isSimulating = useRef(false);

    const startSimulation = useCallback(() => {
        if (isSimulating.current) return;
        console.warn("Starting ml5 simulation fallback");
        isSimulating.current = true;
        let t = 0;
        const loop = () => {
            t += 0.016;
            setState(prev => ({
                ...prev,
                keypoints: generateSimulatedKeypoints(t),
                connections: MOVENET_CONNECTIONS,
                isLoaded: true, isSimulated: true,
            }));
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
    }, []);

    useEffect(() => {
        let stopped = false;

        async function init() {
            // 1. Wait for ml5 script (increased wait time to avoid premature fallback)
            let waited = 0;
            // @ts-ignore
            while (!window.ml5 && waited < 8000) {
                await new Promise(r => setTimeout(r, 200));
                waited += 200;
            }

            // @ts-ignore
            if (!window.ml5) {
                console.error("ml5 library not loaded from CDN");
                if (!stopped) startSimulation();
                return;
            }

            try {
                // 2. Request webcam
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user" },
                });

                const video = videoRef.current;
                if (!video || stopped) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                video.srcObject = stream;
                video.play();

                // Wait for video dimensions to be ready
                await new Promise(r => {
                    video.onloadedmetadata = () => { r(true) };
                    // fallback if event missed
                    setTimeout(r, 1000);
                });

                // 3. Initialize ml5 MoveNet
                // @ts-ignore
                const bp = window.ml5.bodyPose("MoveNet");

                let skeleton = MOVENET_CONNECTIONS;

                // 4. Start detection loop
                bp.detectStart(video, (results: any[]) => {
                    if (stopped) return;
                    if (!results || results.length === 0) return;

                    // Try to get skeleton once
                    try {
                        const s = bp.getSkeleton();
                        if (s && s.length > 0) skeleton = s;
                    } catch { /* ignore */ }

                    const pose = results[0];
                    const w = video.videoWidth || 640;
                    const h = video.videoHeight || 480;

                    const kps: Keypoint[] = pose.keypoints.map((kp: any, i: number) => ({
                        x: kp.x / w,
                        y: kp.y / h,
                        confidence: kp.score ?? kp.confidence ?? 0,
                        name: kp.name ?? KP_NAMES[i] ?? `kp_${i}`,
                    }));

                    setState({
                        keypoints: kps,
                        connections: skeleton,
                        isLoaded: true,
                        isSimulated: false,
                        error: null,
                    });
                });

                setState(prev => ({ ...prev, isLoaded: true, isSimulated: false }));

            } catch (err) {
                console.error("Webcam Request Failed / Model Load Error:", err);
                if (!stopped) {
                    setState(prev => ({
                        ...prev,
                        error: "Webcam denied or failed to load. Please allow camera permissions.",
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
                s.getTracks().forEach(t => t.stop());
            }
        };
    }, [startSimulation, videoRef]);

    return state;
}
