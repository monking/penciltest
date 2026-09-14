---
dateCreated: 2026-09-14
dateModified: 2026-09-14
uuid: 9a8cc486-d9c8-4345-8769-5c3bbd55ff8e
isPartOf: monking/penciltest
...
# glossary
Symbols and terms used in the documentation and notes for *penciltest*.

## key

### versions
Without the `?` question mark, a version number is a statement that a feature is implemented in that version.

With a `?` question mark (e.g. `v1?`), the feature is not yet implemented, with an expectation that the feature may be implemented in that version.  

With `x` (e.g. `v0.3.x`), includes any minor/patch version after the preceding number.

### symbols

`?`
: option, toggle

`|`
: alternate method or option choices, **default in bold**

`N`
: numeric value

`%`
: **normalized** numeric value (0-1, or 0-100%)

`px`
: pixel distance, in **scene dimensions** (scaled to fit screen)

`T`
: text value

`<>`
: range of frames, contiguous set with start and end

`..`
: sparse set of frames, i.e. any number of specific frames

## terms

field
: The work area, a.k.a. stage. Its dimensions are defined on the scene object, and it's scaled to the viewport.

pack, unpack
: Reformat scene data for export to JSON. Generally for compactness, minimum redundancy. Data is unpacked on open/import.

migration
: Update data from an older version to a newer one. Generally done when upacking a scene.

## devices
Means of signalling [actions](actions.md), as with a mouse, tablet, touch, or keyboard.

stylus
: a pointer with pressure sensitivity

mouse
: a pointer with a primary and secondary button

touch
: 1-5 pointers with contact area

keyboard
: ASCII input with modifier keys (Ctrl, Shift, Alt)
