import type { Format } from '../color/state';

const FORMAT_LABELS: Record<Format, string> = {
  oklch: 'OKLCH',
  hsl: 'HSL',
  lch: 'LCH',
  lab: 'LAB',
  oklab: 'OKLab',
};

const FORMATS = Object.keys(FORMAT_LABELS) as Format[];

export interface FormatSelectProps {
  format: Format;
  onChange: (format: Format) => void;
}

export function FormatSelect({ format, onChange }: FormatSelectProps) {
  return (
    <select
      className="cp-format-select"
      value={format}
      onChange={(e) => onChange(e.target.value as Format)}
      aria-label="Color format"
    >
      {FORMATS.map((f) => (
        <option key={f} value={f}>
          {FORMAT_LABELS[f]}
        </option>
      ))}
    </select>
  );
}
