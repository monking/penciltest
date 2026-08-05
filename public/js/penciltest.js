"use strict";
var Renderers;
(function (Renderers) {
    Renderers["CANVAS"] = "canvas";
    Renderers["SVG"] = "svg";
})(Renderers || (Renderers = {}));
;
var PenciltestModes;
(function (PenciltestModes) {
    PenciltestModes["DRAWING"] = "drawing";
    PenciltestModes["WORKING"] = "working";
    PenciltestModes["PLAYING"] = "playing";
})(PenciltestModes || (PenciltestModes = {}));
;
var PenciltestTools;
(function (PenciltestTools) {
    PenciltestTools["PENCIL"] = "pencil";
    PenciltestTools["ERASER"] = "eraser";
    PenciltestTools["PAN"] = "pan";
})(PenciltestTools || (PenciltestTools = {}));
;
;
;
;
;
;
;
;
;
;
;

"use strict";
class Utils {
    static clone(object) {
        return JSON.parse(JSON.stringify(object));
    }
    ;
    static toggleClass(element, className, presence = null) {
        let added = false;
        if (element.classList.contains(className)) {
            if (presence !== true) {
                element.classList.remove(className);
            }
        }
        else if (presence !== false) {
            element.classList.add(className);
            added = true;
        }
        return added;
    }
    ;
    static inherit(child, ...ancestors) {
        if (child == null) {
            child = {};
        }
        for (let ancestor of ancestors) {
            if (ancestor) {
                for (let key in ancestor) {
                    const value = ancestor[key];
                    if (typeof child[key] === 'undefined') {
                        child[key] = ancestor[key];
                    }
                }
            }
        }
        return child;
    }
    ;
    static log(...args) {
        // globalThis.location.hash = args[0].toString()
        console.log.apply(console, args);
    }
    ;
    static alert(...args) {
        globalThis.alert.apply(globalThis, args);
    }
    ;
    static confirm(message) {
        return new Promise((resolve, reject) => {
            resolve(globalThis.confirm(message));
        });
    }
    ;
    static async prompt(message, defaultValue = null, options = {}) {
        const { input: givenPromptInput, submitOnChange: shouldSubmitOnChange, inputAttrs, inputLabel, labelLogic, } = options;
        let property, value;
        const promptModal = document.createElement('div');
        Object.assign(promptModal.style, {
            position: 'absolute',
            top: '0px',
            left: '0px',
            bottom: '0px',
            right: '0px',
            backgroundColor: 'rgba(0,0,0,0.5)'
        });
        const promptForm = document.createElement('form');
        Object.assign(promptForm.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            padding: '1em',
            transform: 'translateX(-50%) translateY(-50%)',
            backgroundColor: 'lightgray'
        });
        promptForm.innerHTML = message;
        promptModal.appendChild(promptForm);
        const inputRow = document.createElement('div');
        const promptInput = (typeof givenPromptInput === 'string' || !givenPromptInput
            ? document.createElement('input')
            : givenPromptInput);
        if (typeof givenPromptInput === 'string') {
            promptInput.setAttribute('type', givenPromptInput);
        }
        if (inputAttrs) {
            for (let key in inputAttrs) {
                promptInput.setAttribute(key, inputAttrs[key]);
            }
        }
        if (!promptInput.hasAttribute('id')) {
            promptInput.setAttribute('id', 'promptInputLabel');
        }
        if (defaultValue !== null) {
            promptInput.value = defaultValue;
        }
        inputRow.appendChild(promptInput);
        if (inputLabel || labelLogic) {
            const labelElement = document.createElement('label');
            labelElement.setAttribute('for', promptInput.getAttribute('id'));
            if (labelLogic) {
                promptInput.addEventListener('input', (event) => {
                    labelElement.innerText = labelLogic(promptInput.value);
                });
                labelElement.innerText = labelLogic(defaultValue);
            }
            else if (inputLabel) {
                labelElement.innerText = inputLabel;
            }
            Object.assign(labelElement.style, {
                padding: '0.5em 1em',
                'vertical-align': 'top',
                'line-height': '1.6em'
            });
            inputRow.appendChild(labelElement);
        }
        promptForm.appendChild(inputRow);
        return new Promise((resolve, reject) => {
            const promptKeyListener = function (event) {
                const keysDescription = Utils.describeKeyCombo(event);
                if (keysDescription === 'Esc') {
                    cancelPrompt();
                }
                else if (keysDescription === 'Enter') {
                    submitPrompt();
                }
            };
            const closePromptModal = function () {
                promptModal.remove();
                document.removeEventListener('keydown', promptKeyListener);
            };
            const cancelPrompt = () => {
                closePromptModal();
                reject(Utils.promptCanceled);
            };
            const submitPrompt = () => {
                closePromptModal();
                resolve(promptInput.value);
            };
            document.addEventListener('keydown', promptKeyListener);
            const promptCancelButton = document.createElement('button');
            promptCancelButton.type = 'button';
            promptCancelButton.innerHTML = 'Cancel';
            promptCancelButton.addEventListener('click', function (event) {
                event.preventDefault();
                closePromptModal();
                reject(Utils.promptCanceled);
            });
            promptForm.appendChild(promptCancelButton);
            if (shouldSubmitOnChange) {
                promptInput.addEventListener('change', submitPrompt);
            }
            else {
                const promptAcceptButton = document.createElement('input');
                promptAcceptButton.type = 'submit';
                promptAcceptButton.value = 'Accept';
                promptForm.addEventListener('submit', function (event) {
                    event.preventDefault();
                    submitPrompt();
                });
                promptForm.appendChild(promptAcceptButton);
            }
            document.body.appendChild(promptModal);
            if (typeof options.onOpen === 'function') {
                options.onOpen();
            }
            else {
                promptInput.focus();
            }
        });
    }
    ;
    static promptSelect(message, choices, defaultValue, options = {}) {
        // TODO: update the application core to handle async prompts (e.g. selectSceneNames)
        const selectInput = document.createElement('select');
        choices.forEach((choice, index) => {
            const optionElement = document.createElement('option');
            optionElement.value = choice;
            optionElement.innerHTML = choice;
            if (choice === defaultValue) {
                optionElement.setAttribute('selected', 'true');
            }
            selectInput.appendChild(optionElement);
        });
        return Utils.prompt(message, null, { ...options, input: selectInput });
    }
    ;
    static async promptForFile(message, options = {}) {
        // FIXME include filePath in result
        const { accept, loadAs } = options;
        const fileInput = document.createElement('input');
        fileInput.setAttribute('type', 'file');
        if (accept) {
            fileInput.setAttribute('accept', accept);
        }
        const filePath = await Utils.prompt(message, null, {
            onOpen: () => fileInput.click(),
            ...options,
            input: fileInput
        });
        if (filePath) {
            const files = Array.from(fileInput.files);
            if (loadAs === 'text') {
                return await Promise.all(files.map((file) => new Promise((resolve, reject) => {
                    const fileReader = new FileReader();
                    fileReader.addEventListener('load', (event) => resolve(event.target.result));
                    fileReader.addEventListener('error', (event) => reject(event));
                    fileReader.readAsText(file);
                })));
            }
            else if (loadAs === 'uri') {
                return files.map((file) => URL.createObjectURL(file));
            }
            else {
                return files;
            }
        }
        ;
    }
    ;
    static getKeyCodeName(keyCode, shiftKey = false, key = '') {
        let keyCodeName;
        if (shiftKey && Utils.shiftKeyCodeNames.hasOwnProperty(keyCode)) {
            keyCodeName = Utils.shiftKeyCodeNames[keyCode];
        }
        else if (Utils.keyCodeNames.hasOwnProperty(keyCode)) {
            keyCodeName = Utils.keyCodeNames[keyCode];
        }
        else {
            keyCodeName = `${key || String.fromCharCode(keyCode)}`;
        }
        return keyCodeName;
    }
    ;
    static describeKeyCombo(event) {
        const keyName = Utils.getKeyCodeName(event.keyCode, event.shiftKey);
        const combo = [];
        if (event.metaKey) {
            combo.push('Super');
        }
        if (event.ctrlKey) {
            combo.push('Ctrl');
        }
        if (event.altKey) {
            combo.push('Alt');
        }
        if (event.shiftKey && !(keyName in this.shiftKeyNameCodes)) {
            combo.push('Shift');
        }
        if (!/^Ctrl|Alt|Shift$/.test(keyName)) {
            combo.push(keyName);
        }
        //console.info(`combo: ${combo.join('+')} (#${event.keyCode})`);
        return combo.join('+');
    }
    ;
    static averagePoints(points) {
        const sumPoints = { x: 0, y: 0 };
        for (let point of points) {
            sumPoints.x += point.x;
            sumPoints.y += point.y;
        }
        sumPoints.x /= points.length;
        sumPoints.y /= points.length;
        return sumPoints;
    }
    ;
    static touchPoint(event, touchLimit = 1, scope = "client") {
        const points = Array.from(event.touches)
            .slice(0, touchLimit)
            .map((touch) => {
            return {
                x: touch[`${scope}X`],
                y: touch[`${scope}Y`]
            };
        });
        if (touchLimit === 1) {
            return points[0];
        }
        else {
            return Utils.averagePoints(points);
        }
    }
    ;
    static eventPoint(event, scope = "client", touchLimit = 1) {
        if (event.type.substr(5) === 'touch') {
            return Utils.touchPoint(event);
        }
        return {
            x: event[`${scope}X`],
            y: event[`${scope}Y`]
        };
    }
    ;
    static scalePoint(point, factor) {
        return {
            x: point.x * factor,
            y: point.y * factor
        };
    }
    ;
    static unionBounds(points, bounds = {}) {
        if (points.length === 0) {
            return bounds;
        }
        points.forEach((point) => {
            if (!("x" in bounds)) {
                bounds.x = point.x;
                bounds.width = 0; // Ignoring if bounds had width without x.
            }
            else if (point.x < bounds.x) {
                bounds.x = point.x;
            }
            else if (point.x > bounds.x + bounds.width) {
                bounds.width = point.x - bounds.x;
            }
            else if ("width" in point && point.x + point.width > bounds.x + bounds.width) {
                bounds.width = point.x + point.width - bounds.x;
            }
            if (!("y" in bounds)) {
                bounds.y = point.y;
                bounds.height = 0; // Ignoring if bounds had height without y.
            }
            else if (point.y < bounds.y) {
                bounds.y = point.y;
            }
            else if (point.y > bounds.y + bounds.height) {
                bounds.height = point.y - bounds.y;
            }
            else if ("height" in point && point.y + point.height > bounds.y + bounds.height) {
                bounds.height = point.y + point.height - bounds.y;
            }
        });
        return bounds;
    }
    static boundsCenter(bounds) {
        const positionBounds = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            ...bounds
        };
        return {
            x: positionBounds.x + positionBounds.width / 2,
            y: positionBounds.y + positionBounds.height / 2
        };
    }
    static diffPoints(point1, point2) {
        return {
            x: point1.x - point2.x,
            y: point1.y - point2.y
        };
    }
    ;
    static negatePoint(point) {
        return {
            x: -point.x,
            y: -point.y
        };
    }
    ;
    static getDecimal(input, precision, toString = false, leftPad = 0) {
        const factor = Math.pow(10, precision);
        const value = Math.round(input * factor) / factor;
        if (toString) {
            const parts = String(value).split('.');
            if (precision > 0) {
                if (parts.length === 1) {
                    parts.push('0');
                }
                while (parts[1].length < precision) {
                    parts[1] += '0';
                }
            }
            while (parts[0].length < leftPad) {
                parts[0] = `0${parts[0]}`;
            }
            if (precision > 0) {
                return parts.join('.');
            }
            else {
                return parts[0];
            }
        }
        return value;
    }
    ;
    static getTimecode(milliseconds, precision = 2) {
        const factors = [1000, 60, 60];
        let remainderMs = milliseconds;
        let cumulativeFactor = 1;
        return factors
            .map((factor, index) => {
            cumulativeFactor *= factor;
            let segment = (remainderMs / cumulativeFactor);
            if (index < factors.length - 1) {
                segment %= factors[index + 1];
            }
            remainderMs -= segment * cumulativeFactor;
            return Utils.getDecimal(segment, index === 0 ? precision : 0, true, 2);
        })
            .reverse()
            .join(':');
    }
    ;
    static isMultiple(a, b, precision = 0.001) {
        let isALarger = a > b;
        let factor = isALarger ? a / b : b / a;
        let wholeFactor = Math.round(factor);
        let wholeDiff = Math.abs(factor - wholeFactor);
        return [wholeDiff < precision, wholeFactor, wholeDiff, isALarger];
    }
    static getRange(range, subject, cut = false) {
        if (typeof (range === null || range === void 0 ? void 0 : range.start) !== 'number' || typeof range.end !== 'number') {
            return [[], -1];
        }
        const low = Math.max(0, Math.min(range.start, range.end, subject.length - 1));
        const high = Math.min(Math.max(0, range.start, range.end), subject.length - 1);
        const frames = cut ? subject.splice(low, high - low + 1) : subject.slice(low, high + 1);
        return [frames, low];
    }
    static getIntersection(a, b) {
        return a.filter((A) => b.indexOf(A) !== -1);
    }
    static encodeBase64(input) {
        return btoa(input);
    }
    ;
    static decodeBase64(input) {
        return atob(input);
    }
    ;
    static downloadFromUrl(url, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        return link.click();
    }
    ;
}
Utils.promptCanceled = 'canceled';
Utils.keyCodeNames = {
    8: 'Backspace',
    9: 'Tab',
    13: 'Enter',
    16: 'Shift',
    17: 'Ctrl',
    18: 'Alt',
    27: 'Esc',
    32: 'Space',
    33: 'PgUp',
    34: 'PgDn',
    35: 'End',
    36: 'Home',
    37: 'Left',
    38: 'Up',
    39: 'Right',
    40: 'Down',
    46: 'Delete',
    91: 'Super',
    188: ',',
    190: '.',
    186: ';',
    187: '=',
    189: '-',
    191: '/',
    219: '[',
    221: ']',
    222: '\''
};
Utils.shiftKeyCodeNames = {
    49: '!',
    50: '@',
    51: '#',
    52: '$',
    53: '%',
    54: '^',
    55: '&',
    56: '*',
    57: '(',
    48: ')',
    187: '+',
    189: '_',
    191: '?'
};
Utils.shiftKeyNameCodes = {
    '!': 49,
    '@': 50,
    '#': 51,
    '$': 52,
    '%': 53,
    '^': 54,
    '&': 55,
    '*': 56,
    '(': 57,
    ')': 48,
    '+': 187,
    '_': 189,
    '?': 191
};
;

"use strict";
class PenciltestScene {
    constructor(sceneData) {
        const now = new Date();
        const nowString = now.toISOString();
        this.name = '';
        this.dateModified = nowString;
        this.dateCreated = nowString;
        this.uuid = '';
        this.instrument = {
            id: Penciltest.instrumentIdentifier,
            version: Penciltest.version
        };
        this.aspectRatio = '1:1';
        this.height = 1024;
        this.framerate = 24;
        this.frameHold = 2;
        this.background = 'gray';
        this.lineColor = 'black';
        this.lineWeight = 1;
        this.frames = [];
        this.current = new SceneState(sceneData.current || {});
        // Restrict assignment to existing keys in new scene.
        Object.keys(sceneData).forEach((key) => {
            if (key in this) {
                this[key] = sceneData[key];
            }
        });
        if (!this.frames || this.frames.length === 0) {
            this.newFrame();
        }
        if (!this.uuid) {
            if (typeof crypto !== 'undefined' && crypto !== null) {
                crypto.randomUUID();
            }
        }
    }
    getDimensions() {
        const aspectRatio = this.aspectRatio || '1:1';
        const ratioParts = aspectRatio.split(':').map(Number);
        const dimensions = {
            width: this.width,
            height: this.height,
            aspect: ratioParts[0] / ratioParts[1],
            aspectRatio
        };
        if (!dimensions.width && !dimensions.height) {
            throw new Error('Either width or height must be defined.');
        }
        else if (!dimensions.width) {
            dimensions.width = Math.ceil(dimensions.height * dimensions.aspect);
        }
        else {
            dimensions.height = Math.ceil(dimensions.height / dimensions.aspect);
        }
        Object.assign(this.current, dimensions);
        return dimensions;
    }
    updateState() {
        Object.assign(this.current, {
            frames: [],
            exposureCount: 0,
            singleFrameDuration: 1000 / this.framerate,
        });
        this.frames.forEach((frame, frameNumber) => {
            const hold = this.getFrameHold(frameNumber);
            const frameMeta = {
                id: frameNumber,
                exposure: this.current.exposureCount,
                duration: hold * this.current.singleFrameDuration,
                time: this.current.exposureCount * this.current.singleFrameDuration
            };
            this.current.frames.push(frameMeta);
            this.current.exposureCount += hold;
        });
        this.current.duration = this.current.exposureCount * this.current.singleFrameDuration;
        return this.current;
    }
    setModified(date = null) {
        if (date === null) {
            date = new Date();
        }
        this.dateModified = date.toISOString();
        return date;
    }
    getFrameHold(frameNumber = -1) {
        var _a;
        if (frameNumber === -1) {
            frameNumber = this.current.frameNumber;
        }
        return Math.max(1, ((_a = this.frames[frameNumber]) === null || _a === void 0 ? void 0 : _a.hold) || this.frameHold);
    }
    setFrameHold(frameHold = 1, frameNumber = -1) {
        if (frameNumber === -1) {
            frameNumber = this.current.frameNumber;
        }
        this.frames[frameNumber].hold = Math.max(1, frameHold);
    }
    setVolume(volume, relative = false) {
        var _a;
        if (typeof ((_a = this.audio) === null || _a === void 0 ? void 0 : _a.volume) !== 'number') {
            if (!this.audio) {
                this.audio = {};
            }
            this.audio.volume = 100;
        }
        const newVolume = relative ? volume + this.audio.volume : volume;
        this.audio.volume = Math.max(0, Math.min(100, newVolume));
    }
    async newFrame(insertAtIndex = null, count = 1, options = {}) {
        return new Promise((resolve, reject) => {
            const newFrames = [];
            for (let i = 0; i < count; i++) {
                const newFrame = {
                    hold: this.getFrameHold(),
                    strokes: [],
                    ...options
                };
                newFrames.push(newFrame);
            }
            if (insertAtIndex === null) {
                insertAtIndex = this.frames.length;
            }
            const insertSpliceParams = [insertAtIndex, 0];
            Array.prototype.splice.apply(this.frames, insertSpliceParams.concat(newFrames));
            this.updateState();
            resolve(newFrames);
        });
    }
}
PenciltestScene.defaultOptions = {
    frameHold: 2,
    framerate: 24,
    loop: false,
    lineColor: 'black',
    lineCorner: 'round',
    lineOpacity: 1,
    lineWeight: 1,
    aspectRatio: '1:1',
    height: 1024
};
PenciltestScene.defaultAudioOptions = {
    offset: 0,
    volume: 100,
};

