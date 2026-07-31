class PenciltestUI extends PenciltestUIComponent {
  //appActions: { showMenu: { label: string; hotkey: {}; gesture: {}; listener(): any; }; renderer: { label: string; listener(): any; action(): any; }; pageFlip: { label: string; gesture: {}; triggerOnMove: boolean; listener(): any; }; playPause: { ...; }; playReverse: { ...; }; nextFrame: { ...; }; prevFrame: { ...; }; };
  menuOptions: {};
  currentGesture: PenciltestGesture;
  controller: any;
  feedbackTimeout: number;
  components: {
    appStatus?: any;
    help?: any;
    menu?: any;
    sceneStatus?: any;
    statusBar?: any;
    toggleHelp?: any;
    toggleMenu?: any;
    toggleTool?: any;
  };
  previousEvent: any;
  pointer: { coords?: {x: number; y: number; } };
  uiListeners: { fieldDown: any; context: any; tool: any; help(): any; };
  menuItems: Array<HTMLElement>;
  keyBindings: { keydown: {}; keyup: {}; };
  menuIsVisible: any;
  feedbackElement: any;

  // action and listener functions are called in controller scope
  static appActions = {
    showMenu: {
      label: "Show Menu",
      hotkey: ['Tab'],
      gesture: /4 still/,
      listener(this: Penciltest) { return this.ui.toggleMenu(this.ui.pointer.coords || {x: 10, y: 10}); }
    },
    renderer: {
      label: "Set Renderer",
      listener(this: Penciltest) {
        let renderer: any;
        const self = this;
        return Utils.select(
          'Set renderer',
          [Renderers.CANVAS, Renderers.SVG],
          this.options.renderer,
          (selected: any) => self.setOptions({renderer: selected})
        );
      },
      action(this: Penciltest) {
        if (this.fieldElement) {
          if (this.renderer != null) {
            this.renderer.destroy();
          }
          const rendererOptions: PenciltestRendererOptions = {
            lineColor: this.scene.lineColor,
            lineWeight: this.scene.lineWeight,
            container: this.fieldElement,
            width: this.forceDimensions ? this.forceDimensions.width as number : this.scene.width,
            height: this.forceDimensions ? this.forceDimensions.height as number : this.scene.height
          };
          if (this.options.renderer === Renderers.SVG) {
            this.renderer = new SVGRenderer(rendererOptions);
          } else {
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
      listener(this: Penciltest) {
        return this.goToFrame(Math.floor(this.ui.currentGesture.startFrameNumber + (this.scene.frames.length * this.ui.currentGesture.deltaNormalized.x * 2)));
      }
    },
    playPause: {
      label: "Play/Pause",
      text: '\u25B6',
      hotkey: ['Space'],
      gesture: /2 still from center (bottom|middle)/,
      cancelComplementKeyEvent: true,
      listener(this: Penciltest) {
        this.playDirection = 1;
        return this.togglePlay();
      }
    },
    playReverse: {
      label: "Play in Reverse",
      hotkey: ['Shift+Space'],
      cancelComplementKeyEvent: true,
      listener(this: Penciltest) {
        this.playDirection = -1;
        return this.togglePlay();
      }
    },
    nextFrame: {
      label: "Next Frame",
      text: '\u27A1',
      hotkey: ['D', 'J', 'Right','.'],
      gesture: /2 still from right bottom/,
      repeat: true,
      listener(this: Penciltest) {
        this.goToFrame(this.current.frameNumber + 1);
        this.stop();
        if (this.audioElement) { return this.scrubAudio(); }
      }
    },
    prevFrame: {
      label: "Previous Frame",
      text: '\u2B05',
      hotkey: ['S', 'K', 'Left',','],
      gesture: /2 still from left bottom/,
      repeat: true,
      listener(this: Penciltest) {
        this.goToFrame(this.current.frameNumber - 1);
        this.stop();
        if (this.audioElement) { return this.scrubAudio(); }
      }
    },
    firstFrame: {
      label: "First Frame",
      text: '\u23EE',
      hotkey: ['1', '0','Home','PgUp'],
      gesture: /2 left from .* (bottom|middle)/,
      cancelComplementKeyEvent: true,
      listener(this: Penciltest) {
        this.goToFrame(0);
        this.stop();
      }
    },
    // lastFrame:
    //   label: "Last Frame"
    //   text: '⏭️'
    //   hotkey: ['$','End','PgDn']
    //   gesture: /2 right from .* (bottom|middle)/
    //   cancelComplementKeyEvent: true
    //   listener: ->
    //     this.goToFrame this.scene.frames.length - 1
    //     this.stop()
    // copyFrame:
    //   label: "Copy Frame/Strokes"
    //   hotkey: ['C']
    //   listener: ->
    //     this.copyFrame()
    // pasteFrame:
    //   label: "Paste Frame"
    //   hotkey: ['V']
    //   listener: ->
    //     this.pasteFrame()
    // pasteStrokes:
    //   label: "Paste Strokes"
    //   hotkey: ['Shift+V']
    //   listener: ->
    //     this.pasteStrokes()
    // insertFrameBefore:
    //   label: "Insert Frame Before"
    //   hotkey: ['Shift+A', 'Shift+I']
    //   gesture: /2 still from left top/
    //   listener: ->
    //     newIndex = this.current.frameNumber
    //     this.newFrame newIndex
    //     this.goToFrame newIndex
    // insertFrameAfter:
    //   label: "Insert Frame After"
    //   hotkey: ['Shift+D', 'I']
    //   gesture: /2 still from right top/
    //   listener: ->
    //     newIndex = this.current.frameNumber + 1
    //     this.newFrame newIndex
    //     this.goToFrame newIndex
    // insertSeconds:
    //   label: "Insert Seconds"
    //   hotkey: ['Alt+Shift+I']
    //   listener: ->
    //     self = this.
    //     Utils.prompt '# of seconds to insert: ', 1, (seconds) ->
    //       first = self.current.frameNumber + 1
    //       last = self.current.frameNumber + Math.floor self.scene.framerate * Number(seconds)
    //       self.newFrame newIndex for newIndex in [first..last]
    //       self.goToFrame newIndex
    // undo:
    //   label: "Undo"
    //   title: "Remove the last line drawn"
    //   hotkey: ['Z']
    //   gesture: /3 still from left/
    //   repeat: true
    //   listener: -> this.undo()
    // redo:
    //   label: "Redo"
    //   title: "Put back a line removed by 'Undo'"
    //   hotkey: ['Shift+Z']
    //   gesture: /3 still from right/
    //   repeat: true
    //   listener: -> this.redo()
    // lineColor:
    //   label: "Line Color"
    //   listener: ->
    //     self = this.
    //     Utils.prompt(
    //       'line color: ',
    //       this.scene.lineColor,
    //       (lineColor) ->
    //         if not lineColor then lineColor = 'black'
    //         self.setOptions lineColor: lineColor
    //       , 
    //       'color'
    //     )
    //   action: ->
    //     this.scene.lineColor = this.options.lineColor
    //     this.renderer?.lineColor = this.options.lineColor
    //     this.drawCurrentFrame()
    // background:
    //   label: "Background Color"
    //   listener: ->
    //     self = this.
    //     Utils.prompt(
    //       'background color: ',
    //       this.scene.background,
    //       (bg) ->
    //         if not bg then bg = 'white'
    //         self.setOptions background: bg
    //       , 
    //       'color'
    //     )
    //   action: ->
    //     this.scene.background = this.options.background
    //     this.renderer?.background = this.options.background
    //     this.drawCurrentFrame()
    // framerate:
    //   label: "Frame Rate"
    //   listener: ->
    //     self = this.
    //     Utils.prompt 'frames per second: ', this.scene.framerate, (rate) ->
    //       if rate then self.setOptions framerate: Number rate
    //   action: ->
    //     this.scene.framerate = this.options.framerate
    //     this.current.singleFrameDuration = 1 / this.scene.framerate
    // frameHold:
    //   label: "Default Frame Hold"
    //   listener: ->
    //     self = this.
    //     Utils.prompt 'default exposures per drawing: ', self.options.frameHold, (hold) ->
    //       if hold
    //         oldHold = self.options.frameHold
    //         self.setOptions frameHold: Number hold
    //         Utils.confirm 'update hold for existing frames in proportion to new setting??: ', ->
    //           magnitudeDelta = self.options.frameHold / oldHold
    //           for frame in self.scene.frames
    //             frame.hold = Math.round frame.hold * magnitudeDelta
    //           self.drawCurrentFrame() # FIXME: not sure why I need to redraw here. something about `setoptions frameHold` above?
    // hideCursor:
    //   label: "Hide Cursor"
    //   hotkey: ['H']
    //   listener: -> this.setOptions hideCursor: not this.options.hideCursor
    //   action: -> Utils.toggleClass this.container, 'hide-cursor', this.options.hideCursor
    // onionSkin:
    //   label: "Onion Skin"
    //   hotkey: ['F', 'O']
    //   gesture: /2 down from center (bottom|middle)/
    //   title: "show previous and next frames in red and blue"
    //   listener: ->
    //     this.setOptions onionSkin: not this.options.onionSkin
    //     this.resize() # FIXME: should either not redraw, or redraw fine without this
    // clearFrame:
    //   label: "Clear Frame"
    //   hotkey: ['Backspace']
    //   gesture: /3 down from center middle/
    //   cancelComplementKeyEvent: true
    //   listener: -> this.clearStrokes()
    // dropFrame:
    //   label: "Drop Frame"
    //   hotkey: ['Shift+X']
    //   gesture: /4 down from center top/
    //   cancelComplementKeyEvent: true
    //   listener: -> this.dropFrame()
    // cutFrame:
    //   label: "Cut Frame"
    //   hotkey: ['X']
    //   gesture: /3 down from center top/
    //   cancelComplementKeyEvent: true
    //   listener: -> this.cutFrame()

    smoothing: {
      label: "Smoothing...",
      title: "How much your lines will be smoothed as you draw",
      hotkey: ['Shift+S'],
      listener(this: Penciltest) {
        const self = this
        Utils.prompt(
          'Smoothing',
          self.options.smoothing,
          (smoothing: number) => self.setOptions({smoothing} as PenciltestOptions)
        );
      },
      action(this: Penciltest) {
        this.state.smoothDrawInterval = Math.sqrt(this.options.smoothing);
      }
    },

    // smoothFrame:
    //   label: "Smooth Frame"
    //   title: "Draw the frame again, with current smoothing settings"
    //   hotkey: ['Shift+M']
    //   listener: -> this.smoothFrame this.current.frameNumber
    // smoothScene:
    //   label: "Smooth All Frames"
    //   title: "Redraw all frames in the scene with the current smoothing setting"
    //   hotkey: ['Alt+Shift+M']
    //   listener: -> this.smoothScene()
    // lessHold:
    //   label: "Shorter Frame Hold"
    //   hotkey: ['Down', '-']
    //   gesture: /2 still from left middle/
    //   repeat: true
    //   listener: -> this.setCurrentFrameHold this.getCurrentFrame().hold - 1
    // moreHold:
    //   label: "Longer Frame Hold"
    //   hotkey: ['Up', '+', '=']
    //   gesture: /2 still from right middle/
    //   repeat: true
    //   listener: -> this.setCurrentFrameHold this.getCurrentFrame().hold + 1
    // toggleDebug:
    //   label: "Toggle Debug"
    //   title: "Verbose logs for debugging"
    //   listener: -> this.setOptions debug: not this.options.debug
    // showStatus:
    //   label: "Show Status"
    //   title: "hide the scene status bar"
    //   listener: -> this.setOptions showStatus: not this.options.showStatus
    //   action: -> Utils.toggleClass this.ui.components.statusBar.getElement(), 'hidden', not this.options.showStatus
    // loop:
    //   label: "Loop"
    //   hotkey: ['L']
    //   gesture: /2 up from center (bottom|middle)/
    //   listener: ->
    //     this.setOptions loop: not this.options.loop
    //     this.resize() # FIXME: should either not redraw, or redraw fine without this
    // saveScene:
    //   label: "Save"
    //   hotkey: ['Ctrl+Alt+S']
    //   gesture: /3 still from center (bottom|middle)/
    //   listener: ->
    //     this.updateScene()
    //     this.saveScene()
    // loadScene:
    //   label: "Load"
    //   hotkey: ['Alt+O']
    //   gesture: /3 up from center (bottom|middle)/
    //   listener: -> this.loadScene()
    // newScene:
    //   label: "New"
    //   hotkey: ['Alt+N']
    //   listener: ->
    //     self = this.
    //     if this.hasUnsavedChanges
    //       Utils.confirm "Make a new scene? Unsaved changes will be lost.", -> self.newScene()
    //     else
    //       this.newScene()
    // renderGif:
    //   label: "Render GIF"
    //   hotkey: ['G']
    //   listener: -> this.renderGif()
    // resizeScene:
    //   label: "Resize Canvas"
    //   title: "Set the width and height of the canvas in this scene"
    //   hotkey: ['Alt+R']
    //   listener: ->
    //     self = this.
    //     Utils.prompt 'Scene width & aspect (W/H)', "#{this.scene.width} #{this.scene.aspect}", (dimensionsResponse) ->
    //       dimensions = dimensionsResponse.split ' '
    //       self.scene.width = Number dimensions[0]
    //       self.scene.aspect = dimensions[1]
    //       self.resize()
    // panScene:
    //   label: "Pan Scene"
    //   title: "Drag to reposition all frames in this scene. Useful after resizing."
    //   hotkey: ['P']
    //   listener: ->
    //     self = this.
    //     oldMode = this.state.mode
    //     this.state.mode = PenciltestModes.WORKING

    //     startPoint = endPoint = deltaPoint = [0,0]
    //     frameScale = this.width / this.scene.width

    //     dragStart = (event: PointerEvent | TouchEvent) ->
    //       startPoint = endPoint = [event.clientX, event.clientY]
    //       deltaPoint = [0, 0]
    //       self.fieldElement.addEventListener 'mousemove', dragStep
    //       self.fieldElement.addEventListener 'mouseup', dragEnd

    //     dragStep = (event: PointerEvent | TouchEvent) ->
    //       deltaPoint = [endPoint[0] - startPoint[0], endPoint[1] - startPoint[1]]
    //       immediateDeltaPoint =  [event.clientX - endPoint[0], event.clientY - endPoint[1]]
    //       endPoint = [event.clientX, event.clientY]
    //       self.pan [immediateDeltaPoint[0] / frameScale, immediateDeltaPoint[1] / frameScale]
    //       self.drawCurrentFrame()

    //     dragEnd = (event: PointerEvent | TouchEvent) ->
    //       self.fieldElement.removeEventListener 'mouseup', dragEnd
    //       self.fieldElement.removeEventListener 'mousedown', dragStart
    //       self.fieldElement.removeEventListener 'mousemove', dragStep

    //       self.state.mode = oldMode

    //     this.fieldElement.addEventListener 'mousedown', dragStart
    //     this.resize()
    // deleteScene:
    //   label: "Delete Scene"
    //   hotkey: ['Alt+Backspace']
    //   listener: -> this.deleteScene()
    // exportScene:
    //   label: "Export"
    //   hotkey: ['Ctrl+S', 'Alt+E']
    //   cancelComplementKeyEvent: true
    //   listener: ->
    //     this.updateScene (scene) =>
    //       blob = new Blob([JSON.stringify scene], {type:'application/json'})
    //       url = globalThis.URL.createObjectURL blob
    //       fileName = (scene.name || 'untitled') + '.penciltest.json'
    //       Utils.downloadFromUrl url, fileName
    // importScene:
    //   label: "Import"
    //   hotkey: ['Ctrl+O']
    //   cancelComplementKeyEvent: true
    //   listener: ->
    //     self = this.
    //     Utils.promptForFile(
    //       'Load a scene JSON file',
    //       (sceneJSON) ->
    //         self.setScene JSON.parse sceneJSON
    //         self.saveScene(false)
    //       ,
    //       '.json,application/json',
    //       'text')
    // linkAudio:
    //   label: "Link Audio"
    //   hotkey: ['Alt+A']
    //   listener: (controller, notice) ->
    //     self = this.
    //     promptMessage = 'Audio file'
    //     promptMessage += ' ('+notice+')' if notice
    //     promptMessage += ': '
    //     Utils.promptForFile(
    //       promptMessage,
    //       (uri, filePath) ->
    //         self.loadAudio(uri, filePath) if uri
    //       ,
    //       'audio/*',
    //       'uri')
    // unloadAudio:
    //   label: "Unload Audio"
    //   listener: ->
    //     this.destroyAudio
    // shiftAudioEarlier:
    //   label: "Shift Audio Earlier"
    //   hotkey: ['[']
    //   title: "Decrease the offset of the audio playback"
    //   listener: ->
    //     Utils.log "Shift Audio Earlier"
    //     this.scene.audio.offset-- if this.scene.audio
    //     this.ui.updateStatus()
    // shiftAudioLater:
    //   label: "Shift Audio Later"
    //   title: "Increase the offset of the audio playback"
    //   hotkey: [']']
    //   listener: ->
    //     Utils.log "Shift Audio Later"
    //     this.scene.audio.offset++ if this.scene.audio
    //     this.ui.updateStatus()
    // toggleInterfaceHelp:
    //   label: "Help"
    //   hotkey: ['?']
    //   listener: -> this.ui.toggleInterfaceHelp()
    // reset:
    //   label: "Reset"
    //   title: "Reset the app's state and settings. Helpful if the app has stopped working."
    //   action: ->
    //     this.state = Utils.inherit {}, Penciltest.prototype.state
    //     this.setOptions Utils.inherit {}, Penciltest.prototype.options

    eraser: {
      label: "Eraser",
      hotkey: ['E'],
      listener(this: Penciltest) {
        this.useTool(
          this.state.toolStack[0] == PenciltestTools.ERASER
            ? this.state.toolStack[1]
            : PenciltestTools.ERASER
        );
        this.ui.updateStatus();
      }
    },
  };

  static menuOptions = [{
      _icons: [
        'firstFrame',
        'prevFrame',
        'playPause',
        'nextFrame',
        'lastFrame'
      ],
      Edit: [
        'undo',
        'redo',
        'moreHold',
        'lessHold',
        'copyFrame',
        'cutFrame',
        'pasteFrame',
        'pasteStrokes',
        'insertFrameAfter',
        'insertFrameBefore',
        'insertSeconds',
        'clearFrame',
        'dropFrame'
      ],
      Playback: [
        'loop'
      ],
      Tools: [
        'hideCursor',
        'onionSkin',
        'smoothing',
        'smoothFrame',
        'smoothScene',
        'linkAudio'
      ],
      Scene: [
        'renderGif',
        'saveScene',
        'loadScene',
        'importScene',
        'exportScene',
        'framerate',
        'resizeScene',
        'panScene',
        'background',
        'lineColor',
        'newScene'
      ],
      Settings: [
        'frameHold',
        'renderer',
        'toggleInterfaceHelp',
        'reset',
        'toggleDebug'
      ]
    }
  ];

  constructor(initOptions:PenciltestUIOptions) {
    const options = {
      className: 'penciltest-ui',
      parent: document.body,
      ...initOptions,
    };

    super(options);

    this.controller = options.controller;

    this.markupDOMElements();

    this.addInputListeners();
    this.addMenuListeners();
    this.addKeyboardListeners();
    this.addOtherListeners();
  }

  markupDOMElements() {
    this.components = {};

    const componentInfo = {
      toolbar: {
        className: 'toolbar',
        parent: this
      },
      statusBar: {
        className: 'status',
        parent: 'toolbar'
      },
      statusLeft: {
        className: 'status-left',
        parent: 'statusBar'
      },
      statusRight: {
        className: 'status-right',
        parent: 'statusBar'
      },
      appStatus: {
        className: 'app-status',
        parent: 'statusLeft'
      },
      sceneStatus: {
        className: 'scene-status',
        parent: 'statusRight'
      },
      toggleTool: {
        tagName: 'button',
        className: 'toggle-tool',
        text: '\u1F589',
        parent: 'statusRight'
      },
      toggleMenu: {
        tagName: 'button',
        className: 'toggle-menu',
        parent: 'statusRight',
        text: '\u2699'
      },
      toggleHelp: {
        tagName: 'button',
        text: '🯄',
        className: 'toggle-help',
        parent: 'statusRight'
      },
      menu: {
        tagName: 'ul',
        className: 'menu',
        parent: this
      },
      help: {
        tagName: 'div',
        className: 'help',
        parent: 'toolbar'
      }
    };

    for (let name in componentInfo) {
      const options = componentInfo[name];
      if (typeof options.parent === 'string') {
        options.parent = this.components[options.parent];
      }
      this.components[name] = new PenciltestUIComponent(options);
    }

    return this.components.menu.setHTML(this.menuWalker(this.menuOptions));
  }

  doAppAction(optionName: string, args: object = {}) {
    if (args == null) { args = []; }
    if (PenciltestUI.appActions[optionName] != null ? PenciltestUI.appActions[optionName].listener : undefined) {
      return (PenciltestUI.appActions[optionName].listener != null ? PenciltestUI.appActions[optionName].listener.call(this.controller, args) : undefined);
    } else if (PenciltestUI.appActions[optionName] != null ? PenciltestUI.appActions[optionName].action : undefined) {
      return PenciltestUI.appActions[optionName].action.call(this.controller, args);
    }
  }

  menuWalker(level: any) {
    let markup = '';
    for (let key of Array.from(level)) {
      if (typeof key === 'string') {
        var title: any;
        const {
          label
        } = PenciltestUI.appActions[key];
        if (PenciltestUI.appActions[key].title) { ({
          title
        } = PenciltestUI.appActions[key]); }
        const text = PenciltestUI.appActions[key].text || '';
        markup += `<li rel=\"${key}\" title=\"${title}\">${text}<label>${label}</label></li>`;
      } else {
        for (let groupName in key as object) {
          const group = key[groupName];
          if (groupName === '_icons') {
            markup += "<li class=\"icons\"><ul>";
          } else {
            markup += `<li class=\"group collapsed\"><label>${groupName}</label><ul>`;
          }
          markup += this.menuWalker(group);
          markup += '</ul></li>';
        }
      }
    }

    return markup;
  }

  addInputListeners() {
    const self = this;

    this.previousEvent = null;

    this.pointer = {};

    const getEventPageXY = function(event: PointerEvent | TouchEvent) {
      let eventLocation: { pageX: any; pageY: any; };
      if (/^touch/.test(event.type)) {
        eventLocation = (event as TouchEvent).touches[0];
      } else {
        eventLocation = event as PointerEvent;
      }

      return {x: eventLocation.pageX, y: eventLocation.pageY} as Point;
    };

    const trackFromEvent = (pageCoords: any) => self.pointer.coords = pageCoords;

    const mouseDownListener = function(event: PointerEvent | TouchEvent) {
      this.previousEvent = event;
      if (this.controller.state.mode !== PenciltestModes.DRAWING) { return; }
      event.preventDefault();
      if ((event.type === 'touchstart') && ((event as TouchEvent).touches.length > 1)) {
        this.controller.cancelStroke();
        this.fieldBounds = {
          x: 0,
          y: 0,
          width: this.controller.width,
          height: this.controller.height
        };
        if (!this.currentGesture) {
          this.doAppAction('undo');
        }
        this.clearGesture();
        this.recordGesture(event as TouchEvent, this.fieldBounds);
        return this.currentGesture.startFrameNumber = this.controller.current.frameNumber;
      } else {
        const pointerEvent = event as PointerEvent
        if (pointerEvent.button === 2) {
          return true; // allow context menu
        } else {
          this.hideMenu();
        }

        if (pointerEvent.button === 1) { this.controller.useTool(PenciltestTools.ERASER); } // mouse middle button; can map stylus eraser to this

        const pageCoords = getEventPageXY(pointerEvent);
        self.controller.track(
          pageCoords.x - self.controller.fieldContainer.offsetLeft,
          pageCoords.y - self.controller.fieldContainer.offsetTop
        );
        this.uiListeners.move = mouseMoveListener.bind(this);
        this.uiListeners.up = mouseUpListener.bind(this);

        document.body.addEventListener('mousemove', this.uiListeners.move);
        document.body.addEventListener('touchmove', this.uiListeners.move);
        document.body.addEventListener('mouseup', this.uiListeners.up);
        return document.body.addEventListener('touchend', this.uiListeners.up);
      }
    };

    var mouseMoveListener = function(event: PointerEvent | TouchEvent) {
      // @previousEvent = event
      event.preventDefault();
      if ((event.type === 'touchmove') && ((event as TouchEvent).touches.length > 2)) {
        this.recordGesture(event as TouchEvent, this.fieldBounds);
        return this.progressGesture(this.describeGesture(this.fieldBounds));
      } else {
        const pageCoords = getEventPageXY(event as PointerEvent);
        this.pointer.coords = pageCoords;
        if (this.controller.state.mode === PenciltestModes.DRAWING) {
          return self.controller.track(
            pageCoords.x - self.controller.fieldContainer.offsetLeft,
            pageCoords.y - self.controller.fieldContainer.offsetTop
          );
        }
      }
    };

    var mouseUpListener = function(event: { type: string; button: number; }) {
      this.previousEvent = event;
      if ((event.type === 'mouseup') && (event.button === 2)) {
        return true; // allow context menu
      } else {
        if ((event.type === 'touchend') && this.currentGesture) {
          this.doGesture(this.describeGesture(this.fieldBounds, 'final'));
          this.clearGesture(event);
        }
        if (event.button === 1) { this.controller.useTool(PenciltestTools.PENCIL); }
        document.body.removeEventListener('mousemove', this.uiListeners.move);
        document.body.removeEventListener('touchmove', this.uiListeners.move);
        document.body.removeEventListener('mouseup', this.uiListeners.up);
        document.body.removeEventListener('touchend', this.uiListeners.up);
        return this.controller.lift();
      }
    };

    const toggleToolListener = function(event: PointerEvent | TouchEvent) {
      event.preventDefault();
      return PenciltestUI.appActions.eraser.listener.call(this.controller);
    };

    const contextMenuListener = function(event: PointerEvent | TouchEvent) {
      event.preventDefault();
      if (!this.previousEvent || !this.previousEvent.type.match(/^touch/)) {
        return this.toggleMenu(getEventPageXY(event));
      }
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

    this.uiListeners = {
      fieldDown: mouseDownListener.bind(this),
      context: contextMenuListener.bind(this),
      tool: toggleToolListener.bind(this),
      help() { return self.doAppAction('toggleInterfaceHelp'); }
    };

    this.controller.fieldElement.addEventListener('mousedown', this.uiListeners.fieldDown);
    this.controller.fieldElement.addEventListener('touchstart', this.uiListeners.fieldDown);
    this.controller.fieldElement.addEventListener('contextmenu', this.uiListeners.context);
    this.components.toggleTool.getElement().addEventListener('click', this.uiListeners.tool);
    this.components.toggleMenu.getElement().addEventListener('click', this.uiListeners.context);
    return this.components.toggleHelp.getElement().addEventListener('click', this.uiListeners.help);
  }

  recordGesture(event: TouchEvent, bounds: Bounds) {
    if (!this.currentGesture) {
      this.currentGesture = {
        touches: event.targetTouches.length,
        origin: Utils.averageTouches(event)
      };
    }

    this.currentGesture.last = Utils.averageTouches(event);
    this.currentGesture.delta = Utils.diffPoints(this.currentGesture.last, this.currentGesture.origin);
    return this.currentGesture.deltaNormalized = {
      x: this.currentGesture.delta.x / bounds.width,
      y: this.currentGesture.delta.y / bounds.height
    };
  }

  clearGesture(event: any) {
    return this.currentGesture = null;
  }

  doGesture(gestureDescription: any) {
    for (let name in PenciltestUI.appActions) {
      const action = PenciltestUI.appActions[name];
      if (!action.triggerOnMove && action.gesture && action.gesture.test(gestureDescription)) {
        this.controller.options.debug && console.debug("action '%s' triggered by gesture '%s'", name, gestureDescription);
        return this.doAppAction(name);
      }
    }
  }

  describePosition(coordinates: Point, bounds: Rect) {
    const positionDescriptors = {
      '0.00': { x: 'left'   , y: 'top'
    },
      '0.33': { x: 'center' , y: 'middle'
    },
      '0.67': { x: 'right'  , y: 'bottom'
    }
    };

    const positionRatio: Point = {
      x: (coordinates.x - bounds.x) / bounds.width,
      y: (coordinates.y - bounds.y) / bounds.height
    };

    const positionDescription: PositionDescription = {x:'', y:''};
    for (let minRatio in positionDescriptors) {
      const descriptors = positionDescriptors[minRatio];
      if (positionRatio.x > Number(minRatio)) { positionDescription.x = descriptors.x; }
      if (positionRatio.y > Number(minRatio)) { positionDescription.y = descriptors.y; }
    }

    return positionDescription.x + ' ' + positionDescription.y;
  }

  describeMotion(startCoordinates: Point, endCoordinates: Point) {
    let description: string;
    const motionThreshold = 10;

    const delta = {
      x: endCoordinates.x - startCoordinates.x,
      y: endCoordinates.y - startCoordinates.y
    };

    const absX: number = Math.abs(delta.x);
    const absY: number = Math.abs(delta.y);

    if ((absX + absY) < motionThreshold) { // TODO: find hypotenuse
        description = 'still';
    } else if (absX > absY) {
      description = delta.x > 0 ? 'right' : 'left';
    } else {
      description = delta.y > 0 ? 'down' : 'up';
    }

    return description;
  }

  describeGesture(gestureBounds: any, extra: string) {
    if (extra == null) { extra = ''; }
    let description = String(this.currentGesture.touches);
    description += ' ' + this.describeMotion( this.currentGesture.origin, this.currentGesture.last );
    description += ' from ' + this.describePosition( this.currentGesture.origin, gestureBounds );
    if (extra) { description += ` ${extra}`; }

    return description;
  }

  progressGesture(gestureDescription: any) {
    for (let name in PenciltestUI.appActions) {
      const action = PenciltestUI.appActions[name];
      if (action.triggerOnMove && action.gesture && action.gesture.test(gestureDescription)) {
        return this.doAppAction(name);
      }
    }
  }

  updateMenuOption(optionElement: HTMLElement) {
    const optionName = optionElement.getAttribute('rel');
    if (typeof this.controller.options[optionName] === 'boolean') {
      return Utils.toggleClass(optionElement, 'enabled', this.controller.options[optionName]);
    }
  }

  addMenuListeners() {
    const self = this;
    this.menuItems = this.components.menu.getElement().querySelectorAll('LI');

    const menuOptionListener = function(event: KeyboardEvent | PointerEvent | TouchEvent) {
      if (this.classList.contains('group')) {
        Utils.toggleClass(this, 'collapsed');
        return (() => {
          const result = [];
          for (let item of Array.from(self.menuItems)) {
            if ((item !== this) && item.classList.contains('group') && !item.classList.contains('collapsed')) {
              result.push(item.classList.add('collapsed'));
            } else {
              result.push(undefined);
            }
          }
          return result;
        })();
      } else if (this.hasAttribute('rel')) {
        event.preventDefault();
        const optionName = this.getAttribute('rel');
        self.doAppAction(optionName);
        return self.hideMenu();
      }
    };

    return (() => {
      const result = [];
      for (let option of Array.from(this.menuItems)) {
        option.addEventListener('mouseup', menuOptionListener);
        // option.addEventListener 'touchend', menuOptionListener
        result.push(option.addEventListener('contextmenu', menuOptionListener));
      }
      return result;
    })();
  }

  addKeyboardListeners() {
    const self = this;

    this.keyBindings = {
      keydown: {},
      keyup: {}
    };

    for (let name in PenciltestUI.appActions) {
      const action = PenciltestUI.appActions[name];
      if (action.hotkey) {
        for (let hotkey of action.hotkey) {
          if (action.repeat) {
            this.keyBindings.keydown[hotkey] = name;

            if (action.cancelComplementKeyEvent) {
              this.keyBindings.keyup[hotkey] = null;
            }

          } else {

            this.keyBindings.keyup[hotkey] = name;

            if (action.cancelComplementKeyEvent) {
              this.keyBindings.keydown[hotkey] = null;
            }
          }
        }
      }
    }

    const keyboardListener = function(event: KeyboardEvent) {
      if (!globalThis.pauseKeyboardListeners) {
        const combo = this.describeKeyCombo(event);
        const actionName = self.keyBindings[event.type][combo];

        if (actionName || (actionName === null)) {
          event.preventDefault();

          if (actionName) {
            return self.doAppAction(actionName);
          }
        }
      }
    };

        // Utils.log "#{event.type}-#{combo} (#{event.keyCode})" if event.keyCode isnt 0

    document.body.addEventListener('keydown', (event: any) => keyboardListener(event));
    return document.body.addEventListener('keyup', (event: any) => keyboardListener(event));
  }

  addOtherListeners() {
    const self = this;
    document.body.addEventListener('wheel', function(event: WheelEvent) {
      if (self.menuIsVisible) {
        return;
      }
      if (event.deltaY > 0) {
        return self.doAppAction('nextFrame');
      } else {
        return self.doAppAction('prevFrame');
      }
    });
    return globalThis.addEventListener('beforeunload', function(event: BeforeUnloadEvent) {
      self.controller.putStoredData('app', 'options', self.controller.options);
      self.controller.putStoredData('app', 'state', self.controller.state);
      if (self.controller.hasUnsavedChanges) { return event.returnValue = "You have unsaved changes. Ctrl+Alt+S to save."; }
    });
  }

  toggleInterfaceHelp() {
    const helpElement = this.components.help.getElement();
    const open = Utils.toggleClass(helpElement, 'active');

    helpElement.innerHTML = '';
    //for child in helpElement.children
    //  helpElement.removeChild(child)

    if (open) {
      const gesturesHeadingElement = document.createElement('H3');
      gesturesHeadingElement.innerText = 'Gestures:';
      const gesturesDocElement = document.createElement('DL');
      const keyboardHeadingElement = document.createElement('H3');
      keyboardHeadingElement.innerText = 'Keyboard Shortcuts:';
      const keyboardDocElement = document.createElement('DL');

      for (let name in PenciltestUI.appActions) {
        const action = PenciltestUI.appActions[name];
        if (action.hotkey) {
          const keyboardActionTermElement = document.createElement('DT');
          const keyboardActionDefElement = document.createElement('DD');
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
          const gesturesActionTermElement = document.createElement('DT');
          const gesturesActionDefElement = document.createElement('DD');
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

  updateStatus() {
    if (this.controller.options.showStatus) {
      let appStatusMarkup = `v${Penciltest.prototype.state.version}`;
      appStatusMarkup += ` Smoothing: ${this.controller.options.smoothing}`;

      this.components.appStatus.setHTML(appStatusMarkup);

      let sceneStatusMarkup = "<div class=\"frame\">";
      sceneStatusMarkup += `${this.controller.scene.framerate} FPS`;
      sceneStatusMarkup += ` | (hold ${this.controller.getCurrentFrame().hold})`;
      sceneStatusMarkup += ` | ${this.controller.current.frameNumber + 1}/${this.controller.scene.frames.length}`;
      sceneStatusMarkup += ` | ${Utils.getDecimal(this.controller.current.frames[this.controller.current.frameNumber].time, 1, true)}`;
      if (this.controller.scene.audio != null ? this.controller.scene.audio.offset : undefined) {
        sceneStatusMarkup += ` ${this.controller.scene.audio.offset >= 0 ? '+' : ''}${this.controller.scene.audio.offset}`;
      }
      sceneStatusMarkup += "</div>";

      this.components.sceneStatus.setHTML(sceneStatusMarkup);
      return this.components.toggleTool.getElement().className = `toggle-tool fa fa-${this.controller.state.toolStack[0]}`;// FIXME: use a helper to do this
    }
  }

  showMenu(coords: Point) {
    if (!this.menuIsVisible) {
      if (!coords) {
        coords = this.pointer.coords || {x: 10, y: 10};
      }

      this.menuIsVisible = true;
      const menuElement = this.components.menu.getElement();
      Utils.toggleClass(menuElement, 'active', true);

      const maxRight = this.components.menu.getElement().offsetWidth;
      const maxBottom = 0;

      if (coords.x > (document.body.offsetWidth - maxRight - menuElement.offsetWidth)) {
        menuElement.style.right = `${maxRight}px`;
        menuElement.style.left = "auto";
      } else {
        menuElement.style.left = `${coords.x + 1}px`;
        menuElement.style.right = "auto";
      }

      if (coords.y > (document.body.offsetHeight - maxBottom - menuElement.offsetHeight)) {
        menuElement.style.top = "auto";
        menuElement.style.bottom = maxBottom;
      } else {
        menuElement.style.top = `${coords.y}px`;
        menuElement.style.bottom = "auto";
      }

      return (() => {
        const result = [];
        for (let option of Array.from(this.menuItems)) {
          if (option.hasAttribute('rel')) { result.push(this.updateMenuOption(option)); } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }

  hideMenu() {
    if (this.menuIsVisible) {
      this.menuIsVisible = false;
      return Utils.toggleClass(this.components.menu.getElement(), 'active', false);
    }
  }

  toggleMenu(coords: any) {
    if (this.menuIsVisible) { return this.hideMenu(); } else { return this.showMenu(coords); }
  }

  showFeedback(message: any, duration: number) {
    if (duration == null) { duration = 2000; }
    const self = this;
    if (!this.feedbackElement) {
      this.feedbackElement = new PenciltestUIComponent({id: 'pt-feedback', parent: this});
    }
    this.feedbackElement.setHTML(message);
    this.feedbackElement.getElement().style.opacity = 1;

    clearTimeout(this.feedbackTimeout);
    const hideFeedback = () => self.feedbackElement.getElement().style.opacity = 0;
    return this.feedbackTimeout = setTimeout(hideFeedback, duration);
  }
}
