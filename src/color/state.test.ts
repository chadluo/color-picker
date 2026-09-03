import { describe, expect, it } from 'vitest';
import { clampToGamut, convertColor, isOutOfGamut, parseColor, serializeColor } from './state';

describe('parseColor', () => {
  it('infers format from the input string', () => {
    expect(parseColor('hsl(200 50% 50%)').format).toBe('hsl');
    expect(parseColor('lch(50% 40 30)').format).toBe('lch');
    expect(parseColor('oklch(70% 0.1 250)').format).toBe('oklch');
  });

  it('defaults to oklch for empty or unparseable input', () => {
    expect(parseColor(undefined).format).toBe('oklch');
    expect(parseColor('not-a-color').format).toBe('oklch');
  });

  it('defaults an unsupported syntax (e.g. rgb/hex) to oklch rather than mirroring it', () => {
    expect(parseColor('#ff0000').format).toBe('oklch');
  });

  it('honors an explicit requested format regardless of the string syntax', () => {
    const { format, color } = parseColor('oklch(70% 0.15 250)', 'hsl');
    expect(format).toBe('hsl');
    expect(color.mode).toBe('hsl');
  });
});

describe('serializeColor round-trip', () => {
  it('re-parses to essentially the same color', () => {
    const { format, color } = parseColor('oklch(70% 0.15 250)');
    const css = serializeColor(color, format);
    const reparsed = parseColor(css, format);
    expect(reparsed.color.l).toBeCloseTo(color.l, 3);
    expect((reparsed.color as { c: number }).c).toBeCloseTo((color as { c: number }).c, 3);
    expect(reparsed.color.h ?? 0).toBeCloseTo(color.h ?? 0, 3);
  });
});

describe('convertColor (format switch)', () => {
  it('is a lossless no-op within the same plane family (lch <-> lab)', () => {
    const { color } = parseColor('lch(60% 40 120)');
    expect(convertColor(color, 'lab')).toBe(color);
  });

  it('preserves the visual color across a real cross-family conversion', () => {
    const { color: oklchColor } = parseColor('oklch(65% 0.1 30)');
    const hslColor = convertColor(oklchColor, 'hsl');
    const roundTripped = convertColor(hslColor, 'oklch');
    expect(roundTripped.l).toBeCloseTo(oklchColor.l, 2);
    expect((roundTripped as { c: number }).c).toBeCloseTo((oklchColor as { c: number }).c, 2);
    expect(roundTripped.h ?? 0).toBeCloseTo(oklchColor.h ?? 0, 0);
  });
});

describe('isOutOfGamut', () => {
  it('flags a color whose chroma exceeds the sRGB gamut', () => {
    const { color } = parseColor('lch(50% 140 30)');
    expect(isOutOfGamut(color)).toBe(true);
  });

  it('does not flag an ordinary in-gamut color', () => {
    const { color } = parseColor('oklch(60% 0.05 250)');
    expect(isOutOfGamut(color)).toBe(false);
  });

  it('never flags hsl, which is sRGB-native by construction', () => {
    const { color } = parseColor('hsl(200 100% 50%)');
    expect(isOutOfGamut(color)).toBe(false);
  });
});

describe('clampToGamut', () => {
  it('reduces an out-of-gamut color to something displayable, and reports that it did', () => {
    const { color } = parseColor('oklch(50% 0.2 250)');
    const { color: clamped, wasClamped } = clampToGamut(color);
    expect(wasClamped).toBe(true);
    expect(isOutOfGamut(clamped)).toBe(false);
    expect(clamped.h).toBeCloseTo(color.h ?? 0, 5);
    expect(clamped.l).toBeCloseTo(color.l, 5);
  });

  it("converting a clamped color never extrapolates outside a target format's valid range", () => {
    // Regression: converting an un-clamped out-of-gamut oklch color to hsl previously produced
    // saturation over 100%, since hsl's math just extrapolates past its own valid range.
    const { color } = parseColor('oklch(50% 0.2 250)');
    const { color: clamped } = clampToGamut(color);
    const hsl = convertColor(clamped, 'hsl');
    expect(hsl.mode).toBe('hsl');
    expect((hsl as { s: number }).s).toBeLessThanOrEqual(1);
    expect((hsl as { s: number }).s).toBeGreaterThanOrEqual(0);
  });

  it('leaves an already-displayable color untouched', () => {
    const { color } = parseColor('oklch(60% 0.05 250)');
    const { color: clamped, wasClamped } = clampToGamut(color);
    expect(wasClamped).toBe(false);
    expect(clamped).toBe(color);
  });
});
