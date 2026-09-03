import * as React from 'react';
import type { PlaneFamily } from '../color/state';
import { nativeToPlane, planeToNative } from '../webgl/planeAxes';
import { createPlaneRenderer, type PlaneRenderer } from '../webgl/createPlaneRenderer';
import { FRAGMENT_SHADER_CIE, FRAGMENT_SHADER_HSL, FRAGMENT_SHADER_OK } from '../webgl/shaders';

const SHADER_BY_FAMILY: Record<PlaneFamily, string> = {
  hsl: FRAGMENT_SHADER_HSL,
  cie: FRAGMENT_SHADER_CIE,
  ok: FRAGMENT_SHADER_OK,
};

export interface PlaneCanvasProps {
  family: PlaneFamily;
  hue: number;
  axis1: number;
  lightness: number;
  onPick: (axis1: number, lightness: number) => void;
  onWheelHue: (deltaY: number) => void;
  size?: number;
}

export function PlaneCanvas({ family, hue, axis1, lightness, onPick, onWheelHue, size = 240 }: PlaneCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const rendererRef = React.useRef<PlaneRenderer | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const renderer = createPlaneRenderer(canvas, SHADER_BY_FAMILY[family]);
    rendererRef.current = renderer;
    renderer.setHue(hue);
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
    // Recreated only when the plane family (shader) or size changes; hue is pushed separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family, size]);

  React.useEffect(() => {
    rendererRef.current?.setHue(hue);
  }, [hue]);

  // Native (non-passive) listener: React's synthetic onWheel is passive, so preventDefault
  // there would silently no-op and the page would scroll while you're trying to spin the hue.
  React.useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      onWheelHue(e.deltaY);
    };
    wrapper.addEventListener('wheel', handler, { passive: false });
    return () => wrapper.removeEventListener('wheel', handler);
  }, [onWheelHue]);

  const pickAt = (clientX: number, clientY: number) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const u = (clientX - rect.left) / rect.width;
    const v = (clientY - rect.top) / rect.height;
    const next = planeToNative(family, u, v);
    onPick(next.axis1, next.lightness);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pickAt(e.clientX, e.clientY);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0) return;
    pickAt(e.clientX, e.clientY);
  };

  const { u, v } = nativeToPlane(family, axis1, lightness);

  return (
    <div
      ref={wrapperRef}
      className="cp-plane"
      style={{ width: size, height: size }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      role="slider"
      aria-label="Chroma and lightness"
      tabIndex={0}
    >
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
      <div className="cp-plane-cursor" style={{ left: `${u * 100}%`, top: `${v * 100}%` }} />
    </div>
  );
}
