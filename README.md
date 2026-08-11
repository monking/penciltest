# penciltest

A "traditional" animation tool in the browser. 
[Try it out](https://monking.github.io/penciltest/).


## usage

1. **Draw** in the box.
2. **Add frames** with the `I` key, or a 3-finger tap on the left or right.
3. `Space` key to **play/pause**.

For **options and tools**, use any of:
- Secondary (right) click anywhere
- long-press (touchscreen)
- Click/tap the gear ⚙️ icon in the bottom right.

For **help**, press the `?` key, or the clic/tap the question mark ❔ icon in the bottom right.


## features

- Onion skin
- Save and load scenes as JSON files, or to [`LocalStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- ~~Render to GIF~~ (using [GIFEncoder](https://github.com/antimatter15/jsgif))  *FIXME*


## caveats

- Scenes saved to `LocalStorage` will disappear if you clear your browser's cache
  (or are in incognito/private browsing).  
  **Export** to JSON files to be able to continue your work later.
- The **Undo** option is very limited in versions 0-0.3. It simply **removes the last stroke** on a drawing.  
  **Redo** can add it back (to whichever frame you're now on 🫤), but **Redo is cleared** upon resuming drawing.


## development

To get set up and build, run:
```sh
npm install
npm start
```

To get compiler feedback, run:
```sh
npm run debug
```
