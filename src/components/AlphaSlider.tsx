import * as React from 'react';

export interface AlphaSliderProps {
  alpha: number;
  /** The current color at full opacity, used as the gradient's solid end. */
  opaqueColorCss: string;
  onChange: (alpha: number) => void;
}

export function AlphaSlider({ alpha, opaqueColorCss, onChange }: AlphaSliderProps) {
  const style = { '--cp-alpha-color': opaqueColorCss } as React.CSSProperties;
  return (
    <input
      type="range"
      className="cp-alpha-slider"
      min={0}
      max={1}
      step={0.01}
      value={alpha}
      onChange={(e) => onChange(Number(e.target.value))}
      style={style}
      aria-label="Alpha"
    />
  );
}