"use strict";
;
const PenciltestVersionMungerV0_0_4 = {
    version: '0.0.4',
    migrate() {
        // change strokes from Raphael SVG format to simple arrays
        const filmNamePattern = /^film:/;
        return (() => {
            const result = [];
            for (let storageName in globalThis.localStorage) {
                if (filmNamePattern.test(storageName)) {
                    const film = JSON.parse(globalThis.localStorage.getItem(storageName));
                    if (!film || !film.frames || !film.frames.length) {
                        continue;
                    }
                    for (let frameIndex = 0; frameIndex < film.frames.length; frameIndex++) {
                        const frame = film.frames[frameIndex];
                        for (let strokeIndex = 0; strokeIndex < frame.strokes.length; strokeIndex++) {
                            const stroke = frame.strokes[strokeIndex];
                            for (let segmentIndex = 0; segmentIndex < stroke.length; segmentIndex++) {
                                const segment = stroke[segmentIndex];
                                if (typeof segment === 'string') {
                                    const newSegment = segment.replace(/[ML]/g, '').split(' ').map(Number);
                                    if (newSegment.length !== 2) {
                                        throw new Error(`bad stroke segment '${segment}': ${storageName}:f${frameIndex}:p${strokeIndex}:s${segmentIndex}`);
                                    }
                                    if (isNaN(newSegment[0]) || isNaN(newSegment[1])) {
                                        throw new Error(`NaN stroke segment '${segment}':  ${storageName}:f${frameIndex}:p${strokeIndex}:s${segmentIndex}`);
                                    }
                                    for (let i = 0, end = newSegment.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
                                        newSegment[i] = Number(newSegment[i]);
                                    }
                                    film.frames[frameIndex].strokes[strokeIndex][segmentIndex] = newSegment;
                                }
                            }
                        }
                    }
                    film.version = '0.0.4';
                    result.push(globalThis.localStorage.setItem(storageName, JSON.stringify(film)));
                }
                else {
                    result.push(undefined);
                }
            }
            return result;
        })();
    }
};
const PenciltestVersionMungerV0_0_5 = {
    version: '0.0.5',
    migrate() {
        // enable scaling, assuming 16:9, 720 width for undefined
        const filmNamePattern = /^film:/;
        return (() => {
            const result = [];
            for (let storageName in globalThis.localStorage) {
                if (filmNamePattern.test(storageName)) {
                    const film = JSON.parse(globalThis.localStorage.getItem(storageName));
                    if (!film || !film.frames || !film.frames.length) {
                        continue;
                    }
                    if (film.aspect == null) {
                        film.aspect = '16:9';
                    }
                    if (film.width == null) {
                        film.width = 720;
                    }
                    film.version = '0.0.5';
                    result.push(globalThis.localStorage.setItem(storageName, JSON.stringify(film)));
                }
                else {
                    result.push(undefined);
                }
            }
            return result;
        })();
    }
};
const PenciltestVersionMungerV0_3_0 = {
    version: '0.3.0',
    migrate() {
        var _a, _b, _c;
        const scene = (this === null || this === void 0 ? void 0 : this.scene);
        // BEGIN: `aspect` is a number, and `aspectRatio` is a string.
        if (typeof (scene === null || scene === void 0 ? void 0 : scene.aspect) === 'string' && typeof (scene === null || scene === void 0 ? void 0 : scene.aspectRatio) !== 'string') {
            scene.aspectRatio = scene.aspect;
            delete scene.aspect;
        }
        // BEGIN: `stroke` has other properties, so points moved to `.path[]`.
        if (Array.isArray(scene === null || scene === void 0 ? void 0 : scene.frames)) {
            scene === null || scene === void 0 ? void 0 : scene.frames.forEach((frame) => {
                if (Array.isArray(frame.strokes)) {
                    frame.strokes = frame.strokes.map((stroke) => {
                        if (Array.isArray(stroke)) {
                            return { path: stroke.map((coords) => { return { x: coords[0], y: coords[1] }; }) };
                        }
                        return stroke; // 🤷
                    });
                }
            });
        }
        // BEGIN: All times recorded in milliseconds.
        if ((_a = scene === null || scene === void 0 ? void 0 : scene.audio) === null || _a === void 0 ? void 0 : _a.offset) {
            scene.audio.offset *= 1000;
        }
        if ((_b = scene === null || scene === void 0 ? void 0 : scene.current) === null || _b === void 0 ? void 0 : _b.duration) {
            scene.current.duration *= 1000;
        }
        if ((_c = scene === null || scene === void 0 ? void 0 : scene.current) === null || _c === void 0 ? void 0 : _c.singleFrameDuration) {
            scene.current.singleFrameDuration *= 1000;
        }
    },
    packSeparators: {
        stroke: "|",
        point: ';',
        coord: ','
    },
    packScene(scene) {
        const packStroke = (stroke, scene) => {
            const packedStrokeObject = { ...stroke };
            delete packedStrokeObject.path;
            let packedStrokeString = stroke.path
                .map((point) => {
                return Utils.getDecimal(point.x, 2) + this.packSeparators.coord + Utils.getDecimal(point.y, 2);
            })
                .join(this.packSeparators.point);
            if (Object.keys(packedStrokeObject).length > 0) {
                packedStrokeString += JSON.stringify(packedStrokeObject);
            }
            return packedStrokeString;
        };
        const packFrame = (frame, scene) => {
            var _a;
            const packedFrame = {
                ...frame,
            };
            if (((_a = frame.strokes) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                packedFrame.packedStrokes = frame.strokes
                    .map((stroke) => packStroke(stroke, scene))
                    .join(this.packSeparators.stroke);
            }
            if (packedFrame.hold === scene.frameHold) {
                delete packedFrame.hold;
            }
            delete packedFrame.strokes;
            return packedFrame;
        };
        const packedScene = {
            ...scene,
            frames: scene.frames.map((frame) => packFrame(frame, scene))
        };
        return packedScene;
    },
    unpackScene(packedScene) {
        const unpackStroke = (packedStroke) => {
            const jsonIndex = packedStroke.indexOf('{');
            const stroke = {};
            if (jsonIndex !== -1) {
                try {
                    Object.assign(stroke, JSON.parse(packedStroke.slice(jsonIndex)));
                }
                catch (e) {
                    console.error(e);
                }
            }
            stroke.path = (jsonIndex > -1 ? packedStroke.substr(0, jsonIndex) : packedStroke)
                .split(this.packSeparators.point)
                .map((packedPoint) => {
                const coords = packedPoint.split(this.packSeparators.coord).map(Number);
                return { x: coords[0], y: coords[1] };
            });
            return stroke;
        };
        const unpackFrame = (frame, scene) => {
            var _a;
            if (!((_a = frame.packedStrokes) === null || _a === void 0 ? void 0 : _a.length)) {
                return frame;
            }
            const unpackedFrame = {
                hold: scene.frameHold,
                ...frame,
                strokes: frame.packedStrokes
                    .split(this.packSeparators.stroke)
                    .map((stroke) => unpackStroke(stroke))
            };
            delete unpackedFrame.packedStrokes;
            return unpackedFrame;
        };
        const scene = new PenciltestScene(packedScene);
        scene.frames = scene.frames.map((frame) => unpackFrame(frame, scene));
        return scene;
    }
};
// e.g.
//const PenciltestVersionMungerVNEXT = {
//  ...PenciltestVersionMungerVPREV,
//  migrate(this:Penciltest) {},
//  pack(scene:PenciltestScene) {},
//  unpack(scene:PenciltestScene) {}
//};
class PenciltestVersions {
    static compareVersions(va, vb) {
        const vaParts = va.split('.').map(Number);
        const vbParts = vb.split('.').map(Number);
        return vaParts.reduce((diff, vx, i) => {
            if (diff !== 0) {
                return diff;
            }
            if (vx === vbParts[i]) {
                return 0;
            }
            if (vx > vbParts[i]) {
                return 1;
            }
            if (vx < vbParts[i]) {
                return -1;
            }
        }, 0);
    }
    static async migrate(controller, fromVersion, toVersion) {
        let atVersion = fromVersion;
        const confirmMessage = `Migrate scene data from v${fromVersion} to v${toVersion}?`;
        if (await Utils.confirm(confirmMessage)) {
            try {
                const result = PenciltestVersions.mungers.reduce((acc, munger) => {
                    const fromVersionComparison = PenciltestVersions.compareVersions(fromVersion, munger.version);
                    const isUpgradeGreaterThanFromVersion = fromVersionComparison === -1;
                    if (!isUpgradeGreaterThanFromVersion || typeof munger.migrate !== 'function') {
                        return acc;
                    }
                    munger.migrate.apply(controller);
                    atVersion = munger.version;
                });
            }
            catch (error) {
                Utils.log(error);
                Utils.alert(`The conversion from ${fromVersion} to ${toVersion} failed. Your data is still compatible with ${atVersion}`);
            }
        }
        return atVersion;
    }
    /**
     * comparisonTrinary: 0 => EXACT match for version
     * comparisonTrinary: -1 => EXACT or latest OLDER version
     * comparisonTrinary: 1 => EXACT or earliest NEWER version
     */
    static getMunger(version, comparison = -1) {
        let munger;
        const step = comparison === -1 ? -1 : 1;
        const left = 0;
        const right = PenciltestVersions.mungers.length - 1;
        const start = step > 0 ? left : right;
        const end = step > 0 ? right : left;
        let i;
        for (i = start; end > start ? i <= end : i >= end; i += step) {
            const munger = PenciltestVersions.mungers[i];
            const mungerComparison = PenciltestVersions.compareVersions(version, munger.version);
            if (mungerComparison === 0 || mungerComparison === comparison) { // exact, or in comparison direction
                return munger;
            }
        }
    }
    static async packScene(scene) {
        return new Promise((resolve, reject) => {
            var _a, _b, _c;
            const munger = PenciltestVersions.getMunger(scene.instrument.version);
            if (typeof (munger === null || munger === void 0 ? void 0 : munger.packScene) === 'function') {
                try {
                    const packedScene = munger.packScene.apply(munger, [Utils.clone(scene)]);
                    if ((_a = packedScene.current) === null || _a === void 0 ? void 0 : _a.frames) {
                        delete packedScene.current.frames;
                    }
                    if ((_b = packedScene.current) === null || _b === void 0 ? void 0 : _b.singleFrameDuration) {
                        packedScene.current.singleFrameDuration = Utils.getDecimal(packedScene.current.singleFrameDuration, 3);
                    }
                    if ((_c = packedScene.current) === null || _c === void 0 ? void 0 : _c.duration) {
                        packedScene.current.duration = Utils.getDecimal(packedScene.current.duration, 3);
                    }
                    resolve(packedScene);
                    return;
                }
                catch (e) {
                    console.error(e);
                    reject(`Error packing scene: ${e.message}`);
                }
            }
            else {
                console.warn(`No packScene method found for scene version ${scene.instrument.version}.`);
            }
            resolve(scene);
        });
    }
    static async unpackScene(packedScene) {
        return new Promise((resolve, reject) => {
            const munger = PenciltestVersions.getMunger(packedScene.instrument.version);
            if (typeof (munger === null || munger === void 0 ? void 0 : munger.unpackScene) === 'function') {
                try {
                    resolve(munger.unpackScene.apply(munger, [packedScene]));
                    return;
                }
                catch (e) {
                    console.error(e);
                }
            }
            resolve(new PenciltestScene(packedScene));
        });
    }
}
PenciltestVersions.mungers = [
    PenciltestVersionMungerV0_0_4,
    PenciltestVersionMungerV0_0_5,
    // TODO rename 'film' localStorage namespace to 'scene'. Which version did that happen in?  2026-07-31 uuid:ee574c36-476a-4a59-86ca-7c9a203b52f8
    PenciltestVersionMungerV0_3_0,
];

"use strict";
class PenciltestUIComponent {
    static restore(options, components) {
        if (options.key && options.key in components) {
            const component = components[options.key];
            component.setContent(options);
            return component;
        }
        return new PenciltestUIComponent(options, components);
    }
    constructor(options, components = {}) {
        this.options = {
            tagName: 'div',
            ...options
        };
        this.components = components;
        this.children = [];
        this.el = {};
        //this.refreshHandlers = [];
        const element = this.setElement(document.createElement(this.options.tagName || 'div'));
        if (this.options.on) {
            for (let eventName in this.options.on) {
                this.getElement().addEventListener(eventName, this.options.on[eventName].bind(this.getElement()));
            }
        }
        if (this.options.children) {
            this.options.children.forEach((childConfig) => PenciltestUIComponent.restore({ ...childConfig, parent: this }, this.components));
        }
        this.setContent(this.options, true);
        this.attach();
        if (this.options.key) {
            this.key = this.options.key;
            this.components[this.options.key] = this;
        }
    }
    attach() {
        if (this.isAttached) {
            return true;
        }
        if (!this.parentElement && this.options.parentElement) {
            this.parentElement = this.options.parentElement;
        }
        if (this.parentElement) {
            this.parentElement.appendChild(this.getElement());
            this.isAttached = true;
        }
        else {
            if (!this.parent) {
                if (typeof this.options.parent === 'string') {
                    if (this.options.parent in this.components) {
                        this.parent = this.components[this.options.parent];
                    }
                }
                else if (this.options.parent) {
                    this.parent = this.options.parent;
                }
            }
            if (this.parent) {
                this.parent.attachChild(this);
                this.parentElement = this.parent.getElement();
                this.isAttached = true;
            }
        }
        return this.isAttached;
    }
    detach() {
        if (!this.isAttached) {
            return true;
        }
        if (this.parentElement) {
            this.parentElement.removeChild(this.getElement());
            this.isAttached = false;
        }
    }
    destroy() {
        this.detach();
        if (this.components && this.key in this.components) {
            delete this.components[this.key];
        }
    }
    setContent(inputConfig, force = false) {
        // Shallow clone to enable deleting members without affecting input object.
        const config = { ...inputConfig };
        let changed = false;
        // Content precedence is (exclusively): children, html, text
        if (this.children.length === 0) {
            if (config.html) {
                changed = config.html !== this.options.html;
                if (force || changed) {
                    this.getElement().innerHTML = this.options.html = config.html;
                }
            }
            else if (config.text) {
                changed = config.text !== this.options.text;
                if (force || changed) {
                    this.getElement().innerText = this.options.text = config.text;
                }
            }
        }
        else if (config.children) {
            config.children.forEach((childConfig) => {
                if (!childConfig.key) {
                    return;
                }
                const childComponent = PenciltestUIComponent.restore(childConfig, this.components);
                if (typeof childComponent.setContent !== 'function') {
                    return;
                }
                childComponent.setContent(childConfig);
            });
        }
        if (config.className) {
            const classChanged = config.className !== this.options.className;
            if (force || classChanged) {
                this.getElement().className = config.className;
            }
            changed = changed || classChanged;
        }
        if (config.style) {
            Object.assign(this.getElement().style, config.style);
        }
        if (config.attr) {
            for (let key in config.attr) {
                const attrChanged = config.attr[key] !== this.options.attr[key];
                if (force || attrChanged) {
                    this.getElement().setAttribute(key, config.attr[key]);
                }
                changed = changed || attrChanged;
            }
            if (this.options.attr) {
                // Assigning nested object separately.
                Object.assign(this.options.attr, config.attr);
                delete config.attr;
            }
        }
        Object.assign(this.options, config);
        return changed;
    }
    //refresh() {
    //  [this].concat(this.children)
    //    .forEach((component) => {
    //      component.refreshHandlers.forEach((r) => r());
    //    });
    //}
    attachChild(child) {
        this.getElement().appendChild(child.getElement());
        this.children.push(child);
    }
    getElement() { return this.el.container; }
    setElement(element) { return this.el.container = element; }
}

"use strict";
class BaseRenderer {
    getColorString(color) {
        if (Array.isArray(color)) {
            if (color.length > 3) {
                return `rgba(${color.join(',')})`;
            }
            else {
                return `rgb(${color.join(',')})`;
            }
        }
        else {
            return String(color);
        }
    }
    constructor(options) {
        this.options = {
            ...BaseRenderer.defaultOptions,
            ...options
        };
        if (typeof this.options.container === 'string') {
            this.container = document.querySelector(this.options.container);
        }
        else {
            this.container = this.options.container;
        }
        this.overrides = {};
        this.composeOptions();
        //this.resize(this.options.width, this.options.height);
    }
    resize(width, height) {
        this.width = width;
        this.height = height;
    }
    composeOptions(overrides = {}, persist = null) {
        const composedOptions = {
            ...this.options
        };
        if (persist === true) {
            Object.assign(this.overrides, overrides);
        }
        if (persist !== false) {
            Object.assign(composedOptions, this.overrides);
        }
        if (persist !== true) {
            Object.assign(composedOptions, overrides);
        }
        this.currentLineOptions = {
            lineColor: composedOptions.lineColor,
            lineWeight: composedOptions.lineWeight,
            lineCorner: composedOptions.lineCorner,
            lineOpacity: composedOptions.lineOpacity
        };
    }
    path(stroke) {
        // TODO apply stroke options
        stroke.path.forEach((segment, index) => {
            if (index === 0) {
                this.moveTo(segment.x, segment.y);
            }
            else {
                this.lineTo(segment.x, segment.y);
            }
        });
        return this.render();
    }
    moveTo(x, y) { }
    lineTo(x, y) { }
    rect(x, y, width, height, backgroundColor, strokeColor = '') { }
    render() { }
    clear() { }
    destroy() { }
}
BaseRenderer.defaultOptions = {
    container: 'body',
    lineColor: 'black',
    lineWeight: 1,
    lineOpacity: 1,
    lineCorner: 'round',
    width: 1920,
    height: 1080
};

"use strict";
class CanvasRenderer extends BaseRenderer {
    //container: HTMLElement;
    constructor(options) {
        super(options);
        this.field = document.createElement('canvas');
        this.context = this.field.getContext('2d', { alpha: false });
        this.resize(this.options.width, this.options.height);
        this.container.appendChild(this.field);
        this.applyStrokeStyle();
    }
    lineTo(x, y) {
        super.lineTo(x, y);
        return this.context.lineTo(x, y);
    }
    rect(x, y, width, height, backgroundColor, strokeColor = '') {
        super.rect(x, y, width, height, backgroundColor, strokeColor);
        this.context.beginPath();
        this.context.rect(x, y, width, height);
        if (backgroundColor) {
            this.context.fillStyle = backgroundColor;
            this.context.fill();
        }
        if (strokeColor) {
            this.context.strokeStyle = strokeColor;
            this.context.stroke();
        }
        return this.applyStrokeStyle();
    }
    applyStrokeStyle() {
        if (this.context) {
            this.context.fillStyle = null;
            this.context.lineWidth = this.currentLineOptions.lineWeight;
            this.context.lineJoin = this.currentLineOptions.lineCorner;
            this.context.strokeStyle = super.getColorString(this.currentLineOptions.lineColor);
        }
    }
    composeOptions(overrides = {}, persist = null) {
        super.composeOptions(overrides);
        this.applyStrokeStyle();
    }
    moveTo(x, y) {
        super.moveTo(x, y);
        this.context.moveTo(x, y);
        this.context.beginPath();
    }
    render() {
        super.render();
        if (this.context) {
            this.context.stroke();
        }
    }
    clear() {
        this.context.clearRect(0, 0, this.width, this.height);
        return super.clear();
    }
    destroy() {
        this.field.remove();
        return super.destroy();
    }
    resize(width, height) {
        this.field.setAttribute('width', String(width));
        this.field.setAttribute('height', String(height));
        return super.resize(width, height);
    }
}

"use strict";
class SVGRenderer extends BaseRenderer {
    //currentLineOptions: PenciltestLineOptions;
    constructor(options) {
        super(options);
        this.field = new Raphael(this.container);
    }
    lineTo(x, y) {
        super.lineTo(x, y);
        return this.drawingPath += `L${x} ${y}`;
    }
    moveTo(x, y) {
        super.moveTo(x, y);
        if (this.drawingPath == null) {
            this.drawingPath = '';
        }
        return this.drawingPath = `M${x} ${y}`;
    }
    render() {
        let path;
        if (this.drawingPath) {
            path = this.field.path(this.drawingPath);
            Object.assign(path.style, {
                stroke: this.getColorString(this.currentLineOptions.lineColor)
            });
        }
        return super.render();
    }
    clear() {
        this.field.clear();
        return super.clear();
    }
    destroy() {
        this.field.remove();
        return super.destroy();
    }
}

"use strict";
class PenciltestUI extends PenciltestUIComponent {
    // action and listener functions are called in controller scope
    constructor(controller, initOptions, components = {}) {
        const options = {
            className: 'penciltest-ui',
            ...initOptions,
        };
        super(options);
        this.components = components;
        this.controller = controller;
        this.menuOptions = [
            {
                _icons: [
                    'firstFrame',
                    'prevFrame',
                    'playPause',
                    'nextFrame',
                    'lastFrame',
                ],
                Edit: [
                    'panFrame',
                    'rescueFrame',
                    'undo',
                    'redo',
                    'moreHold',
                    'lessHold',
                    'copyFrames',
                    'cutFrames',
                    'pasteFrames',
                    'pasteStrokes',
                    'insertFrameAfter',
                    'insertFrameBefore',
                    'insertSeconds',
                    'clearFrame',
                    'dropFrames',
                ],
                Tools: [
                    'scrubAudio',
                    'hideCursor',
                    'onionSkin',
                    'smoothing',
                    'smoothFrame',
                    'smoothScene',
                ],
                Scene: [
                    {
                        'open': [
                            'loadScene',
                            'importScene',
                            'newScene',
                        ],
                        'save/delete': [
                            'renderGif',
                            'exportScene',
                            'saveScene',
                            'renameScene',
                            'deleteScene',
                        ],
                        'audio': [
                            'linkAudio',
                            'volume',
                            'offsetAudio',
                        ],
                    },
                    'loop',
                    'framerate',
                    'frameHold',
                    'background',
                    'lineColor',
                    'resizeScene',
                    'panScene',
                ],
                Settings: [
                    'renderer',
                    'toggleInterfaceHelp',
                    'reset',
                    'debug',
                ],
            },
        ];
        this.appActions = {
            showMenu: {
                label: "Show Menu",
                hotkey: ['Tab'],
                gesture: /4 still/,
                listener() {
                    this.ui.toggleMenu(this.ui.pointer || { x: 10, y: 10 });
                }
            },
            renderer: {
                label: "Set Renderer",
                async listener() {
                    let renderer;
                    const self = this;
                    const selectedRenderer = await Utils.promptSelect('Set renderer', [Renderers.CANVAS, Renderers.SVG], this.options.renderer);
                    self.setOptions({ renderer: selectedRenderer });
                },
                action() {
                    if (this.fieldElement) {
                        if (this.renderer != null) {
                            this.renderer.destroy();
                        }
                        const sceneDimensions = this.scene.getDimensions();
                        const rendererOptions = {
                            lineColor: this.scene.lineColor,
                            lineWeight: this.scene.lineWeight,
                            container: this.fieldElement,
                            width: this.forceDimensions ? this.forceDimensions.width : sceneDimensions.width,
                            height: this.forceDimensions ? this.forceDimensions.height : sceneDimensions.height
                        };
                        if (this.options.renderer === Renderers.SVG) {
                            this.renderer = new SVGRenderer(rendererOptions);
                        }
                        else {
                            this.renderer = new CanvasRenderer(rendererOptions);
                        }
                        return this.renderer;
                    }
                }
            },
            pageFlip: {
                label: "Page Flip",
                gesture: /2 (left|right) from .* (bottom|middle)/,
                triggerOnMove: true,
                listener() {
                    const frameOffset = this.scene.frames.length * this.ui.currentGesture.deltaNormalized.x * 2;
                    this.goToFrame(Math.floor(this.ui.currentGesture.startFrameNumber + frameOffset));
                }
            },
            playPause: {
                label: "Play/Pause",
                text: '\u25B6',
                hotkey: ['Space'],
                gesture: /2 still from center (bottom|middle)/,
                cancelComplementKeyEvent: true,
                listener() {
                    this.playback.direction = 1;
                    this.togglePlay();
                }
            },
            playReverse: {
                label: "Play in Reverse",
                hotkey: ['Shift+Space'],
                cancelComplementKeyEvent: true,
                listener() {
                    this.playback.direction = -1;
                    return this.togglePlay();
                }
            },
            nextFrame: {
                label: "Next Frame",
                text: '\u27A1',
                hotkey: ['Right', '.'],
                hotkeyModifiers: ['Shift'],
                gesture: /2 still from right bottom/,
                repeat: true,
                listener(event) {
                    const toFrame = this.scene.current.frameNumber + 1;
                    if (event === null || event === void 0 ? void 0 : event.shiftKey) {
                        this.ui.expandSelection(this.scene.current.frameNumber, toFrame);
                    }
                    this.goToFrame(toFrame);
                    this.stop();
                    this.scrubAudio();
                }
            },
            prevFrame: {
                label: "Previous Frame",
                text: '\u2B05',
                hotkey: ['Left', ','],
                hotkeyModifiers: ['Shift'],
                gesture: /2 still from left bottom/,
                repeat: true,
                listener(event) {
                    const toFrame = this.scene.current.frameNumber - 1;
                    if (event === null || event === void 0 ? void 0 : event.shiftKey) {
                        this.ui.expandSelection(this.scene.current.frameNumber, toFrame);
                    }
                    this.goToFrame(toFrame);
                    this.stop();
                    this.scrubAudio();
                }
            },
            firstFrame: {
                label: "First Frame",
                text: '\u23EE',
                hotkey: ['1', '0', 'Home', 'PgUp'],
                hotkeyModifiers: ['Shift'],
                gesture: /2 left from .* (bottom|middle)/,
                cancelComplementKeyEvent: true,
                listener(event) {
                    const toFrame = 0;
                    if (event === null || event === void 0 ? void 0 : event.shiftKey) {
                        this.ui.expandSelection(this.scene.current.frameNumber, toFrame);
                    }
                    this.goToFrame(0);
                    this.stop();
                }
            },
            lastFrame: {
                label: "Last Frame",
                text: '⏭️',
                hotkey: ['$', 'End', 'PgDn'],
                hotkeyModifiers: ['Shift'],
                gesture: /2 right from .* (bottom|middle)/,
                cancelComplementKeyEvent: true,
                listener(event) {
                    const toFrame = this.scene.frames.length - 1;
                    if (event === null || event === void 0 ? void 0 : event.shiftKey) {
                        this.ui.expandSelection(this.scene.current.frameNumber, toFrame);
                    }
                    this.goToFrame(toFrame);
                    this.stop();
                }
            },
            selectAllFrames: {
                label: "Select scene",
                title: "Select all the frames in this scene.",
                hotkey: ['Ctrl+A'],
                cancelComplementKeyEvent: true,
                listener(event) {
                    this.state.frameSelection = { start: 0, end: this.scene.frames.length - 1 };
                    this.ui.showFeedback({ text: `Selected all ${this.scene.frames.length} frames` });
                }
            },
            copyFrames: {
                label: "Copy Frames/Strokes",
                hotkey: ['C'],
                hotkeyModifiers: ['Control'],
                listener() {
                    const [copiedFrames] = this.copyFrames();
                    this.ui.showFeedback({ text: `Copied ${copiedFrames.length} frame${copiedFrames.length !== 1 ? 's' : ''}` });
                }
            },
            pasteFrames: {
                label: "Paste Frames",
                hotkey: ['V'],
                hotkeyModifiers: ['Control'],
                listener() {
                    this.pasteFrames();
                    this.ui.showFeedback({ text: `Pasted ${this.copyBuffer.length} frame${this.copyBuffer.length !== 1 ? 's' : ''}` });
                    this.scrubAudio();
                }
            },
            pasteStrokes: {
                label: "Paste Strokes",
                hotkey: ['Shift+V'],
                listener() {
                    this.pasteStrokes();
                    this.ui.showFeedback({ text: 'Pasted strokes' });
                }
            },
            insertFrameBefore: {
                label: "Insert Frame Before",
                hotkey: ['Shift+I'],
                gesture: /2 still from left top/,
                listener() {
                    const newIndex = this.scene.current.frameNumber;
                    this.scene.newFrame(newIndex);
                    this.goToFrame(newIndex);
                    this.ui.showFeedback({ text: 'Inserted frame before' });
                }
            },
            insertFrameAfter: {
                label: "Insert Frame After",
                hotkey: ['Shift+D', 'I'],
                gesture: /2 still from right top/,
                listener() {
                    const newIndex = this.scene.current.frameNumber + 1;
                    this.scene.newFrame(newIndex);
                    this.goToFrame(newIndex);
                    this.ui.showFeedback({ text: 'Inserted frame after' });
                }
            },
            insertSeconds: {
                label: "Insert Seconds",
                hotkey: ['Alt+Shift+I'],
                async listener() {
                    const newIndex = this.scene.current.frameNumber + 1;
                    let seconds;
                    try {
                        seconds = Number(await Utils.prompt('# of seconds to insert: ', 1));
                    }
                    catch (reason) {
                        if (reason !== Utils.promptCanceled) {
                            console.error(reason);
                        }
                        return;
                    }
                    const insertFrameCount = Math.floor(this.scene.framerate / (this.scene.getFrameHold() * seconds));
                    this.scene.newFrame(null, insertFrameCount);
                    this.goToFrame(newIndex);
                    this.ui.showFeedback({ text: `Inserted ${insertFrameCount} frames, beginnging at frame ${newIndex}` });
                }
            },
            undo: {
                label: "Undo",
                title: "Remove the last line drawn",
                hotkey: ['Z'],
                gesture: /3 still from left/,
                repeat: true,
                listener() {
                    this.undo();
                    this.ui.showFeedback({ text: `undo` });
                }
            },
            redo: {
                label: "Redo",
                title: "Put back a line removed by 'Undo'",
                hotkey: ['Shift+Z'],
                gesture: /3 still from right/,
                repeat: true,
                listener() {
                    this.redo();
                    this.ui.showFeedback({ text: `redo` });
                }
            },
            lineColor: {
                label: "Line Color",
                async listener() {
                    let lineColor;
                    try {
                        lineColor = await Utils.prompt('line color: ', this.scene.lineColor, { 'input': 'color' });
                    }
                    catch (reason) {
                        if (reason !== Utils.promptCanceled) {
                            console.error(reason);
                        }
                        return;
                    }
                    if (lineColor) {
                        this.setOptions({ lineColor: lineColor });
                    }
                },
                action() {
                    if (this.scene) {
                        this.scene.lineColor = this.options.lineColor;
                    }
                    if (this.renderer) {
                        this.renderer.options.lineColor = this.options.lineColor;
                        this.drawCurrentFrame();
                    }
                }
            },
            background: {
                label: "Background Color",
                async listener() {
                    let bg;
                    try {
                        bg = await Utils.prompt('background color: ', this.scene.background, { 'input': 'color' });
                    }
                    catch (reason) {
                        if (reason !== Utils.promptCanceled) {
                            console.error(reason);
                        }
                        return;
                    }
                    if (bg) {
                        this.setOptions({ background: bg });
                    }
                },
                action() {
                    if (this.scene) {
                        this.scene.background = this.options.background;
                    }
                    if (this.renderer) {
                        this.renderer.options.background = this.options.background;
                    }
                    this.drawCurrentFrame();
                }
            },
            framerate: {
                label: "Frame rate",
                async listener() {
                    const oldFrameRate = this.scene.framerate;
                    let newFramerate;
                    try {
                        newFramerate = Number(await Utils.prompt(`${lc('promptSetFramerate'), true}:<br><small>FPS, frames per second</small>`, this.scene.framerate));
                    }
                    catch (reason) {
                        if (reason !== Utils.promptCanceled) {
                            console.error(reason);
                        }
                        return;
                    }
                    if (newFramerate && newFramerate !== oldFrameRate) {
                        const newOptions = { framerate: newFramerate };
                        const [isMultiple, absFactor, factorError, newIsLarger] = Utils.isMultiple(newFramerate, oldFrameRate, 0.002);
                        const promptMessage = `Adjust all frame hold times?\nThe new frame rate is ${isMultiple ? 'exactly' : `approximately`} ${absFactor} times ${newIsLarger ? 'faster' : 'slower'} than before${isMultiple ? '' : ` (${Utils.getDecimal(factorError, 3)} off)`}.`;
                        const factor = newIsLarger ? absFactor : 1 / absFactor;
                        if (await Utils.confirm(promptMessage)) {
                            newOptions.frameHold = Math.round(this.options.frameHold * factor);
                            this.scene.frames.forEach((frame, frameNumber) => {
                                const oldHold = this.scene.getFrameHold(frameNumber);
                                frame.hold = Math.round(oldHold * factor);
                            });
                        }
                        this.setOptions(newOptions);
                        this.scene.updateState();
                        this.ui.updateStatusBar();
                    }
                },
                action() {
                    if (this.scene) {
                        this.scene.framerate = this.options.framerate;
                        this.scene.updateState();
                    }
                    if (this.scene) {
                        this.scene.current.singleFrameDuration = 1 / this.scene.framerate;
                    }
                }
            },
            frameHold: {
                label: "Default Frame Hold",
                async listener() {
                    let hold;
                    try {
                        hold = await Utils.prompt('default exposures per drawing: ', this.options.frameHold);
                    }
                    catch (reason) {
                        if (reason !== Utils.promptCanceled) {
                            console.error(reason);
                        }
                        return;
                    }
                    if (hold) {
                        const oldHold = this.options.frameHold;
                        this.setOptions({ frameHold: Number(hold) });
                        if (await Utils.confirm('Update hold for existing frames in proportion to new setting?')) {
                            const magnitudeDelta = this.options.frameHold / oldHold;
                            this.scene.frames.forEach((frame, frameNumber) => {
                                frame.hold = Math.round(this.scene.getFrameHold(frameNumber) * magnitudeDelta);
                            });
                            this.drawCurrentFrame();
                        }
                    }
                }
            },
            hideCursor: {
                label: "Hide Cursor",
                hotkey: ['H'],
                listener() { this.setOptions({ hideCursor: !this.options.hideCursor }); },
                action() { Utils.toggleClass(this.container, 'hide-cursor', this.options.hideCursor); },
            },
            onionSkin: {
                label: "Onion Skin",
                hotkey: ['F', 'O'],
                gesture: /2 down from center (bottom|middle)/,
                title: "show previous and next frames in red and blue",
                listener() {
                    this.setOptions({ onionSkin: !this.options.onionSkin });
                    this.ui.showFeedback({ text: `Onion skin: ${this.options.onionSkin ? 'ON' : 'OFF'}` });
                    this.resize(); // FIXME: should either not redraw, or redraw fine without this
                }
            },
            clearFrame: {
                label: "Clear Frame",
                hotkey: ['Backspace'],
                gesture: /3 down from center middle/,
                cancelComplementKeyEvent: true,
                listener() { this.clearStrokes(); }
            },
            dropFrames: {
                label: "Drop Frame",
                hotkey: ['Shift+X'],
                gesture: /4 down from center top/,
                cancelComplementKeyEvent: true,
                listener() {
                    const [frames, start] = this.dropFrames();
                    this.ui.showFeedback({ text: `Dropped ${frames.length} frame${frames.length !== 1 ? 's' : ''}` });
                }
            },
            cutFrames: {
                label: "Cut Frame",
                hotkey: ['X'],
                gesture: /3 down from center top/,
                cancelComplementKeyEvent: true,
                hotkeyModifiers: ['Control'],
                listener() {
                    const [frames] = this.cutFrames();
                    this.ui.showFeedback({ text: `Cut ${frames.length} frame${frames.length !== 1 ? 's' : ''}` });
                }
            },
            smoothing: {
                label: "Smoothing…",
                title: "How much your lines will be smoothed as you draw",
                hotkey: ['Shift+S'],
                async listener() {
                    const promptOptions = {
                        input: 'range',
                        inputAttrs: {
                            min: 0,
                            max: 3
                        },
                    };
                    let smoothing;
                    try {
                        smoothing = await Utils.prompt('Smoothing', this.options.smoothing, promptOptions);
                    }
                    catch (reason) {
                        if (reason !== Utils.promptCanceled) {
                            console.error(reason);
                        }
                        return;
                    }
                    if (typeof smoothing === 'number') {
                        this.setOptions({ smoothing });
                    }
                },
                action() {
                    this.state.smoothDrawInterval = Math.sqrt(this.options.smoothing);
                }
            },
            smoothFrame: {
                label: "Smooth Frame",
                title: "Redraws the current frame, using current smoothing settings",
                hotkey: ['Shift+M'],
                listener() { this.smoothFrame(this.scene.current.frameNumber); }
            },
            smoothScene: {
                label: "Smooth All Frames",
                title: "Redraw all frames in the scene with the current smoothing setting",
                hotkey: ['Alt+Shift+M'],
                async listener() {
                    const startMode = this.state.mode;
                    if (startMode === PenciltestModes.WORKING) {
                        console.log(`Penciltest is: ${startMode}`);
                        return;
                    }
                    let amount;
                    try {
                        amount = Number(await Utils.prompt('Smoothing all frames in this scene. By how much? 1-5', 2));
                    }
                    catch (ignore) {
                        return;
                    }
                    if (amount < 1) {
                        return;
                    }
                    return await this.smoothScene(amount);
                }
            },
            lessHold: {
                label: "Shorter Frame Hold",
                hotkey: ['Down', '-'],
                gesture: /2 still from left middle/,
                repeat: true,
                listener() {
                    this.setCurrentFrameHold(this.scene.getFrameHold() - 1);
                    this.scrubAudio(-1);
                }
            },
            moreHold: {
                label: "Longer Frame Hold",
                hotkey: ['Up', '+', '='],
                gesture: /2 still from right middle/,
                repeat: true,
                listener() {
                    this.setCurrentFrameHold((this.scene.getFrameHold() || 1) + 1);
                    this.scrubAudio(-1);
                }
            },
            debug: {
                label: "Toggle Debug",
                title: "Verbose logs for debugging",
                listener() { this.setOptions({ debug: !this.options.debug }); }
            },
            showStatus: {
                label: "Toggle Status",
                hotkey: ['Tab'],
                cancelComplementKeyEvent: true,
                title: "Show/hide the scene status bar",
                listener() { this.setOptions({ showStatus: !this.options.showStatus }); },
                action() {
                    Utils.toggleClass(this.ui.components.statusBar.getElement(), 'hidden', !this.options.showStatus);
                    this.resize();
                },
            },
            loop: {
                label: "Loop",
                hotkey: ['L'],
                gesture: /2 up from center (bottom|middle)/,
                listener() {
                    this.setOptions({ loop: !this.options.loop });
                    this.ui.showFeedback({ text: `Loop: ${this.options.loop ? 'ON' : 'OFF'}` });
                }
            },
            scrubAudio: {
                label: "Scrub audio",
                hotkey: ['A'],
                title: "Play audio at the current frame when changing frames, other than regular playback.",
                listener() {
                    this.setOptions({ scrubAudio: !this.options.scrubAudio });
                    this.ui.showFeedback({ text: `Scrub audio: ${this.options.scrubAudio ? 'ON' : 'OFF'}` });
                }
            },
            muteAudio: {
                label: "Toggle Mute",
                hotkey: ['M'],
                listener() {
                    this.setPlayback({ muteAudio: !this.playback.muteAudio });
                    this.ui.showFeedback({ text: `Mute: ${this.playback.muteAudio ? 'ON' : 'OFF'}` });
                },
                action() {
                    this.ui.handleAppReaction('volume');
                }
            },
            splitFrame: {
                label: "Split frame",
                hotkey: ['B'],
                title: "Split the current frame into two.",
                async listener() {
                    const startingFrameHold = this.scene.getFrameHold();
                    if (startingFrameHold < 2) {
                        this.ui.showFeedback({ text: 'Frame must be held for 2 or more exposures to split' });
                        return;
                    }
                    let splitOffset = Math.floor(startingFrameHold / 2);
                    if (startingFrameHold > 2) {
                        const promptOptions = {
                            input: 'range',
                            inputAttrs: {
                                min: 1,
                                max: startingFrameHold - 1
                            },
                            'labelLogic': (offset) => offset
                        };
                        try {
                            splitOffset = Number(await Utils.prompt(`Split the frame in twain<br><small>out of ${startingFrameHold} exposures, where to split?</small>`, splitOffset, promptOptions));
                        }
                        catch (reason) {
                            if (reason !== Utils.promptCanceled) {
                                console.error(reason);
                                return;
                            }
                        }
                    }
                    if (splitOffset) {
                        this.splitFrame(this.scene.current.frameNumber, splitOffset);
                        this.ui.triggerAppAction('nextFrame');
                    }
                }
            },
            saveScene: {
                label: "Save to browser",
                hotkey: ['S'],
                gesture: /3 still from center (bottom|middle)/,
                async listener() {
                    try {
                        this.scene.setModified();
                        if (!this.scene.name) {
                            await this.ui.triggerAppAction('renameScene');
                        }
                        await this.saveScene();
                        this.ui.showFeedback({ text: `Saved scene '${this.scene.name}' to browser local storage` });
                    }
                    catch (e) {
                        console.error(e);
                        this.ui.showFeedback({ text: `Unable to save scene: ${e.message}` });
                    }
                }
            },
            renameScene: {
                label: "Rename Scene",
                async listener() {
                    let newName;
                    try {
                        newName = await Utils.prompt("Scene name:", this.scene.name);
                    }
                    catch (reason) {
                        if (reason !== Utils.promptCanceled) {
                            console.error(reason);
                        }
                        return;
                    }
                    if (newName) {
                        this.scene.name = newName;
                        this.ui.updateStatusBar();
                    }
                }
            },
            loadScene: {
                label: "Load from browser",
                hotkey: ['Shift+O'],
                gesture: /3 up from center (bottom|middle)/,
                async listener() {
                    const sceneName = await this.ui.selectSceneName('Choose a scene to load');
                    if (sceneName) {
                        try {
                            if (await this.loadScene(sceneName)) {
                                this.ui.showFeedback({ text: `Loaded scene: ${this.scene.name}` });
                            }
                        }
                        catch (reason) {
                            if (reason !== Utils.promptCanceled) {
                                console.error(reason);
                            }
                            return;
                        }
                    }
                }
            },
            newScene: {
                label: "New scene",
                hotkey: ['Alt+N'],
                listener() {
                    if (this.hasUnsavedChanges
                        || Utils.confirm("Make a new scene? Unsaved changes will be lost.")) {
                        this.newScene();
                    }
                }
            },
            renderGif: {
                label: "Render GIF",
                hotkey: ['Shift+G'],
                async listener() {
                    const exporter = new PenciltestRenderExporter(this);
                    const gifURL = await exporter.renderGif();
                    console.log({ gifURL });
                    const gifInstructions = PenciltestUIComponent.restore({
                        key: 'gifInstructions',
                        html: "Click/touch image to download.<br>Click/touch outside GIF to close.",
                        style: {
                            position: 'relative',
                            color: 'white',
                            textAlign: 'center',
                            backgroundColor: 'rgba(0,0,0,0.5)'
                        }
                    }, this.ui.components);
                    const gifImage = PenciltestUIComponent.restore({
                        key: 'gifImage',
                        attr: {
                            src: gifURL
                        },
                        style: {
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translateX(-50%) translateY(-50%)',
                            maxWidth: '80%',
                            maxHeight: '80%'
                        }
                    }, this.ui.components);
                    const gifLink = PenciltestUIComponent.restore({
                        key: 'gifLink',
                        attr: {
                            href: gifURL,
                            download: `${this.scene.name || 'untitled'}.penciltest.gif`,
                        },
                        children: [
                            gifImage
                        ]
                    }, this.ui.components);
                    const gifContainer = PenciltestUIComponent.restore({
                        key: 'gifContainer',
                        attr: {
                            id: 'rendered_gif'
                        },
                        parent: this.ui,
                        children: [
                            gifInstructions,
                            gifLink
                        ],
                        style: {
                            position: 'absolute',
                            top: '0px',
                            left: '0px',
                            bottom: '0px',
                            right: '0px',
                            backgroundColor: 'rgba(0,0,0,0.5)'
                        }
                    }, this.ui.components);
                    const gifCloseHandler = function (event) {
                        if ((event.target !== gifImage.getElement()) || (event.type === 'keydown' && (event.key === 'escape'))) {
                            gifContainer.getElement().removeEventListener('click', gifCloseHandler);
                            gifContainer.getElement().removeEventListener('touchend', gifCloseHandler);
                            globalThis.document.body.removeEventListener('keydown', gifCloseHandler);
                            return gifContainer.getElement().remove();
                        }
                    };
                    gifContainer.getElement().addEventListener('click', gifCloseHandler);
                    gifContainer.getElement().addEventListener('touchend', gifCloseHandler);
                    globalThis.document.body.addEventListener('keydown', gifCloseHandler);
                }
            },
            resizeScene: {
                label: "Resize Canvas",
                title: "Set the width and height of the canvas in this scene",
                hotkey: ['Alt+R'],
                async listener() {
                    const sceneDimensions = this.scene.getDimensions();
                    let dimensionsResponse;
                    try {
                        dimensionsResponse = await Utils.prompt('Scene height & aspect (W/H)', `${sceneDimensions.height} ${sceneDimensions.aspectRatio}`);
                    }
                    catch (reason) {
                        if (reason !== Utils.promptCanceled) {
                            console.error(reason);
                        }
                        return;
                    }
                    if (!dimensionsResponse) {
                        return;
                    }
                    const dimensions = dimensionsResponse.split(' ');
                    this.scene.height = Number(dimensions[0]);
                    this.scene.aspectRatio = dimensions[1];
                    this.resize();
                }
            },
            panFrame: {
                label: "Pan Frame",
                title: "Move the contents of the selected/current frame(s).",
                hotkey: ['P'],
                async listener() {
                    const offset = await this.ui.interactivePan();
                    this.ui.showFeedback({ text: `Panned this frame: ${Utils.getDecimal(offset.x, 0, true)}, ${Utils.getDecimal(offset.y, 0, true)}` });
                }
            },
            rescueFrame: {
                label: "Rescue Frames",
                title: "Move the contents of the selected frames to the center of the canvas. Useful after resizing or panning them out of view.",
                async listener() {
                    const [frames] = this.getSelectedFrames();
                    const selectionBounds = this.getFrameBounds(frames);
                    const fieldCenter = Utils.boundsCenter(this.scene.getDimensions());
                    const contentCenter = Utils.boundsCenter(selectionBounds);
                    const deltaPoint = Utils.diffPoints(fieldCenter, contentCenter);
                    this.pan(deltaPoint, frames);
                    this.drawCurrentFrame();
                }
            },
            panScene: {
                label: "Pan Scene",
                title: "Move the contents of all the frames in the scene. Useful after resizing.",
                hotkey: ['Shift+P'],
                async listener() {
                    const offset = await this.ui.interactivePan(this.scene.frames);
                    this.ui.showFeedback({ text: `Panned whole scene: ${Utils.getDecimal(offset.x, 0, true)}, ${Utils.getDecimal(offset.y, 0, true)}` });
                }
            },
            deleteScene: {
                label: "Delete Scene",
                hotkey: ['Alt+Backspace'],
                async listener() {
                    const sceneName = await this.ui.selectSceneName('Choose a scene to delete from local browser storage:');
                    if (typeof sceneName === 'string' && sceneName) {
                        if (await this.deleteScene(sceneName)) {
                            this.ui.showFeedback({ text: `Deleted scene: ${sceneName}` });
                        }
                    }
                }
            },
            exportScene: {
                label: "Export JSON file",
                hotkey: ['Ctrl+S', 'Alt+E'],
                cancelComplementKeyEvent: true,
                async listener() {
                    this.scene.setModified();
                    if (!this.scene.name) {
                        await this.ui.triggerAppAction('renameScene');
                    }
                    const packedScene = await PenciltestVersions.packScene(this.scene);
                    const blob = new Blob([JSON.stringify(packedScene, null, '  ')], { type: 'application/json' });
                    const url = globalThis.URL.createObjectURL(blob);
                    const fileName = (packedScene.name || 'untitled') + '.penciltest.json';
                    await Utils.downloadFromUrl(url, fileName);
                }
            },
            importScene: {
                label: "Import JSON file",
                hotkey: ['Ctrl+O'],
                cancelComplementKeyEvent: true,
                async listener() {
                    const promptMessage = 'Load a scene JSON file';
                    const promptOptions = {
                        accept: '.json,application/json',
                        loadAs: 'text',
                        submitOnChange: true
                    };
                    const [sceneJSON, filePath] = await Utils.promptForFile(promptMessage, promptOptions);
                    try {
                        await this.setScene(JSON.parse(sceneJSON), true);
                    }
                    catch (reason) {
                        if (reason !== Utils.promptCanceled) {
                            console.error(reason);
                        }
                    }
                }
            },
            linkAudio: {
                label: "Load Audio",
                hotkey: ['Shift+A'],
                async listener(event, notice = '') {
                    const promptMessage = `Audio file${notice ? ' (' + notice + ')' : ''}: `;
                    const promptOptions = {
                        accept: 'audio/*',
                        loadAs: 'uri',
                        submitOnChange: true
                    };
                    const [uri, filePath] = await Utils.promptForFile(promptMessage, promptOptions);
                    if (uri) {
                        this.loadAudio(uri, filePath);
                    }
                }
            },
            unloadAudio: {
                label: "Unload Audio",
                listener() { this.destroyAudio(); }
            },
            volume: {
                label: "Volume",
                hotkey: ['v', '9', '0'],
                async listener(event) {
                    const combo = Utils.describeKeyCombo(event);
                    const promptOptions = {
                        input: 'range',
                        inputAttrs: {
                            min: 0,
                            max: 100
                        }
                    };
                    try {
                        this.scene.audio.volume = Number(await Utils.prompt(`Audio volume`, promptOptions));
                    }
                    catch (reason) {
                        if (reason !== Utils.promptCanceled) {
                            console.error(reason);
                            return;
                        }
                    }
                },
                action() {
                    if (this.audioElement) {
                        this.audioElement.volume = this.playback.muteAudio ? 0 : this.scene.audio.volume / 100;
                    }
                }
            },
            volumeStep: {
                hotkey: ['9', '0'],
                async listener(event) {
                    const combo = Utils.describeKeyCombo(event);
                    let change = 0;
                    if (combo === '9') {
                        change -= 5;
                    }
                    else if (combo === '0') {
                        change += 5;
                    }
                    this.scene.setVolume(change, true);
                    this.ui.showFeedback({ text: `Volume: ${this.scene.audio.volume}%` });
                }
            },
            shiftAudioEarlier: {
                label: "Shift Audio Earlier",
                hotkey: ['['],
                title: "Decrease the offset of the audio playback",
                listener() {
                    if (!this.scene.audio) {
                        this.scene.audio = { offset: 0 };
                    }
                    this.scene.audio.offset--;
                    this.ui.updateStatusBar();
                    this.ui.showFeedback({ text: `Audio shift: ${this.scene.audio.offset} s` });
                }
            },
            shiftAudioLater: {
                label: "Shift Audio Later",
                title: "Increase the offset of the audio playback",
                hotkey: [']'],
                listener() {
                    var _a, _b;
                    if (!((_b = (_a = this.scene) === null || _a === void 0 ? void 0 : _a.audio) === null || _b === void 0 ? void 0 : _b.offset)) {
                        this.scene.audio = { offset: 0 };
                    }
                    this.scene.audio.offset++;
                    this.ui.updateStatusBar();
                    this.ui.showFeedback({ text: `Audio shift: ${this.scene.audio.offset} s` });
                }
            },
            toggleInterfaceHelp: {
                label: "Help",
                hotkey: ['?'],
                listener() { this.ui.toggleInterfaceHelp(); }
            },
            reset: {
                label: "Reset",
                title: "Reset the app's state and settings. Helpful if the app has stopped working.",
                async listener() {
                    if (await Utils.confirm(`Are you sure you want to reset? This is generally a last resort to work around bugs.`)) {
                        this.resetOptionsAndState();
                    }
                }
            },
            eraser: {
                label: "Eraser",
                hotkey: ['E'],
                listener() {
                    this.useTool(PenciltestTools.ERASER);
                }
            },
            hideMenu: {
                hotkey: ['Esc'],
                listener() {
                    this.ui.hideMenu();
                    this.ui.clearSelection();
                }
            },
        };
        this.defaultDragOptions = {
            startTarget: document.body,
            moveTarget: document.body,
            endTarget: document.body,
            coordinateScope: 'client',
            touchLimit: 5,
        };
        const startingComponents = [
            {
                key: 'toolbar',
                className: 'toolbar',
                parent: this
            },
            {
                key: 'statusBar',
                className: 'status',
                parent: 'toolbar'
            },
            {
                key: 'statusLeft',
                className: 'status-left',
                parent: 'statusBar'
            },
            {
                key: 'statusRight',
                className: 'status-right',
                parent: 'statusBar'
            },
            {
                key: 'appStatus',
                className: 'app-status',
                parent: 'statusLeft'
            },
            {
                key: 'sceneStatus',
                className: 'scene-status',
                parent: 'statusRight'
            },
            {
                key: 'toggleTool',
                tagName: 'button',
                className: 'toggle-tool',
                text: '\u1F589',
                parent: 'statusRight'
            },
            {
                key: 'toggleMenu',
                tagName: 'button',
                className: 'toggle-menu',
                parent: 'statusRight',
                text: '\u2699'
            },
            {
                key: 'toggleHelp',
                tagName: 'button',
                text: '🯄',
                className: 'toggle-help',
                parent: 'statusRight'
            },
            {
                key: 'contextMenu',
                tagName: 'ul',
                className: 'menu',
                parent: this
            },
            {
                key: 'help',
                tagName: 'div',
                className: 'help',
                parent: 'toolbar'
            }
        ];
        startingComponents.forEach((config) => {
            new PenciltestUIComponent(config, this.components);
        });
        this.menuWalker(this.menuOptions, this.components.contextMenu);
        this.addInputListeners();
        this.addMenuListeners();
        this.addKeyboardListeners();
        this.addOtherListeners();
    }
    async triggerAppAction(optionName, ...args) {
        var _a;
        if (typeof ((_a = this.appActions[optionName]) === null || _a === void 0 ? void 0 : _a.listener) === 'function') {
            await this.appActions[optionName].listener.apply(this.controller, args);
        }
        return await this.handleAppReaction(optionName);
    }
    async handleAppReaction(optionName, ...args) {
        var _a;
        if (typeof ((_a = this.appActions[optionName]) === null || _a === void 0 ? void 0 : _a.action) === 'function') {
            return await this.appActions[optionName].action.apply(this.controller, args);
        }
        return null;
    }
    menuWalker(level, parent) {
        for (let entry of level) {
            if (typeof entry === 'string') {
                const entryConfig = {
                    parent,
                    tagName: 'li',
                    key: entry,
                    attr: {
                        rel: entry
                    }
                };
                const { label, text, title } = {
                    ...this.appActions[entry]
                };
                if (title) {
                    entryConfig.attr.title = title;
                }
                if (text) {
                    entryConfig.text = text;
                }
                if (label) {
                    entryConfig.children = [{ key: `${entry}_label`, tagName: 'label', text: label }];
                }
                new PenciltestUIComponent(entryConfig, this.components);
            }
            else {
                for (let groupName in entry) {
                    const group = entry[groupName];
                    const groupHeadConfig = {
                        tagName: 'li',
                        key: `menuGroup_${groupName}`,
                        children: [],
                        parent,
                    };
                    if (groupName === '_icons') {
                        groupHeadConfig.className = 'icons';
                    }
                    else {
                        groupHeadConfig.className = 'group collapsed';
                        groupHeadConfig.children.push({ tagName: 'label', text: groupName });
                    }
                    const groupHeadComponent = new PenciltestUIComponent(groupHeadConfig, this.components);
                    const groupMenuConfig = {
                        key: `menuGroup_${groupName}_list`,
                        tagName: 'ul',
                        parent: groupHeadComponent
                    };
                    const groupMenuComponent = new PenciltestUIComponent(groupMenuConfig, this.components);
                    this.menuWalker(group, groupMenuComponent);
                }
            }
        }
    }
    addInputListeners() {
        this.previousEvent = null;
        this.pointer = { x: 0, y: 0 }; // FIXME Smoothing may make this origin evident.
        //const trackFromEvent = (pageCoords: any) => Object.assign(this.pointer, pageCoords); // DELME: unused @1785514531
        let fieldBounds;
        const updateFieldBounds = () => {
            fieldBounds = {
                x: 0,
                y: 0,
                width: this.controller.width,
                height: this.controller.height
            };
        };
        const fieldMouseDownListener = (event) => {
            this.previousEvent = event;
            if (this.controller.state.mode !== PenciltestModes.DRAWING) {
                return;
            }
            event.preventDefault();
            if ((event.type === 'touchstart') && (event.touches.length > 1)) {
                this.controller.cancelStroke();
                updateFieldBounds();
                if (!this.currentGesture) {
                    this.triggerAppAction('undo');
                }
                this.clearGesture();
                this.recordGesture(event, fieldBounds);
                this.currentGesture.startFrameNumber = this.controller.scene.current.frameNumber;
            }
            else {
                const mouseEvent = event;
                if (mouseEvent.button === 2) {
                    return true; // allow context menu
                }
                else {
                    this.hideMenu();
                }
                if (mouseEvent.button === 1) { // middle click
                    if (event.shiftKey) {
                        this.controller.useTool(PenciltestTools.ERASER);
                    }
                    else {
                        this.interactivePan([], event);
                    }
                    return;
                }
                const pagePoint = Utils.eventPoint(mouseEvent);
                this.controller.track(pagePoint.x - this.controller.fieldContainer.offsetLeft, pagePoint.y - this.controller.fieldContainer.offsetTop);
                document.body.addEventListener('mousemove', mouseMoveListener);
                document.body.addEventListener('touchmove', mouseMoveListener);
                document.body.addEventListener('mouseup', mouseUpListener);
                document.body.addEventListener('touchend', mouseUpListener);
            }
        };
        const mouseMoveListener = (event) => {
            // this.previousEvent = event
            event.preventDefault();
            if ((event.type === 'touchmove') && (event.touches.length > 2)) {
                this.recordGesture(event, fieldBounds);
                return this.progressGesture(this.describeGesture(fieldBounds));
            }
            else {
                const pagePoint = Utils.eventPoint(event, 'page');
                Object.assign(this.pointer, pagePoint);
                if (this.controller.state.mode === PenciltestModes.DRAWING) {
                    return this.controller.track(pagePoint.x - this.controller.fieldContainer.offsetLeft, pagePoint.y - this.controller.fieldContainer.offsetTop);
                }
            }
        };
        const mouseUpListener = (event) => {
            const mouseEvent = event;
            this.previousEvent = event;
            if ((event.type === 'mouseup') && ((mouseEvent).button === 2)) {
                return true; // allow context menu
            }
            else {
                if ((event.type === 'touchend') && this.currentGesture) {
                    this.doGesture(this.describeGesture(fieldBounds, 'final'));
                    this.clearGesture();
                }
                if (mouseEvent.button === 1) {
                    this.controller.usePreviousTool();
                }
                document.body.removeEventListener('mousemove', mouseMoveListener);
                document.body.removeEventListener('touchmove', mouseMoveListener);
                document.body.removeEventListener('mouseup', mouseUpListener);
                document.body.removeEventListener('touchend', mouseUpListener);
                return this.controller.lift();
            }
        };
        const toggleToolListener = (event) => {
            event.preventDefault();
            return this.triggerAppAction('eraser');
        };
        const contextMenuListener = (event) => {
            event.preventDefault();
            if (!this.previousEvent || !this.previousEvent.type.match(/^touch/)) {
                return this.toggleMenu(Utils.eventPoint(event));
            }
        };
        const globalMouseDownListener = (event) => {
            if (this.menuIsVisible && !this.components.contextMenu.getElement().contains(event.target)) {
                this.hideMenu();
            }
        };
        const statusClickListener = (event) => {
            const targetElement = event.target;
            if (typeof (targetElement === null || targetElement === void 0 ? void 0 : targetElement.hasAttribute) !== 'function' || !targetElement.hasAttribute('rel')) {
                return;
            }
            const statusRel = targetElement.getAttribute('rel');
            this.triggerAppAction(statusRel, event);
        };
        // # doesn't work; Chrome warns: 
        // # > [Intervention] Unable to preventDefault inside passive event listener
        // # > due to target being treated as passive. See
        // # > https://www.chromestatus.com/features/5093566007214080
        // preventPinchZoomHandler = (event) => (
        //   if event.cancelable && event.touches.length > 1
        //     console.log(
        //       "preventing pinch zoom, (%s, type: %s, cancelable: %s)",
        //       (event.target === globalThis ? 'window' : 'body'),
        //       event.type,
        //       event.cancelable
        //     )
        //     event.preventDefault()
        // )
        // globalThis.addEventListener 'touchstart', preventPinchZoomHandler, true
        // document.body.addEventListener 'touchstart', preventPinchZoomHandler, true
        // globalThis.addEventListener 'touchmove', preventPinchZoomHandler, true
        // document.body.addEventListener 'touchmove', preventPinchZoomHandler, true
        const helpListener = () => this.triggerAppAction('toggleInterfaceHelp');
        this.components.appStatus.getElement().addEventListener('click', statusClickListener);
        this.components.sceneStatus.getElement().addEventListener('click', statusClickListener);
        this.controller.fieldElement.addEventListener('mousedown', fieldMouseDownListener);
        this.controller.fieldElement.addEventListener('touchstart', fieldMouseDownListener);
        this.controller.fieldElement.addEventListener('contextmenu', contextMenuListener);
        this.controller.container.addEventListener('mousedown', globalMouseDownListener);
        this.controller.container.addEventListener('touchstart', globalMouseDownListener);
        this.components.toggleTool.getElement().addEventListener('click', toggleToolListener);
        this.components.toggleMenu.getElement().addEventListener('click', contextMenuListener);
        return this.components.toggleHelp.getElement().addEventListener('click', helpListener);
    }
    recordGesture(event, bounds) {
        if (!this.currentGesture) {
            this.currentGesture = {
                touches: event.targetTouches.length,
                origin: Utils.eventPoint(event, "client", 5)
            };
        }
        this.currentGesture.last = Utils.eventPoint(event, "client", 5);
        this.currentGesture.delta = Utils.diffPoints(this.currentGesture.last, this.currentGesture.origin);
        return this.currentGesture.deltaNormalized = {
            x: this.currentGesture.delta.x / bounds.width,
            y: this.currentGesture.delta.y / bounds.height
        };
    }
    clearGesture() {
        return this.currentGesture = null;
    }
    doGesture(gestureDescription) {
        for (let name in this.appActions) {
            const action = this.appActions[name];
            if (!action.triggerOnMove && action.gesture && action.gesture.test(gestureDescription)) {
                this.controller.options.debug && console.debug("action '%s' triggered by gesture '%s'", name, gestureDescription);
                this.triggerAppAction(name);
            }
        }
    }
    describePosition(coordinates, bounds) {
        const positionDescriptors = {
            '0.00': { x: 'left', y: 'top'
            },
            '0.33': { x: 'center', y: 'middle'
            },
            '0.67': { x: 'right', y: 'bottom'
            }
        };
        const positionRatio = {
            x: (coordinates.x - bounds.x) / bounds.width,
            y: (coordinates.y - bounds.y) / bounds.height
        };
        const positionDescription = { x: '', y: '' };
        for (let minRatio in positionDescriptors) {
            const descriptors = positionDescriptors[minRatio];
            if (positionRatio.x > Number(minRatio)) {
                positionDescription.x = descriptors.x;
            }
            if (positionRatio.y > Number(minRatio)) {
                positionDescription.y = descriptors.y;
            }
        }
        return positionDescription.x + ' ' + positionDescription.y;
    }
    describeMotion(startCoordinates, endCoordinates) {
        let description;
        const motionThreshold = 10;
        const delta = {
            x: endCoordinates.x - startCoordinates.x,
            y: endCoordinates.y - startCoordinates.y
        };
        const absX = Math.abs(delta.x);
        const absY = Math.abs(delta.y);
        if ((absX + absY) < motionThreshold) { // TODO: find hypotenuse
            description = 'still';
        }
        else if (absX > absY) {
            description = delta.x > 0 ? 'right' : 'left';
        }
        else {
            description = delta.y > 0 ? 'down' : 'up';
        }
        return description;
    }
    describeGesture(gestureBounds, extra = '') {
        let description = String(this.currentGesture.touches);
        description += ' ' + this.describeMotion(this.currentGesture.origin, this.currentGesture.last);
        description += ' from ' + this.describePosition(this.currentGesture.origin, gestureBounds);
        if (extra) {
            description += ` ${extra}`;
        }
        return description;
    }
    progressGesture(gestureDescription) {
        for (let name in this.appActions) {
            const action = this.appActions[name];
            if (action.triggerOnMove && action.gesture && action.gesture.test(gestureDescription)) {
                this.triggerAppAction(name);
                return;
            }
        }
    }
    async selectSceneName(message) {
        const sceneNames = this.controller.getSceneNames();
        if (sceneNames.length) {
            if (message == null) {
                message = 'Choose a scene';
            }
            const selectedSceneName = await Utils.promptSelect(message, sceneNames, this.controller.scene.name);
            if (selectedSceneName) {
                return selectedSceneName;
            }
            else {
                Utils.alert("No scene by that name.");
            }
        }
        else {
            Utils.alert("You don't have any saved scenes yet.");
        }
        return false;
    }
    updateMenuOption(optionElement) {
        const optionName = optionElement.getAttribute('rel');
        if (typeof this.controller.options[optionName] === 'boolean') {
            return Utils.toggleClass(optionElement, 'enabled', this.controller.options[optionName]);
        }
    }
    addMenuListeners() {
        const ui = this;
        this.menuItemElements = Array.from(this.components.contextMenu.getElement().querySelectorAll('li'));
        const menuOptionListener = function (event) {
            event.stopImmediatePropagation();
            if (this.classList.contains('group')) {
                Utils.toggleClass(this, 'collapsed');
                ui.menuItemElements.forEach((itemElement) => {
                    if (!itemElement.contains(this) && itemElement.classList.contains('group') && !itemElement.classList.contains('collapsed')) {
                        itemElement.classList.add('collapsed');
                    }
                });
            }
            else if (this.hasAttribute('rel')) {
                event.preventDefault();
                const optionName = this.getAttribute('rel');
                ui.triggerAppAction(optionName);
                return ui.hideMenu();
            }
        };
        this.menuItemElements.forEach((itemElement) => {
            itemElement.addEventListener('mouseup', menuOptionListener);
            // itemElement.addEventListener('touchend', menuOptionListener); // IIRC(2026-08-03), 'mouseup' also catches 'touchend', so this would cause it to fire twice.
            itemElement.addEventListener('contextmenu', menuOptionListener);
        });
    }
    addKeyboardListeners() {
        const self = this;
        this.keyBindings = {
            keydown: {},
            keyup: {}
        };
        for (let name in this.appActions) {
            const action = this.appActions[name];
            if (action.hotkey) {
                for (let hotkey of action.hotkey) {
                    if (action.repeat) {
                        this.keyBindings.keydown[hotkey] = name;
                        if (action.hotkeyModifiers) {
                            action.hotkeyModifiers.forEach((modifierKey) => {
                                this.keyBindings.keydown[`${modifierKey}+${hotkey}`] = name;
                            });
                        }
                        if (action.cancelComplementKeyEvent) {
                            this.keyBindings.keyup[hotkey] = null;
                        }
                    }
                    else {
                        this.keyBindings.keyup[hotkey] = name;
                        if (action.hotkeyModifiers) {
                            action.hotkeyModifiers.forEach((modifierKey) => {
                                this.keyBindings.keyup[`${modifierKey}+${hotkey}`] = name;
                            });
                        }
                        if (action.cancelComplementKeyEvent) {
                            this.keyBindings.keydown[hotkey] = null;
                        }
                    }
                }
            }
        }
        const keyboardListener = function (event) {
            const htmlTarget = event.target;
            if (htmlTarget.hasAttribute('contenteditable')) {
                if (event.key === 'Escape' || event.key === 'Enter') {
                    htmlTarget.blur();
                }
            }
            else if (!htmlTarget.matches('input')) {
                const combo = Utils.describeKeyCombo(event);
                const actionName = self.keyBindings[event.type][combo];
                if (actionName || (actionName === null)) {
                    event.preventDefault();
                    if (actionName) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        self.triggerAppAction(actionName, event);
                    }
                }
            }
        };
        // console.log "#{event.type}-#{combo} (#{event.keyCode})" if event.keyCode isnt 0
        document.body.addEventListener('keydown', (event) => keyboardListener(event));
        document.body.addEventListener('keyup', (event) => keyboardListener(event));
    }
    addOtherListeners() {
        this.controller.fieldContainer.addEventListener('wheel', (event) => {
            if (this.menuIsVisible) {
                return;
            }
            if (event.deltaY > 0) {
                return this.triggerAppAction('nextFrame');
            }
            else {
                return this.triggerAppAction('prevFrame');
            }
        });
        return globalThis.addEventListener('beforeunload', (event) => {
            this.controller.putStoredData('app', 'options', this.controller.options);
            this.controller.putStoredData('app', 'state', this.controller.state);
            if (this.controller.hasUnsavedChanges) {
                return event.returnValue = "You have unsaved changes. Ctrl+Alt+S to save.";
            }
        });
    }
    toggleInterfaceHelp() {
        const helpElement = this.components.help.getElement();
        const open = Utils.toggleClass(helpElement, 'active');
        helpElement.innerHTML = '';
        //for child in helpElement.children
        //  helpElement.removeChild(child)
        if (open) {
            const gesturesHeadingElement = document.createElement('h3');
            gesturesHeadingElement.innerText = 'Gestures:';
            const gesturesDocElement = document.createElement('dl');
            const keyboardHeadingElement = document.createElement('h3');
            keyboardHeadingElement.innerText = 'Keyboard Shortcuts:';
            const keyboardDocElement = document.createElement('dl');
            for (let name in this.appActions) {
                const action = this.appActions[name];
                if (action.hotkey) {
                    const keyboardActionTermElement = document.createElement('dt');
                    const keyboardActionDefElement = document.createElement('dd');
                    keyboardActionTermElement.innerText = action.label || name;
                    if (action.hotkey) {
                        keyboardActionDefElement.innerText = action.hotkey.join(' or ');
                    }
                    if (action.title) {
                        keyboardActionTermElement.innerHTML += `<small>${action.title}</small>`;
                    }
                    keyboardDocElement.appendChild(keyboardActionTermElement);
                    keyboardDocElement.appendChild(keyboardActionDefElement);
                }
                if (action.gesture) {
                    const gesturesActionTermElement = document.createElement('dt');
                    const gesturesActionDefElement = document.createElement('dd');
                    gesturesActionTermElement.innerText = action.label || name;
                    const gestureTerms = String(action.gesture).match(/([0-9]+)(.*)\/$/);
                    const fingerCount = Number(gestureTerms[1]);
                    const unicodeDotCounters = ['', '\u2024', '\u2025', '\u2056', '\u2058', '\u2059'];
                    gesturesActionDefElement.innerText = `${unicodeDotCounters[fingerCount]} ${gestureTerms[2]}`;
                    gesturesDocElement.appendChild(gesturesActionTermElement);
                    gesturesDocElement.appendChild(gesturesActionDefElement);
                }
            }
            helpElement.appendChild(gesturesHeadingElement);
            helpElement.appendChild(gesturesDocElement);
            helpElement.appendChild(keyboardHeadingElement);
            return helpElement.appendChild(keyboardDocElement);
        }
    }
    updateStatusBar() {
        var _a, _b, _c, _d, _e, _f;
        if (this.controller.options.showStatus) {
            debugger;
            const statusComponentDefinitions = [
                {
                    key: "statusVersion",
                    tagName: 'span',
                    text: `v${Penciltest.version}${((_a = this.controller.scene.instrument) === null || _a === void 0 ? void 0 : _a.version) && Penciltest.version !== this.controller.scene.instrument.version ? ` (@v${this.controller.scene.instrument.version})` : ''}`,
                    parent: 'appStatus'
                },
                {
                    key: "statusMode",
                    tagName: 'span',
                    attr: {
                        title: "Current mode."
                    },
                    text: this.controller.state.mode,
                    parent: 'appStatus'
                },
                {
                    key: "statusTool",
                    tagName: 'span',
                    attr: {
                        title: lc(this.controller.state.toolStack[0]),
                        className: `tool-icon-${this.controller.state.toolStack[0]}`,
                        text: lc(this.controller.state.toolStack[0])
                    },
                    text: this.controller.state.mode,
                    parent: 'appStatus'
                },
                {
                    key: "statusSmoothing",
                    tagName: 'span',
                    attr: {
                        title: lc('statusSmoothingTooltip')
                    },
                    text: String(this.controller.options.smoothing),
                    parent: 'appStatus'
                },
                {
                    key: "statusSceneName",
                    tagName: 'span',
                    attr: {
                        title: lc('statusSceneNameTooltip')
                    },
                    children: [
                        {
                            key: "statusSceneNameLabel",
                            tagName: 'label',
                            html: '<small>SCN: </small>',
                            attr: { 'for': 'statusSceneNameEditable' }
                        },
                        {
                            tagName: 'span',
                            key: "statusSceneNameEditable",
                            text: this.controller.scene.name || lc('untitled'),
                            attr: { 'contenteditable': 'true' }
                        },
                    ],
                    on: {
                        input: (e) => this.controller.scene.name = e.target.innerText,
                        change: (e) => this.updateStatusBar()
                    },
                    parent: 'appStatus'
                },
                {
                    key: "statusFrameRate",
                    tagName: 'span',
                    children: [
                        {
                            key: 'statusFramerateLabel',
                            tagName: 'small',
                            text: 'FPS:'
                        },
                        {
                            key: 'statusFramerate',
                            tagName: 'span',
                            text: `${((_b = this.controller.scene) === null || _b === void 0 ? void 0 : _b.framerate) || '…'}`
                        },
                        {
                            key: 'statusFrameHold',
                            tagName: 'span',
                            text: `/${this.controller.scene.getFrameHold()}`,
                            attr: {
                                title: 'Number of exposures this frame is holding for.'
                            }
                        }
                    ],
                    attr: {
                        title: "Frame rate (FPS) and current frame's hold duration. Click to change FPS.",
                    },
                    parent: 'sceneStatus'
                },
                {
                    key: "statusFrames",
                    tagName: 'span',
                    children: [
                        {
                            key: 'statusFramesLabel',
                            tagName: 'small',
                            text: 'frame:'
                        },
                        {
                            key: 'statusFrameNumber',
                            tagName: 'span',
                            text: String((((_c = this.controller.scene.current) === null || _c === void 0 ? void 0 : _c.frameNumber) || 0) + 1),
                            attr: {
                                title: 'Current frame number'
                            }
                        },
                        {
                            tagName: 'span',
                            text: `/${((_d = this.controller.scene.frames) === null || _d === void 0 ? void 0 : _d.length) || 1}`,
                            attr: {
                                title: 'Total number of frames'
                            }
                        }
                    ],
                    parent: 'sceneStatus'
                },
                {
                    key: "statusTime",
                    tagName: 'span',
                    children: [
                        {
                            key: 'statusTimeLabel',
                            tagName: 'small',
                            text: 'frame:'
                        },
                        {
                            key: 'statusCurrentTime',
                            tagName: 'span',
                            text: Utils.getTimecode(((_e = this.controller.scene.current.frames[this.controller.scene.current.frameNumber]) === null || _e === void 0 ? void 0 : _e.time) || 0, 3),
                            attr: {
                                title: "Current frame's start time"
                            }
                        },
                        {
                            key: 'statusTotalTime',
                            tagName: 'span',
                            text: '/' + Utils.getTimecode((this.controller.scene.current.frames.length > 0 ? this.controller.scene.current.frames[this.controller.scene.current.frames.length - 1].time : 0) + (this.controller.scene.current.singleFrameDuration || 0), 3),
                            attr: {
                                title: 'Total duration'
                            }
                        }
                    ],
                    parent: 'sceneStatus'
                },
                {
                    key: 'statusAudioOffset',
                    tagName: 'span',
                    parent: 'sceneStatus',
                    text: ((_f = this.controller.scene.audio) === null || _f === void 0 ? void 0 : _f.offset) ? `${this.controller.scene.audio.offset >= 0 ? '+' : ''}${this.controller.scene.audio.offset}` : '0'
                },
                {
                    key: 'toggleTool', // Already exists, just setting className
                    className: `toggle-tool tool-icon-${this.controller.state.toolStack[0]}`
                }
            ];
            statusComponentDefinitions.forEach((config) => {
                const component = PenciltestUIComponent.restore(config, this.components);
            });
        }
        // ELSE, hide status? @1785792939
    }
    showMenu(coords) {
        if (!this.menuIsVisible) {
            if (!coords) {
                coords = { x: 10, y: 10, ...this.pointer };
            }
            this.menuIsVisible = true;
            const menuElement = this.components.contextMenu.getElement();
            Utils.toggleClass(menuElement, 'active', true);
            const maxRight = this.components.contextMenu.getElement().offsetWidth;
            const maxBottom = 0;
            if (coords.x > (document.body.offsetWidth - maxRight - menuElement.offsetWidth)) {
                menuElement.style.right = `${maxRight}px`;
                menuElement.style.left = "auto";
            }
            else {
                menuElement.style.left = `${coords.x + 1}px`;
                menuElement.style.right = "auto";
            }
            if (coords.y > (document.body.offsetHeight - maxBottom - menuElement.offsetHeight)) {
                menuElement.style.top = "auto";
                menuElement.style.bottom = `${maxBottom}px`;
            }
            else {
                menuElement.style.top = `${coords.y}px`;
                menuElement.style.bottom = "auto";
            }
            this.menuItemElements.forEach((option) => {
                if (option.hasAttribute('rel')) {
                    this.updateMenuOption(option);
                }
            });
        }
    }
    hideMenu() {
        if (this.menuIsVisible) {
            this.menuIsVisible = false;
            return Utils.toggleClass(this.components.contextMenu.getElement(), 'active', false);
        }
    }
    toggleMenu(coords) {
        if (this.menuIsVisible) {
            return this.hideMenu();
        }
        else {
            return this.showMenu(coords);
        }
    }
    showFeedback(config, duration = 2000) {
        const feedbackComponent = PenciltestUIComponent.restore({
            ...config,
            style: { opacity: '1', ...config.style },
            attr: { ...config.attr, id: 'pt-feedback' },
            key: 'showFeedback',
            parent: this
        }, this.components);
        clearTimeout(this.feedbackTimeout);
        const hideFeedback = () => feedbackComponent.setContent({ style: { opacity: '0' } });
        return this.feedbackTimeout = setTimeout(hideFeedback, duration);
    }
    expandSelection(from = NaN, to = NaN) {
        if (isNaN(from)) {
            from = this.controller.scene.current.frameNumber;
        }
        if (isNaN(to)) {
            to = from;
        }
        from = Math.min(this.controller.scene.current.frames.length - 1, Math.max(0, from));
        to = Math.min(this.controller.scene.current.frames.length - 1, Math.max(0, to));
        if (!this.controller.state.frameSelection) {
            this.controller.state.frameSelection = { start: from };
        }
        this.controller.state.frameSelection.end = to;
        const selectionCount = Math.abs(this.controller.state.frameSelection.end - this.controller.state.frameSelection.start) + 1;
        this.showFeedback({ text: `Selecting ${selectionCount} frame${selectionCount !== 1 ? 's' : ''}` });
    }
    clearSelection() {
        if (this.controller.state.frameSelection) {
            delete this.controller.state.frameSelection;
            this.showFeedback({ text: `Cleared selection` });
        }
    }
    useTool(toolName, uiState = '') {
        this.controller.useTool(toolName);
    }
    handleDrag(options) {
        const { startTarget, moveTarget, endTarget, onstart, onmove, onend, alreadyStartedEvent, coordinateScope, touchLimit, } = {
            ...this.defaultDragOptions,
            ...options
        };
        let startPoint, endPoint;
        startPoint = endPoint = { x: 0, y: 0 };
        const dragStart = (event) => {
            //event.preventDefault();
            //event.stopImmediatePropagation();
            startPoint = Utils.eventPoint(event, coordinateScope, touchLimit);
            endPoint = startPoint;
            moveTarget.addEventListener('mousemove', dragMove);
            endTarget.addEventListener('mouseup', dragEnd);
            this.controller.container.classList.add('dragging');
            if (typeof onstart === 'function') {
                onstart.apply(this, [event]);
            }
        };
        const dragMove = (event) => {
            event.stopPropagation();
            const nowPoint = Utils.eventPoint(event, coordinateScope, touchLimit);
            if (typeof onmove === 'function') {
                const immediateDeltaPoint = Utils.diffPoints(nowPoint, endPoint);
                const totalDeltaPoint = Utils.diffPoints(endPoint, startPoint);
                onmove.apply(this, [event, immediateDeltaPoint, totalDeltaPoint]);
                endPoint = nowPoint;
            }
        };
        const dragEnd = (event) => {
            //event.preventDefault();
            event.stopImmediatePropagation();
            this.controller.container.classList.remove('dragging');
            endTarget.removeEventListener('mouseup', dragEnd);
            if (!alreadyStartedEvent) {
                startTarget.removeEventListener('mousedown', dragStart);
            }
            moveTarget.removeEventListener('mousemove', dragMove);
            const totalDeltaPoint = Utils.diffPoints(endPoint, startPoint);
            if (typeof onend === 'function') {
                onend.apply(this, [event, totalDeltaPoint]);
            }
        };
        if (alreadyStartedEvent) {
            dragStart(alreadyStartedEvent);
        }
        else {
            startTarget.addEventListener('mousedown', dragStart);
        }
    }
    async interactivePan(selection = [], alreadyStartedEvent = null) {
        return new Promise((resolve, reject) => {
            this.useTool(PenciltestTools.PAN);
            this.controller.resize();
            let frameScale = this.controller.width / this.controller.scene.getDimensions().width;
            if (selection.length === 0) {
                [selection] = this.controller.getSelectedFrames();
            }
            const previewSelection = Utils.getIntersection(this.controller.getVisibleFrames(), selection);
            if (previewSelection.length === 0) {
                previewSelection.push(selection[0]);
            }
            this.handleDrag({
                alreadyStartedEvent,
                coordinateScope: 'page',
                startTarget: this.controller.fieldElement,
                onstart: () => {
                    this.controller.setMode(PenciltestModes.WORKING);
                },
                onmove: (event, immediateDeltaPoint, totalDeltaPoint) => {
                    const scaledDelta = Utils.scalePoint(immediateDeltaPoint, 1 / frameScale);
                    this.controller.pan(scaledDelta, previewSelection);
                    this.controller.drawCurrentFrame();
                },
                onend: (event, totalDeltaPoint) => {
                    this.controller.setPreviousMode();
                    this.controller.usePreviousTool();
                    const scaledTotalDelta = Utils.scalePoint(totalDeltaPoint, 1 / frameScale);
                    if (previewSelection !== selection) {
                        this.controller.pan(Utils.negatePoint(scaledTotalDelta), previewSelection);
                        this.controller.pan(scaledTotalDelta, selection);
                    }
                    resolve(scaledTotalDelta);
                }
            });
        });
    }
}

