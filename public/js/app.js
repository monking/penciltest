"use strict";
Object.assign(globalThis, {
    "LOCALES": {
        "en-US": {
            "subjectOf": [
                "TODO 2026-08-03 Migrate to a more standard locale format."
            ],
            "content": {
                "_plural": "s",
                "_singular": "",
                "audioOffset": "audio timing offset",
                "chooseSceneDelete": "choose a scene to %%delete%% from %%localStorage%%",
                "clickToChange": "click to change",
                "clickToRename": "click to rename",
                "current": "current",
                "currentFrameNumber": "current %%frameNumber%%",
                "currentFrameTime": "current frame's start time",
                "currentMode": "current %%frameNumber%%",
                "duration": "duration",
                "explainLargerTool": "Increase the width of the current tool",
                "explainSmallerTool": "Decrease the width of the current tool",
                "explainTool_eraser": "Switch between pencil and eraser",
                "explainTool_move": "Switch between the pencil and the move tool",
                "explainTool_pencil": "Switch between pencil and eraser",
                "exposureHoldTitle": "number of %%exposures%% this frame is holding for",
                "frameNumber": "frame number",
                "from a to b": "from %%a%% to %%b%%",
                "import": "import",
                "jsonFile": "JSON file",
                "localStorage": "local browser storage",
                "name": "name",
                "promptSetFramerate": "set the %%framerate%% of the scene",
                "scene": "scene",
                "sceneFrameCount": "total number of frames in this scene",
                "selectAllFrames": "%%\\uselect%% all the frames in this scene",
                "smoothing": "drawing smoothing factor",
                "statusFrameRate": "frame rate (FPS) and current frame's hold duration. %%\\uclickToChange%% FPS",
                "statusSceneName": "current scene name",
                "statusSceneNameTooltip": "%%statusSceneName%% (%%\\uclickToRename%%)",
                "statusSmoothingTooltip": "%%smoothing%% (%%\\uclickToChange%%)"
            }
        }
    }
});

"use strict";
;
class Locale {
    constructor(options = {}) {
        this.options = {
            ...Locale.defaultOptions,
            ...options
        };
    }
    // NOTE: Using '.substr(0, 1)' where a string output is a must, and `[0]` where `undefined` is OK.
    makeEngine(localeKey) {
        if (!(localeKey in LOCALES)) {
            throw new Error(`Missing locale '${localeKey}' in global LOCALES object.`);
        }
        this.dict = LOCALES[localeKey].content;
        if (typeof this.options.plural === 'function') {
            this.pluralOperation = this.options.plural;
        }
        else {
            this.pluralOperation = (message, engine) => Number(message) === 1 ? engine('_singular') : engine('_plural');
        }
        const engine = (key, innerDict = {}, recursionLimit = Locale.recursionLimit) => {
            if (!key) {
                return '';
            }
            const filters = [];
            // NOTE: Filters are run inside out.
            // e.g. "\\U\\p5" will first run the 'p' (plural) filter, then 'U' (uppercase) on the output of 'p'.
            while (key[0] === "\\") {
                const filterMatch = this.getFilter(key[1]);
                if (typeof filterMatch === 'function') {
                    key = key.substr(2);
                    filters.unshift(filterMatch);
                }
                else {
                    break;
                }
            }
            let message = key;
            if (key in innerDict) {
                message = innerDict[key];
            }
            else if (key in this.dict) {
                message = this.dict[key];
            }
            if (recursionLimit > 0) {
                message = message.replaceAll(this.options.subPattern, (match, key) => engine(key, innerDict, recursionLimit - 1));
            }
            if (filters.length > 0) {
                return filters.reduce((m, f) => f(m), message);
            }
            return message;
        };
        this.getFilter = (filterId) => {
            switch (filterId) {
                case 'u':
                    return (message) => message.substr(0, 1).toUpperCase() + message.substr(1);
                case 'U':
                    return (message) => message.toUpperCase();
                case 'l':
                    return (message) => message.substr(0, 1).toLowerCase() + message.substr(1);
                case 'L':
                    return (message) => message.toLowerCase();
                case 'p':
                    return (message) => this.pluralOperation(message, engine);
            }
            return null;
        };
        return engine;
    }
}
Locale.recursionLimit = 3;
Locale.defaultOptions = {
    subPattern: /%%([^%]{1,128})%%/g,
};
const thisLocale = new Locale();
const lc = thisLocale.makeEngine('en-US');

"use strict";
// globalThis.document.addEventListener 'DOMContentLoaded', -> # the SVG is not the correct size yet
globalThis.addEventListener('load', function () {
    const penciltest = new Penciltest({
        container: '#penciltest'
    });
    globalThis.p = penciltest;
    return globalThis.addEventListener('resize', () => penciltest.resize());
});
