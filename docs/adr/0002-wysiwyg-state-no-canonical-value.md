# Store color state as the active format's native coordinates, not a canonical value

Format switching needs somewhere to read from and write to. Two designs
were on the table: (a) one persistent canonical color value (e.g. always
OKLCH) that every plane reads and writes through a conversion, or (b) no
canonical value at all — whatever format is active, its own native
coordinates are the only stored state, and a format switch performs
exactly one real `culori` conversion into the new format's coordinates.

Decision: (b). Chosen so that "what you see is what's stored" — no
conversion happens on every render or drag frame, and there is no phantom
internal value that could drift from what the active plane displays.

## Considered options

(a), a single persistent canonical value — rejected because it adds a
conversion on every interaction frame for no benefit the user asked for,
and because the user explicitly wants the currently active format to be
authoritative rather than a display projection of something else.

## Consequences

Switching format is a lossy-once operation (one `culori` conversion), not
lossless-forever: repeatedly bouncing between formats with no edits in
between accumulates negligible floating-point drift, versus zero drift
under design (a). Accepted as immaterial for a UI-driven picker.

Separately, but following from native-coordinate storage generally: the
hue number shown changes across formats for the same visual color, since
hue is defined differently in HSL, CIE Lab, and OKLab space. This is a
property of the math, not an extra cost of this decision.
