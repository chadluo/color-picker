import { clampChroma, converter, displayable, formatCss, parse, type Color, type Hsl, type Lch, type Oklch } from 'culori';

/** CSS color formats the picker can edit and emit. See CONTEXT.md: Active format. */
export type Format = 'oklch' | 'hsl' | 'lch' | 'lab' | 'oklab';

/** The three WebGL rendering/editing spaces. See CONTEXT.md: Plane family. */
export type PlaneFamily = 'hsl' | 'cie' | 'ok';

/** The only culori modes the picker ever edits in — one per plane family. `lab`/`oklab` are
 * serialized from `lch`/`oklch` at the format boundary, never stored in Cartesian form, since
 * the plane always drags in chroma/lightness (polar) terms. See ADR-0001. */
type EditingMode = 'hsl' | 'lch' | 'oklch';

/** Native coordinates: the active format's own live color state. See CONTEXT.md and ADR-0002 —
 * there is no separate canonical value behind this. */
export type PickerColor = (Hsl | Lch | Oklch) & { alpha: number };

const SUPPORTED_FORMATS: readonly Format[] = ['oklch', 'hsl', 'lch', 'lab', 'oklab'];

const EDITING_MODE_OF: Record<Format, EditingMode> = {
  oklch: 'oklch',
  oklab: 'oklch',
  lch: 'lch',
  lab: 'lch',
  hsl: 'hsl',
};

const FAMILY_OF: Record<EditingMode, PlaneFamily> = {
  hsl: 'hsl',
  lch: 'cie',
  oklch: 'ok',
};

export function familyOf(format: Format): PlaneFamily {
  return FAMILY_OF[EDITING_MODE_OF[format]];
}

export function editingModeOf(format: Format): EditingMode {
  return EDITING_MODE_OF[format];
}

const DEFAULT_FORMAT: Format = 'oklch';
const DEFAULT_COLOR: Oklch & { alpha: number } = { mode: 'oklch', l: 0.7, c: 0.15, h: 250, alpha: 1 };

function toEditingColor(color: Color & { alpha?: number }, mode: EditingMode): PickerColor {
  const converted = converter(mode)(color) as PickerColor;
  converted.alpha = color.alpha ?? converted.alpha ?? 1;
  return converted;
}

function isSupportedFormat(mode: string): mode is Format {
  return (SUPPORTED_FORMATS as readonly string[]).includes(mode);
}

/**
 * Parses a CSS color string into picker state. If `requestedFormat` is given (switching format,
 * or re-syncing an external `value` update into the currently active format — ADR-0003), the
 * result is always in that format's editing space. Otherwise the format is inferred from the
 * string's own syntax, falling back to `oklch` when the string is empty, unparseable, or in an
 * unsupported format (e.g. `rgb()`/hex).
 */
export function parseColor(value: string | undefined, requestedFormat?: Format): { format: Format; color: PickerColor } {
  const parsed = value ? parse(value) : undefined;

  if (!parsed) {
    const format = requestedFormat ?? DEFAULT_FORMAT;
    return { format, color: toEditingColor(DEFAULT_COLOR, EDITING_MODE_OF[format]) };
  }

  const format = requestedFormat ?? (isSupportedFormat(parsed.mode) ? parsed.mode : DEFAULT_FORMAT);
  return { format, color: toEditingColor(parsed, EDITING_MODE_OF[format]) };
}

/** Converts picker state into a new format's editing space. A no-op when both formats share a
 * plane family (e.g. `lch` → `lab`), otherwise the one real conversion ADR-0002 describes. */
export function convertColor(color: PickerColor, format: Format): PickerColor {
  const mode = EDITING_MODE_OF[format];
  return mode === color.mode ? color : toEditingColor(color, mode);
}

function roundChannels<T extends Record<string, unknown>>(color: T): T {
  const rounded: Record<string, unknown> = { ...color };
  for (const key of Object.keys(rounded)) {
    const v = rounded[key];
    if (typeof v === 'number') rounded[key] = Math.round(v * 10000) / 10000;
  }
  return rounded as T;
}

/** Serializes picker state as a CSS string in the given format. */
export function serializeColor(color: PickerColor, format: Format): string {
  const output = format === 'lab' || format === 'oklab' ? converter(format)(color) : color;
  return formatCss(roundChannels({ ...output, alpha: color.alpha }));
}

/** Whether the current color falls outside the sRGB gamut and had to be clamped for display. */
export function isOutOfGamut(color: PickerColor): boolean {
  return !displayable(color);
}

/**
 * Reduces chroma at constant lightness/hue until the color is displayable in sRGB — the same
 * gamut clamp ADR-0002 describes for the shaders, applied to the *stored* value. Without this,
 * an out-of-gamut pick (chroma can range up to the plane's full display max, most of which is
 * undisplayable at extreme lightness) stays in state un-clamped: converting it to another format
 * then extrapolates nonsense, e.g. an HSL saturation over 100%. `hsl` is always in gamut by
 * construction and never needs this.
 */
export function clampToGamut(color: PickerColor): { color: PickerColor; wasClamped: boolean } {
  if (color.mode === 'hsl' || displayable(color)) return { color, wasClamped: false };
  const clamped = clampChroma(color, color.mode) as PickerColor;
  clamped.alpha = color.alpha;
  return { color: clamped, wasClamped: true };
}
