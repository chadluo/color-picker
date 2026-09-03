# Format is internal, sticky state — not a controlled prop

`value` is a controlled prop (`value` + `onChange`). Whether the active
format should be controlled the same way (a `format` prop +
`onFormatChange`) or stay internal component state was an open question.

Decision: format stays internal. It is seeded once from the initial
`value`'s parsed syntax, or defaults to `oklch` if `value` is empty or
unparseable. After that, only the in-component format dropdown changes it.
Later external `value` updates are re-parsed into whichever format is
currently active and never change the active format themselves.

## Considered options

A controlled `format`/`onFormatChange` prop pair mirroring `value`/
`onChange` — rejected per explicit direction: the component should honor
whatever format a host's initial value arrives in and hold onto it for the
picker's lifecycle, without the host managing a second piece of state, and
without a later `value` update silently reformatting the UI out from under
whatever the person using the picker currently has selected.

## Consequences

A host that wants to force a specific starting format has exactly one
lever: the syntax of the first `value` it passes in. A host cannot
reprogrammatically change the active format later (e.g. a "preview in
HSL" button) without going through the dropdown UI itself — out of scope
for now; revisit this ADR if that's needed.
