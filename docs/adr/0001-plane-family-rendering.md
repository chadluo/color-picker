# Collapse five color formats into three WebGL plane families

The picker supports five CSS color formats (`oklch`, `hsl`, `lch`, `lab`,
`oklab`) but renders only three distinct WebGL planes. `lab`⟺`lch` and
`oklab`⟺`oklch` are the same underlying space in Cartesian vs. polar
coordinates — only the output serialization differs, so they share a
plane family (CIE and OK respectively); `hsl` gets its own. Each plane
family owns one gamut-clamped fragment shader (chroma reduced at constant
lightness/hue until in-gamut).

## Considered options

Rendering a distinct plane per format (five shaders) was rejected as pure
duplication for two of the five pairs: `lab`/`lch` and `oklab`/`oklch`
already have identical native `(L, C, H)` coordinates and differ only in
whether the two chroma axes are exposed as `a`/`b` or `C`/`H`.

## Consequences

Adding a sixth format that shares an existing plane family's space is
nearly free. Adding one with a genuinely new space (not derived from HSL,
CIE Lab, or OKLab) needs a fourth shader.
