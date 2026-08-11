"use strict";
var Renderers;
(function (Renderers) {
    Renderers["CANVAS"] = "canvas";
    Renderers["SVG"] = "svg";
})(Renderers || (Renderers = {}));
;
var PenciltestMode;
(function (PenciltestMode) {
    PenciltestMode["DRAWING"] = "drawing";
    PenciltestMode["WORKING"] = "working";
    PenciltestMode["PLAYING"] = "playing";
})(PenciltestMode || (PenciltestMode = {}));
;
var PenciltestTool;
(function (PenciltestTool) {
    PenciltestTool["PENCIL"] = "pencil";
    PenciltestTool["ERASER"] = "eraser";
    PenciltestTool["MOVE"] = "move";
    PenciltestTool["FLIP"] = "flip";
    /**
     * Not yet implemented. TODO 2026-08-05
    SCALE = "scale",
    ROTATE = "rotate",
     */
})(PenciltestTool || (PenciltestTool = {}));
;
var PointerMode;
(function (PointerMode) {
    PointerMode["PRESS"] = "press";
    PointerMode["HOVER"] = "hover";
    PointerMode["AWAY"] = "away";
})(PointerMode || (PointerMode = {}));
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
var ColorHexNames;
(function (ColorHexNames) {
    ColorHexNames["black"] = "#000000";
    ColorHexNames["lightgray"] = "#d3d3d3";
})(ColorHexNames || (ColorHexNames = {}));
;