"use strict";
/**
 * This class lets you encode animated GIF files
 * Base class :  http://www.java2s.com/Code/Java/2D-Graphics-GUI/AnimatedGifEncoder.htm
 * @author Kevin Weiner (original Java version - kweiner@fmsware.com)
 * @author Thibault Imbert (AS3 version - bytearray.org)
 * @author Kevin Kwok (JavaScript version - https://github.com/antimatter15/jsgif)
 * @version 0.1 AS3 implementation
 */
globalThis.GIFEncoder = function () {
    for (var i = 0, chr = {}; i < 256; i++)
        chr[i] = String.fromCharCode(i);
    function ByteArray() {
        this.bin = [];
    }
    ByteArray.prototype.getData = function () {
        for (var v = '', l = this.bin.length, i = 0; i < l; i++)
            v += chr[this.bin[i]];
        return v;
    };
    ByteArray.prototype.writeByte = function (val) {
        this.bin.push(val);
    };
    ByteArray.prototype.writeUTFBytes = function (string) {
        for (var l = string.length, i = 0; i < l; i++)
            this.writeByte(string.charCodeAt(i));
    };
    ByteArray.prototype.writeBytes = function (array, offset, length) {
        for (var l = length || array.length, i = offset || 0; i < l; i++)
            this.writeByte(array[i]);
    };
    var exports = {};
    var width; // image size
    var height;
    var transparent = null; // transparent color if given
    var transIndex; // transparent index in color table
    var repeat = -1; // no repeat
    var delay = 0; // frame delay (hundredths)
    var started = false; // ready to output frames
    var out;
    var image; // current frame
    var pixels; // BGR byte array from frame
    var indexedPixels; // converted frame indexed to palette
    var colorDepth; // number of bit planes
    var colorTab; // RGB palette
    var usedEntry = []; // active palette entries
    var palSize = 7; // color table size (bits-1)
    var dispose = -1; // disposal code (-1 = use default)
    var closeStream = false; // close stream when finished
    var firstFrame = true;
    var sizeSet = false; // if false, get size from first frame
    var sample = 10; // default sample interval for quantizer
    var comment = "Generated by jsgif (https://github.com/antimatter15/jsgif/)"; // default comment for generated gif
    /**
     * Sets the delay time between each frame, or changes it for subsequent frames
     * (applies to last frame added)
     * int delay time in milliseconds
     * @param ms
     */
    var setDelay = exports.setDelay = function setDelay(ms) {
        delay = Math.round(ms / 10);
    };
    /**
     * Sets the GIF frame disposal code for the last added frame and any
     *
     * subsequent frames. Default is 0 if no transparent color has been set,
     * otherwise 2.
     * @param code
     * int disposal code.
     */
    var setDispose = exports.setDispose = function setDispose(code) {
        if (code >= 0)
            dispose = code;
    };
    /**
     * Sets the number of times the set of GIF frames should be played. Default is
     * 1; 0 means play indefinitely. Must be invoked before the first image is
     * added.
     *
     * @param iter
     * int number of iterations.
     * @return
     */
    var setRepeat = exports.setRepeat = function setRepeat(iter) {
        if (iter >= 0)
            repeat = iter;
    };
    /**
     * Sets the transparent color for the last added frame and any subsequent
     * frames. Since all colors are subject to modification in the quantization
     * process, the color in the final palette for each frame closest to the given
     * color becomes the transparent color for that frame. May be set to null to
     * indicate no transparent color.
     * @param
     * Color to be treated as transparent on display.
     */
    var setTransparent = exports.setTransparent = function setTransparent(c) {
        transparent = c;
    };
    /**
     * Sets the comment for the block comment
     * @param
     * string to be insterted as comment
     */
    var setComment = exports.setComment = function setComment(c) {
        comment = c;
    };
    /**
     * The addFrame method takes an incoming BitmapData object to create each frames
     * @param
     * BitmapData object to be treated as a GIF's frame
     */
    var addFrame = exports.addFrame = function addFrame(im, is_imageData) {
        if ((im === null) || !started || out === null) {
            throw new Error("Please call start method before calling addFrame");
        }
        var ok = true;
        try {
            if (!is_imageData) {
                image = im.getImageData(0, 0, im.canvas.width, im.canvas.height).data;
                if (!sizeSet)
                    setSize(im.canvas.width, im.canvas.height);
            }
            else {
                if (im instanceof ImageData) {
                    image = im.data;
                    if (!sizeset || width != im.width || height != im.height) {
                        setSize(im.width, im.height);
                    }
                    else {
                    }
                }
                else if (im instanceof Uint8ClampedArray) {
                    if (im.length == (width * height * 4)) {
                        image = im;
                    }
                    else {
                        console.log("Please set the correct size: ImageData length mismatch");
                        ok = false;
                    }
                }
                else {
                    console.log("Please provide correct input");
                    ok = false;
                }
            }
            getImagePixels(); // convert to correct format if necessary
            analyzePixels(); // build color table & map pixels
            if (firstFrame) {
                writeLSD(); // logical screen descriptior
                writePalette(); // global color table
                if (repeat >= 0) {
                    // use NS app extension to indicate reps
                    writeNetscapeExt();
                }
            }
            writeGraphicCtrlExt(); // write graphic control extension
            if (comment !== '') {
                writeCommentExt(); // write comment extension
            }
            writeImageDesc(); // image descriptor
            if (!firstFrame)
                writePalette(); // local color table
            writePixels(); // encode and write pixel data
            firstFrame = false;
        }
        catch (e) {
            ok = false;
        }
        return ok;
    };
    /**
    * @description: Downloads the encoded gif with the given name
    * No need of any conversion from the stream data (out) to base64
    * Solves the issue of large file sizes when there are more frames
    * and does not involve in creation of any temporary data in the process
    * so no wastage of memory, and speeds up the process of downloading
    * to just calling this function.
    * @parameter {String} filename filename used for downloading the gif
    */
    var download = exports.download = function download(filename) {
        if (out === null || closeStream == false) {
            console.log("Please call start method and add frames and call finish method before calling download");
        }
        else {
            filename = filename !== undefined ? (filename.endsWith(".gif") ? filename : filename + ".gif") : "download.gif";
            var templink = document.createElement("a");
            templink.download = filename;
            templink.href = URL.createObjectURL(new Blob([new Uint8Array(out.bin)], { type: "image/gif" }));
            templink.click();
        }
    };
    /**
     * Adds final trailer to the GIF stream, if you don't call the finish method
     * the GIF stream will not be valid.
     */
    var finish = exports.finish = function finish() {
        if (!started)
            return false;
        var ok = true;
        started = false;
        try {
            out.writeByte(0x3b); // gif trailer
            closeStream = true;
        }
        catch (e) {
            ok = false;
        }
        return ok;
    };
    /**
     * Resets some members so that a new stream can be started.
     * This method is actually called by the start method
     */
    var reset = function reset() {
        // reset for subsequent use
        transIndex = 0;
        image = null;
        pixels = null;
        indexedPixels = null;
        colorTab = null;
        closeStream = false;
        firstFrame = true;
    };
    /**
     * * Sets frame rate in frames per second. Equivalent to
     * <code>setDelay(1000/fps)</code>.
     * @param fps
     * float frame rate (frames per second)
     */
    var setFrameRate = exports.setFrameRate = function setFrameRate(fps) {
        if (fps != 0xf)
            delay = Math.round(100 / fps);
    };
    /**
     * Sets quality of color quantization (conversion of images to the maximum 256
     * colors allowed by the GIF specification). Lower values (minimum = 1)
     * produce better colors, but slow processing significantly. 10 is the
     * default, and produces good color mapping at reasonable speeds. Values
     * greater than 20 do not yield significant improvements in speed.
     * @param quality
     * int greater than 0.
     * @return
     */
    var setQuality = exports.setQuality = function setQuality(quality) {
        if (quality < 1)
            quality = 1;
        sample = quality;
    };
    /**
     * Sets the GIF frame size. The default size is the size of the first frame
     * added if this method is not invoked.
     * @param w
     * int frame width.
     * @param h
     * int frame width.
     */
    var setSize = exports.setSize = function setSize(w, h) {
        if (started && !firstFrame)
            return;
        width = w;
        height = h;
        if (width < 1)
            width = 320;
        if (height < 1)
            height = 240;
        sizeSet = true;
    };
    /**
     * Initiates GIF file creation on the given stream.
     * @param os
     * OutputStream on which GIF images are written.
     * @return false if initial write failed.
     */
    var start = exports.start = function start() {
        reset();
        var ok = true;
        closeStream = false;
        out = new ByteArray();
        try {
            out.writeUTFBytes("GIF89a"); // header
        }
        catch (e) {
            ok = false;
        }
        return started = ok;
    };
    var cont = exports.cont = function cont() {
        reset();
        var ok = true;
        closeStream = false;
        out = new ByteArray();
        return started = ok;
    };
    /**
     * Analyzes image colors and creates color map.
     */
    var analyzePixels = function analyzePixels() {
        var len = pixels.length;
        var nPix = len / 3;
        indexedPixels = [];
        var nq = new NeuQuant(pixels, len, sample);
        // initialize quantizer
        colorTab = nq.process(); // create reduced palette
        // map image pixels to new palette
        var k = 0;
        for (var j = 0; j < nPix; j++) {
            var index = nq.map(pixels[k++] & 0xff, pixels[k++] & 0xff, pixels[k++] & 0xff);
            usedEntry[index] = true;
            indexedPixels[j] = index;
        }
        pixels = null;
        colorDepth = 8;
        palSize = 7;
        // get closest match to transparent color if specified
        if (transparent !== null) {
            transIndex = findClosest(transparent);
        }
    };
    /**
     * Returns index of palette color closest to c
     */
    var findClosest = function findClosest(c) {
        if (colorTab === null)
            return -1;
        var r = (c & 0xFF0000) >> 16;
        var g = (c & 0x00FF00) >> 8;
        var b = (c & 0x0000FF);
        var minpos = 0;
        var dmin = 256 * 256 * 256;
        var len = colorTab.length;
        for (var i = 0; i < len;) {
            var dr = r - (colorTab[i++] & 0xff);
            var dg = g - (colorTab[i++] & 0xff);
            var db = b - (colorTab[i] & 0xff);
            var d = dr * dr + dg * dg + db * db;
            var index = i / 3;
            if (usedEntry[index] && (d < dmin)) {
                dmin = d;
                minpos = index;
            }
            i++;
        }
        return minpos;
    };
    /**
     * Extracts image pixels into byte array "pixels
     */
    var getImagePixels = function getImagePixels() {
        var w = width;
        var h = height;
        pixels = [];
        var data = image;
        var count = 0;
        for (var i = 0; i < h; i++) {
            for (var j = 0; j < w; j++) {
                var b = (i * w * 4) + j * 4;
                pixels[count++] = data[b];
                pixels[count++] = data[b + 1];
                pixels[count++] = data[b + 2];
            }
        }
    };
    /**
     * Writes Graphic Control Extension
     */
    var writeGraphicCtrlExt = function writeGraphicCtrlExt() {
        out.writeByte(0x21); // extension introducer
        out.writeByte(0xf9); // GCE label
        out.writeByte(4); // data block size
        var transp;
        var disp;
        if (transparent === null) {
            transp = 0;
            disp = 0; // dispose = no action
        }
        else {
            transp = 1;
            disp = 2; // force clear if using transparent color
        }
        if (dispose >= 0) {
            disp = dispose & 7; // user override
        }
        disp <<= 2;
        // packed fields
        out.writeByte(0 | // 1:3 reserved
            disp | // 4:6 disposal
            0 | // 7 user input - 0 = none
            transp); // 8 transparency flag
        WriteShort(delay); // delay x 1/100 sec
        out.writeByte(transIndex); // transparent color index
        out.writeByte(0); // block terminator
    };
    /**
     * Writes Comment Extention
     */
    var writeCommentExt = function writeCommentExt() {
        out.writeByte(0x21); // extension introducer
        out.writeByte(0xfe); // comment label
        out.writeByte(comment.length); // Block Size (s)
        out.writeUTFBytes(comment);
        out.writeByte(0); // block terminator
    };
    /**
     * Writes Image Descriptor
     */
    var writeImageDesc = function writeImageDesc() {
        out.writeByte(0x2c); // image separator
        WriteShort(0); // image position x,y = 0,0
        WriteShort(0);
        WriteShort(width); // image size
        WriteShort(height);
        // packed fields
        if (firstFrame) {
            // no LCT - GCT is used for first (or only) frame
            out.writeByte(0);
        }
        else {
            // specify normal LCT
            out.writeByte(0x80 | // 1 local color table 1=yes
                0 | // 2 interlace - 0=no
                0 | // 3 sorted - 0=no
                0 | // 4-5 reserved
                palSize); // 6-8 size of color table
        }
    };
    /**
     * Writes Logical Screen Descriptor
     */
    var writeLSD = function writeLSD() {
        // logical screen size
        WriteShort(width);
        WriteShort(height);
        // packed fields
        out.writeByte((0x80 | // 1 : global color table flag = 1 (gct used)
            0x70 | // 2-4 : color resolution = 7
            0x00 | // 5 : gct sort flag = 0
            palSize)); // 6-8 : gct size
        out.writeByte(0); // background color index
        out.writeByte(0); // pixel aspect ratio - assume 1:1
    };
    /**
     * Writes Netscape application extension to define repeat count.
     */
    var writeNetscapeExt = function writeNetscapeExt() {
        out.writeByte(0x21); // extension introducer
        out.writeByte(0xff); // app extension label
        out.writeByte(11); // block size
        out.writeUTFBytes("NETSCAPE" + "2.0"); // app id + auth code
        out.writeByte(3); // sub-block size
        out.writeByte(1); // loop sub-block id
        WriteShort(repeat); // loop count (extra iterations, 0=repeat forever)
        out.writeByte(0); // block terminator
    };
    /**
     * Writes color table
     */
    var writePalette = function writePalette() {
        out.writeBytes(colorTab);
        var n = (3 * 256) - colorTab.length;
        for (var i = 0; i < n; i++)
            out.writeByte(0);
    };
    var WriteShort = function WriteShort(pValue) {
        out.writeByte(pValue & 0xFF);
        out.writeByte((pValue >> 8) & 0xFF);
    };
    /**
     * Encodes and writes pixel data
     */
    var writePixels = function writePixels() {
        var myencoder = new LZWEncoder(width, height, indexedPixels, colorDepth);
        myencoder.encode(out);
    };
    /**
     * Retrieves the GIF stream
     */
    var stream = exports.stream = function stream() {
        return out;
    };
    var setProperties = exports.setProperties = function setProperties(has_start, is_first) {
        started = has_start;
        firstFrame = is_first;
    };
    return exports;
};

