# penciltest

A traditional animation tool in the browser.

- [demo](https://monking.github.io/penciltest/)

## features

- onion skin
- save and load scenes to [LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- render to GIF (using [GIFEncoder](https://github.com/antimatter15/jsgif))

## usage

Draw in the white box.

Spacebar to play.

For options:
- Right-click (pointer/mouse) or long-press (touchscreen)
- Click the gear icon in the bottom right.

## caveats

Scenes are saved to Local Storage, so they will disappear if you clear your
browser's cache (or are in incognito/private browsing).

The "undo" option simply removes the last stroke on a drawing. It cannot be
recovered, except to load a saved scene.

This version has only been tested in Google Chrome (Linux, Mac, Android -- way back in 2016).

## development

To get set up, do:

```
npm install -g grunt-cli
npm install
grunt watch
`