"use strict";
var GlobalPromiseGroup;
(function (GlobalPromiseGroup) {
    GlobalPromiseGroup["MODAL"] = "modal";
})(GlobalPromiseGroup || (GlobalPromiseGroup = {}));
;
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
    static getColorString(color, opacity = -1) {
        // TODO: I suppose I'm permitting `null` values for `color` so that this
        // method can be called in a `.map()` without modification. Is that
        // necessary?
        if (!color) {
            return '';
        }
        const channels = Array.isArray(color)
            ? color.slice(0)
            : Utils.getColorChannels(color);
        if (channels.length === 0 && typeof color === 'string') {
            if (opacity !== -1) {
                return `rgb(from ${color} r g b / ${Utils.toDecimal(opacity, 3)})`;
            }
            return color;
        }
        if (channels.length === 3) {
            channels.push(1);
        }
        channels[3] *= 255;
        if (opacity !== -1) {
            channels[3] *= opacity;
        }
        return '#' + channels
            .map((n) => {
            const hex = Math.floor(n).toString(16);
            return (hex.length === 1 ? '0' : '') + hex;
        })
            .join('');
    }
    ;
    static getColorChannels(color) {
        const channels = [];
        if (color[0] === '#') {
            for (let i = 1; i < color.length; i += 2) {
                const hex = color.substr(i, 2);
                channels.push(Number(`0x${hex}`));
            }
            if (channels[3]) {
                channels[3] /= 255;
            }
        }
        else if (color.substr(0, 3) === 'rgb') {
            const pattern = /rgba?\( *([0-9]+) *, *([0-9]+) *, *([0-9]+)( *[,\/] *([0-9.]+))?/;
            const groups = color.match(pattern);
            if (groups) {
                channels.push(Number(groups[1]));
                channels.push(Number(groups[2]));
                channels.push(Number(groups[3]));
                if (groups[5]) {
                    channels.push(Number(groups[5]));
                }
            }
        }
        return channels;
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
    static async promptForm(message, formComponentDefs, options = {}) {
        const promptPromise = new Promise((resolve, reject) => {
            const promptComponents = {};
            const promptKeyListener = function (event) {
                const keysDescription = Utils.describeKeyCombo(event);
                if (keysDescription === 'Esc') {
                    cancelPrompt();
                }
                else if (keysDescription === 'Enter') {
                    submitPrompt();
                }
            };
            document.addEventListener('keydown', promptKeyListener);
            const closePromptModal = function () {
                const promptModal = promptComponents.modal.getElement();
                if (promptModal) {
                    promptModal.remove();
                }
                document.removeEventListener('keydown', promptKeyListener);
            };
            const cancelPrompt = () => {
                closePromptModal();
                resolve(null);
            };
            const submitPrompt = () => {
                const result = {};
                if (Array.isArray(options.inputKeys) && options.inputKeys.length > 0) {
                    options.inputKeys.forEach((key) => {
                        const component = promptComponents[key];
                        if (!component) {
                            return;
                        }
                        const inputElement = promptComponents[key].getElement();
                        if (!inputElement) {
                            return;
                        }
                        result[key] = inputElement.value;
                    });
                }
                closePromptModal();
                resolve(result);
            };
            const promptComponentDefinitions = [];
            const modalDef = {
                key: 'modal',
                style: {
                    position: 'absolute',
                    top: '0px',
                    left: '0px',
                    bottom: '0px',
                    right: '0px',
                    backgroundColor: 'rgba(0,0,0,0.5)'
                },
                parentElement: document.body
            };
            promptComponentDefinitions.push(modalDef);
            const formDef = {
                key: 'form',
                tagName: 'form',
                style: {
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    padding: '1em',
                    transform: 'translateX(-50%) translateY(-50%)',
                    backgroundColor: 'lightgray'
                },
                on: {
                    'submit': function (event) {
                        event.preventDefault();
                        submitPrompt();
                    },
                },
                html: message,
                parent: 'modal'
            };
            if (options.className) {
                formDef.className = options.className;
            }
            promptComponentDefinitions.push(formDef);
            promptComponentDefinitions.push({
                key: 'formBody',
                parent: 'form',
                children: formComponentDefs
            });
            promptComponentDefinitions.push({
                key: 'cancel',
                tagName: 'button',
                attr: {
                    type: 'button'
                },
                text: 'Cancel',
                on: {
                    'click': (event) => {
                        event.preventDefault();
                        closePromptModal();
                        resolve(null);
                    }
                },
                parent: 'form'
            });
            promptComponentDefinitions.push({
                key: 'submit',
                tagName: 'button',
                attr: {
                    type: 'submit'
                },
                text: 'Accept',
                parent: 'form'
            });
            promptComponentDefinitions.forEach((def) => {
                new PenciltestUIComponent(def, promptComponents);
            });
            if (typeof options.onOpen === 'function') {
                options.onOpen();
            }
            else {
                promptComponents[options.inputKeys[0]].getElement().focus();
            }
        });
        Utils.registerGlobalPromise(promptPromise);
        return promptPromise;
    }
    static async prompt(message, defaultValue = null, options = {}) {
        const { input: givenPromptInput, submitOnChange: shouldSubmitOnChange, inputAttrs, inputLabel, labelLogic, } = options;
        const promptComponentDefinitions = [];
        const inputDef = {
            key: 'input',
            attr: { id: 'promptInputLabel', ...inputAttrs },
            parent: 'formBody',
        };
        if (typeof givenPromptInput === 'string' || !givenPromptInput) {
            inputDef.tagName = 'input';
            if (typeof givenPromptInput === 'string' && givenPromptInput) {
                inputDef.attr.type = givenPromptInput;
            }
        }
        else if (typeof givenPromptInput === 'object') {
            if (givenPromptInput.isPTComponent) {
                inputDef.is = givenPromptInput;
            }
            else if ("nodeName" in givenPromptInput) {
                inputDef.el = givenPromptInput;
            }
            else {
                const givenInputDef = givenPromptInput;
                Object.assign(inputDef, {
                    ...givenInputDef,
                    parent: inputDef.parent,
                    on: { ...inputDef.on, ...givenInputDef.on },
                    attr: { ...inputDef.attr, ...givenInputDef.attr }
                });
            }
        }
        if (defaultValue !== null) {
            inputDef.attr.value = defaultValue;
        }
        if (!inputDef.on) {
            inputDef.on = {};
        }
        promptComponentDefinitions.push(inputDef);
        if (inputLabel || labelLogic) {
            const promptInputLabelDef = {
                key: 'promptInputLabel',
                tagName: 'label',
                attr: {
                    for: inputDef.attr.id
                },
                style: {
                    padding: '0.5em 1em',
                    'vertical-align': 'top',
                    'line-height': '1.6em'
                },
                parent: 'formBody'
            };
            if (labelLogic) {
                inputDef.on.input = (event, components) => { components.promptInputLabel.getElement().innerText = labelLogic(components.input.getElement().value); };
                promptInputLabelDef.text = labelLogic(defaultValue);
            }
            else if (inputLabel) {
                promptInputLabelDef.text = inputLabel;
            }
            promptComponentDefinitions.push(promptInputLabelDef);
        }
        if (shouldSubmitOnChange) {
            inputDef.on.change = (event, components) => {
                components.form.getElement().requestSubmit();
            };
        }
        const promptFormOptions = {
            ...options,
            inputKeys: ['input']
        };
        const result = await Utils.promptForm(message, promptComponentDefinitions, promptFormOptions);
        return result === null ? null : result.input;
    }
    ;
    static promptSelect(message, choices, defaultValue, options = {}) {
        const selectDef = {
            tagName: 'select',
            children: choices.map((choice, index) => {
                const optionDef = {
                    tagName: 'option',
                    attr: {
                        value: choice
                    },
                    text: choice
                };
                if (choice === defaultValue) {
                    optionDef.attr.selected = 'true';
                }
                return optionDef;
            })
        };
        return Utils.prompt(message, null, { ...options, input: selectDef });
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
        else {
            return null;
        }
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
    static normalize(x, m = 1) { return x < m ? (x * x) / (m * m * 2) : 1 - (m / x / 2); }
    static lerp(a, b, weight = 0.5) { return a + weight * (b - a); }
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
            return PTSpace.averagePoints(points);
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
    static toDecimal(input, precision, options = { strict: true, pad: 0, prefix: false }) {
        const { strict, pad: leftPad, prefix: literalPositive } = options;
        const factor = Math.pow(10, precision);
        const value = Math.round(input * factor) / factor;
        if (!strict) {
            return String(value);
        }
        const parts = String(value).split('.');
        const prefix = literalPositive && value > 0 ? '+' : '';
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
            return prefix + parts.join('.');
        }
        else {
            return prefix + parts[0];
        }
    }
    ;
    static toTimecode(milliseconds, precision = 2, minimumUnits = 2) {
        const factors = [1000, 60, 60];
        let remainderMs = milliseconds;
        let cumulativeFactor = 1;
        return factors
            .map((factor, index) => {
            cumulativeFactor *= factor;
            let segment = (remainderMs / cumulativeFactor);
            if (index >= minimumUnits && segment < 1) {
                return null;
            }
            if (index < factors.length - 1) {
                segment %= factors[index + 1];
            }
            remainderMs -= segment * cumulativeFactor;
            return Utils.toDecimal(segment, index === 0 ? precision : 0, { pad: 2 });
        })
            .filter((x) => typeof x === 'string')
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
    static registerGlobalPromise(promise, group = GlobalPromiseGroup.MODAL) {
        if (!("penciltestGlobalPromises" in globalThis)) {
            globalThis.penciltestGlobalPromises = {};
        }
        const set = globalThis.penciltestGlobalPromises;
        if (!(group in set)) {
            set[group] = [];
        }
        set[group].push(promise);
        promise.finally(() => {
            const promiseIndex = set[group].indexOf(promise);
            if (promiseIndex !== -1) {
                set[group].splice(promiseIndex, 1);
            }
        });
    }
    static getGlobalPromises(group = GlobalPromiseGroup.MODAL) {
        const set = globalThis.penciltestGlobalPromises;
        if (set && set[group]) {
            return set[group];
        }
        return [];
    }
    static anyGlobalPromises(group = GlobalPromiseGroup.MODAL) {
        var _a;
        return Boolean(globalThis.penciltestGlobalPromises && ((_a = globalThis.penciltestGlobalPromises[group]) === null || _a === void 0 ? void 0 : _a.length) > 0);
    }
}
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
;
; // Identity with Arc, but a distinct name to clarify expectation no gap between start and end (end === start + 1).
class PTSpace {
    static boundsAroundPoint(point, radiusX, radiusY = NaN) {
        if (isNaN(radiusY)) {
            radiusY = radiusX;
        }
        return {
            x: point.x - radiusX,
            y: point.y - radiusY,
            width: radiusX * 2,
            height: radiusY * 2,
        };
    }
    static rectCenter(bounds) {
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
    static arcPoint(arc, angle) {
        return {
            x: Math.cos(Math.PI * 2 * angle) * arc.radius,
            y: Math.sin(Math.PI * 2 * angle) * arc.radius,
        };
    }
    static traceArc(config) {
        const arc = { ...PTSpace.defaultArc, ...config };
        const points = [];
        const arcStep = (arc.start < arc.end ? 1 : -1) / arc.resolution;
        let angle = arc.start;
        while (angle <= arc.end) {
            if (angle > arc.end) {
                angle = arc.end;
            }
            points.push(PTSpace.sumPoints(PTSpace.arcPoint(arc, angle), config.center));
            if (angle === arc.end) {
                break;
            }
            angle += arcStep;
            if (angle > arc.end) {
                angle = arc.end;
            }
        }
        return points;
    }
    static toPoint(coords) {
        if ("width" in coords) {
            return PTSpace.rectCenter(coords);
        }
        return {
            x: coords.x || 0,
            y: coords.y || 0
        };
    }
    static averagePoints(points) {
        const sumPoints = PTSpace.zeroPoint;
        for (let point of points) {
            sumPoints.x += point.x;
            sumPoints.y += point.y;
        }
        sumPoints.x /= points.length;
        sumPoints.y /= points.length;
        return sumPoints;
    }
    ;
    static scalePoint(point, factor) {
        const scaledPoint = {
            ...point, // for overloaded types like Mark
            x: point.x * factor,
            y: point.y * factor
        };
        return scaledPoint;
    }
    ;
    static scalePath(path, factor) {
        return path.map((p) => PTSpace.scalePoint(p, factor));
    }
    static magnitude(point) {
        return Math.sqrt(point.x * point.x + point.y * point.y);
    }
    ;
    static doesPathIntersect(path, area) {
        const isCircle = "radius" in area;
        const radiusX = isCircle ? area.radius : area.width / 2;
        const radiusY = isCircle ? area.radius : area.height / 2;
        const center = isCircle ? area.center : { x: area.x + radiusX, y: area.y + radiusY };
        const subdivisionLength = Math.max(radiusX, radiusY, 0.5) * 1.9; // A little less than the diameter, to make it more likely to intersect an edge of the area. Throwing in a non-zero literal, just in case.
        // TODO Test LINE segment intersection with area. #77af0b21-5b34-4831-b6e9-946de3146597
        // WORKAROUND(31e33644-5677-4cf7-ba3f-660befeb662c): Simulate midpoints along the line.
        // Performance is not terrible, even when the radius approaches 1.
        // Slowdown occurs around (with a radius of 5px on an 8-core Intel i7, 1.2GHz-3GHz):
        // * 10k points on eco (1.2GHz × 8)
        // * 30k points on performance (3.0 GHz × 8)
        //
        // Larger test area has better performance (as fewer midpoints are made).
        let lastPoint, midpoint, midpointStep = 1 / 2;
        for (let point of path) {
            midpointStep = lastPoint
                ? subdivisionLength / PTSpace.magnitude(PTSpace.diffPoints(point, lastPoint))
                : 1;
            for (let midPosition = 0; midPosition < 1; midPosition += midpointStep) {
                midpoint = midPosition === 0 || !lastPoint
                    ? point
                    : PTSpace.lerpPoint(point, lastPoint, midPosition); // Lerping backward*
                // * Somewhat counterintuitively, I'm making midpoints BACK from the
                //   current point. This is to serve a simpler intuition that we're
                //   testing THIS point NOW, rather than waiting for the next
                //   iteration.
                if (Math.abs(center.x - midpoint.x) < radiusX && Math.abs(center.y - midpoint.y) < radiusY) {
                    if (isCircle && PTSpace.magnitude(PTSpace.diffPoints(center, midpoint)) > radiusX) {
                        continue;
                    }
                    return true;
                }
            }
            lastPoint = point;
        }
        return false;
    }
    static expandRect(rect, radius) {
        return {
            ...rect,
            x: (rect.x || 0) - radius,
            y: (rect.y || 0) - radius,
            width: rect.width + radius * 2,
            height: rect.height + radius * 2,
        };
    }
    static lerpPoint(a, b, weight = 0.5) {
        return {
            x: Utils.lerp(a.x, b.x, weight),
            y: Utils.lerp(a.y, b.y, weight)
        };
    }
    static sumPoints(...points) {
        return points.reduce((sum, point) => {
            return {
                x: sum.x + point.x,
                y: sum.y + point.y
            };
        }, PTSpace.zeroPoint);
    }
    ;
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
}
PTSpace.zeroPoint = { x: 0, y: 0 };
PTSpace.defaultArc = {
    center: PTSpace.zeroPoint,
    radius: 10,
    start: 0,
    end: 1,
    resolution: 24,
};

"use strict";
class SceneState {
    constructor(overrides = {}) {
        Object.assign(this, {
            frames: [],
            exposureCount: 0,
            exposureNumber: 0,
            frameNumber: 0,
            strokeNumber: -1,
            ...overrides
        });
    }
}
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
        this.strokeColor = 'black';
        this.strokeWidth = 1;
        this.frames = [];
        this.current = new SceneState(sceneData.current || {});
        // Restrict assignment to existing keys in new scene.
        Object.keys(sceneData).forEach((key) => {
            if (key in this) {
                this[key] = sceneData[key];
            }
        });
        if (this.frames.length === 0) {
            this.newFrame();
        }
        if (!this.uuid) {
            if (typeof crypto !== 'undefined' && crypto !== null) {
                crypto.randomUUID();
            }
        }
        this.updateState();
    }
    getDimensions() {
        const aspectRatio = this.aspectRatio || '1:1';
        const ratioParts = aspectRatio.split(':').map(Number);
        const dimensions = {
            width: this.width,
            height: this.height,
            aspect: ratioParts[0] / ratioParts[1],
            aspectRatio,
            x: 0,
            y: 0,
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
    resolveFrameNumber(inputIndex, loop = false) {
        let realIndex = inputIndex;
        if (loop) {
            while ((realIndex < 0) || (realIndex >= this.frames.length)) {
                realIndex = (realIndex + this.frames.length) % this.frames.length;
            }
        }
        else {
            realIndex = Math.max(0, Math.min(this.frames.length - 1, realIndex));
        }
        return realIndex;
    }
    newFrame(insertAtIndex = -1, count = 1, options = {}) {
        const newFrames = [];
        for (let i = 0; i < count; i++) {
            const frame = {
                hold: this.getFrameHold(),
                strokes: [],
                ...options
            };
            newFrames.push(frame);
        }
        if (insertAtIndex === -1) {
            insertAtIndex = this.frames.length;
        }
        Array.prototype.splice.apply(this.frames, [insertAtIndex, 0].concat(newFrames));
        this.updateState();
        return newFrames;
    }
    getCurrentFrame(makeIfEmpty = false) {
        if (makeIfEmpty) {
            if (this.frames.length === 0) {
                this.current.frameNumber = 0;
                return this.newFrame()[0];
            }
        }
        return this.frames[this.current.frameNumber || 0];
    }
    setCurrentFrameNumber(frameNumber, loop = true) {
        return this.current.frameNumber = this.resolveFrameNumber(frameNumber, loop);
    }
    ;
    insertFrames(frames, insertFrameNumber, jumpToOffset = -1) {
        Array.prototype.splice.apply(this.frames, [insertFrameNumber, 0].concat(frames));
        this.updateState();
        this.setCurrentFrameNumber(insertFrameNumber + (jumpToOffset < 0
            ? frames.length + jumpToOffset
            : jumpToOffset));
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
    getCurrentStroke(makeNewIfEmpty = false) {
        const frame = this.getCurrentFrame(makeNewIfEmpty);
        const isNewStroke = this.current.strokeNumber === -1;
        if (isNewStroke || makeNewIfEmpty) {
            if (!("strokes" in frame)) {
                frame.strokes = [];
            }
            if (isNewStroke || (makeNewIfEmpty && frame.strokes.length === 0)) {
                this.current.strokeNumber = frame.strokes.length;
                const stroke = { path: [] };
                frame.strokes.push(stroke);
                return stroke;
            }
        }
        if (!(frame === null || frame === void 0 ? void 0 : frame.strokes)) {
            throw new Error('Missing strokes on current frame in scene.');
        }
        return frame.strokes[this.current.strokeNumber > -1 ? this.current.strokeNumber : frame.strokes.length - 1];
    }
}
PenciltestScene.defaultOptions = {
    frameHold: 2,
    framerate: 24,
    loop: false,
    strokeColor: 'black',
    strokeCorner: 'round',
    strokeOpacity: 1,
    strokeWidth: 1,
    aspectRatio: '1:1',
    height: 1024
};
PenciltestScene.defaultAudioOptions = {
    offset: 0,
    volume: 100,
};

"use strict";
;
;
;
class PenciltestMigrationBase {
    constructor() {
        this.fromVersion = '0.0.0';
        this.toVersion = '0.0.0';
    }
}
class PTMigration_v0_to_v0_0_4 extends PenciltestMigrationBase {
    constructor() {
        super();
        this.fromVersion = '0.0.0';
        this.toVersion = '0.0.4';
    }
    migrateScene(film) {
        // change strokes from Raphael SVG format to simple arrays
        for (let frameIndex = 0; frameIndex < film.frames.length; frameIndex++) {
            const frame = film.frames[frameIndex];
            for (let strokeIndex = 0; strokeIndex < frame.strokes.length; strokeIndex++) {
                const stroke = frame.strokes[strokeIndex];
                for (let segmentIndex = 0; segmentIndex < stroke.length; segmentIndex++) {
                    const segment = stroke[segmentIndex];
                    if (typeof segment === 'string') {
                        const newSegment = segment.replace(/[ML]/g, '').split(' ').map(Number);
                        if (newSegment.length !== 2) {
                            throw new Error(`bad stroke segment '${segment}': f${frameIndex}:p${strokeIndex}:s${segmentIndex}`);
                        }
                        if (isNaN(newSegment[0]) || isNaN(newSegment[1])) {
                            throw new Error(`NaN stroke segment '${segment}':  f${frameIndex}:p${strokeIndex}:s${segmentIndex}`);
                        }
                        for (let i = 0, end = newSegment.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
                            newSegment[i] = Number(newSegment[i]);
                        }
                        film.frames[frameIndex].strokes[strokeIndex][segmentIndex] = newSegment;
                    }
                }
            }
        }
        return film;
    }
    migrateStorage(name, get) {
        if (!/^film:/.test(name)) {
            return null;
        }
        const film = get();
        if (!film || !film.frames || !film.frames.length) {
            return null;
        }
        return this.migrateScene(film);
    }
}
PTMigration_v0_to_v0_0_4.fromVersion = '0.0.0';
PTMigration_v0_to_v0_0_4.toVersion = '0.0.4';
;
class PTMigration_v0_2_0_to_v0_3_0 extends PenciltestMigrationBase {
    constructor() {
        super();
        this.fromVersion = '0.2.0';
        this.toVersion = '0.3.0';
    }
    migrateScene(scene) {
        var _a, _b, _c;
        // BEGIN: `aspect` is a number, and `aspectRatio` is a string.
        if (typeof (scene === null || scene === void 0 ? void 0 : scene.aspect) === 'string' && typeof (scene === null || scene === void 0 ? void 0 : scene.aspectRatio) !== 'string') {
            scene.aspectRatio = scene.aspect;
            delete scene.aspect;
        }
        // BEGIN: `stroke` has other properties, so points moved to `.path[]`.
        if (Array.isArray(scene === null || scene === void 0 ? void 0 : scene.frames)) {
            scene === null || scene === void 0 ? void 0 : scene.frames.forEach((frame) => {
                if (!Array.isArray(frame.strokes)) {
                    return;
                }
                ;
                frame.strokes = frame.strokes.map((stroke) => {
                    if (!Array.isArray(stroke)) {
                        return { old: stroke };
                    }
                    return {
                        path: stroke.map((coords) => {
                            const point = {
                                x: coords[0],
                                y: coords[1]
                            };
                            if (coords.length === 3) {
                                if (coords[2] && (!Array.isArray(coords[2]) || coords[2].length > 0)) {
                                    point.etc = coords[2];
                                }
                            }
                            else if (coords.length > 3) {
                                point.etc = coords.slice(2);
                            }
                            return point;
                        })
                    };
                });
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
        return scene;
    }
}
;
class PTMigration_v0_3_0_to_v0_3_1 extends PenciltestMigrationBase {
    constructor() {
        super();
        this.fromVersion = '0.3.0';
        this.toVersion = '0.3.1';
    }
    migrateApp(controller) {
        // BEGIN: onion skin opacity is part of the color, and so configurable separately forward and backward.
        const onionSkinOpacity = controller.options.onionSkinOpacity;
        controller.options.onionSkinForwardColor = [0, 200, 50, onionSkinOpacity];
        controller.options.onionSkinBackwardColor = [220, 0, 0, onionSkinOpacity];
        delete controller.options.onionSkinOpacity;
    }
    migrateScene(scene) {
        // BEGIN: `line-` prefix changed to `stroke-`
        Object.assign(scene.options, {
            strokeColor: scene.options.lineColor,
            strokeWeight: scene.options.lineWeight,
            strokeOpacity: scene.options.lineOpacity,
            strokeCorner: scene.options.lineCorner,
        });
        delete scene.options.lineColor;
        delete scene.options.lineWeight;
        delete scene.options.lineOpacity;
        delete scene.options.lineCorner;
        return scene;
    }
}
;
class PTMunger_V0_3_0 {
    constructor() {
        this.version = '0.3.0';
        this.packSeparators = {
            stroke: "|",
            point: ';',
            coord: ','
        };
    }
    packNumber(value) {
        return Utils.toDecimal(value, 2);
    }
    unpackNumber(value) {
        return Number(value);
    }
    packPoint(point) {
        return `${this.packNumber(point.x)}${this.packSeparators.coord}${this.packNumber(point.y)}`;
    }
    unpackPoint(packedPoint) {
        const coords = packedPoint.split(this.packSeparators.coord).map(this.unpackNumber.bind(this));
        return { x: coords[0], y: coords[1] };
    }
    packStroke(stroke, scene) {
        const packedStrokeObject = { ...stroke };
        delete packedStrokeObject.path;
        let packedStrokeString = stroke.path
            .map(this.packPoint.bind(this))
            .join(this.packSeparators.point);
        if (Object.keys(packedStrokeObject).length > 0) {
            packedStrokeString += JSON.stringify(packedStrokeObject);
        }
        return packedStrokeString;
    }
    unpackStroke(packedStroke) {
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
            .map(this.unpackPoint.bind(this));
        return stroke;
    }
    packFrame(frame, scene) {
        var _a;
        const packedFrame = {
            ...frame,
        };
        if (((_a = frame.strokes) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            packedFrame.packedStrokes = frame.strokes
                .map((stroke) => this.packStroke(stroke, scene))
                .join(this.packSeparators.stroke);
        }
        if (packedFrame.hold === scene.frameHold) {
            delete packedFrame.hold;
        }
        delete packedFrame.strokes;
        return packedFrame;
    }
    unpackFrame(frame, scene) {
        var _a;
        if (!((_a = frame.packedStrokes) === null || _a === void 0 ? void 0 : _a.length)) {
            return frame;
        }
        const unpackedFrame = {
            hold: scene.frameHold,
            ...frame,
            strokes: frame.packedStrokes
                .split(this.packSeparators.stroke)
                .map(this.unpackStroke.bind(this))
        };
        delete unpackedFrame.packedStrokes;
        return unpackedFrame;
    }
    packScene(scene) {
        const packedScene = {
            ...scene,
            frames: scene.frames.map((frame) => this.packFrame(frame, scene))
        };
        return packedScene;
    }
    unpackScene(packedScene) {
        const scene = new PenciltestScene(packedScene);
        scene.frames = scene.frames.map((frame) => this.unpackFrame(frame, scene));
        return scene;
    }
}
;
;
class PTMunger_V0_3_1 extends PTMunger_V0_3_0 {
    constructor() {
        super();
        this.version = '0.3.1';
        this.packedScale = 100;
    }
    analyzeScene(scene) {
        const analysis = {
            colorCount: {},
            widthCount: {},
        };
        const sceneStrokeWidth = scene.strokeWidth || 1;
        const sceneStrokeColor = Utils.getColorString(scene.strokeColor || ColorHexNames.black, scene.strokeOpacity || -1);
        if (!(sceneStrokeColor in analysis.colorCount)) {
            analysis.colorCount[sceneStrokeColor] = 0;
        }
        analysis.colorCount[sceneStrokeColor]++;
        scene.frames.forEach((frame) => {
            frame.strokes.forEach((stroke) => {
                const strokeWidth = "width" in stroke
                    ? stroke.width
                    : sceneStrokeWidth;
                const widthString = String(strokeWidth);
                if (!(widthString in analysis.widthCount)) {
                    analysis.widthCount[widthString] = 0;
                }
                analysis.widthCount[widthString]++;
                const colorString = Utils.getColorString(stroke.strokeColor) || sceneStrokeColor;
                // Sounds redundant, but a stroke COULD also have a fill color.
                if (!(colorString in analysis.colorCount)) {
                    analysis.colorCount[colorString] = 0;
                }
                analysis.colorCount[colorString]++;
            });
        });
        analysis.colors = Object.keys(analysis.colorCount)
            .filter((key) => analysis.colorCount[key] !== 1) // omit singletons
            .sort((a, b) => analysis.colorCount[b] - analysis.colorCount[a]); // descending
        analysis.widths = Object.keys(analysis.widthCount)
            .filter((key) => analysis.widthCount[key] !== 1) // omit singletons
            .sort((a, b) => analysis.widthCount[b] - analysis.widthCount[a]); // descending
        return analysis;
    }
    packScene(scene) {
        this.analysis = this.analyzeScene(scene);
        const packedScene = super.packScene(scene);
        packedScene.pack = {
            scale: this.packedScale,
        };
        packedScene.strokeWidth = Number(this.analysis.widths[0]);
        packedScene.strokeColor = this.analysis.colors[0];
        return packedScene;
    }
    unpackScene(packedScene) {
        if ("pack" in packedScene) {
            this.packedScale = packedScene.pack.scale;
            this.analysis = {
                colors: packedScene.pack.colors || [],
            };
        }
        const sceneData = super.unpackScene(packedScene);
        return sceneData;
    }
    packStroke(stroke, scene) {
        const packedStrokeObject = { ...stroke };
        if (!("width" in packedStrokeObject)) {
            packedStrokeObject.width = scene.strokeWidth;
        }
        if (String(packedStrokeObject.width) === this.analysis.widths[0]) {
            delete packedStrokeObject.width;
        }
        if (!("strokeColor" in packedStrokeObject)) {
            packedStrokeObject.strokeColor = scene.strokeColor || ColorHexNames.black;
        }
        if (packedStrokeObject.strokeColor === this.analysis.colors[0]) {
            delete packedStrokeObject.strokeColor;
        }
        return super.packStroke(packedStrokeObject, scene);
    }
    unpackStroke(packedStroke) {
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
            .map(this.unpackPoint.bind(this));
        return stroke;
    }
    packPoint(point) {
        const coords = [point.x, point.y].map(this.packNumber);
        if ("weight" in point && point.weight !== 1) {
            coords.push('w' + this.packNumber(point.weight));
        }
        return coords.join(this.packSeparators.coord);
    }
    unpackPoint(packedPoint) {
        const coords = packedPoint.split(this.packSeparators.coord);
        const mark = {
            x: this.unpackNumber(coords[0]),
            y: this.unpackNumber(coords[1]),
        };
        if (coords[2] && coords[2][0] === 'w') {
            mark.weight = this.unpackNumber(coords[2].substr(1));
        }
        return mark;
    }
    packNumber(value) {
        return String(Math.floor(value * this.packedScale));
    }
    unpackNumber(value) {
        return Number(value) / this.packedScale;
    }
}
;
class PTMigration_debug extends PenciltestMigrationBase {
    constructor() {
        super();
        this.fromVersion = Penciltest.version;
        this.toVersion = Penciltest.debugVersion;
    }
    migrateScene(scene) { return scene; }
}
;
class PenciltestMigrator {
    constructor() {
        this.mungers = [
            new PTMunger_V0_3_0(),
            new PTMunger_V0_3_1(),
        ];
        this.migrations = [
            new PTMigration_v0_to_v0_0_4(),
            // TODO rename 'film' localStorage namespace to 'scene'. Which version did that happen in?  2026-07-31 uuid:ee574c36-476a-4a59-86ca-7c9a203b52f8
            new PTMigration_v0_2_0_to_v0_3_0(),
            new PTMigration_debug()
        ];
    }
    compareVersions(va, vb) {
        const prepVersionParts = (version) => version
            .split('.')
            .slice(0, 3)
            .map((x) => isNaN(Number(x)) ? 0 : Number(x));
        const vaParts = prepVersionParts(va);
        const vbParts = prepVersionParts(vb);
        return vaParts.reduce((diff, xa, i) => {
            const xb = vbParts[i];
            if (diff !== 0) {
                return diff;
            }
            if (xa === xb) {
                return 0;
            }
            if (xa > xb) {
                return 1;
            }
            if (xa < xb) {
                return -1;
            }
        }, 0);
    }
    static filterByMethods(methodNames) {
        return (migration) => {
            for (let methodName of methodNames) {
                if (typeof migration[methodName] !== 'function') {
                    return false;
                }
            }
            return true;
        };
    }
    getSceneVersion(sceneData) {
        var _a;
        return ((_a = sceneData.instrument) === null || _a === void 0 ? void 0 : _a.version) || sceneData.version;
    }
    getMigrationsByVersion(fromVersion, toVersion) {
        let start = -Infinity, end = Infinity;
        this.migrations.forEach((migration, i) => {
            if (this.compareVersions(fromVersion, migration.fromVersion) != -1) {
                start = i;
            }
            if (start > -Infinity && this.compareVersions(toVersion, migration.toVersion) != 1) {
                end = i;
            }
        });
        return this.migrations.slice(start, end + 1); // Include end index in slice.
    }
    getMunger(sceneData) {
        const sceneDataVersion = this.getSceneVersion(sceneData);
        for (let i = this.mungers.length - 1; i >= 0; i--) {
            const mungerIsTooNew = this.compareVersions(sceneDataVersion, this.mungers[i].version) === -1;
            if (!mungerIsTooNew) {
                // munger version is not newer than scene version
                return this.mungers[i];
            }
        }
        return null;
    }
    async packScene(scene) {
        return new Promise((resolve, reject) => {
            var _a, _b, _c;
            try {
                const munger = this.getMunger(scene);
                if (typeof (munger === null || munger === void 0 ? void 0 : munger.packScene) === 'function') {
                    try {
                        const packedScene = munger.packScene(Utils.clone(scene));
                        if ((_a = packedScene.current) === null || _a === void 0 ? void 0 : _a.frames) {
                            delete packedScene.current.frames;
                        }
                        debugger;
                        if ((_b = packedScene.current) === null || _b === void 0 ? void 0 : _b.singleFrameDuration) {
                            packedScene.current.singleFrameDuration = Utils.toDecimal(packedScene.current.singleFrameDuration, 3);
                        }
                        if ((_c = packedScene.current) === null || _c === void 0 ? void 0 : _c.duration) {
                            packedScene.current.duration = Utils.toDecimal(packedScene.current.duration, 3);
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
            }
            catch (e) {
                console.error(e);
            }
            resolve(scene);
        });
    }
    async unpackScene(packedScene) {
        return new Promise((resolve, reject) => {
            const munger = this.getMunger(packedScene);
            if (typeof (munger === null || munger === void 0 ? void 0 : munger.unpackScene) === 'function') {
                try {
                    resolve(munger.unpackScene(packedScene));
                    return;
                }
                catch (e) {
                    console.error(e);
                }
            }
            resolve(packedScene);
        });
    }
    async migrateScene(startingSceneData, untilVersion = '') {
        let startingVersion = this.getSceneVersion(startingSceneData);
        if (!untilVersion) {
            untilVersion = Penciltest.version;
        }
        const context = { fromVersion: startingVersion, toVersion: startingVersion, errorMessage: '' };
        const scene = this.getMigrationsByVersion(startingVersion, untilVersion)
            .filter(PenciltestMigrator.filterByMethods(['migrateScene']))
            .reduce((scene, migration) => {
            try {
                const migratedScene = migration.migrateScene(scene);
                if (!("instrument" in migratedScene)) {
                    migratedScene.instrument = {};
                }
                migratedScene.instrument.version = migration.toVersion;
                context.toVersion = migration.toVersion;
                return migratedScene;
            }
            catch (e) {
                console.error(e);
                context.errorMessage = e.message;
            }
            return scene;
        }, startingSceneData);
        return [scene, context];
    }
    migrateStorage(untilVersion = '') {
        if (!untilVersion) {
            untilVersion = Penciltest.version;
        }
        const migrations = this.getMigrationsByVersion('0.0.0', untilVersion)
            .filter(PenciltestMigrator.filterByMethods(['migrateStorage']));
        const makeStorageGetter = (storageName, data, is) => {
            return () => {
                if (!is.retrieved && data === null) {
                    data = globalThis.localStorage.getItem(storageName);
                    is.retrieved = true;
                    try {
                        data = JSON.parse(data);
                        is.json = true;
                    }
                    catch (ignore) { }
                }
                return data;
            };
        };
        for (let storageName in globalThis.localStorage) {
            const is = {};
            const migratedData = migrations.reduce((data, migration) => {
                const get = makeStorageGetter(storageName, data, is);
                const result = migration.migrateStorage(storageName, get);
                if (result === null) {
                    return data;
                }
                return result;
            }, null);
            if (migratedData !== null) {
                globalThis.localStorage.setItem(storageName, typeof migratedData === 'string' && !is.json
                    ? migratedData
                    : JSON.stringify(migratedData));
            }
        }
    }
}

"use strict";
class PenciltestUIComponent {
    static restore(options, components) {
        if (options.is) {
            return options.is;
        }
        if (options.key && options.key in components) {
            const component = components[options.key];
            component.setContent(options);
            return component;
        }
        return new PenciltestUIComponent(options, components);
    }
    static find(element, components) {
        const key = element.getAttribute('x-key');
        if (key) {
            return PenciltestUIComponent.restore({ key }, components);
        }
        return null;
    }
    constructor(options, components = {}) {
        this.isPTComponent = true;
        this.options = {
            tagName: 'div',
            ...options
        };
        this.components = components;
        this.children = [];
        this.el = {};
        //this.refreshHandlers = [];
        const element = this.setElement(options.el || document.createElement(this.options.tagName || 'div'));
        if (this.options.key) {
            element.setAttribute('x-key', this.options.key);
        }
        if (this.options.on) {
            for (let eventName in this.options.on) {
                const boundListener = this.options.on[eventName].bind(this.getElement());
                this.getElement().addEventListener(eventName, (event) => {
                    boundListener(event, this.components);
                });
            }
        }
        this.setContent(this.options, true);
        //if (this.options.children) {
        //  this.options.children.forEach(
        //    (childConfig:PenciltestUIComponentOptions) => PenciltestUIComponent.restore({...childConfig, parent: this}, this.components)
        //  );
        //}
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
        // NOTE: The 'key' property is necessary for children components to also have their content updated.
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
        if (config.children) {
            config.children.forEach((childConfig) => {
                const childConfigWithThisAsParent = {
                    ...childConfig,
                    parent: this,
                };
                if (!force && !childConfigWithThisAsParent.key) {
                    return;
                } // Avoiding assumptions of persistent child node order.
                const childComponent = PenciltestUIComponent.restore(childConfigWithThisAsParent, this.components);
                if (typeof childComponent.setContent !== 'function') {
                    return;
                }
                //childComponent.setContent(childConfigWithThisAsParent); //restore already calls setContent
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
    attachChild(child) {
        this.getElement().appendChild(child.getElement());
        this.children.push(child);
    }
    getElement() { return this.el.container; }
    setElement(element) { return this.el.container = element; }
}

"use strict";
class BaseRenderer {
    constructor(options) {
        this.options = {
            ...BaseRenderer.defaultOptions,
            ...options
        };
        this.renderOperationQueue = [];
        this.renderWaitId = NaN;
        if (typeof this.options.container === 'string') {
            this.container = document.querySelector(this.options.container);
        }
        else {
            this.container = this.options.container;
        }
        this.overrides = {};
        this.composeOptions();
        //this.resize(this.options.width, this.options.height); // Let descendants do this. It might not be ready yet.
    }
    setOptions(options) {
        if (this.options.debug) {
            console.log('   setOptions');
        }
        Object.assign(this.options, options);
    }
    resize(width, height) {
        if (this.options.debug) {
            console.log('  resize');
        }
        this.width = width;
        this.height = height;
    }
    composeOptions(options = {}, persist = null) {
        this.currentStyle = {
            ...this.options
        };
        if (persist === true) {
            Object.assign(this.overrides, options);
        }
        if (persist !== false) {
            Object.assign(this.currentStyle, this.overrides);
        }
        if (persist !== true) {
            Object.assign(this.currentStyle, options);
        }
    }
    subpath(path) {
        if (this.options.debug) {
            console.log(' subpath');
        }
        path.forEach((segment, index) => {
            const { x, y } = segment;
            if (index === 0) {
                this.moveTo(x, y);
            }
            else {
                this.lineTo(x, y);
            }
        });
    }
    moveTo(x, y) {
        if (this.options.debug) {
            console.log('moveTo: %s, %s', x, y);
        }
    }
    moveToPoint(point) {
        this.moveTo(point.x, point.y);
    }
    lineTo(x, y) {
        if (this.options.debug) {
            console.log('lineTo: %s, %s', x, y);
        }
    }
    lineToPoint(point) {
        this.lineTo(point.x, point.y);
    }
    rect(rect, options) {
        if (this.options.debug) {
            console.log('rect');
        }
    }
    requestRender(...enqueueWork) {
        if (this.options.debug) {
            console.log('   render: REQ');
        }
        if (enqueueWork.length > 0) {
            Array.prototype.push.apply(this.renderOperationQueue, enqueueWork);
        }
        if (!isNaN(this.renderWaitId)) {
            return;
        } // Already pending request.
        this.renderWaitId = globalThis.requestAnimationFrame((timestamp) => {
            this.renderWaitId = NaN;
            this.render(timestamp);
        });
    }
    render(timestamp = 0) {
        if (this.options.debug) {
            console.log('   render:     BEGIN');
        }
        const queueLength = this.renderOperationQueue.length;
        if (queueLength === 0) {
            return;
        }
        const renderStart = performance.now();
        this.renderOperationQueue.forEach((o) => o(this, timestamp));
        const renderElapsed = performance.now() - renderStart;
        if (this.options.debug) {
            console.log(`   render:           DONE (${renderElapsed} ms, ${queueLength} operations)`);
        }
        this.renderOperationQueue = [];
    }
    getFieldRect() {
        if (this.options.debug) {
            console.log('  getFieldRect');
        }
        return { x: 0, y: 0, width: this.width, height: this.height };
    }
    beginPath(options = null) {
        if (this.options.debug) {
            console.log('beginPath');
        }
        if (options !== null) {
            this.composeOptions(options);
        }
    }
    endPath() {
        if (this.options.debug) {
            console.log('endPath');
        }
    }
    clear(redrawBackground = true) {
        if (this.options.debug) {
            console.log(` clear${redrawBackground ? ' BACK' : ''}`);
        }
        if (redrawBackground && this.options.background !== 'transparent') {
            const fieldRect = this.getFieldRect();
            this.rect(fieldRect, { fillColor: this.options.background });
        }
    }
    destroy() {
        if (this.options.debug) {
            console.log('   destroy');
        }
    }
    arc(arc, options = {}) {
        Object.assign(arc, PTSpace.defaultArc, arc);
        const arcPoints = PTSpace.traceArc(arc);
        this.composeOptions(options);
        if (this.options.debug) {
            console.log(` arc ⊙ ${arc.radius} ⊾ ${arc.end - arc.start} ▷ ${arc.resolution} ▦ ${arc.center.x},${arc.center.y} ⾊ ${this.currentStyle.strokeColor}`);
        }
        this.subpath(arcPoints);
    }
    circle(arc, options) {
        if (this.options.debug) {
            console.log({ 'fn': 'circle', arc, options });
        }
        const circle = { start: 0, ...arc };
        circle.end = circle.start + 1;
        this.arc(circle, options);
        // Maybe other contexts will have diferent logic. For now, the default
        // "arc" without arguments is a circle, so `arc` and `circle` are the same
        // for now..
    }
    text(text, options) {
        if (this.options.debug) {
            console.log({ 'fn': 'text', text, options });
        }
    }
}
BaseRenderer.defaultOptions = {
    container: 'body',
    strokeColor: 'black',
    background: 'lightgray',
    strokeWidth: 1,
    strokeOpacity: 1,
    strokeCorner: 'round',
    width: 1920,
    height: 1080,
    debug: false
};

"use strict";
class CanvasRenderer extends BaseRenderer {
    //container: HTMLElement;
    constructor(options) {
        super(options);
        this.field = document.createElement('canvas');
        this.field.style.backgroundColor = Utils.getColorString(this.options.background);
        this.context = this.field.getContext('2d', { alpha: options.alpha });
        this.resize(this.options.width, this.options.height);
        this.container.appendChild(this.field);
        this.applyStyle(); // Was skipped over in super's composeOptions, because this.context can't be set before super() is called.
    }
    beginPath() {
        super.beginPath();
        this.context.beginPath();
    }
    endPath() {
        this.context.strokeStyle = this.currentCanvasStyle.strokeStyle;
        super.endPath();
        this.context.stroke();
    }
    moveTo(x, y) {
        super.moveTo(x, y);
        this.context.moveTo(x, y);
    }
    lineTo(x, y) {
        super.lineTo(x, y);
        return this.context.lineTo(x, y);
    }
    rect(rect, options) {
        const { x, y, width, height } = rect;
        //this.beginPath();
        this.composeOptions(options);
        if (options.fillColor && !options.strokeColor) {
            this.context.fillStyle = this.currentCanvasStyle.fillStyle;
            this.context.fillRect(x, y, width, height);
        }
        else {
            this.context.rect(x, y, width, height);
        }
        if (options.strokeColor) {
            this.context.strokeStyle = this.currentCanvasStyle.strokeStyle;
            this.context.stroke();
        }
        super.rect(rect, options);
    }
    applyStyle() {
        if (this.context) {
            Object.assign(this.context, this.currentCanvasStyle);
        }
    }
    composeOptions(overrides = {}, persist = null) {
        super.composeOptions(overrides);
        this.currentCanvasStyle = {
            fillStyle: Utils.getColorString(this.currentStyle.fillColor, "fillOpacity" in this.currentStyle ? this.currentStyle.fillOpacity : -1),
            strokeStyle: Utils.getColorString(this.currentStyle.strokeColor, "strokeOpacity" in this.currentStyle ? this.currentStyle.strokeOpacity : -1),
            lineJoin: this.currentStyle.strokeCorner,
            lineWidth: this.currentStyle.strokeWidth,
        };
        this.applyStyle();
    }
    clear(redrawBackground = true) {
        const { x, y, width, height } = this.getFieldRect();
        this.context.clearRect(x, y, width, height);
        return super.clear(redrawBackground);
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
    arc(arc, options = {}) {
        if (this.options.debug) {
            console.log(` arc ⊙ ${arc.radius} ⊾ ${arc.end - arc.start} ▷ ${arc.resolution} ▦ ${arc.center.x},${arc.center.y} ⾊ ${this.currentStyle.strokeColor} (${this.currentCanvasStyle.strokeStyle})`);
        }
        this.composeOptions(options);
        this.applyStyle();
        this.context.arc(arc.center.x, arc.center.y, arc.radius, arc.start * Math.PI * 2, arc.end * Math.PI * 2);
    }
    text(text, options) {
        super.text(text, options);
        const { anchor, fillColor, font, strokeColor, strokeFirst, strokeWidth, } = {
            fillColor: 'black',
            font: '12px sans-serif',
            strokeColor: '',
            strokeFirst: false,
            strokeWidth: 0,
            ...options
        };
        this.context.font = font;
        const renderOperations = [];
        if (fillColor) {
            renderOperations.push(() => {
                this.context.fillStyle = fillColor;
                this.context.fillText(text, anchor.x, anchor.y);
            });
        }
        if (strokeColor && strokeWidth) {
            renderOperations.push(() => {
                this.context.strokeStyle = strokeColor;
                this.context.lineWidth = strokeWidth;
                this.context.strokeText(text, anchor.x, anchor.y);
            });
        }
        if (strokeFirst && renderOperations.length > 1) {
            renderOperations.reverse();
        }
        renderOperations.forEach((o) => o());
    }
}

"use strict";
;
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
                stroke: Utils.getColorString(this.options.strokeColor)
            });
        }
        return super.render();
    }
    clear(redrawBackground = true) {
        this.field.clear();
        return super.clear(redrawBackground);
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
                Scene: [
                    {
                        'open/new': [
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
                    'config',
                    'loop',
                    'framerate',
                    'frameHold',
                    'background',
                    'strokeColor',
                    'resizeScene',
                    'moveFrameContents',
                ],
                Tools: [
                    'scrubAudio',
                    'hideCursor',
                    'onionSkin',
                    'smoothing',
                    'smoothFrame',
                    'smoothScene',
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
                Settings: [
                    'toggleInterfaceHelp',
                    'config',
                    'renderer',
                    'reset',
                    'debug',
                    'showStatus',
                ],
            },
        ];
        this.appActions = {
            showMenu: {
                label: "Show Menu",
                hotkey: ['F'],
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
                    if (this.sceneRenderer != null) {
                        this.sceneRenderer.destroy();
                    }
                    this.prepareRenderers();
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
                hotkey: ['Home', 'PgUp'],
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
                label: lc('%%\\uselect%% %%scene%%'),
                title: lc('selectAllFrames'),
                hotkey: ['Ctrl+A'],
                cancelComplementKeyEvent: true,
                listener(event) {
                    this.state.frameSelection = { start: 0, end: this.scene.frames.length - 1 };
                    this.ui.showFeedback({ text: lc(`%%\\uselect%%ed all ${this.scene.frames.length} %%frame%%s`) });
                }
            },
            copyFrames: {
                label: "Copy Frames/Strokes",
                hotkey: ['C'],
                hotkeyModifiers: ['Control'],
                listener() {
                    const [copiedFrames] = this.copyFrames();
                    this.ui.showFeedback({ text: lc(`%%\\ucopied%% ${copiedFrames.length} %%frame%%${copiedFrames.length !== 1 ? 's' : ''}`) });
                    this.ui.clearSelection();
                }
            },
            pasteFrames: {
                label: "Paste Frames",
                hotkey: ['V'],
                hotkeyModifiers: ['Control'],
                listener() {
                    this.pasteFrames();
                    this.ui.showFeedback({ text: `Pasted ${this.copyBuffer.length} frame${this.copyBuffer.length !== 1 ? 's' : ''}` });
                    this.ui.clearSelection();
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
                    this.scrubAudio();
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
                    this.scrubAudio();
                    this.ui.showFeedback({ text: 'Inserted frame after' });
                }
            },
            insertSeconds: {
                label: "Insert Seconds",
                hotkey: ['Alt+Shift+I'],
                async listener() {
                    const newIndex = this.scene.current.frameNumber + 1;
                    const secondsInput = await Utils.prompt('# of seconds to insert: ', 1);
                    if (typeof secondsInput !== 'string') {
                        return;
                    }
                    const seconds = Number(secondsInput);
                    const insertFrameCount = Math.floor(this.scene.framerate / (this.scene.getFrameHold() * seconds));
                    this.scene.newFrame(newIndex, insertFrameCount);
                    this.goToFrame(newIndex);
                    this.ui.showFeedback({ text: `Inserted ${insertFrameCount} frames, beginnging at frame ${newIndex}` });
                }
            },
            undo: {
                label: "Undo",
                title: "Remove the last line drawn",
                hotkey: ['Z', 'Ctrl+Z'],
                gesture: /3 still from left/,
                repeat: true,
                listener() {
                    this.undo();
                    this.ui.showFeedback({ text: `Undo` });
                }
            },
            redo: {
                label: "Redo",
                title: "Put back a line removed by 'Undo'",
                hotkey: ['Shift+Z', 'Ctrl+Shift+Z', 'Ctrl+Y'],
                gesture: /3 still from right/,
                repeat: true,
                listener() {
                    this.redo();
                    this.ui.showFeedback({ text: `Redo` });
                }
            },
            strokeColor: {
                label: "Line Color",
                async listener() {
                    const strokeColor = await Utils.prompt('line color: ', this.scene.strokeColor, { 'input': 'color' });
                    if (strokeColor) {
                        this.setOptions({ strokeColor });
                    }
                },
                action() {
                    if (this.scene) {
                        this.scene.strokeColor = this.options.strokeColor;
                    }
                    //if (this.sceneRenderer) {
                    //  this.sceneRenderer.options.strokeColor = this.options.strokeColor;
                    //  this.drawCurrentFrame();
                    //}
                }
            },
            background: {
                label: "Background Color",
                async listener() {
                    const bg = await Utils.prompt('background color: ', this.scene.background, { 'input': 'color' });
                    if (bg) {
                        this.setOptions({ background: bg });
                    }
                },
                action() {
                    if (this.scene) {
                        this.scene.background = this.options.background;
                    }
                    if (this.sceneRenderer) {
                        this.sceneRenderer.options.background = this.options.background;
                    }
                    this.drawCurrentFrame();
                }
            },
            framerate: {
                label: "Frame rate",
                async listener() {
                    const oldFrameRate = this.scene.framerate;
                    const newFramerate = Number(await Utils.prompt(`${lc('promptSetFramerate')}:<br><small>FPS, frames per second</small>`, this.scene.framerate));
                    if (newFramerate === null) {
                        return;
                    }
                    if (newFramerate && newFramerate !== oldFrameRate) {
                        const newOptions = { framerate: newFramerate };
                        const [isMultiple, absFactor, factorError, newIsLarger] = Utils.isMultiple(newFramerate, oldFrameRate, 0.002);
                        const promptMessage = `Adjust all frame hold times?\nThe new frame rate is ${isMultiple ? 'exactly' : `approximately`} ${absFactor} times ${newIsLarger ? 'faster' : 'slower'} than before${isMultiple ? '' : ` (${Utils.toDecimal(factorError, 3)} off)`}.`;
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
                    const hold = await Utils.prompt('default exposures per drawing: ', this.options.frameHold);
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
                hotkey: ['O'],
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
                    this.ui.clearSelection();
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
                    this.ui.clearSelection();
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
                            max: 5,
                            step: 0.1
                        },
                        labelLogic: (smoothing) => smoothing
                    };
                    const smoothing = await Utils.prompt('Smoothing', this.options.smoothing, promptOptions);
                    if (smoothing === null) {
                        return;
                    }
                    this.setOptions({ smoothing: Number(smoothing) });
                },
                action() {
                    this.ui.updateStatusBar();
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
                    if (startMode === PenciltestMode.WORKING) {
                        console.info(`Penciltest is: ${startMode}`);
                        return;
                    }
                    const amount = Number(await Utils.prompt('Smoothing all frames in this scene. By how much? 1-5', 2));
                    if (amount === null || Number(amount) < 1) {
                        return;
                    }
                    return await this.smoothScene(Number(amount));
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
                listener() { this.setOptions({ debug: !this.options.debug }); },
                action() {
                    if (this.scene) {
                        this.scene.debug = this.options.debug;
                    }
                    if (this.sceneRenderer) {
                        this.sceneRenderer.options.debug = this.options.debug;
                    }
                    if (this.toolRenderer) {
                        this.toolRenderer.options.debug = this.options.debug;
                    }
                    this.ui.updateStatusBar();
                }
            },
            showStatus: {
                label: "Show status bar",
                hotkey: ['Tab'],
                cancelComplementKeyEvent: true,
                title: "Show/hide the scene status bar",
                listener(event) {
                    const keyEvent = event;
                    if (keyEvent && (keyEvent.altKey || keyEvent.shiftKey || keyEvent.ctrlKey)) {
                        // FIXME Avoid toggling if alt+tabbing into application. This only gets halfway there.
                        return;
                    }
                    this.setOptions({ showStatus: !this.options.showStatus });
                },
                action() {
                    this.ui.components.statusBar.getElement().classList.toggle('hidden', !this.options.showStatus);
                    this.resize();
                    this.ui.updateStatusBar();
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
                    if (this.state.mode === PenciltestMode.DRAWING) {
                        if (this.options.scrubAudio) {
                            this.scrubAudio();
                        }
                        else {
                            this.pauseAudio();
                        }
                    }
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
                            labelLogic: (offset) => offset
                        };
                        splitOffset = Number(await Utils.prompt(`Split the frame in twain<br><small>out of ${startingFrameHold} exposures, where to split?</small>`, splitOffset, promptOptions));
                    }
                    if (splitOffset) {
                        this.splitFrame(this.scene.current.frameNumber, Number(splitOffset));
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
                hotkey: ['F2'],
                async listener() {
                    const newName = await Utils.prompt(lc('%%\\uscene%% %%name%%') + ":", this.scene.name);
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
                            const [scene, context] = await this.loadScene(sceneName);
                            if (scene !== null) {
                                if (context.fromVersion !== context.toVersion) {
                                    this.ui.showFeedback({ text: lc(`%%Migrated scene data%% %%from a to b%%`, { a: context.fromVersion, b: context.toVersion }) });
                                }
                                else {
                                    this.ui.showFeedback({ text: `Loaded scene: ${this.scene.name}` });
                                }
                            }
                        }
                        catch (reason) {
                            console.error(reason);
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
                        this.newScene({
                            debug: this.options.debug
                        });
                    }
                }
            },
            renderGif: {
                label: "Render GIF (FIXME)",
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
                            background: 'rgba(0,0,0,0.5)'
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
                            {
                                is: gifImage
                            }
                        ]
                    }, this.ui.components);
                    const gifContainer = PenciltestUIComponent.restore({
                        key: 'gifContainer',
                        attr: {
                            id: 'rendered_gif'
                        },
                        parent: this.ui,
                        children: [
                            { is: gifInstructions },
                            { is: gifLink }
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
                    const dimensionsResponse = await Utils.prompt('Scene height & aspect (W/H)', `${sceneDimensions.height} ${sceneDimensions.aspectRatio}`);
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
                title: lc('explainTool_pan'),
                hotkey: ['P'],
                async listener() {
                    this.toggleTool(PenciltestTool.MOVE, [PenciltestTool.PENCIL]);
                    if (this.state.toolStack[0] !== PenciltestTool.MOVE) {
                        return;
                    }
                    const offset = await this.ui.interactivePan();
                    this.ui.showFeedback({ text: `Panned this frame: ${Utils.toDecimal(offset.x, 0)}, ${Utils.toDecimal(offset.y, 0)}` });
                }
            },
            rescueFrame: {
                label: "Rescue Frames",
                title: "Move the contents of the selected frames to the center of the canvas. Useful after resizing or panning them out of view.",
                async listener() {
                    const [frames] = this.getSelectedFrames();
                    const selectionBounds = this.getFrameBounds(frames);
                    const fieldCenter = PTSpace.rectCenter(this.scene.getDimensions());
                    const contentCenter = PTSpace.rectCenter(selectionBounds);
                    const deltaPoint = PTSpace.diffPoints(fieldCenter, contentCenter);
                    this.moveFrameContents(deltaPoint, frames);
                    this.drawCurrentFrame();
                }
            },
            moveFrameContents: {
                label: "Move frame contents",
                title: "Move the contents of ALL the frames in the scene. Useful after resizing.",
                hotkey: ['Shift+P'],
                async listener() {
                    const offset = await this.ui.interactivePan(this.scene.frames);
                    this.ui.showFeedback({ text: `Panned whole scene: ${Utils.toDecimal(offset.x, 0)}, ${Utils.toDecimal(offset.y, 0)}` });
                }
            },
            deleteScene: {
                label: "Delete Scene",
                hotkey: ['Alt+Backspace'],
                async listener() {
                    const sceneName = await this.ui.selectSceneName(lc('chooseSceneDelete') + ':');
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
                    const packedScene = await this.migrator.packScene(this.scene);
                    const blob = new Blob([JSON.stringify(packedScene, null, '  ')], { type: 'application/json' });
                    const url = globalThis.URL.createObjectURL(blob);
                    const fileName = (packedScene.name || 'untitled') + '.penciltest.json';
                    await Utils.downloadFromUrl(url, fileName);
                }
            },
            importScene: {
                label: lc("%%Import%% %%jsonFile%%"),
                hotkey: ['Ctrl+O'],
                cancelComplementKeyEvent: true,
                async listener() {
                    const promptMessage = 'Load a scene JSON file';
                    const promptOptions = {
                        accept: '.json,application/json',
                        loadAs: 'text',
                        submitOnChange: true
                    };
                    try {
                        const inputFile = await Utils.promptForFile(promptMessage, promptOptions);
                        if (inputFile === null) {
                            return [];
                        }
                        const [sceneJSON, filePath] = inputFile;
                        await this.setScene(JSON.parse(sceneJSON));
                    }
                    catch (reason) {
                        console.error(reason);
                        this.ui.showFeedback({ text: `ERROR: ${reason.message}` });
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
                    try {
                        const inputFile = await Utils.promptForFile(promptMessage, promptOptions);
                        if (inputFile === null) {
                            return;
                        }
                        const [uri, filePath] = inputFile;
                        if (uri) {
                            this.loadAudio(uri, filePath);
                        }
                    }
                    catch (e) {
                        console.error(e);
                        this.ui.showFeedback({ text: `Audio file error: ${e.message}` });
                    }
                }
            },
            unloadAudio: {
                label: "Unload Audio",
                listener() { this.destroyAudio(); }
            },
            volume: {
                label: "Volume",
                hotkey: ['v'],
                async listener(event) {
                    const combo = Utils.describeKeyCombo(event);
                    const promptOptions = {
                        input: 'range',
                        inputAttrs: {
                            min: 0,
                            max: 100
                        }
                    };
                    const inputVolume = await Utils.prompt(`Audio volume`, promptOptions);
                    if (inputVolume !== null) {
                        this.scene.audio.volume = Number(inputVolume);
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
                repeat: true,
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
            smallerTool: {
                label: "Smaller tool",
                hotkey: ['['],
                repeat: true,
                title: "Decrease the radius of the current tool",
                listener() {
                    if (this.state.mode !== PenciltestMode.DRAWING) {
                        return;
                    }
                    switch (this.state.toolStack[0]) {
                        case PenciltestTool.ERASER:
                            this.setOptions({ eraserWidth: Math.max(1, this.options.eraserWidth - 1) });
                            break;
                        default:
                            this.setOptions({ strokeWidth: Math.max(1, this.options.strokeWidth - 1) });
                            break;
                    }
                },
                action() {
                    this.drawTool({ metadataTimeout: 3000 });
                }
            },
            largerTool: {
                label: "Larger tool",
                hotkey: [']'],
                repeat: true,
                title: "Increase the radius of the current tool",
                listener() {
                    if (this.state.mode !== PenciltestMode.DRAWING) {
                        return;
                    }
                    switch (this.state.toolStack[0]) {
                        case PenciltestTool.ERASER:
                            this.setOptions({ eraserWidth: Math.min(256, this.options.eraserWidth + 1) });
                            break;
                        default:
                            this.setOptions({ strokeWidth: Math.min(256, this.options.strokeWidth + 1) });
                            break;
                    }
                },
                action() {
                    this.drawTool({ metadataTimeout: 3000 });
                }
            },
            shiftAudioEarlier: {
                label: "Shift Audio Earlier",
                hotkey: ['Shift+['],
                repeat: true,
                title: "Decrease the offset of the audio playback",
                listener() {
                    if (!this.scene.audio) {
                        this.scene.audio = { offset: 0 };
                    }
                    this.scene.audio.offset -= 0.1;
                    this.ui.updateStatusBar();
                    this.ui.showFeedback({ text: `Audio shift: ${Utils.toDecimal(this.scene.audio.offset, 1, { prefix: true })} s` });
                    this.scrubAudio();
                }
            },
            shiftAudioLater: {
                label: "Shift Audio Later",
                title: "Increase the offset of the audio playback",
                hotkey: ['Shift+]'],
                repeat: true,
                listener() {
                    var _a, _b;
                    if (!((_b = (_a = this.scene) === null || _a === void 0 ? void 0 : _a.audio) === null || _b === void 0 ? void 0 : _b.offset)) {
                        this.scene.audio = { offset: 0 };
                    }
                    this.scene.audio.offset += 0.1;
                    this.ui.updateStatusBar();
                    this.ui.showFeedback({ text: `Audio shift: ${Utils.toDecimal(this.scene.audio.offset, 1, { prefix: true })} s` });
                    this.scrubAudio();
                }
            },
            config: {
                label: "Configuration",
                hotkey: ['Ctrl+,'],
                async listener() {
                    // Range input param order: value after min/max
                    // FIXME: Object parameters are not reliably in order, so perhaps the
                    // `value` param should be held for last assignment... Unless doing
                    // so would trigger an `onchange` event.
                    const onionColorDef = {
                        text: 'Onion skin color',
                        children: [
                            {
                                tagName: 'label',
                                attr: {
                                    for: 'onionSkinBackwardColor',
                                },
                                text: 'backward:',
                            },
                            {
                                key: 'onionSkinBackwardColor',
                                tagName: 'input',
                                attr: {
                                    id: 'onionSkinBackwardColor',
                                    type: 'color',
                                    value: Utils.getColorString(this.options.onionSkinBackwardColor),
                                },
                            },
                            {
                                tagName: 'label',
                                attr: {
                                    for: 'onionSkinForwardColor',
                                },
                                text: 'forward:',
                            },
                            {
                                key: 'onionSkinForwardColor',
                                tagName: 'input',
                                attr: {
                                    id: 'onionSkinForwardColor',
                                    type: 'color',
                                    value: Utils.getColorString(this.options.onionSkinForwardColor),
                                },
                            },
                        ],
                    };
                    const onionOpacityDef = {
                        text: 'Onion skin opacity',
                        children: [
                            {
                                tagName: 'label',
                                attr: {
                                    for: 'onionSkinBackwardOpacity',
                                },
                                text: 'backward:',
                            },
                            {
                                key: 'onionSkinBackwardOpacity',
                                tagName: 'input',
                                attr: {
                                    id: 'onionSkinBackwardOpacity',
                                    type: 'range',
                                    min: '0',
                                    max: '255',
                                    step: 'any',
                                    value: Utils.toDecimal(this.options.onionSkinBackwardColor[3] * 255, 0),
                                },
                            },
                            {
                                tagName: 'label',
                                attr: {
                                    for: 'onionSkinForwardOpacity',
                                },
                                text: 'forward:',
                            },
                            {
                                key: 'onionSkinForwardOpacity',
                                tagName: 'input',
                                attr: {
                                    id: 'onionSkinForwardOpacity',
                                    type: 'range',
                                    min: '0',
                                    max: '255',
                                    value: Utils.toDecimal(this.options.onionSkinForwardColor[3] * 255, 0),
                                },
                            },
                        ],
                    };
                    const onionRadiusDef = {
                        text: 'Onion skin frame count',
                        children: [
                            {
                                tagName: 'label',
                                key: 'onionSkinFrameRadiusLabel',
                                text: String(this.options.onionSkinFrameRadius),
                                attr: {
                                    for: 'onionSkinFrameRadius',
                                },
                            },
                            {
                                key: 'onionSkinFrameRadius',
                                tagName: 'input',
                                attr: {
                                    id: 'onionSkinFrameRadius',
                                    type: 'range',
                                    min: '1',
                                    max: '10',
                                    value: String(this.options.onionSkinFrameRadius),
                                },
                                on: {
                                    'input': (e, components) => {
                                        debugger;
                                        const label = components.onionSkinFrameRadiusLabel.getElement();
                                        const input = e.target;
                                        if (label && input) {
                                            label.innerText = input.value;
                                        }
                                    },
                                },
                            },
                        ],
                    };
                    const configInputDef = [
                        onionColorDef,
                        onionOpacityDef,
                        onionRadiusDef,
                    ];
                    const promptOptions = {
                        inputKeys: [
                            'onionSkinBackwardColor',
                            'onionSkinForwardColor',
                            'onionSkinBackwardOpacity',
                            'onionSkinForwardOpacity',
                            'onionSkinFrameRadius',
                        ],
                        className: 'config',
                    };
                    const configInput = await Utils.promptForm('<h3>Configuration</h3>', configInputDef, promptOptions);
                    if (configInput === null) {
                        return;
                    }
                    const options = {
                        onionSkinFrameRadius: Number(configInput.onionSkinFrameRadius),
                    };
                    options.onionSkinBackwardColor = Utils.getColorChannels(configInput.onionSkinBackwardColor);
                    options.onionSkinBackwardColor[3] = Number(configInput.onionSkinBackwardOpacity) / 255;
                    options.onionSkinForwardColor = Utils.getColorChannels(configInput.onionSkinForwardColor);
                    options.onionSkinForwardColor[3] = Number(configInput.onionSkinForwardOpacity) / 255;
                    this.setOptions(options);
                    this.drawCurrentFrame();
                    console.log(`   oso: ${options.onionSkinBackwardColor}:${options.onionSkinForwardColor}`); // XXX
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
                title: lc('explainTool_eraser'),
                hotkey: ['E'],
                listener() {
                    this.toggleTool(PenciltestTool.ERASER, [PenciltestTool.PENCIL]);
                }
            },
            hideMenu: {
                hotkey: ['Esc'],
                listener() {
                    this.ui.hideMenu();
                    this.ui.clearSelection(true);
                }
            },
        };
        this.defaultDragOptions = {
            startTarget: this.controller.container,
            moveTarget: this.controller.container,
            endTarget: this.controller.container,
            coordinateScope: 'page',
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
                key: 'toggleMenu',
                text: "\u2699\ufe0f", /* gear emoji */
                tagName: 'button',
                className: 'toggle-menu icon',
                parent: 'statusRight',
            },
            {
                key: 'toggleHelp',
                text: '\u2754', /* white question mark */
                tagName: 'button',
                className: 'toggle-help icon',
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
                    },
                    children: []
                };
                const { label, text, title, hotkey } = {
                    ...this.appActions[entry]
                };
                if (title) {
                    entryConfig.attr.title = title;
                }
                if (text) {
                    entryConfig.text = text;
                }
                if (label) {
                    const labelComponent = {
                        key: `${entry}_label`,
                        tagName: 'label',
                        text: label,
                        children: [],
                    };
                    if (hotkey && hotkey.length > 0) {
                        labelComponent.children.push({
                            key: `${entry}_hotkey`,
                            tagName: 'span',
                            text: hotkey[0],
                            className: "hotkey",
                        });
                    }
                    entryConfig.children.push(labelComponent);
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
        let fieldBounds;
        const updateFieldBounds = () => {
            fieldBounds = {
                x: 0,
                y: 0,
                width: this.controller.width,
                height: this.controller.height
            };
        };
        const fieldPointerPressListener = (event) => {
            if (this.isMenuVisible) {
                return;
            }
            this.previousEvent = event;
            const focusedInput = document.querySelector(':focus');
            if (focusedInput) {
                focusedInput.blur();
            }
            if (this.controller.state.mode !== PenciltestMode.DRAWING) {
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
                const pointerEvent = event;
                if (pointerEvent.button === 2) {
                    return true; // allow context menu
                }
                else {
                    this.hideMenu();
                }
                if (pointerEvent.button === 1) { // middle click
                    if (event.shiftKey) {
                        this.controller.useTool(PenciltestTool.ERASER);
                    }
                    else {
                        this.interactivePan([], event);
                        return;
                    }
                }
                this.controller.state.pointerMode = PointerMode.PRESS;
                globalThis.addEventListener('mouseup', globalPointerUpListener);
                globalThis.addEventListener('touchend', globalPointerUpListener);
                fieldPointerMoveListener(event);
            }
        };
        const fieldPointerMoveListener = (event) => {
            const isDown = this.controller.state.pointerMode === PointerMode.PRESS;
            event.preventDefault();
            if ((event.type === 'touchmove') && (event.touches.length > 2)) {
                this.recordGesture(event, fieldBounds);
                return this.progressGesture(this.describeGesture(fieldBounds));
            }
            else {
                const pagePoint = Utils.eventPoint(event, 'page');
                Object.assign(this.pointer, pagePoint);
                const offsetPoint = {
                    x: this.controller.fieldElement.offsetLeft,
                    y: this.controller.fieldElement.offsetTop
                };
                const trackPoint = PTSpace.diffPoints(pagePoint, offsetPoint);
                const pointerEvent = event;
                if ("pressure" in pointerEvent) {
                    trackPoint.weight = pointerEvent.pressure;
                }
                if (this.controller.state.mode === PenciltestMode.DRAWING) {
                    this.controller.track(trackPoint);
                }
            }
        };
        const globalPointerUpListener = (event) => {
            this.controller.state.pointerMode = PointerMode.HOVER;
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
                    this.controller.drawCurrentFrame(); // wipe tool cursor
                }
                globalThis.removeEventListener('mouseup', globalPointerUpListener);
                globalThis.removeEventListener('touchend', globalPointerUpListener);
                return this.controller.lift();
            }
        };
        const contextMenuListener = (event) => {
            const targetElement = event.target;
            //const targetComponent = PenciltestUIComponent.find(targetElement, this.components);
            if (this.controller.fieldContainer.contains(targetElement)) {
                event.preventDefault();
                this.toggleMenu(Utils.eventPoint(event));
            }
        };
        const globalPointerPressListener = (event) => {
            if (this.isMenuVisible && !this.components.contextMenu.getElement().contains(event.target)) {
                event.stopImmediatePropagation();
                event.preventDefault();
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
        // this.controller.container.addEventListener 'touchstart', preventPinchZoomHandler, true
        // globalThis.addEventListener 'touchmove', preventPinchZoomHandler, true
        // this.controller.container.addEventListener 'touchmove', preventPinchZoomHandler, true
        const helpListener = () => this.triggerAppAction('toggleInterfaceHelp');
        this.components.appStatus.getElement().addEventListener('click', statusClickListener);
        this.components.sceneStatus.getElement().addEventListener('click', statusClickListener);
        this.controller.fieldContainer.addEventListener('mousedown', fieldPointerPressListener);
        this.controller.fieldContainer.addEventListener('touchstart', fieldPointerPressListener);
        globalThis.addEventListener('mousemove', fieldPointerMoveListener);
        globalThis.addEventListener('touchmove', fieldPointerMoveListener);
        this.controller.container.addEventListener('contextmenu', contextMenuListener);
        this.controller.container.addEventListener('mousedown', globalPointerPressListener);
        this.controller.container.addEventListener('touchstart', globalPointerPressListener);
        this.components.toggleMenu.getElement().addEventListener('click', contextMenuListener);
        this.components.toggleHelp.getElement().addEventListener('click', helpListener);
    }
    recordGesture(event, bounds) {
        if (!this.currentGesture) {
            this.currentGesture = {
                touches: event.targetTouches.length,
                origin: Utils.eventPoint(event, "page", 5)
            };
        }
        this.currentGesture.last = Utils.eventPoint(event, "page", 5);
        this.currentGesture.delta = PTSpace.diffPoints(this.currentGesture.last, this.currentGesture.origin);
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
            return await Utils.promptSelect(message, sceneNames, this.controller.scene.name);
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
        const keyboardListener = (event) => {
            if (Utils.anyGlobalPromises()) {
                return;
            }
            const htmlTarget = event.target;
            if (htmlTarget.hasAttribute('contenteditable')) {
                if (event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey)) {
                    htmlTarget.blur();
                }
            }
            else if (!htmlTarget.matches('input')) {
                const combo = Utils.describeKeyCombo(event);
                if (event.keyCode !== 0 && this.controller.options.debug) {
                    console.log(`${event.type}-${combo} (${event.keyCode})`);
                }
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
        document.body.addEventListener('keydown', (event) => keyboardListener(event));
        document.body.addEventListener('keyup', (event) => keyboardListener(event));
    }
    addOtherListeners() {
        this.controller.fieldContainer.addEventListener('wheel', (event) => {
            if (this.isMenuVisible) {
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
            const statusComponentDefinitions = [
                {
                    key: "statusVersion",
                    tagName: 'span',
                    text: `v${this.controller.state.version}${((_a = this.controller.scene.instrument) === null || _a === void 0 ? void 0 : _a.version) && this.controller.state.version !== this.controller.scene.instrument.version ? ` (@v${this.controller.scene.instrument.version})` : ''}`,
                    parent: 'appStatus'
                },
                {
                    key: "statusMode",
                    tagName: 'span',
                    attr: {
                        title: "Current mode"
                    },
                    text: lc(this.controller.state.mode),
                    parent: 'appStatus'
                },
                {
                    key: "statusTool",
                    tagName: 'span',
                    attr: {
                        title: lc(`explainTool_${this.controller.state.toolStack[0]}`),
                        className: `tool-icon-${this.controller.state.toolStack[0]}`,
                    },
                    on: {
                        click: () => this.triggerAppAction('toolSettings')
                    },
                    text: lc(this.controller.state.toolStack[0]),
                    parent: 'appStatus'
                },
                {
                    key: "statusSmoothing",
                    tagName: 'span',
                    attr: {
                        title: lc('statusSmoothingTooltip')
                    },
                    on: {
                        click: (e) => this.triggerAppAction('smoothing')
                    },
                    text: `~${this.controller.options.smoothing}~`,
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
                            on: {
                                'click': () => this.components.statusSceneNameEditable.getElement().focus(),
                            }
                        },
                        {
                            tagName: 'span',
                            key: "statusSceneNameEditable",
                            text: this.controller.scene.name || lc('untitled'),
                            attr: { 'contenteditable': 'true' },
                            on: {
                                input: (e) => this.controller.scene.name = e.target.innerText,
                                focus: (e) => {
                                    if (e.target.innerText === 'untitled') {
                                        e.target.innerText = '';
                                    }
                                },
                                blur: (e) => this.updateStatusBar()
                            }
                        },
                    ],
                    parent: 'appStatus'
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
                            text: String((((_b = this.controller.scene.current) === null || _b === void 0 ? void 0 : _b.frameNumber) || 0) + 1),
                            attr: {
                                title: lc('currentFrameNumber')
                            }
                        },
                        {
                            key: 'statusFrameTotal',
                            tagName: 'span',
                            text: `/${((_c = this.controller.scene.frames) === null || _c === void 0 ? void 0 : _c.length) || 1}`,
                            attr: {
                                title: lc('sceneFrameCount')
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
                            text: 'time:'
                        },
                        {
                            key: 'statusCurrentTime',
                            tagName: 'span',
                            text: Utils.toTimecode(((_d = this.controller.scene.current.frames[this.controller.scene.current.frameNumber]) === null || _d === void 0 ? void 0 : _d.time) || 0, 3),
                            attr: {
                                title: lc('currentFrameTime')
                            }
                        },
                        {
                            key: 'statusTotalTime',
                            tagName: 'span',
                            text: '/' + Utils.toTimecode((this.controller.scene.current.frames.length > 0 ? this.controller.scene.current.frames[this.controller.scene.current.frames.length - 1].time : 0) + (this.controller.scene.current.singleFrameDuration || 0), 3),
                            attr: {
                                title: lc('%%\\uscene%% %%duration%%')
                            }
                        }
                    ],
                    parent: 'sceneStatus'
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
                            text: `${((_e = this.controller.scene) === null || _e === void 0 ? void 0 : _e.framerate) || '…'}`
                        },
                        {
                            key: 'statusFrameHold',
                            tagName: 'span',
                            text: `/${this.controller.scene.getFrameHold()}`,
                            attr: {
                                title: lc('exposureHoldTitle')
                            }
                        }
                    ],
                    attr: {
                        title: lc('statusFrameRate'),
                    },
                    parent: 'sceneStatus'
                },
                {
                    key: 'statusAudioOffset',
                    tagName: 'span',
                    parent: 'sceneStatus',
                    text: ((_f = this.controller.scene.audio) === null || _f === void 0 ? void 0 : _f.offset) ? `${this.controller.scene.audio.offset >= 0 ? '+' : ''}${Utils.toDecimal(this.controller.scene.audio.offset, 1)}` : '-',
                    attr: {
                        title: lc('audioOffset')
                    }
                }
            ];
            statusComponentDefinitions.forEach((config) => {
                const component = PenciltestUIComponent.restore(config, this.components);
            });
        }
        // ELSE, hide status? @1785792939
    }
    showMenu(coords) {
        if (!this.isMenuVisible) {
            if (!coords) {
                coords = { x: 10, y: 10, ...this.pointer };
            }
            this.isMenuVisible = true;
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
        return this.isMenuVisible;
    }
    hideMenu() {
        if (this.isMenuVisible) {
            this.isMenuVisible = false;
            Utils.toggleClass(this.components.contextMenu.getElement(), 'active', false);
        }
        return this.isMenuVisible;
    }
    toggleMenu(coords) {
        if (this.isMenuVisible) {
            return this.hideMenu();
        }
        else {
            return this.showMenu(coords);
        }
        return this.isMenuVisible;
    }
    showFeedback(config, duration = 0) {
        if (!duration) {
            duration = 2000;
            let length = 0;
            if ("text" in config) {
                length = config.text.length;
            }
            else if ("html" in config) {
                length = config.html.length;
            }
            if (length) {
                duration += 8000 * Utils.normalize(length, 100);
            }
        }
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
    clearSelection(showFeedback = false) {
        if (this.controller.state.frameSelection) {
            delete this.controller.state.frameSelection;
            if (showFeedback) {
                this.showFeedback({ text: `Cleared selectedFrameNumbers` });
            }
        }
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
                const immediateDeltaPoint = PTSpace.diffPoints(nowPoint, endPoint);
                const totalDeltaPoint = PTSpace.diffPoints(endPoint, startPoint);
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
            const totalDeltaPoint = PTSpace.diffPoints(endPoint, startPoint);
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
    async interactivePan(selectedFrameNumbers = [], alreadyStartedEvent = null) {
        // TODO Select specific strokes to move.  #f063eb1f-b09a-44c1-8582-83711b2d10e8
        return new Promise((resolve, reject) => {
            this.controller.useTool(PenciltestTool.MOVE);
            this.controller.resize();
            let frameScale = this.controller.width / this.controller.scene.getDimensions().width;
            if (selectedFrameNumbers.length === 0) {
                [selectedFrameNumbers] = this.controller.getSelectedFrames();
            }
            const previewFrameSelection = Utils.getIntersection(this.controller.getVisibleFrames(), selectedFrameNumbers);
            if (previewFrameSelection.length === 0) {
                previewFrameSelection.push(selectedFrameNumbers[0]);
            }
            this.handleDrag({
                alreadyStartedEvent,
                coordinateScope: 'page',
                startTarget: this.controller.fieldElement,
                onstart: () => {
                    this.controller.setMode(PenciltestMode.WORKING);
                },
                onmove: (event, immediateDeltaPoint, totalDeltaPoint) => {
                    const scaledDelta = PTSpace.scalePoint(immediateDeltaPoint, 1 / frameScale);
                    this.controller.moveFrameContents(scaledDelta, previewFrameSelection);
                    this.controller.drawCurrentFrame();
                },
                onend: (event, totalDeltaPoint) => {
                    this.controller.setPreviousMode();
                    this.controller.usePreviousTool();
                    const scaledTotalDelta = PTSpace.scalePoint(totalDeltaPoint, 1 / frameScale);
                    if (previewFrameSelection !== selectedFrameNumbers) {
                        this.controller.moveFrameContents(PTSpace.negatePoint(scaledTotalDelta), previewFrameSelection);
                        this.controller.moveFrameContents(scaledTotalDelta, selectedFrameNumbers);
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
;
class PenciltestRenderExporter {
    constructor(controller) {
        this.controller = controller;
    }
    async renderGif() {
        const renderRange = this.controller.state.frameSelection
            ? this.controller.state.frameSelection
            : { start: 0, end: this.controller.scene.frames.length - 1 };
        const gifSize = Math.min(512, this.controller.scene.height);
        const strokeWidth = 1;
        const gifConfigurationString = await Utils.prompt(`Rendering ${renderRange.end - renderRange.start + 1} frames, ${renderRange.start} through ${renderRange.end}.\nWhat dimensions (maximum width/height) and line weight would you like?`, `${gifSize} ${strokeWidth}`);
        if (!gifConfigurationString) {
            return;
        }
        const gifConfiguration = (gifConfigurationString || '512 2').split(' ');
        const maxGifDimension = parseInt(gifConfiguration[0], 10);
        const gifLineWidth = parseInt(gifConfiguration[1], 10);
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
        const gifRenderOverrides = { strokeWidth: gifLineWidth };
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
            gifEncoder.addFrame(this.controller.sceneRenderer.context);
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
class Penciltest {
    constructor(options) {
        const [storedOptions] = this.getStoredData('app', 'options');
        this.options = {
            ...PenciltestScene.defaultOptions,
            ...Penciltest.defaultOptions,
            ...storedOptions,
        };
        const [storedState] = this.getStoredData('app', 'state');
        this.state = {
            ...Penciltest.defaultState,
            ...storedState,
        };
        this.components = {};
        this.trackBuffer = [];
        this.workingOn = [];
        this.playback = { ...Penciltest.defaultPlayback };
        this.migrator = new PenciltestMigrator();
        this.container = globalThis.document.querySelector(this.options.container);
        this.container.className = 'penciltest-app';
        this.buildContainer();
        this.ui = new PenciltestUI(this, { parentElement: this.container }, this.components);
        this.newScene();
        this.setOptions(this.options)
            .then(() => {
            //this.prepareRenderers(); // Already called in penciltest-ui reaction to `renderer` setting. Leaving this note here to remember this is when it happens.
            this.resize();
            this.drawCurrentFrame();
            this.useTool(PenciltestTool.PENCIL);
        });
    }
    ;
    async setOptions(newOptions) {
        Object.assign(this.options, newOptions);
        if (newOptions.debug && Penciltest.debugVersion && Penciltest.debugVersion !== Penciltest.version) {
            this.state.version = Penciltest.debugVersion;
        }
        const reactions = [];
        for (let key in newOptions) {
            if (key in this.ui.appActions && typeof this.ui.appActions[key].action === 'function') {
                reactions.push(this.ui.handleAppReaction(key));
            }
        }
        await Promise.all(reactions);
    }
    async resetOptionsAndState() {
        this.state = { ...Penciltest.defaultState };
        await this.setOptions(Penciltest.defaultOptions);
        this.scene.current.strokeNumber = -1;
        if (this.scene) {
            this.scene.updateState();
        }
        this.resize();
    }
    prepareRenderers() {
        const rendererOptions = {
            strokeColor: this.scene.strokeColor,
            strokeWidth: this.scene.strokeWidth,
            strokeOpacity: this.scene.strokeOpacity,
            container: this.fieldElement,
            background: this.scene.background,
            debug: this.options.debug
        };
        if (this.options.renderer === Renderers.SVG) {
            this.sceneRenderer = new SVGRenderer(rendererOptions);
        }
        else {
            this.sceneRenderer = new CanvasRenderer(rendererOptions);
        }
        const toolRendererOptions = {
            ...rendererOptions,
            background: 'transparent',
            alpha: true,
        };
        this.toolRenderer = new CanvasRenderer(toolRendererOptions);
    }
    setPlayback(newPlayback) {
        Object.assign(this.playback, newPlayback);
        for (let key in newPlayback) {
            if (key in this.ui.appActions && typeof this.ui.appActions[key].action === 'function') {
                this.ui.handleAppReaction(key);
            }
        }
        this.ui.updateStatusBar();
    }
    buildContainer() {
        const fieldDef = {
            key: 'field',
            className: "field",
            style: {
                'margin-top': '40px'
            }
        };
        const containerDef = {
            key: 'fieldContainer',
            parentElement: this.container,
            className: 'field-container',
            children: [fieldDef]
        };
        new PenciltestUIComponent(containerDef, this.components);
        this.fieldContainer = this.components.fieldContainer.getElement();
        this.fieldElement = this.components.field.getElement();
    }
    setMode(mode) {
        if (mode !== this.state.mode) {
            this.state.previousMode = this.state.mode;
            this.state.mode = mode;
            this.container.setAttribute('x-mode', mode);
            if (this.state.previousMode === PenciltestMode.PLAYING) {
                this.stop();
            }
            this.ui.updateStatusBar();
            return true;
        }
        return false;
    }
    setPreviousMode() {
        return this.setMode(this.state.previousMode || PenciltestMode.DRAWING);
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
    getFrameBounds(frames = []) {
        if (frames.length === 0) {
            frames = [this.scene.getCurrentFrame()];
        }
        const frameBounds = {};
        frames.forEach((frame) => {
            if (!frame.strokes) {
                return;
            }
            frame.strokes.forEach((stroke) => {
                if (stroke.path) {
                    PTSpace.unionBounds(stroke.path, frameBounds);
                }
            });
        });
        return frameBounds;
    }
    mark(mark) {
        var _a, _b;
        const stroke = this.scene.getCurrentStroke(true);
        const isNewStroke = stroke.path.length === 0;
        if (isNewStroke) {
            delete this.previousMark;
            stroke.provisional = true;
            stroke.width = this.options.strokeWidth;
            stroke.strokeColor = this.options.strokeColor;
        }
        stroke.path.push(PTSpace.scalePoint(mark, 1 / this.zoomFactor));
        if (this.options.debug) {
            console.log(`  mark ${((_a = this.previousMark) === null || _a === void 0 ? void 0 : _a.x) || '_'},${((_b = this.previousMark) === null || _b === void 0 ? void 0 : _b.y) || '_'}-->${mark.x},${mark.y}`);
        }
        if (this.state.mode === PenciltestMode.DRAWING) {
            // Rendering new line in toolRenderer layer.
            // It gets drawn in the sceneRenderer upon lift().
            this.toolRenderer.requestRender((renderer, timestamp) => {
                if (this.options.debug) {
                    console.log(`stroke width: ${stroke.width}, @ canvas: ${this.sceneRenderer.context.lineWidth}`);
                }
                renderer.composeOptions({
                    strokeColor: ("strokeColor" in stroke ? stroke.strokeColor : this.scene.strokeColor),
                    strokeWidth: stroke.width * this.zoomFactor
                });
                renderer.beginPath();
                renderer.subpath(PTSpace.scalePath(stroke.path, this.zoomFactor));
                renderer.endPath();
            });
        }
        this.clearRedo();
        this.hasUnsavedChanges = true;
        this.previousMark = mark;
    }
    track(trackMark) {
        var _a;
        const isDown = this.state.pointerMode === PointerMode.PRESS;
        this.trackBuffer.unshift(trackMark);
        if (this.trackBuffer.length > 3) {
            this.trackBuffer.pop();
        }
        const scenePoint = PTSpace.scalePoint(trackMark, 1 / this.zoomFactor);
        this.drawTool({ trackPoint: trackMark, down: isDown });
        if (this.state.toolStack[0] === PenciltestTool.PENCIL) {
            if (isDown) {
                this.mark({ ...trackMark });
            }
        }
        else if (this.state.toolStack[0] === PenciltestTool.ERASER) {
            if (isDown) {
                const currentFrame = this.scene.getCurrentFrame();
                let erasures = 0;
                if (((_a = currentFrame.strokes) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                    const erasingStrokeIndexes = this.findIntersectingStrokes(currentFrame.strokes, scenePoint, this.options.eraserWidth / 2);
                    if (erasingStrokeIndexes.length > 0) {
                        erasingStrokeIndexes.reverse().forEach((strokeIndex) => {
                            currentFrame.strokes.splice(strokeIndex, 1);
                            erasures++;
                        });
                    }
                }
                if (erasures > 0) {
                    this.drawCurrentFrame();
                }
            }
        }
    }
    findIntersectingStrokes(strokes, scenePoint, radius, checkCircle = true, findAll = true) {
        const matches = [];
        for (let strokeIndex = 0; strokeIndex < Number(strokes.length); strokeIndex++) {
            const area = checkCircle
                ? { center: scenePoint, radius }
                : PTSpace.boundsAroundPoint(scenePoint, radius);
            if (PTSpace.doesPathIntersect(strokes[strokeIndex].path, area)) {
                matches.push(strokeIndex);
                if (!findAll) {
                    return matches;
                }
            }
        }
        return matches;
    }
    resolveFrameNumber(inputIndex) {
        return this.scene.resolveFrameNumber(inputIndex, this.options.loop);
    }
    goToFrame(targetFrameNumber, overrides = {}) {
        const selectedFrameNumber = this.scene.setCurrentFrameNumber(targetFrameNumber, this.options.loop);
        if (this.state.mode !== PenciltestMode.PLAYING) {
            this.lift();
            this.seekAudioToFrame(selectedFrameNumber);
        }
        this.ui.updateStatusBar(); // FIXME: Probably too slow, rewriting all status DOM elemets, on each frame of play.
        return this.drawCurrentFrame(overrides);
    }
    seekAudioToFrame(frameNumber, exposureOffset = 0) {
        var _a;
        if (this.scene.audio) {
            const frame = this.scene.current.frames[frameNumber];
            if (!frame || !("time" in frame)) {
                return;
            }
            let offset = typeof ((_a = this.scene.audio) === null || _a === void 0 ? void 0 : _a.offset) === 'number' ? -this.scene.audio.offset : 0;
            if (exposureOffset !== 0) {
                offset += exposureOffset * this.scene.current.singleFrameDuration;
            }
            const seekTime = (frame.time + offset) / 1000;
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
        if (this.playback.scrubAudioId) {
            clearTimeout(this.playback.scrubAudioId);
        }
        stepListener(true);
        this.playback.stepId = setInterval(stepListener, 1000 / this.scene.framerate);
        this.lift();
        this.setMode(PenciltestMode.PLAYING);
        return this.playAudio(); // FIXME: if audio offset is positive, it should not begin playing on the first frame, but later.
    }
    stop() {
        if (this.audioElement) {
            this.pauseAudio();
        }
        clearInterval(this.playback.stepId);
        if (this.state.mode === PenciltestMode.PLAYING) {
            this.setPreviousMode();
        }
    }
    togglePlay() {
        if (this.state.mode !== PenciltestMode.WORKING) {
            if (this.state.mode === PenciltestMode.PLAYING) {
                return this.stop();
            }
            else {
                return this.play();
            }
        }
    }
    drawCurrentFrame(overrides = {}) {
        // NOTE: This draws the background, while drawFrame() does not.
        // NOTE: This also calls drawFrame.
        if (!this.sceneRenderer || !this.scene.frames.length) {
            return;
        }
        if (this.options.debug) {
            console.log('    drawCurrentFrame: REQ');
        }
        this.sceneRenderer.requestRender((renderer, timestamp) => {
            if (this.options.debug) {
                console.log('    drawCurrentFrame:     HAP');
            }
            renderer.clear(true);
            if (this.options.onionSkin) {
                for (let i = 1, end = this.options.onionSkinFrameRadius, asc = 1 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
                    const previousFrameNumber = this.resolveFrameNumber(this.scene.current.frameNumber - i);
                    if (previousFrameNumber !== this.scene.current.frameNumber) {
                        this.drawFrame(previousFrameNumber, renderer, {
                            ...overrides,
                            strokeColor: this.options.onionSkinBackwardColor.slice(0, 3).concat([Math.pow(this.options.onionSkinBackwardColor[3], i)])
                        });
                    }
                    const nextFrameNumber = this.resolveFrameNumber(this.scene.current.frameNumber + i);
                    if (nextFrameNumber !== this.scene.current.frameNumber) {
                        this.drawFrame(nextFrameNumber, renderer, {
                            ...overrides,
                            strokeColor: this.options.onionSkinForwardColor.slice(0, 3).concat([Math.pow(this.options.onionSkinForwardColor[3], i)])
                        });
                    }
                }
            }
            renderer.composeOptions();
            this.drawFrame(this.scene.current.frameNumber, renderer, overrides);
            if (this.options.debug) {
                console.log('    drawCurrentFrame:         END');
            }
        });
    }
    drawFrame(frameNumber, renderer, overrides = {}) {
        var _a;
        if (!this.width || !this.height) {
            return;
        }
        if (this.options.debug) {
            console.log('   drawFrame: BEGIN');
        }
        const frame = this.scene.frames[frameNumber];
        if (((_a = frame === null || frame === void 0 ? void 0 : frame.strokes) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            frame.strokes.forEach((stroke) => {
                renderer.beginPath();
                renderer.composeOptions({
                    strokeColor: ("strokeColor" in stroke ? stroke.strokeColor : this.scene.strokeColor),
                    ...overrides,
                    strokeWidth: (stroke.width || this.scene.strokeWidth || 1) * this.zoomFactor
                });
                const scaledStroke = this.scaleStroke(stroke, this.zoomFactor);
                renderer.subpath(scaledStroke.path);
                renderer.endPath();
            });
        }
        if (this.options.debug) {
            console.log('   drawFrame:       END');
        }
        return frame;
    }
    drawTool(state = {}) {
        const { trackPoint, down: isDown, metadataTimeout } = { trackPoint: this.trackBuffer[0], ...state };
        if (typeof (trackPoint === null || trackPoint === void 0 ? void 0 : trackPoint.x) !== 'number'
            || typeof (trackPoint === null || trackPoint === void 0 ? void 0 : trackPoint.y) !== 'number') {
            return;
        }
        let toolDiameterSceneSpace, outerWidth = 1, innerWidth = 2, crosshairOuterRadius = 12, crosshairInnerRadius = 6, innerColor = 'white', outerColor = 'black';
        if (this.state.toolStack[0] === PenciltestTool.PENCIL) {
            toolDiameterSceneSpace = this.options.strokeWidth;
            innerWidth = 2;
            innerColor = 'white';
        }
        else if (this.state.toolStack[0] === PenciltestTool.ERASER) {
            toolDiameterSceneSpace = this.options.eraserWidth;
            innerWidth = 3;
            innerColor = 'red';
        }
        else {
            return;
        }
        const toolScreenRadius = Math.max(0.5, toolDiameterSceneSpace / 2 * this.zoomFactor);
        const innerScreenRadius = Math.max(0.5, toolScreenRadius - innerWidth / 2);
        if (this.options.debug) {
            console.log(`  track:${this.state.toolStack[0]} ⊙ ${toolDiameterSceneSpace}`, { toolScreenRadius, innerScreenRadius, innerWidth, innerColor, outerColor });
        }
        if (metadataTimeout > 0) {
            if (this.toolMetaTimeoutId) {
                clearTimeout(this.toolMetaTimeoutId);
            }
            this.toolMetaTimeoutId = setTimeout(() => {
                this.toolMetaTimeoutId = 0;
                this.drawTool();
            }, metadataTimeout);
        }
        this.toolRenderer.requestRender((renderer, timestamp) => {
            renderer.clear();
            // ID
            if (innerScreenRadius !== toolScreenRadius) {
                renderer.beginPath();
                renderer.circle({ center: trackPoint, radius: innerScreenRadius }, { strokeColor: innerColor, strokeWidth: innerWidth });
                renderer.endPath();
            }
            // OD
            renderer.beginPath();
            renderer.circle({ center: trackPoint, radius: toolScreenRadius }, { strokeColor: outerColor, strokeWidth: outerWidth });
            renderer.endPath();
            // crosshair
            renderer.beginPath({
                lineWidth: 1,
                strokeColor: 'black'
            });
            renderer.moveToPoint(PTSpace.sumPoints(trackPoint, { x: 0, y: -crosshairOuterRadius }));
            renderer.lineToPoint(PTSpace.sumPoints(trackPoint, { x: 0, y: -crosshairInnerRadius }));
            renderer.moveToPoint(PTSpace.sumPoints(trackPoint, { x: 0, y: crosshairOuterRadius }));
            renderer.lineToPoint(PTSpace.sumPoints(trackPoint, { x: 0, y: crosshairInnerRadius }));
            renderer.moveToPoint(PTSpace.sumPoints(trackPoint, { x: -crosshairOuterRadius, y: 0 }));
            renderer.lineToPoint(PTSpace.sumPoints(trackPoint, { x: -crosshairInnerRadius, y: 0 }));
            renderer.moveToPoint(PTSpace.sumPoints(trackPoint, { x: crosshairOuterRadius, y: 0 }));
            renderer.lineToPoint(PTSpace.sumPoints(trackPoint, { x: crosshairInnerRadius, y: 0 }));
            renderer.endPath();
            // metadata text
            if (this.toolMetaTimeoutId > 0) {
                const metadataOutput = `${toolDiameterSceneSpace}px`;
                const metaTextOptions = {
                    anchor: PTSpace.sumPoints(trackPoint, { x: Math.max(toolScreenRadius, crosshairOuterRadius) + 8, y: 0 }),
                    fillColor: 'black',
                    font: 'bold 14px monospace',
                    strokeColor: 'white',
                    strokeFirst: true,
                    strokeWidth: 3,
                };
                this.toolRenderer.text(metadataOutput, metaTextOptions);
            }
        });
    }
    scaleStroke(stroke, factor) {
        return {
            ...stroke,
            // TODO: scale stroke weight, too?
            path: stroke.path.map((point) => PTSpace.scalePoint(point, factor))
        };
    }
    useTool(toolName) {
        const index = this.state.toolStack.indexOf(toolName);
        const isChanging = index !== 0;
        if (this.options.debug) {
            console.log(`   useTool:${toolName} ${isChanging ? 'CHANGE' : 'SAME'}`);
        }
        if (isChanging) {
            if (index > -1) {
                this.state.toolStack.splice(index, 1);
            }
            this.state.toolStack.unshift(toolName);
            this.container.setAttribute('x-tool', toolName);
            this.ui.updateStatusBar();
            this.drawTool();
        }
        return isChanging;
    }
    usePreviousTool() {
        this.useTool(this.state.toolStack[1]);
    }
    toggleTool(toolName, complementTools = []) {
        const index = this.state.toolStack.indexOf(toolName);
        if (index === 0) {
            if (complementTools.length > 0) {
                this.useTool(complementTools[0]);
            }
            else {
                this.usePreviousTool();
            }
        }
        else {
            this.useTool(toolName);
        }
    }
    cancelStroke() {
        this.trackBuffer = [];
        return this.scene.current.strokeNumber = -1;
    }
    lift() {
        if (this.state.toolStack[0] === PenciltestTool.PENCIL) {
            if (this.scene.current.strokeNumber !== -1) {
                const lastStroke = this.scene.getCurrentStroke();
                const frame = this.scene.getCurrentFrame();
                debugger;
                if (lastStroke.provisional) {
                    const fieldPlusStrokeRadius = PTSpace.expandRect(this.scene.getDimensions(), this.options.strokeWidth / 2);
                    if (PTSpace.doesPathIntersect(lastStroke.path, fieldPlusStrokeRadius)) {
                        delete lastStroke.provisional;
                    }
                    else {
                        // Don't record mark if it (TODO including its width) are off the
                        // field. This enables both beginning a mark from outside the
                        // field, but also clicking outside the field to blur/cancel other
                        // elements.  uuid:0051f2f1-ec80-4377-9dee-a32d47ecf185
                        frame.strokes.splice(this.scene.current.strokeNumber, 1);
                    }
                }
                this.scene.current.strokeNumber = -1;
            }
            this.drawCurrentFrame();
            this.drawTool();
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
                return [[this.scene.getCurrentFrame()], this.scene.current.frameNumber];
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
            const insertFrameNumber = this.scene.current.frameNumber + 1;
            this.scene.insertFrames(Utils.clone(this.copyBuffer), insertFrameNumber);
            this.ui.updateStatusBar();
        }
    }
    splitFrame(frameNumber, splitOffset) {
        var _a;
        const frame = (_a = this.scene) === null || _a === void 0 ? void 0 : _a.frames[frameNumber];
        const oldHold = this.scene.getFrameHold();
        frame.hold = splitOffset;
        const newFrame = Utils.clone(frame);
        newFrame.hold = oldHold - splitOffset;
        this.scene.insertFrames([newFrame], frameNumber + 1);
        this.ui.updateStatusBar();
    }
    pasteStrokes() {
        var _a;
        if (((_a = this.copyBuffer) === null || _a === void 0 ? void 0 : _a.length) > 0 && this.copyBuffer[0].strokes) {
            const currentFrame = this.scene.getCurrentFrame(true);
            if (!("strokes" in currentFrame)) {
                currentFrame.strokes = [];
            }
            Array.prototype.push.apply(currentFrame.strokes, Utils.clone(this.copyBuffer[0].strokes));
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
            this.sceneRenderer.clear(true);
            const result = [];
            for (let stroke of oldStrokes) {
                for (let segment of stroke.path) {
                    const fieldScalePoint = PTSpace.scalePoint(segment, this.zoomFactor);
                    this.track(fieldScalePoint);
                }
                result.push(this.lift());
            }
            this.options.smoothing = smoothingBackup;
            return result;
        };
        if (!amount) {
            amount = Number(await Utils.prompt('How much to smooth? 1-5', 2));
            if (!amount) {
                return;
            }
        }
        smooth(amount);
        this.drawCurrentFrame();
    }
    async smoothScene(amount = 1) {
        if (await Utils.confirm('Would you like to smooth every frame of this scene?')) {
            if (amount < 1) {
                amount = Number(await Utils.prompt('How much to smooth? 1-5', 2));
                if (!amount) {
                    return;
                }
            }
            this.setMode(PenciltestMode.WORKING);
            this.queueWork(() => {
                this.scene.frames.forEach((frame, i) => this.smoothFrame(i, amount));
                this.setPreviousMode();
            });
        }
    }
    undo() {
        if (this.scene.getCurrentFrame().strokes && this.scene.getCurrentFrame().strokes.length) {
            this.redoQueue.push(this.scene.getCurrentFrame().strokes.pop());
            this.hasUnsavedChanges = true;
            return this.drawCurrentFrame();
        }
    }
    redo() {
        if (this.redoQueue && this.redoQueue.length) {
            this.scene.getCurrentFrame().strokes.push(this.redoQueue.pop());
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
    newScene(options = {}) {
        this.scene = new PenciltestScene({ ...this.options, ...options });
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
        const context = { errorMessage: '' };
        const storageName = this.encodeStorageReference(namespace, name);
        try {
            return [JSON.parse(globalThis.localStorage.getItem(storageName)), context];
        }
        catch (e) {
            console.error(e);
            context.errorMessage = `Failed to parse stored data at name '${storageName}'.`;
            return [null, context];
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
        let sceneToStore = this.scene;
        try {
            sceneToStore = await this.migrator.packScene(this.scene);
        }
        catch (e) {
            console.error(e);
        }
        if (sceneToStore && this.putStoredData('scene', sceneName, sceneToStore)) {
            this.hasUnsavedChanges = false;
            return true;
        }
        return false;
    }
    async setScene(sceneData) {
        var _a;
        const context = {};
        try {
            this.migrator
                .unpackScene(sceneData)
                .then(async (unpackedSceneData) => {
                const [migratedSceneData, migrationContext] = await this.migrator.migrateScene(unpackedSceneData, this.state.version);
                Object.assign(context, migrationContext);
                this.scene = new PenciltestScene(migratedSceneData);
            });
        }
        catch (e) {
            console.error(e);
            context.errorMessage = e.message;
            this.scene = new PenciltestScene(sceneData);
        }
        if ((_a = this.scene.audio) === null || _a === void 0 ? void 0 : _a.url) {
            this.loadAudio(this.scene.audio.url, this.scene.audio.info);
        }
        else {
            this.destroyAudio();
        }
        if (this.sceneRenderer) {
            if (this.scene.background) {
                this.sceneRenderer.options.background = this.scene.background;
            }
        }
        this.scene.updateState();
        this.goToFrame(this.scene.current.frameNumber || 0);
        this.hasUnsavedChanges = false;
        this.resize();
        return [this.scene, context];
    }
    async loadScene(sceneName) {
        const [storedScene, storageContext] = this.getStoredData('scene', sceneName);
        if (!storedScene) {
            return [false, storageContext];
        }
        const [scene, sceneContext] = await this.setScene(storedScene);
        return [scene, { ...storageContext, ...sceneContext }];
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
            console.error('audio file error', e);
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
            this.audioElement.pause();
        }
        if (this.playback.scrubAudioId) {
            clearTimeout(this.playback.scrubAudioId);
        }
    }
    playAudio() {
        if (this.audioElement && this.audioElement.paused) {
            this.audioElement.play();
        }
    }
    seekAudio(time) {
        if (this.audioElement) {
            return (this.audioElement.currentTime = time);
        }
    }
    scrubAudio(exposureOffset = 0) {
        // If negative, plays that many exposures at the end of the current frame hold.
        // This is useful for quickly previewing frame hold changes relative to audio.
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
        return this.playback.scrubAudioId = setTimeout(() => this.pauseAudio(), this.scene.current.singleFrameDuration * (frameExposures - exposureOffset));
    }
    moveFrameContents(deltaPoint, selection = []) {
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
        const fieldMargin = 40;
        const bounds = this.forceDimensions || {
            width: this.container.offsetWidth - 40 * 2,
            height: this.container.offsetHeight - 40 * 2,
        };
        if (this.options.showStatus && !this.forceDimensions) {
            const toolbarElement = this.ui.components.toolbar.getElement();
            const toolbarHeight = toolbarElement.offsetHeight;
            if (toolbarHeight) {
                bounds.height -= toolbarHeight;
            }
        }
        const boundsAspect = bounds.width / bounds.height;
        const sceneDimensions = this.scene.getDimensions();
        if (boundsAspect > sceneDimensions.aspect) {
            this.width = Math.floor(bounds.height * sceneDimensions.aspect);
            this.height = bounds.height;
        }
        else {
            this.width = bounds.width;
            this.height = Math.floor(bounds.width / sceneDimensions.aspect);
        }
        this.fieldElement.style.width = `${this.width}px`;
        this.fieldElement.style.height = `${this.height}px`;
        this.sceneRenderer.resize(this.width, this.height);
        this.toolRenderer.resize(this.width, this.height);
        this.zoomFactor = this.height / sceneDimensions.height;
        this.drawCurrentFrame();
        this.drawTool();
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
Penciltest.version = '0.3.1';
Penciltest.debugVersion = '0.3.2';
Penciltest.instrumentIdentifier = 'io.lovejoy.penciltest';
Penciltest.defaultOptions = {
    background: ColorHexNames.lightgray,
    strokeColor: ColorHexNames.black,
    strokeOpacity: -1,
    strokeWidth: 1,
    eraserWidth: 40,
    container: 'body',
    hideCursor: true,
    onionSkin: true,
    onionSkinFrameRadius: 4,
    renderer: Renderers.CANVAS,
    scrubAudio: false,
    showStatus: true,
    smoothing: 1,
    onionSkinForwardColor: [0, 200, 50, 0.5],
    onionSkinBackwardColor: [220, 0, 0, 0.5],
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
    mode: PenciltestMode.DRAWING,
    toolStack: [],
    pointerMode: PointerMode.AWAY,
    previousMode: null
};
