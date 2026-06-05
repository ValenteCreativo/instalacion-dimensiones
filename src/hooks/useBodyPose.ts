"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface Keypoint {
    x: number;
    y: number;
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

// Keypoint names in MoveNet order
const KP_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
];

// MoveNet skeleton connections as fallback
const MOVENET_CONNECTIONS: [number, number][] = [
    [0, 1], [0, 2], [1, 3], [2, 4],
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
    [5, 11], [6, 12], [11, 12],
    [11, 13], [13, 15], [12, 14], [14, 16],
];

// --- Simulated Body Fallback ---
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
        [cx + sway, cy - 0.28 + breathe],                      // 0 nose
        [cx - 0.018 + sway, cy - 0.295 + breathe],             // 1 left_eye
        [cx + 0.018 + sway, cy - 0.295 + breathe],             // 2 right_eye
        [cx - 0.04 + sway, cy - 0.285 + breathe],              // 3 left_ear
        [cx + 0.04 + sway, cy - 0.285 + breathe],              // 4 right_ear
        [cx - 0.08 + sway, cy - 0.18 + breathe],               // 5 left_shoulder
        [cx + 0.08 + sway, cy - 0.18 + breathe],               // 6 right_shoulder
        [cx - 0.13 + armL + sway, cy - 0.05],                  // 7 left_elbow
        [cx + 0.13 - armR + sway, cy - 0.05],                  // 8 right_elbow
        [cx - 0.17 + armL * 1.4 + sway, cy + 0.07],            // 9 left_wrist
        [cx + 0.17 - armR * 1.4 + sway, cy + 0.07],            // 10 right_wrist
        [cx - 0.055 + sway * 0.5, cy + 0.06 + breathe * 0.5], // 11 left_hip
        [cx + 0.055 + sway * 0.5, cy + 0.06 + breathe * 0.5], // 12 right_hip
        [cx - 0.06 + legL, cy + 0.19],                         // 13 left_knee
        [cx + 0.06 + legR, cy + 0.19],                         // 14 right_knee
        [cx - 0.06 + legL * 0.5, cy + 0.33],                   // 15 left_ankle
        [cx + 0.06 + legR * 0.5, cy + 0.33],                   // 16 right_ankle
    ];

    return pts.map(([x, y], i) => ({
        x, y, confidence: 0.92, name: KP_NAMES[i],
    }));
}

// Wait for window.ml5 to be injected by the CDN script (up to maxMs)
function waitForMl5(maxMs = 10000): Promise<boolean> {
    return new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
            // @ts-ignore
            if (typeof window !== "undefined" && window.ml5) {
                resolve(true);
                return;
            }
            if (Date.now() - start >= maxMs) {
                resolve(false);
                return;
            }
            setTimeout(check, 150);
        };
        check();
    });
}

export function useBodyPose(videoRef: React.RefObject<HTMLVideoElement | null>): BodyPoseState {
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
        console.warn("[BodyPose] Starting simulation fallback");
        isSimulating.current = true;
        let t = 0;
        const loop = () => {
            t += 0.016;
            setState({
                keypoints: generateSimulatedKeypoints(t),
                connections: MOVENET_CONNECTIONS,
                isLoaded: true,
                isSimulated: true,
                error: null,
            });
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
    }, []);

    useEffect(() => {
        let stopped = false;
        let stream: MediaStream | null = null;

        async function init() {
            // 1. Wait for ml5 CDN script to load
            const ml5Ready = await waitForMl5(10000);

            if (!ml5Ready) {
                console.error("[BodyPose] ml5 not available after 10s — falling back to simulation");
                if (!stopped) startSimulation();
                return;
            }

            // 2. Request webcam access
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
                });
            } catch (err) {
                console.error("[BodyPose] Camera permission denied:", err);
                if (!stopped) {
                    setState(prev => ({
                        ...prev,
                        error: "Cámara denegada. Permite el acceso en el navegador.",
                        isSimulated: true,
                    }));
                    startSimulation();
                }
                return;
            }

            const video = videoRef.current;
            if (!video || stopped) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            // 3. Attach stream to video element and wait for metadata
            video.srcObject = stream;

            await new Promise<void>((resolve) => {
                // onloadedmetadata fires once width/height are known
                const onMeta = () => {
                    video.removeEventListener("loadedmetadata", onMeta);
                    resolve();
                };
                video.addEventListener("loadedmetadata", onMeta);
                // Safeguard: if metadata already loaded
                if (video.readyState >= 1) resolve();
            });

            try {
                await video.play();
            } catch (err) {
                console.warn("[BodyPose] video.play() failed:", err);
            }

            // Give the video a frame to render before handing to ml5
            await new Promise(r => setTimeout(r, 300));

            if (stopped) return;

            // 4. Initialize ml5 bodyPose (MoveNet — lighter and faster than BlazePose)
            // @ts-ignore
            const bp = window.ml5.bodyPose("MoveNet", { flipped: false });

            // 5. Get skeleton connections — call immediately after init, not in callback
            let skeleton: [number, number][] = MOVENET_CONNECTIONS;
            try {
                const s = bp.getSkeleton();
                if (Array.isArray(s) && s.length > 0) {
                    skeleton = s as [number, number][];
                }
            } catch {
                // getSkeleton may not be ready yet on some builds; use fallback
            }

            // 6. Start continuous detection
            bp.detectStart(video, (results: any[]) => {
                if (stopped) return;
                if (!results || results.length === 0) return;

                // Try to get skeleton once more if the first call failed
                if (skeleton === MOVENET_CONNECTIONS) {
                    try {
                        const s = bp.getSkeleton();
                        if (Array.isArray(s) && s.length > 0) {
                            skeleton = s as [number, number][];
                        }
                    } catch { /* ignore */ }
                }

                const pose = results[0];
                // Use actual video dimensions for correct normalization
                const w = video.videoWidth || 640;
                const h = video.videoHeight || 480;

                const kps: Keypoint[] = (pose.keypoints as any[]).map((kp: any, i: number) => ({
                    x: kp.x / w,
                    y: kp.y / h,
                    // ml5 v1 uses 'score', older may use 'confidence'
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

            console.log("[BodyPose] MoveNet started, video:", video.videoWidth, "x", video.videoHeight);
        }

        init().catch((err) => {
            console.error("[BodyPose] Unexpected init error:", err);
            if (!stopped) startSimulation();
        });

        return () => {
            stopped = true;
            cancelAnimationFrame(rafRef.current);
            isSimulating.current = false;
            // Stop webcam tracks
            if (stream) stream.getTracks().forEach(t => t.stop());
            if (videoRef.current?.srcObject) {
                const s = videoRef.current.srcObject as MediaStream;
                s.getTracks().forEach(t => t.stop());
                videoRef.current.srcObject = null;
            }
        };
    }, [startSimulation, videoRef]);

    return state;
}
