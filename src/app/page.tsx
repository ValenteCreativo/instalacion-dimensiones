"use client";

import dynamic from "next/dynamic";

// Dynamically import to avoid SSR issues (webcam + canvas are client-only)
const ProjectionStage = dynamic(
  () => import("@/components/ProjectionStage"),
  {
    ssr: false,
    loading: () => (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div
          className="text-sm uppercase tracking-[0.4em] animate-pulse"
          style={{ color: "#38bdf8", fontFamily: "monospace" }}
        >
          Dimensiones Jamboteo
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return <ProjectionStage />;
}
