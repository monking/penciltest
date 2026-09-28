---
dateCreated: 2026-09-14
dateModified: 2026-09-14
uuid: 4f5a7df7-2dff-4b5f-b86e-e78df2d85d40
isPartOf: monking/penciltest
...
# actions
What a user can do in the *penciltest* app, primarily irrespective of UI or [device](glossary.md#devices).

[glossary (symbols and terms)](glossary.md "symbols and terms in penciltest documentation")

Actions are outlined with parameters and implementation versions.

Actions **not yet implemented** are ~~struck through~~ with an estimated version to be implemented.

## modes
Behaviors will change depending on the mode.

* drawing
* playing
* working

## tools

* pencil
* eraser
* ~~transform~~ `v0.5?`
* ~~select~~ `v0.5?`

## drawing

* move cursor `px`(x,y) `v0.1.x`
* mark `px`(x,y), `px`(width) `v0.1.x`, `%`(weight) `v0.3.x`
* lift (end marking a stroke) `v0.1.x`
* erase `px`(x,y), `px`(width) `v0.1.x`

## selection

* select path(s) `..` `v0.2.x`
* ~~select path nodes~~ `..` [`v0.5?`](todo.feature-dreams.md#select-partial-paths)
* select frame(s) `<>` `v0.3.x`

## view

* toggle onion skin `v0.1.x`
* ~~zoom~~ `v0.5?`
* ~~pan~~ `v0.5?`
* ~~rotate~~ `v0.5?`

## transform

* translate selection `N`(x,y) [`v0.2.x`](#translate "called \"pan\" originally")
* ~~scale~~ `px`(x,y) selection around *cursor* `v0.5?`
* ~~rotate~~ `%`τ(z) selection around *cursor* `v0.5?`

## playback

* play `?` pause `v0.1.x`
* go to frame `N` `v0.1.x`
  * next/previous `v0.1.x`
* ~~set playback speed (not frame rate)~~ `v0.6?`

## frames

* insert (new, paste `<>`) `v0.1.x`
* change hold (extend, shorten) `v0.1.x`
* copy current or `<>` selection `v0.2.x`
* ~~move~~ `<>` to `N` start exposure `v0.5?`
* ~~change~~ layer of `<>|..` selected frame(s) `v0.6?`

## scene settings

* scene dimensions `px`(width, height) `v0.1.0`
* scene background color `N` `v0.3.x`
* frame rate `N` `v0.1.x`
* default hold `N` `v0.2.x`

## fundamental UI
Some UI with deep implementation, but which will change depending on the device.

### timeline/layers

* select frames `<>` `v0.3.x`, ~~`..`~~ `v0.5?`
* ~~select layer~~ `v0.6?`

### help

* list keyboard shortcuts `v0.1.x`
* list touch gestures `v0.1.x`

### localization

* choose language `v0.6?`

### configuration

* onion skin distance `v0.3.x`
* onion skin colors `v0.3.x`
* ~~rebind keys / gestures~~ `v0.7?`

### context menu
Especially subject to change.

* show/hide `v0.1.x`
* expand section `v0.1.x`
* nested section `v0.3.x`

## questions

Should a *touchpad* be distinct from a *touchscreen*?
: **Yes**, since it's not feasible to coordinate the location of an initial touch without a display under the touch. Thus, touching and dragging must have different meanings between *touchpad* and *touchscreen*. **BUT**, a *touchpad* is capable of sending multiple touches and gestures.

Should touch contact area connote pressure?
: **Maybe** `v0.4?` -- try it out. See [`Touch.radius*` and `Touch.force`](https://developer.mozilla.org/en-US/docs/Web/API/Touch).
