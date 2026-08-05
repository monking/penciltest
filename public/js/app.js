"use strict";
Object.assign(globalThis, {
    "LOCALES": {
        "en-US": {
            "subjectOf": [
                "TODO 2026-08-03 Migrate to a more standard locale format."
            ],
            "content": {
                "clickToChange": "click to change",
                "clickToRename": "click to rename",
                "eraser": "eraser",
                "framerate": "framerate",
                "pan": "pan",
                "pencil": "pencil",
                "playing": "playing",
                "promptSetFramerate": "Set the %%framerate%% of the scene",
                "smoothing": "Drawing smoothing factor",
                "statusSceneName": "Current scene name",
                "statusSceneNameTooltip": "%%statusSceneName%% (%%clickToRename%%)",
                "statusSmoothingTooltip": "%%smoothing%% (%%clickToChange%%)",
                "untitled": "untitled",
                "working": "working"
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
    makeEngine(localeKey) {
        if (!(localeKey in LOCALES)) {
            throw new Error(`Missing locale '${localeKey}' in global LOCALES object.`);
        }
        this.dict = LOCALES[localeKey].content;
        const engine = (key, substitution, subDepth = 0) => {
            const dict = subDepth === 0 ? { ...this.dict, ...substitution } : substitution;
            const keyExists = key in dict;
            const message = keyExists ? dict[key] : key;
            if (substitution) {
                return message.replace(this.options.subPattern, (match, groups) => engine(groups.key, substitution ? dict : substitution, subDepth + 1));
            }
            if (keyExists || subDepth === 0) {
                return message;
            }
            return '(?)';
        };
        return engine;
    }
}
Locale.recursionLimit = 3;
Locale.defaultOptions = {
    subPattern: /%%(?<key>[^%]{1,128})%%/,
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
