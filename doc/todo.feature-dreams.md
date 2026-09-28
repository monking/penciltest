---
dateCreated: 2026-09-14
dateModified: 2026-09-14
uuid: 96a582fd-ddbd-4264-bfaf-3fc1f943372d
isPartOf: monking/penciltest
...
# feature dreams
Dreaming of features, fleshing them out, making them real.

[glossary (symbols and terms)](glossary.md "symbols and terms in penciltest documentation")

[issues]: https://github.com/monking/penciltest/issues "issues registered at GitHub"
[discussions]: https://github.com/monking/penciltest/discussions "discussions forum at GitHub"
[polls]: https://github.com/monking/penciltest/discussions/categories/polls "'polls' category of discussions at GitHub"
[ideas]: https://github.com/monking/penciltest/discussions/categories/ideas "'ideas' category of discussions at GitHub"

## priority
Pretty sure I'll do these. Once they're fleshed out, move them to `todo.txt`, or [issues][].

### metadata input

* `T` author
* `T` description
* [ ] … (what else?)
* `?` set default for new scenes

### feedback link(/form)
- `?` attach (packed) scene
  - `?` **strip metadata** (author info, names, descriptions)


## dreaming
Thinking up how these will work, in clear enough detail to describe their
interaction with other features.  
When they're well defined, [seek feedback][ideas] and [priority][polls] in [discussions][].

[timeline UI]: #timeline-ui
[layers]: #layers
[transform]: #transform

### timeline UI

* show frames, holds
* navigate to a frame
* *select*
  * `<>` a range of frames  
    by dragging (from no selection `|` from outside current selection)
  * `..` any set of frames  
    by `^+m1|t1sL` beside existing selection (`Ctrl`+primary-click, or long-press)
* *shift* (move frame in timeline) a selected `<>` range of frames by dragging

### layers
`v0.6?`

Integrates closely with: [timeline UI][]

* `?` fade inactive layers
* `?` hide a layer
  - omit hidden layers from *onion skin*
  - `?` omit hidden layers from *render* `|` **included in *render* by default**
* `?` set layer as *guide* (or *note*?)
  - omit *guide* layers from *render* and *onion skin*

### transform
selection, object

* translate `px`(x,y) 
  * [x] implemented destructively on *selection*, *frames*, *scene*, since `v0.2.x`
* scale `N`(x,y)
* rotate `%`τ(z)

### select partial paths

Thru `v0.3.x`, whole paths may be selected.

Partial paths could be selected
* in a **rough way**, by selecting nodes within a *region*
* or in a **fine way**, by making new nodes where *region* intersects paths.

selection *region*:
* rectangular `|` drawn inclusion (a.k.a. "lasso")
* add to a selection
* remove from a selection

### <span id="a5fc64ce-9755-4b37-8bd1-3f92944c529f">objects (re-usable)</span>
a.k.a. *symbols*, *elements*, *clips*, …

* convert selection to object
  * *origin* `px`(x,y) defaults to center of contents
* make new empty object
  * *origin* defaults to *cursor*, if in *field*, or else center of *field*

* object library
* non-destructive object [transformations][transform]
* swap object
  * `?` **only selected (in current frame)** `|` all instances `|` all on frame `|` all on contiguous frames
* object metadata: `T` name
* object timeline
  * `N` instance start frame
  * `?` hold start frame

reference by unique name
* `?` **uuid** (render as "object `N`") `|` name (with suffix `N` as needed for unique-ness)
* *pack* as alpha counter (`a`, `b`, …`z`, `aa`, `ab`, …) with lookup in scene metadata

#### selecting objects

* select object *abstract* in library list `m1` `|` select object `m1` in *field*
* highlight frames (in [timeline UI][]) containing selected object

#### edit object

* initiate edit `m1x2|m2` on object, in field or *library*
  * `m1x2` on object in *field* to edit object in place
  * `m1x2` on object in *libary* to edit *detached*
* modal style emphasizing **not global timeline** (e.g. hatched overlay in background around *field*?)
* object *origin*
  * at center of *field* when editing *detached*
  * 

#### placing objects

* drag `m1d` from library onto *field*
* stamp `m1`: place object(s) while maintaining library selection
  * `?` spray `m1d` within field
    * `px` interval
    * `px` jitter
  * `?` random start frame
  * `?` hold start frame

#### tween

- `?` *tween* an object on one frame to its twin on a later frame.
  - `?` identify the *instance* to use as target (unnecessary if there' sonly one *instance* of the same object on the subsequent frame)
  - `?` set an interpolation *curve*, **default: linear**.
  - interpolate [transformations](#transform)

### void frames

Truly empty: exposures without any frames.  
v0.0.0--v0.3.x All frames are contiguous, and empty frames still exist.

* frames with explicit start exposure `N`
  * changing timing on frames before would update position of all frames after
* drawing on a void frame creates a new frame
  * **starting at current frame, with `N` scene frame hold duration**
    * cap hold if later frame (on same layer) would overlap
  * `?` fill void after new frame (extend hold; related: split frame)
  * `?` place frame start at beginning of void (hold until current exposure)
