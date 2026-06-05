import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dimensiones Jamboteo",
  description: "Live projection-mapping art installation — Gitana Condesa",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="bg-black">
      <head>
        {/* ml5.js loaded via CDN — required for BodyPose */}
        <script
          src="https://unpkg.com/ml5@1/dist/ml5.min.js"
          defer
        />
        {/* JetBrains Mono for monospace aesthetic */}
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black overflow-hidden w-screen h-screen m-0 p-0">
        {children}
      </body>
    </html>
  );
}
