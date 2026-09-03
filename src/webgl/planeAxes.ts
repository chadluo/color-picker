import type { PlaneFamily } from '../color/state';

/**
 * Display range for each plane family's two axes: `axis1` is chroma (cie/ok) or saturation
 * (hsl), 0 to `axis1Max`; lightness is 0 to `lightnessMax`. These numbers are baked into the
 * matching GLSL fragment shader in shaders.ts, so the plane and the cursor position always
 * agree — keep the two in sync if either changes.
 */
export const PLANE_AXES: Record<PlaneFamily, { axis1Max: number; lightnessMax: number }> = {
  hsl: { axis1Max: 1, lightnessMax: 1 },
  cie: { axis1Max: 150, lightnessMax: 100 },
  ok: { axis1Max: 0.4, lightnessMax: 1 },
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** DOM-normalized plane position (u, v both 0..1, origin top-left) → native axis values. */
export function planeToNative(family: PlaneFamily, u: number, v: number): { axis1: number; lightness: number } {
  const { axis1Max, lightnessMax } = PLANE_AXES[family];
  return { axis1: clamp01(u) * axis1Max, lightness: lightnessMax * (1 - clamp01(v)) };
}

/** Native axis values → DOM-normalized plane position (u, v both 0..1, origin top-left). */
export function nativeToPlane(family: PlaneFamily, axis1: number, lightness: number): { u: number; v: number } {
  const { axis1Max, lightnessMax } = PLANE_AXES[family];
  return { u: clamp01(axis1 / axis1Max), v: clamp01(1 - lightness / lightnessMax) };
}
