import { PLANE_AXES } from './planeAxes';

/** Fullscreen quad. Flips v so (0,0) is top-left, matching DOM pointer coordinates and
 * planeAxes.ts — the fragment shaders and the JS-side cursor math then agree without
 * either side needing to know about clip-space orientation. */
export const VERTEX_SHADER = /* glsl */ `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = vec2(aPosition.x * 0.5 + 0.5, 1.0 - (aPosition.y * 0.5 + 0.5));
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const LINEAR_TO_SRGB = /* glsl */ `
float linearToSrgb(float c) {
  c = clamp(c, 0.0, 1.0);
  return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}
bool inGamut(vec3 lrgb) {
  return lrgb.r >= -1e-3 && lrgb.r <= 1.001 && lrgb.g >= -1e-3 && lrgb.g <= 1.001 && lrgb.b >= -1e-3 && lrgb.b <= 1.001;
}
`;

const FRAGMENT_HEADER = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform float uHue;
`;

/** HSL is sRGB-native by construction: any (h, s, l) with s, l in [0, 1] is already in gamut,
 * so this is the only plane family that needs no gamut clamping. */
export const FRAGMENT_SHADER_HSL = /* glsl */ `${FRAGMENT_HEADER}
vec3 hsl2rgb(float h, float s, float l) {
  h = mod(h, 360.0) / 360.0;
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
  float m = l - c * 0.5;
  vec3 rgb;
  if (h < 1.0 / 6.0) rgb = vec3(c, x, 0.0);
  else if (h < 2.0 / 6.0) rgb = vec3(x, c, 0.0);
  else if (h < 3.0 / 6.0) rgb = vec3(0.0, c, x);
  else if (h < 4.0 / 6.0) rgb = vec3(0.0, x, c);
  else if (h < 5.0 / 6.0) rgb = vec3(x, 0.0, c);
  else rgb = vec3(c, 0.0, x);
  return rgb + m;
}

void main() {
  float s = vUv.x * ${PLANE_AXES.hsl.axis1Max.toFixed(6)};
  float l = ${PLANE_AXES.hsl.lightnessMax.toFixed(6)} * (1.0 - vUv.y);
  outColor = vec4(hsl2rgb(uHue, s, l), 1.0);
}
`;

/** CIELAB (D65) → linear sRGB, then a bisection search that reduces chroma at constant L, H
 * until the color re-enters the sRGB gamut — ADR-0002's "gamut clamp" applied per pixel. */
export const FRAGMENT_SHADER_CIE = /* glsl */ `${FRAGMENT_HEADER}
${LINEAR_TO_SRGB}
vec3 lab2rgb(float L, float a, float b) {
  float fy = (L + 16.0) / 116.0;
  float fx = fy + a / 500.0;
  float fz = fy - b / 200.0;
  float fx3 = fx * fx * fx;
  float fz3 = fz * fz * fz;
  float xr = fx3 > 0.008856 ? fx3 : (fx - 16.0 / 116.0) / 7.787;
  float yr = L > 8.0 ? pow((L + 16.0) / 116.0, 3.0) : L / 903.3;
  float zr = fz3 > 0.008856 ? fz3 : (fz - 16.0 / 116.0) / 7.787;
  float X = xr * 0.95047;
  float Y = yr;
  float Z = zr * 1.08883;
  return vec3(
    3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z,
    -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z,
    0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z
  );
}
vec3 lch2rgb(float L, float C, float Hdeg) {
  float hRad = radians(Hdeg);
  return lab2rgb(L, C * cos(hRad), C * sin(hRad));
}
vec3 clampedLch2rgb(float L, float C, float Hdeg) {
  vec3 lrgb = lch2rgb(L, C, Hdeg);
  if (inGamut(lrgb)) return lrgb;
  float lo = 0.0;
  float hi = C;
  for (int i = 0; i < 14; i++) {
    float mid = (lo + hi) * 0.5;
    if (inGamut(lch2rgb(L, mid, Hdeg))) lo = mid; else hi = mid;
  }
  return lch2rgb(L, lo, Hdeg);
}

void main() {
  float c = vUv.x * ${PLANE_AXES.cie.axis1Max.toFixed(6)};
  float l = ${PLANE_AXES.cie.lightnessMax.toFixed(6)} * (1.0 - vUv.y);
  vec3 lrgb = clampedLch2rgb(l, c, uHue);
  vec3 srgb = vec3(linearToSrgb(lrgb.r), linearToSrgb(lrgb.g), linearToSrgb(lrgb.b));
  outColor = vec4(clamp(srgb, 0.0, 1.0), 1.0);
}
`;

/** OKLab → linear sRGB (Björn Ottosson's published matrices), with the same per-pixel
 * chroma-reduction gamut clamp as the CIE plane. */
export const FRAGMENT_SHADER_OK = /* glsl */ `${FRAGMENT_HEADER}
${LINEAR_TO_SRGB}
vec3 oklch2rgb(float L, float C, float Hdeg) {
  float hRad = radians(Hdeg);
  float a = C * cos(hRad);
  float b = C * sin(hRad);
  float l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  float m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  float s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  float l = l_ * l_ * l_;
  float m = m_ * m_ * m_;
  float s = s_ * s_ * s_;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}
vec3 clampedOklch2rgb(float L, float C, float Hdeg) {
  vec3 lrgb = oklch2rgb(L, C, Hdeg);
  if (inGamut(lrgb)) return lrgb;
  float lo = 0.0;
  float hi = C;
  for (int i = 0; i < 14; i++) {
    float mid = (lo + hi) * 0.5;
    if (inGamut(oklch2rgb(L, mid, Hdeg))) lo = mid; else hi = mid;
  }
  return oklch2rgb(L, lo, Hdeg);
}

void main() {
  float c = vUv.x * ${PLANE_AXES.ok.axis1Max.toFixed(6)};
  float l = ${PLANE_AXES.ok.lightnessMax.toFixed(6)} * (1.0 - vUv.y);
  vec3 lrgb = clampedOklch2rgb(l, c, uHue);
  vec3 srgb = vec3(linearToSrgb(lrgb.r), linearToSrgb(lrgb.g), linearToSrgb(lrgb.b));
  outColor = vec4(clamp(srgb, 0.0, 1.0), 1.0);
}
`;
