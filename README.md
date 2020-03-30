# pencil test

A traditional animation tool in the browser

## features

- render to GIF
- onion skin
- save and load films

## usage

Draw in the white box.

Spacebar to play.

Right-click for options.

## caveats

Films are saved to Local Storage, so they will disappear if you clear your
browser's cache (or are in incognito/private browsing).

The "undo" option simply removes the last stroke on a drawing. It cannot be
recovered, except to load a saved film.

This version has only been tested in Google Chrome (Linux, Mac, Android).

## development

To get set up, do:

```
npm install -g grunt-cli
npm install
grunt watch
`
