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

// Skeleton connections for drawing lines between keypoints
export const SKELETON_CONNECTIONS: [string, string][] = [
    ["nose", "left_eye"],
    ["nose", "right_eye"],
    ["left_eye", "left_ear"],
    ["right_eye", "right_ear"],
    ["left_shoulder", "right_shoulder"],
    ["left_shoulder", "left_elbow"],
    ["left_elbow", "left_wrist"],
    ["right_shoulder", "right_elbow"],
    ["right_elbow", "right_wrist"],
    ["left_shoulder", "left_hip"],
    ["right_shoulder", "right_hip"],
    ["left_hip", "right_hip"],
    ["left_hip", "left_knee"],
    ["left_knee", "left_ankle"],
    ["right_hip", "right_knee"],
    ["right_knee", "right_ankle"],
];

// Simulated body — a slow, breathing, dancing figure useful when webcam is unavailable
function generateSimulatedKeypoints(t: number): Keypoint[] {
    const cx = 0.5;
    const cy = 0.5;
    const breathe = Math.sin(t * 0.8) * 0.01;
    const sway = Math.sin(t * 0.4) * 0.03;
    const armSway = Math.sin(t * 0.6) * 0.05;

    const pts: Record<string, [number, number]> = {
        nose: [cx + sway, cy - 0.28 + breathe],
        left_eye: [cx - 0.02 + sway, cy - 0.295 + breathe],
        right_eye: [cx + 0.02 + sway, cy - 0.295 + breathe],
        left_ear: [cx - 0.035 + sway, cy - 0.285 + breathe],
        right_ear: [cx + 0.035 + sway, cy - 0.285 + breathe],
        left_shoulder: [cx - 0.07 + sway, cy - 0.18 + breathe],
        right_shoulder: [cx + 0.07 + sway, cy - 0.18 + breathe],
        left_elbow: [cx - 0.13 + armSway + sway, cy - 0.04],
        left_wrist: [cx - 0.17 + armSway * 1.5 + sway, cy + 0.08],
        right_elbow: [cx + 0.13 - armSway + sway, cy - 0.04],
        right_wrist: [cx + 0.17 - armSway * 1.5 + sway, cy + 0.08],
        left_hip: [cx - 0.055 + sway * 0.5, cy + 0.05 + breathe * 0.5],
        right_hip: [cx + 0.055 + sway * 0.5, cy + 0.05 + breathe * 0.5],
        left_knee: [cx - 0.06 + Math.sin(t * 0.5) * 0.02, cy + 0.19],
        left_ankle: [cx - 0.06 + Math.sin(t * 0.5) * 0.01, cy + 0.33],
        right_knee: [cx + 0.06 + Math.sin(t * 0.5 + 1) * 0.02, cy + 0.19],
        right_ankle: [cx + 0.06 + Math.sin(t * 0.5 + 1) * 0.01, cy + 0.33],
    };

    return Object.entries(pts).map(([name, [x, y]]) => ({
        name,
        x,
        y,
        confidence: 0.9,
    }));
}

export function useBodyPose(
    videoRef: React.RefObject<HTMLVideoElement | null>,
    canvasRef: React.RefObject<HTMLCanvasElement | null>
): BodyPoseState {
    const [state, setState] = useState<BodyPoseState>({
        keypoints: [],
        isLoaded: false,
        isSimulated: false,
        error: null,
    });

    const poseRef = useRef<Keypoint[]>([]);
    const rafRef = useRef<number>(0);
    const isSimulating = useRef(false);
    const ml5Ready = useRef(false);

    // Simulation loop — used when webcam/ml5 not available
    const startSimulation = useCallback(() => {
        if (isSimulating.current) return;
        isSimulating.current = true;
        let t = 0;

        const loop = () => {
            t += 0.016;
            const kps = generateSimulatedKeypoints(t);
            poseRef.current = kps;
            setState((prev) => ({
                ...prev,
                keypoints: kps,
                isLoaded: true,
                isSimulated: true,
            }));
            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
    }, []);

    useEffect(() => {
        let bodypose: ReturnType<typeof setTimeout> | null = null;

        // Wait for ml5 to load from CDN
        const tryInit = async () => {
            if (!window.ml5) {
                // ml5 not yet loaded — use simulation
                startSimulation();
                return;
            }

            ml5Ready.current = true;

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: "user" },
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }

                const bp = window.ml5.bodyPose("MoveNet", { flipped: false });

                bp.detectStart(videoRef.current, (results: { pose: { keypoints: Keypoint[] } }[]) => {
                    if (results && results.length > 0) {
                        // Normalize keypoints to 0-1 range relative to video dimensions
                        const video = videoRef.current;
                        if (!video) return;
                        const w = video.videoWidth || 640;
                        const h = video.videoHeight || 480;
                        const kps: Keypoint[] = results[0].pose.keypoints.map((kp) => ({
                            name: kp.name,
                            x: kp.x / w,
                            y: kp.y / h,
                            confidence: kp.confidence,
                        }));
                        poseRef.current = kps;
                        setState((prev) => ({
                            ...prev,
                            keypoints: kps,
                            isLoaded: true,
                            isSimulated: false,
                        }));
                    }
                });

                setState((prev) => ({ ...prev, isLoaded: true, isSimulated: false }));
            } catch (err) {
                console.warn("Webcam/BodyPose unavailable, using simulation:", err);
                setState((prev) => ({
                    ...prev,
                    error: "Webcam unavailable — using simulated body",
                }));
                startSimulation();
            }
        };

        // Give the CDN script a moment to load, then try
        bodypose = setTimeout(tryInit, 800);

        return () => {
            if (bodypose) clearTimeout(bodypose);
            cancelAnimationFrame(rafRef.current);
            isSimulating.current = false;
            // Stop webcam stream
            if (videoRef.current?.srcObject) {
                const s = videoRef.current.srcObject as MediaStream;
                s.getTracks().forEach((t) => t.stop());
            }
        };
    }, [startSimulation, videoRef, canvasRef]);

    return state;
}
