export interface HueSliderProps {
  hue: number;
  onChange: (hue: number) => void;
}

/** Visible, keyboard/touch-accessible hue control — the fallback for the plane's wheel
 * shortcut (see grilling thread: wheel-only was rejected as insufficient). */
export function HueSlider({ hue, onChange }: HueSliderProps) {
  return (
    <input
      type="range"
      className="cp-hue-slider"
      min={0}
      max={360}
      step={1}
      value={hue}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label="Hue"
    />
  );
}