"use strict";
class PenciltestRenderExporter {
    constructor(controller) {
        this.controller = controller;
    }
    async renderGif() {
        const renderRange = this.controller.state.frameSelection
            ? this.controller.state.frameSelection
            : { start: 0, end: this.controller.scene.frames.length - 1 };
        const gifSize = Math.min(512, this.controller.scene.height);
        const lineWeight = 1;
        let gifConfigurationString;
        try {
            gifConfigurationString = await Utils.prompt(`Rendering ${renderRange.end - renderRange.start + 1} frames, ${renderRange.start} through ${renderRange.end}.\nWhat dimensions (maximum width/height) and line weight would you like?`, `${gifSize} ${lineWeight}`);
        }
        catch (reason) {
            if (reason !== Utils.promptCanceled) {
                console.error(reason);
            }
            return;
        }
        const gifConfiguration = (gifConfigurationString || '512 2').split(' ');
        const maxGifDimension = parseInt(gifConfiguration[0], 10);
        const gifLineWeight = parseInt(gifConfiguration[1], 10);
        const dimensions = this.controller.scene.getDimensions();
        if (dimensions.width > maxGifDimension) {
            dimensions.width = maxGifDimension;
            dimensions.height = maxGifDimension / dimensions.aspect;
        }
        else if (dimensions.height > maxGifDimension) {
            dimensions.height = maxGifDimension;
            dimensions.width = maxGifDimension * dimensions.aspect;
        }
        this.controller.forceDimensions = dimensions;
        const oldRendererType = this.controller.options.renderer;
        this.controller.setOptions({ renderer: Renderers.CANVAS });
        //// rebuild renderer to ensure correct resolution for capture
        //this.controller.ui.appActions.renderer.action();
        this.controller.resize();
        //this.controller.ui.appActions.renderer.action();
        const gifRenderOverrides = { lineWeight: gifLineWeight };
        const baseFrameDelay = 1000 / this.controller.scene.framerate;
        // prepare encoder
        const gifEncoder = GIFEncoder();
        // gifEncoder.setSize dimensions.width, dimensions.height # no use: uses the original dimensions of the canvas, regardless of its current size
        gifEncoder.setRepeat(0);
        gifEncoder.setDelay(baseFrameDelay);
        gifEncoder.start();
        ;
        for (let frameNumber = renderRange.start; frameNumber <= renderRange.end; frameNumber++) {
            this.controller.goToFrame(frameNumber, gifRenderOverrides);
            gifEncoder.setDelay(baseFrameDelay * this.controller.scene.getFrameHold()); // FIXME This seems to work once for the whole GIF, and not individually per frame. How to set individual delays for each fram in gifEncoder?
            gifEncoder.addFrame(this.controller.renderer.context);
        }
        gifEncoder.finish();
        const blobUrl = URL.createObjectURL(new Blob([new Uint8Array(gifEncoder.stream().bin).buffer], { type: "image/gif" }));
        // reset to user's configuration
        this.controller.setOptions({ renderer: oldRendererType });
        this.controller.forceDimensions = null;
        this.controller.resize();
        return blobUrl;
    }
}

