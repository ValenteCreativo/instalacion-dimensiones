"use client";

import { useEffect, useRef, useState } from "react";

export interface AudioData {
    volume: number;       // 0–1 overall volume (RMS)
    bass: number;         // 0–1 low frequency energy
    mid: number;          // 0–1 mid frequency energy
    treble: number;       // 0–1 high frequency energy
    beat: boolean;        // true on detected beat/kick
    isActive: boolean;    // microphone successfully running
}

const DEFAULT: AudioData = {
    volume: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    beat: false,
    isActive: false,
};

export function useAudioReactive(): AudioData {
    const [data, setData] = useState<AudioData>(DEFAULT);
    const rafRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const prevVolumeRef = useRef(0);

    useEffect(() => {
        let stream: MediaStream | null = null;
        let ctx: AudioContext | null = null;

        async function init() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                ctx = new AudioContext();
                const source = ctx.createMediaStreamSource(stream);

                const analyser = ctx.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.75;
                source.connect(analyser);

                const bufferLength = analyser.frequencyBinCount; // 128 bins
                const dataArray = new Uint8Array(bufferLength);
                analyserRef.current = analyser;
                dataArrayRef.current = dataArray;

                const loop = () => {
                    analyser.getByteFrequencyData(dataArray);

                    // Frequency bin ranges (for 256 FFT, 128 bins, ~43Hz/bin at 44.1kHz sr)
                    const bassEnd = 5;       // 0–215 Hz
                    const midEnd = 25;       // 215–1075 Hz
                    // treble: 25–128

                    let bassSum = 0, midSum = 0, trebleSum = 0, totalSum = 0;
                    for (let i = 0; i < bufferLength; i++) {
                        const v = dataArray[i] / 255;
                        totalSum += v * v; // RMS
                        if (i < bassEnd) bassSum += v;
                        else if (i < midEnd) midSum += v;
                        else trebleSum += v;
                    }

                    const volume = Math.min(1, Math.sqrt(totalSum / bufferLength) * 3);
                    const bass = Math.min(1, bassSum / bassEnd * 1.5);
                    const mid = Math.min(1, midSum / (midEnd - bassEnd));
                    const treble = Math.min(1, trebleSum / (bufferLength - midEnd) * 1.2);

                    // Beat detection: sudden bass spike
                    const beat = bass > 0.5 && bass > prevVolumeRef.current * 1.4;
                    prevVolumeRef.current = bass;

                    setData({ volume, bass, mid, treble, beat, isActive: true });
                    rafRef.current = requestAnimationFrame(loop);
                };

                rafRef.current = requestAnimationFrame(loop);
            } catch {
                // Microphone denied or unavailable — silently degrade
                console.warn("Microphone unavailable — audio reactivity disabled");
                setData(DEFAULT);
            }
        }

        init();

        return () => {
            cancelAnimationFrame(rafRef.current);
            stream?.getTracks().forEach((t) => t.stop());
            ctx?.close();
        };
    }, []);

    return data;
}
