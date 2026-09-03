import * as React from 'react';
import {
  type Format,
  type PickerColor,
  clampToGamut,
  convertColor,
  familyOf,
  parseColor,
  serializeColor,
} from './color/state';
import { PlaneCanvas } from './components/PlaneCanvas';
import { HueSlider } from './components/HueSlider';
import { AlphaSlider } from './components/AlphaSlider';
import { FormatSelect } from './components/FormatSelect';
import './ColorPickerPanel.css';

export interface ColorPickerPanelProps {
  /** A CSS color string in any supported format: oklch, hsl, lch, lab, or oklab. */
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function axesOf(color: PickerColor): { hue: number; axis1: number; lightness: number } {
  return {
    hue: color.h ?? 0,
    axis1: color.mode === 'hsl' ? color.s : color.c,
    lightness: color.l,
  };
}

function withAxis1Lightness(color: PickerColor, axis1: number, lightness: number): PickerColor {
  return color.mode === 'hsl' ? { ...color, s: axis1, l: lightness } : { ...color, c: axis1, l: lightness };
}

function withHue(color: PickerColor, hue: number): PickerColor {
  return { ...color, h: ((hue % 360) + 360) % 360 };
}

function withAlpha(color: PickerColor, alpha: number): PickerColor {
  return { ...color, alpha };
}

/** The full inline picker: WebGL plane, hue/alpha sliders, format dropdown. Exported for
 * embedding directly (e.g. a custom trigger UI); most consumers want `ColorPicker`, which wraps
 * this in a button + popover. */
export function ColorPickerPanel({ value, onChange, className }: ColorPickerPanelProps) {
  const initial = React.useRef<{ format: Format; color: PickerColor } | null>(null);
  if (!initial.current) initial.current = parseColor(value);

  const [format, setFormat] = React.useState<Format>(initial.current.format);
  const [color, setColor] = React.useState<PickerColor>(initial.current.color);
  const [clampNotice, setClampNotice] = React.useState(false);
  const lastEmitted = React.useRef(value);

  // Re-sync from `value` prop changes that didn't originate here. Format is intentionally left
  // out of this effect's reasoning — external updates never change the active format (ADR-0003).
  React.useEffect(() => {
    if (value === lastEmitted.current) return;
    const { color: clamped, wasClamped } = clampToGamut(parseColor(value, format).color);
    setColor(clamped);
    setClampNotice(wasClamped);
    lastEmitted.current = serializeColor(clamped, format);
    // `format` intentionally omitted: this effect reacts to external `value` changes only, and
    // always uses whatever format is active at the moment `value` actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = React.useCallback(
    (nextColor: PickerColor, nextFormat: Format = format) => {
      const { color: clamped, wasClamped } = clampToGamut(nextColor);
      setColor(clamped);
      setClampNotice(wasClamped);
      if (nextFormat !== format) setFormat(nextFormat);
      const css = serializeColor(clamped, nextFormat);
      lastEmitted.current = css;
      onChange(css);
    },
    [format, onChange],
  );

  const handleFormatChange = (nextFormat: Format) => {
    commit(convertColor(color, nextFormat), nextFormat);
  };

  const handlePick = (axis1: number, lightness: number) => {
    commit(withAxis1Lightness(color, axis1, lightness));
  };

  const handleHueChange = (hue: number) => {
    commit(withHue(color, hue));
  };

  const handleWheelHue = React.useCallback(
    (deltaY: number) => {
      commit(withHue(color, axesOf(color).hue + deltaY * 0.5));
    },
    [color, commit],
  );

  const handleAlphaChange = (alpha: number) => {
    commit(withAlpha(color, alpha));
  };

  const { hue, axis1, lightness } = axesOf(color);
  const family = familyOf(format);
  const outputCss = serializeColor(color, format);
  const opaqueCss = serializeColor(withAlpha(color, 1), format);

  return (
    <div className={['cp-root', className].filter(Boolean).join(' ')}>
      <PlaneCanvas
        family={family}
        hue={hue}
        axis1={axis1}
        lightness={lightness}
        onPick={handlePick}
        onWheelHue={handleWheelHue}
      />
      <div className="cp-controls">
        <HueSlider hue={hue} onChange={handleHueChange} />
        <AlphaSlider alpha={color.alpha} opaqueColorCss={opaqueCss} onChange={handleAlphaChange} />
        <div className="cp-footer">
          <span className="cp-swatch" style={{ '--cp-current-color': outputCss } as React.CSSProperties} />
          <FormatSelect format={format} onChange={handleFormatChange} />
          <code className="cp-output">{outputCss}</code>
        </div>
        {clampNotice && <p className="cp-clamp-notice">Adjusted to fit your screen's colors.</p>}
      </div>
    </div>
  );
}
