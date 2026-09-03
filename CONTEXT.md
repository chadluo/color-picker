# Color Picker Component

A hue-based CSS color picker: a WebGL-rendered 2D plane covers two color
dimensions, a hue control covers the third, and a format dropdown lets the
same color be edited and emitted as any of five CSS color formats.

## Language

**Active format**:
The CSS color format (`oklch`, `hsl`, `lch`, `lab`, or `oklab`) the picker is
currently editing in and emitting on `onChange`. Set once from the initial
`value`, changed only via the format dropdown thereafter.
_Avoid_: current format, selected format, output format

**Plane family**:
One of the three distinct chroma-or-saturation × lightness coordinate spaces
the WebGL plane can render: HSL, CIE (backs `lch`/`lab`), and OK (backs
`oklch`/`oklab`). Several active formats can share one plane family.
_Avoid_: color space, mode, shader type

**Native coordinates**:
The active format's own numeric parameters (e.g. hue/saturation/lightness
for `hsl`; lightness/chroma/hue for `lch`) — the picker's only stored color
state. There is no separate internal or canonical representation.
_Avoid_: canonical value, internal color, source of truth

**Gamut clamp**:
Reducing a color's chroma at constant lightness and hue until it re-enters
the sRGB gamut. Applied per pixel by each plane family's shader so
out-of-gamut regions still render a displayable color, and surfaced in the
UI when the picked point itself was clamped.
_Avoid_: clipping, desaturation
