import * as React from 'react';
import { ColorPickerPanel, type ColorPickerPanelProps } from './ColorPickerPanel';
import './ColorPicker.css';

export type ColorPickerProps = ColorPickerPanelProps;

/**
 * A compact trigger button — showing a swatch of the current color — that opens the full
 * picker (WebGL plane, sliders, format dropdown) in a native popover anchored under it. This
 * is the component most consumers want; import `ColorPickerPanel` directly to embed the picker
 * inline without a popup.
 *
 * Uses the native Popover API (`popover`/`popoverTarget`) for open/close state and light-dismiss
 * (outside click, Escape) — no positioning library, no open-state management of our own.
 */
export function ColorPicker({ value, onChange, className, wheelSensitivity }: ColorPickerProps) {
  const popoverId = React.useId();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  const handleToggle = (e: React.ToggleEvent<HTMLDivElement>) => {
    if (e.newState !== 'open') return;
    const button = buttonRef.current;
    const popover = popoverRef.current;
    if (!button || !popover) return;
    const rect = button.getBoundingClientRect();
    popover.style.top = `${rect.bottom + 6}px`;
    popover.style.left = `${rect.left}px`;
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={['cp-trigger', className].filter(Boolean).join(' ')}
        popoverTarget={popoverId}
        aria-label="Choose a color"
      >
        <span className="cp-trigger-swatch" style={{ '--cp-current-color': value } as React.CSSProperties} />
      </button>
      <div ref={popoverRef} id={popoverId} popover="auto" className="cp-popover" onToggle={handleToggle}>
        <ColorPickerPanel value={value} onChange={onChange} wheelSensitivity={wheelSensitivity} />
      </div>
    </>
  );
}
