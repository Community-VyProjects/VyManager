"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Image from "next/image";
import { VortexEngine, type VortexLayout } from "./vortex-engine";
import styles from "./login.module.css";

export interface VortexHandle {
  pulse: () => void;
  setBusy: (busy: boolean) => void;
  fail: () => void;
  /** Resolves when it is time to navigate away. */
  succeed: () => Promise<void>;
}

const STACKED_BELOW = 960;

/** Keep in step with the breakpoint in login.module.css. */
export function vortexLayout(width: number, height: number): VortexLayout {
  if (width < STACKED_BELOW) {
    const radius = Math.min(width * 0.27, height * 0.145);
    return { x: width / 2, y: radius + Math.max(44, height * 0.07), radius };
  }
  const formColumn = Math.min(560, width * 0.42);
  const radius = Math.min(height * 0.31, (width - formColumn) * 0.3);
  return { x: (width - formColumn) * 0.52, y: height * 0.44, radius };
}

export const VortexCanvas = forwardRef<VortexHandle, { alt: string }>(function VortexCanvas({ alt }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VortexEngine | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      pulse: () => engineRef.current?.pulse(),
      setBusy: (busy) => engineRef.current?.setBusy(busy),
      fail: () => engineRef.current?.fail(),
      succeed: () => engineRef.current?.succeed() ?? Promise.resolve(),
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const engine = new VortexEngine(canvas, {
        iconSrc: "/vy-icon.png",
        layout: vortexLayout,
        still: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        onUnavailable: () => {
          // The engine has already torn itself down.
          engineRef.current = null;
          setUnavailable(true);
        },
      });
      engineRef.current = engine;
      return () => {
        engine.dispose();
        engineRef.current = null;
      };
    } catch (err) {
      console.error("[Vortex] WebGL unavailable:", err);
      queueMicrotask(() => setUnavailable(true));
    }
  }, []);

  if (unavailable) {
    return (
      <div className={styles.fallbackMark}>
        <Image src="/vy-icon.png" alt={alt} width={500} height={500} priority />
      </div>
    );
  }

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
});