"use strict";
class SceneState {
    constructor(overrides = {}) {
        Object.assign(this, {
            frames: [],
            exposureCount: 0,
            exposureNumber: 0,
            frameNumber: 0,
            ...overrides
        });
    }
}
class Penciltest {
    constructor(options) {
        this.options = {
            ...PenciltestScene.defaultOptions,
            ...Penciltest.defaultOptions,
            ...this.getStoredData('app', 'options'),
        };
        this.state = {
            ...Penciltest.defaultState,
            ...this.getStoredData('app', 'state'),
        };
        this.currentStrokeIndex = -1;
        this.workingOn = [];
        this.playback = { ...Penciltest.defaultPlayback };
        this.container = globalThis.document.querySelector(this.options.container);
        this.container.className = 'penciltest-app';
        this.buildContainer();
        this.ui = new PenciltestUI(this, { parentElement: this.container });
        this.newScene();
        this.setOptions(this.options); // do all the option actions
        if (this.state.version !== Penciltest.version) {
            (async () => {
                // User is not prompted about migration on launch, only on loading a scene.
                // The app won't work without compatible state data.
                this.state.version = await PenciltestVersions.migrate(this, this.state.version, Penciltest.version);
            })();
        }
        this.resize();
    }
    ;
    setOptions(newOptions) {
        Object.assign(this.options, newOptions);
        for (let key in newOptions) {
            if (key in this.ui.appActions && typeof this.ui.appActions[key].action === 'function') {
                this.ui.handleAppReaction(key);
            }
        }
        //this.ui.updateStatusBar();
    }
    resetOptionsAndState() {
        this.state = { ...Penciltest.defaultState };
        this.setOptions(Penciltest.defaultOptions);
        this.currentStrokeIndex = -1;
        if (this.scene) {
            this.scene.updateState();
        }
        this.resize();
    }
    setPlayback(newPlayback) {
        Object.assign(this.playback, newPlayback);
        for (let key in newPlayback) {
            if (key in this.ui.appActions && typeof this.ui.appActions[key].action === 'function') {
                this.ui.handleAppReaction(key);
            }
        }
        //this.ui.updateStatusBar();
    }
    buildContainer() {
        const markup = '<div class="field-container">' +
            '<div class="field"></div>' +
            '</div>';
        this.container.innerHTML = markup;
        this.fieldContainer = this.container.querySelector('.field-container');
        return this.fieldElement = this.container.querySelector('.field');
    }
    setMode(mode) {
        if (mode !== this.state.mode) {
            this.state.previousMode = this.state.mode;
            this.state.mode = mode;
            this.container.setAttribute('x-mode', mode);
            this.ui.updateStatusBar();
            return true;
        }
        return false;
    }
    setPreviousMode() {
        return this.setMode(this.state.previousMode || PenciltestModes.DRAWING);
    }
    getVisibleFrameRange() {
        const range = { start: this.scene.current.frameNumber, end: this.scene.current.frameNumber };
        if (this.options.onionSkin && this.options.onionSkinFrameRadius > 0) {
            range.start = Math.max(0, range.start - this.options.onionSkinFrameRadius);
            range.end = Math.min(this.scene.frames.length - 1, range.end + this.options.onionSkinFrameRadius);
        }
        return range;
    }
    getVisibleFrames() {
        return Utils.getRange(this.getVisibleFrameRange(), this.scene.frames)[0];
    }
    getCurrentFrame() {
        return this.scene.frames[this.scene.current.frameNumber || 0];
    }
    getCurrentStroke() {
        return this.getCurrentFrame().strokes[this.currentStrokeIndex > -1 ? this.currentStrokeIndex : 0];
    }
    getFrameBounds(frames = []) {
        if (frames.length === 0) {
            frames = [this.getCurrentFrame()];
        }
        const frameBounds = {};
        frames.forEach((frame) => {
            if (!frame.strokes) {
                return;
            }
            frame.strokes.forEach((stroke) => {
                if (stroke.path) {
                    Utils.unionBounds(stroke.path, frameBounds);
                }
            });
        });
        return frameBounds;
    }
    mark(point) {
        if (this.currentStrokeIndex < 0) {
            let frame = this.getCurrentFrame();
            if (!frame.strokes) {
                frame.strokes = [];
            }
            this.currentStrokeIndex = frame.strokes.length;
            const stroke = { path: [] };
            frame.strokes.push(stroke);
            this.renderer.moveTo(point.x, point.y);
        }
        else {
            this.renderer.lineTo(point.x, point.y);
        }
        const stroke = this.getCurrentStroke();
        if (!stroke) {
            return;
        } // FIXME This shouldn't happen, right?
        stroke.path.push(Utils.scalePoint(point, 1 / this.zoomFactor));
        if (this.state.mode === PenciltestModes.DRAWING) {
            this.renderer.render();
        }
        this.clearRedo();
        return this.hasUnsavedChanges = true;
    }
    track(x, y) {
        var _a;
        const trackPoint = { x, y };
        if (this.state.toolStack[0] === PenciltestTools.ERASER) {
            const screenPoint = Utils.scalePoint(trackPoint, 1 / this.zoomFactor);
            let done = false;
            const currentFrame = this.getCurrentFrame();
            const screenEraseRadius = 10;
            this.drawCurrentFrame();
            for (let strokeIndex = 0; strokeIndex < Number((_a = currentFrame.strokes) === null || _a === void 0 ? void 0 : _a.length); strokeIndex++) {
                const stroke = currentFrame.strokes[strokeIndex];
                for (let segment of stroke.path) {
                    const realEraseRadius = screenEraseRadius / this.zoomFactor;
                    if ((Math.abs(screenPoint.x - segment.x) < realEraseRadius) && (Math.abs(screenPoint.y - segment.y) < realEraseRadius)) {
                        currentFrame.strokes.splice(strokeIndex, 1);
                        this.drawCurrentFrame();
                        done = true;
                    }
                    if (done) {
                        break;
                    }
                }
                if (done) {
                    break;
                }
            }
            return this.renderer.rect(screenPoint[0] - screenEraseRadius, screenPoint[1] - screenEraseRadius, screenEraseRadius * 2, screenEraseRadius * 2, null, 'red');
        }
        else if (this.options.smoothing > 0) {
            if ((this.currentStrokeIndex < 0)) {
                this.markPoint = trackPoint;
                this.markBuffer = [];
            }
            this.markBuffer.push(trackPoint);
            // TODO  Mark multiple points per @options.smoothing
            this.markPoint.x = ((this.markPoint.x * this.options.smoothing) + x) / (this.options.smoothing + 1);
            this.markPoint.y = ((this.markPoint.y * this.options.smoothing) + y) / (this.options.smoothing + 1);
            // TODO  Use previous mark for velocity, to interpolate `smoothing`×
            if (this.markBuffer.length > this.state.smoothDrawInterval) {
                this.markBuffer = [];
            }
            return this.mark(this.markPoint);
        }
        else {
            return this.mark(trackPoint);
        }
    }
    resolveFrameNumber(inputIndex) {
        let realIndex = inputIndex;
        if (this.options.loop) {
            while ((realIndex < 0) || (realIndex >= this.scene.frames.length)) {
                realIndex = (realIndex + this.scene.frames.length) % this.scene.frames.length;
            }
        }
        else {
            realIndex = Math.max(0, Math.min(this.scene.frames.length - 1, realIndex));
        }
        return realIndex;
    }
    goToFrame(targetFrameNumber, overrides = {}) {
        const selectedFrameNumber = this.resolveFrameNumber(targetFrameNumber);
        this.scene.current.frameNumber = selectedFrameNumber;
        if (this.state.mode !== PenciltestModes.PLAYING) {
            this.lift();
            this.seekAudioToFrame(selectedFrameNumber);
        }
        this.ui.updateStatusBar(); // FIXME: Probably too slow, rewriting all status DOM elemets, on each frame of play.
        return this.drawCurrentFrame(overrides);
    }
    seekAudioToFrame(frameNumber, exposureOffset = 0) {
        if (this.scene.audio) {
            const seekTime = (this.scene.current.frames[frameNumber].time + exposureOffset * this.scene.current.singleFrameDuration - this.scene.audio.offset) / 1000;
            return this.seekAudio(seekTime);
        }
    }
    play() {
        if (this.playback.direction == null) {
            this.playback.direction = 1;
        }
        if (this.scene.current.frameNumber < this.scene.frames.length) { // i.e. it is a frame in the scene (in case this.scene.current.frameNumber was
            this.playback.heldExposures = 0;
            this.goToFrame(this.scene.current.frameNumber); // reset the audio position to the _beginning_ of the current frame
        }
        else {
            this.playback.heldExposures = -1;
            this.goToFrame(0);
        }
        const stepListener = (firstStep) => {
            this.playback.heldExposures++;
            const frameHold = this.scene.getFrameHold();
            let newIndex = this.scene.current.frameNumber + this.playback.direction;
            if ((this.playback.heldExposures >= frameHold) || (firstStep && (newIndex === this.scene.frames.length))) {
                this.playback.heldExposures = 0;
                if ((newIndex >= this.scene.frames.length) || (newIndex < 0)) {
                    if (this.options.loop || firstStep) {
                        newIndex = (newIndex + this.scene.frames.length) % this.scene.frames.length;
                        this.goToFrame(newIndex);
                        return this.seekAudioToFrame(newIndex);
                    }
                    else {
                        this.stop();
                        this.ui.updateStatusBar();
                    }
                }
                else {
                    return this.goToFrame(newIndex);
                }
            }
        };
        this.stop();
        stepListener(true);
        this.playback.stepId = setInterval(stepListener, 1000 / this.scene.framerate);
        this.lift();
        this.setMode(PenciltestModes.PLAYING);
        return this.playAudio();
    }
    stop() {
        if (this.audioElement) {
            this.pauseAudio();
        }
        clearInterval(this.playback.stepId);
        if (this.state.mode === PenciltestModes.PLAYING) {
            this.setPreviousMode();
        }
    }
    togglePlay() {
        if (this.state.mode !== PenciltestModes.WORKING) {
            if (this.state.mode === PenciltestModes.PLAYING) {
                return this.stop();
            }
            else {
                return this.play();
            }
        }
    }
    drawCurrentFrame(overrides = {}) {
        // NOTE: This draws the background, while drawFrame() does not.
        if (!this.renderer || !this.scene.frames.length) {
            return;
        }
        this.renderer.clear();
        if (this.scene.background) {
            this.renderer.rect(0, 0, this.width, this.height, this.scene.background);
        }
        if (this.options.onionSkin) {
            for (let i = 1, end = this.options.onionSkinFrameRadius, asc = 1 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
                const previousFrameNumber = this.resolveFrameNumber(this.scene.current.frameNumber - i);
                const lineOpacity = Math.pow(this.options.onionSkinOpacity, i);
                if (previousFrameNumber !== this.scene.current.frameNumber) {
                    this.drawFrame(previousFrameNumber, Object.assign({}, overrides, {
                        lineColor: [255, 0, 0, lineOpacity]
                    }));
                }
                const nextFrameNumber = this.resolveFrameNumber(this.scene.current.frameNumber + i);
                if (nextFrameNumber !== this.scene.current.frameNumber) {
                    this.drawFrame(nextFrameNumber, Object.assign({}, overrides, {
                        lineColor: [0, 255, 255, lineOpacity]
                    }));
                }
            }
        }
        this.renderer.composeOptions();
        this.drawFrame(this.scene.current.frameNumber, overrides);
    }
    drawFrame(frameNumber, overrides) {
        var _a;
        if (!this.width || !this.height) {
            return;
        }
        if (overrides) {
            this.renderer.composeOptions(overrides);
        }
        const frame = this.scene.frames[frameNumber];
        if (((_a = frame === null || frame === void 0 ? void 0 : frame.strokes) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            frame.strokes.map((stroke) => this.renderer.path(this.scaleStroke(stroke, this.zoomFactor)));
        }
        return frame;
    }
    scaleStroke(stroke, factor) {
        return {
            ...stroke,
            // TODO: scale stroke weight, too?
            path: stroke.path.map((point) => Utils.scalePoint(point, factor))
        };
    }
    useTool(toolName) {
        const index = this.state.toolStack.indexOf(toolName);
        const isChanging = index !== 0;
        if (isChanging) {
            if (index > -1) {
                this.state.toolStack.splice(index, 1);
            }
            this.state.toolStack.unshift(toolName);
            this.container.setAttribute('x-tool', toolName);
        }
        return isChanging;
    }
    usePreviousTool() {
        return [this.state.toolStack[1], this.useTool(this.state.toolStack[1])];
    }
    cancelStroke() {
        this.markBuffer = [];
        return this.currentStrokeIndex = -1;
    }
    lift() {
        if (this.markBuffer && this.markBuffer.length) {
            const last = this.markBuffer.pop();
            this.mark(last);
            this.markBuffer = [];
        }
        this.currentStrokeIndex = -1;
        if (this.state.toolStack[0] === PenciltestTools.ERASER) {
            return this.drawCurrentFrame();
        }
    }
    getSelectedFrames(frames = [], cut = false) {
        if (frames.length > 0) {
            return [frames, -1];
        }
        else {
            const [selection, index] = Utils.getRange(this.state.frameSelection, this.scene.frames, cut);
            if (cut) {
                this.scene.updateState();
            }
            if (selection.length > 0) {
                return [selection, index];
            }
            else if (cut) {
                return [this.scene.frames.splice(this.scene.current.frameNumber, 1), this.scene.current.frameNumber];
            }
            else {
                return [[this.getCurrentFrame()], this.scene.current.frameNumber];
            }
        }
    }
    copyFrames() {
        const [frames, start] = this.getSelectedFrames();
        this.copyBuffer = Utils.clone(frames);
        return [this.copyBuffer, start];
    }
    pasteFrames() {
        if (this.copyBuffer) {
            const newFrameNumber = this.scene.current.frameNumber + 1;
            this.insertFrames(Utils.clone(this.copyBuffer), newFrameNumber);
            this.goToFrame(newFrameNumber);
        }
    }
    insertFrames(frames, position) {
        Array.prototype.splice.apply(this.scene.frames, [position, 0].concat(frames));
        this.scene.updateState();
        this.ui.updateStatusBar();
    }
    splitFrame(frameNumber, splitOffset) {
        var _a;
        const frame = (_a = this.scene) === null || _a === void 0 ? void 0 : _a.frames[frameNumber];
        const oldHold = this.scene.getFrameHold();
        frame.hold = splitOffset;
        const newFrame = Utils.clone(frame);
        newFrame.hold = oldHold - splitOffset;
        this.insertFrames([newFrame], frameNumber + 1);
    }
    pasteStrokes() {
        var _a;
        if (((_a = this.copyBuffer) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            this.scene.frames[this.scene.current.frameNumber].strokes = this.scene.frames[this.scene.current.frameNumber].strokes.concat(Utils.clone(this.copyBuffer[0].strokes));
            return this.drawCurrentFrame();
        }
    }
    clearStrokes() {
        this.scene.frames[this.scene.current.frameNumber].strokes = [];
        return this.drawCurrentFrame();
    }
    cutFrames() {
        const [droppedFrames, start] = this.dropFrames();
        this.copyBuffer = droppedFrames;
        return [droppedFrames, start];
    }
    dropFrames() {
        const [droppedFrames, start] = this.getSelectedFrames([], true);
        if (this.scene.frames.length === 0) {
            this.scene.newFrame();
        }
        if (this.scene.current.frameNumber >= start) {
            if (this.scene.current.frameNumber - start <= droppedFrames.length) {
                this.scene.current.frameNumber = Math.min(start, this.scene.frames.length - 1);
            }
            else {
                this.scene.current.frameNumber -= droppedFrames.length;
            }
        }
        this.drawCurrentFrame();
        this.ui.updateStatusBar();
        return [droppedFrames, start];
    }
    async smoothFrame(index, amount = 1) {
        const smooth = (amount) => {
            const smoothingBackup = this.options.smoothing;
            this.options.smoothing = amount;
            const frame = this.scene.frames[index];
            const oldStrokes = Utils.clone(frame.strokes);
            this.lift();
            frame.strokes = [];
            this.scene.current.frameNumber = index;
            this.renderer.clear();
            const result = [];
            for (let stroke of oldStrokes) {
                for (let segment of stroke.path) {
                    this.track.apply(this, [segment.x, segment.y]);
                }
                result.push(this.lift());
            }
            this.options.smoothing = smoothingBackup;
            return result;
        };
        if (!amount) {
            try {
                amount = Number(await Utils.prompt('How much to smooth? 1-5', 2));
            }
            catch (reason) {
                if (reason !== Utils.promptCanceled) {
                    console.error(reason);
                }
                return;
            }
        }
        return smooth(amount);
    }
    async smoothScene(amount = 1) {
        if (await Utils.confirm('Would you like to smooth every frame of this scene?')) {
            if (amount < 1) {
                try {
                    amount = Number(await Utils.prompt('How much to smooth? 1-5', 2));
                }
                catch (reason) {
                    if (reason !== Utils.promptCanceled) {
                        console.error(reason);
                    }
                    return;
                }
            }
            this.setMode(PenciltestModes.WORKING);
            this.queueWork(() => {
                this.scene.frames.forEach((frame, i) => this.smoothFrame(i, amount));
                this.setPreviousMode();
            });
        }
    }
    undo() {
        if (this.getCurrentFrame().strokes && this.getCurrentFrame().strokes.length) {
            this.redoQueue.push(this.getCurrentFrame().strokes.pop());
            this.hasUnsavedChanges = true;
            return this.drawCurrentFrame();
        }
    }
    redo() {
        if (this.redoQueue && this.redoQueue.length) {
            this.getCurrentFrame().strokes.push(this.redoQueue.pop());
            this.hasUnsavedChanges = true;
            return this.drawCurrentFrame();
        }
    }
    clearRedo() {
        return this.redoQueue = [];
    }
    setCurrentFrameHold(newHold) {
        this.scene.setFrameHold(newHold);
        this.scene.updateState();
        return this.ui.updateStatusBar();
    }
    newScene() {
        this.scene = new PenciltestScene(this.options);
        this.hasUnsavedChanges = false;
        return this.goToFrame(0);
    }
    getSceneNames() {
        const sceneNamePattern = /^scene:/;
        const sceneNames = [];
        for (let storageName in globalThis.localStorage) {
            const reference = this.decodeStorageReference(storageName);
            if (reference && (reference.namespace === 'scene')) {
                sceneNames.push(reference.name);
            }
        }
        return sceneNames;
    }
    encodeStorageReference(namespace, name) {
        return `${namespace}:${name}`;
    }
    decodeStorageReference(encoded) {
        let match;
        if ((match = encoded.match(/^(app|scene):(.*)/))) {
            return {
                namespace: match[1],
                name: match[2]
            };
        }
        else {
            return false;
        }
    }
    getStoredData(namespace, name) {
        const storageName = this.encodeStorageReference(namespace, name);
        try {
            return JSON.parse(globalThis.localStorage.getItem(storageName));
        }
        catch (e) {
            console.error(e);
            this.ui.showFeedback({ text: `Failed to parse stored data at name '${storageName}'.` });
            return null;
        }
    }
    putStoredData(namespace, name, data) {
        const storageName = this.encodeStorageReference(namespace, name);
        try {
            globalThis.localStorage.setItem(storageName, JSON.stringify(data));
            return true;
        }
        catch (e) {
            console.error(e);
            this.ui.showFeedback({ text: `Failed to store local data at name '${storageName}': ${e.message}.` });
            return false;
        }
    }
    async saveScene(update = true) {
        const sceneName = this.scene.name || 'Untitled';
        const scenePack = await PenciltestVersions.packScene(this.scene);
        if (scenePack && this.putStoredData('scene', sceneName, scenePack)) {
            this.hasUnsavedChanges = false;
            return true;
        }
        return false;
    }
    async setScene(scene, shouldUnpack = false) {
        var _a, _b;
        if (shouldUnpack) {
            this.scene = await PenciltestVersions.unpackScene(scene);
        }
        else {
            this.scene = new PenciltestScene(scene);
        }
        if (((_a = this.scene.instrument) === null || _a === void 0 ? void 0 : _a.version) && PenciltestVersions.compareVersions(this.scene.instrument.version, Penciltest.version) === -1) {
            this.scene.instrument.version = await PenciltestVersions.migrate(this, this.scene.instrument.version, Penciltest.version);
        }
        if ((_b = this.scene.audio) === null || _b === void 0 ? void 0 : _b.url) {
            this.loadAudio(this.scene.audio.url, this.scene.audio.info);
        }
        else {
            this.destroyAudio();
        }
        if (this.renderer) {
            if (this.scene.background) {
                this.renderer.options.background = this.scene.background;
            }
            if (this.scene.lineColor) {
                this.renderer.options.lineColor = this.scene.lineColor;
            }
            if (this.scene.lineWeight) {
                this.renderer.options.lineWeight = this.scene.lineWeight;
            }
        }
        this.scene.updateState();
        this.goToFrame(this.scene.current.frameNumber || 0);
        this.hasUnsavedChanges = false;
        this.resize();
        return this.scene;
    }
    async loadScene(sceneName) {
        const storedScene = this.getStoredData('scene', sceneName);
        if (!storedScene) {
            return false;
        }
        return await this.setScene(storedScene, true);
    }
    async deleteScene(sceneName) {
        try {
            globalThis.localStorage.removeItem(this.encodeStorageReference('scene', sceneName));
            return true;
        }
        catch (e) {
            console.error(e);
        }
        return false;
    }
    loadAudio(audioURL, audioInfo) {
        const self = this;
        this.scene.audio = {
            ...PenciltestScene.defaultAudioOptions,
            url: audioURL,
            info: audioInfo,
        };
        this.hasUnsavedChanges = true;
        if (!this.audioElement) { // TODO: abstract away from browser
            this.audioElement = globalThis.document.createElement('audio');
            this.audioElement.setAttribute('preload', 'true');
            this.fieldContainer.appendChild(this.audioElement);
        }
        else {
            this.pauseAudio();
        }
        this.audioElement.addEventListener('error', (e) => {
            console.log('audio file error', e);
            const message = `The audio URL is no longer available. Please load the file again: ${this.scene.audio.info}`;
            return self.ui.triggerAppAction('linkAudio', [e, message]);
        });
        return this.audioElement.setAttribute('src', audioURL);
    }
    destroyAudio() {
        if (this.scene.audio) {
            delete this.scene.audio;
        }
        if (this.audioElement) {
            this.pauseAudio();
            this.audioElement.remove();
            return this.audioElement = null;
        }
    }
    pauseAudio() {
        if (this.audioElement && !this.audioElement.paused) {
            return this.audioElement.pause();
        }
    }
    playAudio() {
        if (this.audioElement && this.audioElement.paused) {
            return this.audioElement.play();
        }
    }
    seekAudio(time) {
        if (this.audioElement) {
            return (this.audioElement.currentTime = time);
        }
    }
    scrubAudio(exposureOffset = 0) {
        if (!this.options.scrubAudio || !this.audioElement) {
            return;
        }
        const frameExposures = this.scene.getFrameHold();
        if (exposureOffset < 0) {
            exposureOffset += frameExposures;
        }
        this.seekAudioToFrame(this.scene.current.frameNumber, exposureOffset);
        clearTimeout(this.playback.scrubAudioId);
        this.playAudio();
        return this.playback.scrubAudioId = setTimeout(() => this.pauseAudio(), Math.max(this.scene.current.singleFrameDuration * (frameExposures - exposureOffset), 200));
    }
    pan(deltaPoint, selection = []) {
        if (selection.length === 0) {
            [selection] = this.getSelectedFrames();
        }
        selection.map((frame) => {
            if (!frame.strokes) {
                return;
            }
            frame.strokes.forEach((stroke) => {
                if (!stroke.path) {
                    return;
                }
                stroke.path.forEach((segment) => {
                    segment.x += deltaPoint.x;
                    segment.y += deltaPoint.y;
                });
            });
        });
    }
    resize() {
        let containerHeight, containerWidth;
        if (this.forceDimensions) {
            containerWidth = this.forceDimensions.width;
            containerHeight = this.forceDimensions.height;
        }
        else {
            containerWidth = this.container.offsetWidth;
            containerHeight = this.container.offsetHeight;
            if (this.options.showStatus) {
                containerHeight -= 36;
            }
        }
        const sceneDimensions = this.scene.getDimensions();
        const containerAspect = containerWidth / containerHeight;
        if (containerAspect > sceneDimensions.aspect) {
            this.width = Math.floor(containerHeight * sceneDimensions.aspect);
            this.height = containerHeight;
        }
        else {
            this.width = containerWidth;
            this.height = Math.floor(containerWidth / sceneDimensions.aspect);
        }
        this.fieldContainer.style.width = `${this.width}px`;
        this.fieldContainer.style.height = `${this.height}px`;
        this.renderer.resize(this.width, this.height);
        this.zoomFactor = this.height / sceneDimensions.height;
        this.renderer.options.lineWeight = this.zoomFactor * this.scene.lineWeight;
        return this.drawCurrentFrame();
    }
    queueWork(work, afterAll = false) {
        const queueCopy = this.workingOn.map((j) => j); // shallow clone
        let job;
        if (afterAll) {
            job = Promise.all(queueCopy).finally(() => work);
        }
        else {
            const lastJob = queueCopy[0];
            if (lastJob) {
                job = lastJob.finally(() => work);
            }
            else {
                job = new Promise((res, rej) => res(work));
            }
        }
        this.workingOn.unshift(job);
        job.finally(() => {
            const jobIndex = this.workingOn.indexOf(job);
            if (jobIndex > -1) {
                this.workingOn.splice(jobIndex, 1);
            }
        });
        return job;
    }
}
Penciltest.version = '0.3.0';
Penciltest.instrumentIdentifier = 'io.lovejoy.penciltest';
Penciltest.defaultOptions = {
    background: 'gray',
    container: 'body',
    hideCursor: false,
    onionSkin: true,
    onionSkinFrameRadius: 4,
    onionSkinOpacity: 0.5,
    renderer: Renderers.CANVAS,
    scrubAudio: false,
    showStatus: true,
    smoothing: 1,
};
Penciltest.defaultPlayback = {
    heldExposures: 0,
    direction: 1,
    muteAudio: false,
    stepId: -1,
    scrubAudioId: -1,
};
Penciltest.defaultState = {
    version: Penciltest.version,
    mode: PenciltestModes.DRAWING,
    toolStack: [
        PenciltestTools.PENCIL,
        PenciltestTools.ERASER,
        PenciltestTools.PAN
    ],
    previousMode: null
};
