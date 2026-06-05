import type { Metadata } from "next";
import Script from "next/script";
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
        {/* JetBrains Mono for monospace aesthetic */}
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black overflow-hidden w-screen h-screen m-0 p-0">
        {children}
        {/* ml5.js loaded after page is interactive — afterInteractive ensures
            window is available and prevents SSR issues */}
        <Script
          src="https://unpkg.com/ml5@1/dist/ml5.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
