---
dateCreated: 2026-09-14
dateModified: 2026-09-14
uuid: 9a8cc486-d9c8-4345-8769-5c3bbd55ff8e
isPartOf: monking/penciltest
...
# Glossary
Symbols and terms used in the documentation and notes for *penciltest*.

## Key

### Versions
Without the `?` question mark, a version number is a statement that a feature is implemented in that version.

With a `?` question mark (e.g. `v1?`), the feature is not yet implemented, with an expectation that the feature may be implemented in that version.  

With `x` (e.g. `v0.3.x`), includes any minor/patch version after the preceding number.

### Symbols
Some values or behaviors can be characterized by symbols.

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

`?`
: option, toggle, generally disabled by default, describing alternate behavior  
  e.g.
  > `?` hide
  >
  For a `hide` option on something that's generally **not hidden**

`|`
: explicit alternate method or option choices, **default in bold**  
  e.g.
  > `?` **selected** `|` all `|` none
  >
  Where `selected` is the default option.
  > `?` omit `|` **include**
  >
  Where `include` is the default, which would be implied by "`?` omit" alone,
  but may be made explicit for clarity.

### Interactions
Many inputs can be reduced to an abbreviation describing the device and some
parameters.  
Variant inputs for the same action may be separated by a `|` pipe.

`mN`
: click with `N`th mouse/pointer button:  
  `0`: primary,  
  `1`: secondary or "right",  
  `2`: tertiary or "middle")

  > [!NOTE]
  > `m1` primary click will usually also be triggered by `t1` a 1-finger tap.

`e`
: Eraser button on stylus.  
  Generally equivalent to `m5` or `m5d`.

`tN`
: `N`-finger touch

`xN`
: `N`-click (or -tap),  
  e.g. `m1x2` double-click primary mouse button

`…d`
: Drag in any direction,  
  e.g. `m1d` drag primary mouse button; `t2d` drag 2 touches.

`…dC`
: `d`rag in `C`ompass direction (`N`, `E`, `S`, `W`), or 2-letter combinations,  
  e.g. `dS` drag down,  
  `dNE` drag diagonally up and right,  
  `dEW` for dragging either direction horizontally, e.g. scrubbing the timeline.

`…sN`, `…sL`
: Press for `N` seconds, or about `2` seconds for a `L`ong-press (may be configurable),  
  e.g. `m1s2` (press primary pointer button for 2 seconds)

`z`
: Zoom gesture with 2 fingers, with optional `+` (larger) or `-` (smaller) suffix,  
  e.g. `z+` zoom in / enlarge.

`w`
: Mouse wheel, with optional `+` (up) or `-` (down) suffix.  
  e.g. `w+` scroll up.

  > [!NOTE]
  > Scroll "up" and "down" are subject to the OS's interpretation, and may be
  > reversed with a "natural" setting.

`^+…`, `S+…`, `A+…`
: Modifier keys `Ctrl`, `Shift`, or `Alt`, respectively.

`TX`
: active `T`ool, where `X` is `p`en, `e`raser, `t`ransform

## Terms

field
: The work area, a.k.a. stage. Its dimensions are defined on the scene object, and it's scaled to the viewport.

pack, unpack
: Reformat scene data for export to JSON. Generally for compactness, minimum redundancy. Data is unpacked on open/import.

migration
: Update data from an older version to a newer one. Generally done when upacking a scene.

## Devices
Means of signalling [actions](actions.md), as with a mouse, tablet, touch, or keyboard.

stylus
: a pointer with pressure sensitivity

mouse
: a pointer with a primary and secondary button

touch
: 1-5 pointers with contact area

keyboard
: ASCII input with modifier keys (Ctrl, Shift, Alt)
