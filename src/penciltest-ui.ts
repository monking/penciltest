class PenciltestUI extends PenciltestUIComponent {
  appActions: AppActionsList;
  menuOptions: Array<any>;
  currentGesture: PenciltestGesture;
  controller: any;
  feedbackTimeout: number;
  components: { [key: string]: any /* FIXME: Setting to `PenciltestUIComponent` causes `.getElement().addEventListener()` to complain: `Argument of type 'Function' is not assignable to parameter of type 'EventListenerOrEventListenerObject'.` @1785650080*/; };
  previousEvent: PointerEvent | MouseEvent | WheelEvent | KeyboardEvent | null;
  pointer: { coords: Point; };
  uiListeners: { [key:string]: Function; };
  menuItemElements: Array<HTMLElement>;
  keyBindings: { keydown: {}; keyup: {}; };
  menuIsVisible: any;
  feedbackElement: any;

  // action and listener functions are called in controller scope


  constructor(initOptions:PenciltestUIOptions) {
    const options = {
      className: 'penciltest-ui',
      parent: document.body,
      ...initOptions,
    };

    super(options);

    this.controller = options.controller;

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
          },
          'loop',
          'framerate',
          'frameHold',
          'linkAudio',
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
        listener(this: Penciltest) {
          this.ui.toggleMenu(this.ui.pointer.coords || {x: 10, y: 10});
        }
      },

      renderer: {
        label: "Set Renderer",
        async listener(this: Penciltest) {
          let renderer: any;
          const self = this;
          const selectedRenderer = await Utils.select(
            'Set renderer',
            [Renderers.CANVAS, Renderers.SVG],
            this.options.renderer
          );
          self.setOptions({renderer: selectedRenderer as Renderers.CANVAS | Renderers.SVG})
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
          const frameOffset = this.scene.frames.length * this.ui.currentGesture.deltaNormalized.x * 2
          this.goToFrame(Math.floor(this.ui.currentGesture.startFrameNumber + frameOffset));
        }
      },

      playPause: {
        label: "Play/Pause",
        text: '\u25B6',
        hotkey: ['Space'],
        gesture: /2 still from center (bottom|middle)/,
        cancelComplementKeyEvent: true,
        listener(this: Penciltest) {
          this.playback.direction = 1;
          this.togglePlay();
        }
      },

      playReverse: {
        label: "Play in Reverse",
        hotkey: ['Shift+Space'],
        cancelComplementKeyEvent: true,
        listener(this: Penciltest) {
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
        listener(this: Penciltest, event) {
          const toFrame = this.scene.current.frameNumber + 1
          if ((event as KeyboardEvent)?.shiftKey) {
            this.ui.expandSelection(this.scene.current.frameNumber, toFrame);
          } else {
            this.ui.clearSelection();
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
        listener(this: Penciltest, event) {
          const toFrame = this.scene.current.frameNumber - 1
          if ((event as KeyboardEvent)?.shiftKey) {
            this.ui.expandSelection(this.scene.current.frameNumber, toFrame);
          } else {
            this.ui.clearSelection();
          }
          this.goToFrame(toFrame);
          this.stop();
          this.scrubAudio();
        }
      },

      firstFrame: {
        label: "First Frame",
        text: '\u23EE',
        hotkey: ['1', '0','Home','PgUp'],
        hotkeyModifiers: ['Shift'],
        gesture: /2 left from .* (bottom|middle)/,
        cancelComplementKeyEvent: true,
        listener(this: Penciltest, event) {
          const toFrame = 0
          if ((event as KeyboardEvent)?.shiftKey) {
            this.ui.expandSelection(this.scene.current.frameNumber, toFrame);
          } else {
            this.ui.clearSelection();
          }
          this.goToFrame(0);
          this.stop();
        }
      },

      lastFrame: {
        label: "Last Frame",
        text: '⏭️',
        hotkey: ['$','End','PgDn'],
        hotkeyModifiers: ['Shift'],
        gesture: /2 right from .* (bottom|middle)/,
        cancelComplementKeyEvent: true,
        listener(this: Penciltest, event) {
          const toFrame = this.scene.frames.length - 1
          if ((event as KeyboardEvent)?.shiftKey) {
            this.ui.expandSelection(this.scene.current.frameNumber, toFrame);
          } else {
            this.ui.clearSelection();
          }
          this.goToFrame(toFrame);
          this.stop();
        }
      },

      copyFrames: {
        label: "Copy Frames/Strokes",
        hotkey: ['C'],
        hotkeyModifiers: ['Control'],
        listener(this: Penciltest) {
          const [ copiedFrames ] = this.copyFrames();
          this.ui.showFeedback(`Copied ${copiedFrames.length} frame${copiedFrames.length !== 1 ? 's' : ''}`);
        }
      },

      pasteFrames: {
      label: "Paste Frames",
        hotkey: ['V'],
        hotkeyModifiers: ['Control'],
        listener(this: Penciltest) {
          this.pasteFrames();
          this.ui.showFeedback(`Pasted ${this.copyBuffer.length} frame${this.copyBuffer.length !== 1 ? 's' : ''}`);
        }
      },

      pasteStrokes: {
        label: "Paste Strokes",
        hotkey: ['Shift+V'],
        listener(this: Penciltest) {
          this.pasteStrokes()
          this.ui.showFeedback('Pasted strokes');
        }
      },

      insertFrameBefore: {
        label: "Insert Frame Before",
        hotkey: ['Shift+A', 'Shift+I'],
        gesture: /2 still from left top/,
        listener(this: Penciltest) {
          const newIndex = this.scene.current.frameNumber;
          this.newFrame(newIndex);
          this.goToFrame(newIndex);
          this.ui.showFeedback('Inserted frame before');
        }
      },

      insertFrameAfter: {
        label: "Insert Frame After",
        hotkey: ['Shift+D', 'I'],
        gesture: /2 still from right top/,
        listener(this: Penciltest) {
          const newIndex = this.scene.current.frameNumber + 1;
          this.newFrame(newIndex);
          this.goToFrame(newIndex);
          this.ui.showFeedback('Inserted frame after');
        }
      },

      insertSeconds: {
        label: "Insert Seconds",
        hotkey: ['Alt+Shift+I'],
        async listener(this: Penciltest) {
          const newIndex = this.scene.current.frameNumber + 1;
          const seconds = Number(await Utils.prompt('# of seconds to insert: ', 1));
          const insertFrameCount = Math.floor(this.scene.framerate / this.options.frameHold * seconds);
          this.newFrame(null, insertFrameCount);
          this.goToFrame(newIndex);
          this.ui.showFeedback(`Inserted ${insertFrameCount} frames, beginnging at frame ${newIndex}`);
        }
      },

      undo: {
        label: "Undo",
        title: "Remove the last line drawn",
        hotkey: ['Z'],
        gesture: /3 still from left/,
        repeat: true,
        listener(this: Penciltest) {
          this.undo();
          this.ui.showFeedback(`undo`);
        }
      },

      redo: {
        label: "Redo",
        title: "Put back a line removed by 'Undo'",
        hotkey: ['Shift+Z'],
        gesture: /3 still from right/,
        repeat: true,
        listener(this: Penciltest) {
          this.redo();
          this.ui.showFeedback(`redo`);
        }
      },

      lineColor: {
        label: "Line Color",
        async listener(this: Penciltest) {
          const lineColor = await Utils.prompt('line color: ', this.scene.lineColor, {'input':'color'});
          if (lineColor) {
            this.setOptions({lineColor: lineColor});
          }
        },
        action(this: Penciltest) {
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
        async listener(this: Penciltest) {
          const bg = await Utils.prompt('background color: ', this.scene.background, {'input':'color'});
          if (bg) {
            this.setOptions({background: bg});
          }
        }, 
        action(this: Penciltest) {
          if (this.scene) {
            this.scene.background = this.options.background;
          }
          if (this.renderer) {
            this.renderer.options.background = this.options.background;
          }
          this.drawCurrentFrame()
        }
      },

      framerate: {
        label: "Frame rate",
        async listener(this: Penciltest) {
          const oldFrameRate = this.scene.framerate;
          const newFramerate = Number(await Utils.prompt(`Set the frame rate of the scene:<br><small>FPS, frames per second</small>`, this.scene.framerate));
          if (newFramerate && newFramerate !== oldFrameRate) {
            const newOptions:PenciltestOptions = {framerate: newFramerate};
            const [ isMultiple, absFactor, factorError, newIsLarger ] = Utils.isMultiple(newFramerate, oldFrameRate, 0.002);
            const promptMessage = `Adjust all frame hold times?\nThe new frame rate is ${isMultiple ? 'exactly' : `approximately`} ${absFactor} times ${newIsLarger ? 'faster' : 'slower'} than before${isMultiple ? '' : ` (${Utils.getDecimal(factorError, 3)} off)`}.`
            const factor = newIsLarger ? absFactor : 1/absFactor;
            if (await Utils.confirm(promptMessage)) {
              newOptions.frameHold = Math.round(this.options.frameHold * factor);
              this.scene.frames.forEach((frame, frameNumber) => {
                const oldHold = this.scene.getFrameHold(frameNumber);
                frame.hold = Math.round(oldHold * factor);
              });
            }
            this.setOptions(newOptions);
          }
        },
        action(this: Penciltest) {
          if (this.scene) {
            this.scene.framerate = this.options.framerate;
          }
          if (this.scene) {
            this.scene.current.singleFrameDuration = 1 / this.scene.framerate;
          }
        }
      },

      frameHold: {
        label: "Default Frame Hold",
        async listener(this: Penciltest) {
          const hold = await Utils.prompt('default exposures per drawing: ', this.options.frameHold);
          if (hold) {
            const oldHold = this.options.frameHold;
            this.setOptions({frameHold: Number(hold)});
            if (await Utils.confirm('Update hold for existing frames in proportion to new setting?')) {
              const magnitudeDelta = this.options.frameHold / oldHold;
              this.scene.frames.forEach((frame, frameNumber) => {
                frame.hold = Math.round(this.scene.getFrameHold(frameNumber) * magnitudeDelta);
              });
              this.drawCurrentFrame()
            }
          }
        }
      },

      hideCursor: {
        label: "Hide Cursor",
        hotkey: ['H'],
        listener(this: Penciltest) { this.setOptions({hideCursor: !this.options.hideCursor}); },
        action(this: Penciltest) { Utils.toggleClass(this.container, 'hide-cursor', this.options.hideCursor); },
      },

      onionSkin: {
        label: "Onion Skin",
        hotkey: ['F', 'O'],
        gesture: /2 down from center (bottom|middle)/,
        title: "show previous and next frames in red and blue",
        listener(this: Penciltest) {
          this.setOptions({onionSkin: !this.options.onionSkin});
          this.resize(); // FIXME: should either not redraw, or redraw fine without this
        }
      },

      clearFrame: {
        label: "Clear Frame",
        hotkey: ['Backspace'],
        gesture: /3 down from center middle/,
        cancelComplementKeyEvent: true,
        listener(this: Penciltest) { this.clearStrokes(); }
      },

      dropFrames: {
        label: "Drop Frame",
        hotkey: ['Shift+X'],
        gesture: /4 down from center top/,
        cancelComplementKeyEvent: true,
        listener(this: Penciltest) {
          const [ frames, start ] = this.dropFrames();
          this.ui.showFeedback(`Dropped ${frames.length} frame${frames.length !== 1 ? 's' : ''}`);
        }
      },

      cutFrames: {
        label: "Cut Frame",
        hotkey: ['X'],
        gesture: /3 down from center top/,
        cancelComplementKeyEvent: true,
        hotkeyModifiers: ['Control'],
        listener(this: Penciltest) {
          const [ frames ] = this.cutFrames();
          this.ui.showFeedback(`Cut ${frames.length} frame${frames.length !== 1 ? 's' : ''}`);
        }
      },

      smoothing: {
        label: "Smoothing…",
        title: "How much your lines will be smoothed as you draw",
        hotkey: ['Shift+S'],
        async listener(this: Penciltest) {
          const smoothing = await Utils.prompt('Smoothing', this.options.smoothing);
          if (typeof smoothing === 'number') {
            this.setOptions({smoothing})
          }
        },
        action(this: Penciltest) {
          this.state.smoothDrawInterval = Math.sqrt(this.options.smoothing);
        }
      },

      smoothFrame: {
        label: "Smooth Frame",
        title: "Redraws the current frame, using current smoothing settings",
        hotkey: ['Shift+M'],
        listener(this: Penciltest) { this.smoothFrame(this.scene.current.frameNumber); }
      },

      smoothScene: {
        label: "Smooth All Frames",
        title: "Redraw all frames in the scene with the current smoothing setting",
        hotkey: ['Alt+Shift+M'],
        async listener(this: Penciltest) {
          const startMode = this.state.mode;
          if (startMode === PenciltestModes.WORKING) {
            console.log(`Penciltest is: ${startMode}`);
            return;
          }
          const amount = Number(await Utils.prompt('Smoothing all frames in this scene. By how much? 1-5', 2));
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
        listener(this: Penciltest) {
          this.setCurrentFrameHold(this.scene.getFrameHold() - 1);
          this.scrubAudio(-1);
        }
      },

      moreHold: {
        label: "Longer Frame Hold",
        hotkey: ['Up', '+', '='],
        gesture: /2 still from right middle/,
        repeat: true,
        listener(this: Penciltest) {
          this.setCurrentFrameHold((this.scene.getFrameHold() || 1) + 1);
          this.scrubAudio(-1);
        }
      },

      debug: {
        label: "Toggle Debug",
        title: "Verbose logs for debugging",
        listener(this: Penciltest) { this.setOptions({debug: !this.options.debug}); }
      },

      showStatus: {
        label: "Show Status",
        title: "Show/hide the scene status bar",
        listener(this: Penciltest) { this.setOptions({showStatus: !this.options.showStatus}); },
        action(this: Penciltest) { Utils.toggleClass(this.ui.components.statusBar.getElement(), 'hidden', !this.options.showStatus); },
      },

      loop: {
        label: "Loop",
        hotkey: ['L'],
        gesture: /2 up from center (bottom|middle)/,
        listener(this: Penciltest) {
          this.setOptions({ loop: !this.options.loop });
          this.ui.showFeedback(`Loop: ${this.options.loop ? 'ON' : 'OFF'}`);
        }
      },

      scrubAudio: {
        label: "Scrub audio",
        hotkey: ['A'],
        title: "Play audio at the current frame when changing frames, other than regular playback.",
        listener(this: Penciltest) {
          this.setOptions({ scrubAudio: !this.options.scrubAudio });
          this.ui.showFeedback(`Scrub audio: ${this.options.scrubAudio ? 'ON' : 'OFF'}`);
        }
      },

      muteAudio: {
        label: "Toggle Mute",
        hotkey: ['M'],
        listener(this: Penciltest) {
          this.setPlayback({ muteAudio: !this.playback.muteAudio });
          this.ui.showFeedback(`Mute: ${this.playback.muteAudio ? 'ON' : 'OFF'}`);
        },
        action(this: Penciltest) {
          if (this.audioElement) {
            this.audioElement.volume = this.playback.muteAudio ? 0 : this.scene.audio.volume / 100;
          }
        }
      },

      splitFrame: {
        label: "Split frame",
        hotkey: ['B'],
        title: "Split the current frame into two.",
        async listener(this: Penciltest) {
          const startingFrameHold = this.scene.getFrameHold();
          if (startingFrameHold < 2) {
            this.ui.showFeedback('Frame must be held for 2 or more exposures to split.');
            return;
          }
          let splitOffset = Math.floor(startingFrameHold/2);
          if (startingFrameHold > 2) {
            const promptOptions = {
              'input':'range',
              'inputAttrs': {
                'min':1,
                'max':startingFrameHold - 1
              },
              'labelLogic': (offset:string) => offset
            };
            splitOffset = Number(await Utils.prompt(`Split the frame in twain<br><small>out of ${startingFrameHold} exposures, where to split?</small>`, splitOffset, promptOptions))
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
        async listener(this: Penciltest) {
          try {
            this.scene.setModified();
            if (!this.scene.name) {
              await this.ui.triggerAppAction('renameScene')
            }
            await this.saveScene()
            this.ui.showFeedback(`Saved scene '${this.scene.name}' to browser local storage`);
          } catch(e) {
            console.error(e);
            this.ui.showFeedback(`Unable to save scene: ${e.message}`);
          }
        }
      },

      renameScene: {
        label: "Rename Scene",
        async listener(this: Penciltest) {
          const newName = await Utils.prompt("Scene name:", this.scene.name);
          if (newName) {
            this.scene.name = newName;
            this.ui.updateStatus();
          }
        }
      },

      loadScene: {
        label: "Load from browser",
        hotkey: ['Shift+O'],
        gesture: /3 up from center (bottom|middle)/,
        async listener(this: Penciltest) {
          const sceneName = await this.ui.selectSceneName('Choose a scene to load');
          if (sceneName) {
            if (await this.loadScene(sceneName as string)) {
              this.ui.showFeedback(`Loaded scene: ${this.scene.name}`);
            }
          }
        }
      },

      newScene: {
        label: "New scene",
        hotkey: ['Alt+N'],
        listener(this: Penciltest) {
          if (
            this.hasUnsavedChanges
            || Utils.confirm("Make a new scene? Unsaved changes will be lost.")
          ) {
            this.newScene()
          }
        }
      },

      renderGif: {
        label: "Render GIF",
        hotkey: ['G'],
        listener(this: Penciltest) { this.renderGif(); }
      },

      resizeScene: {
        label: "Resize Canvas",
        title: "Set the width and height of the canvas in this scene",
        hotkey: ['Alt+R'],
        async listener(this: Penciltest) {
          const dimensionsResponse = await Utils.prompt('Scene width & aspect (W/H)', `${this.scene.width} ${this.scene.aspectRatio}`)
          if (!dimensionsResponse) {
            return;
          }
          const dimensions = dimensionsResponse.split(' ');
          this.scene.width = Number(dimensions[0])
          this.scene.aspectRatio = dimensions[1]
          this.resize()
        }
      },

      panScene: {
        label: "Pan Scene",
        title: "Drag to reposition all frames in this scene. Useful after resizing.",
        hotkey: ['P'],
        listener(this: Penciltest) {
          const self = this;
          const oldMode = this.state.mode;
          this.state.mode = PenciltestModes.WORKING;

          let startPoint:Point, endPoint:Point, deltaPoint:Point;
          startPoint = endPoint = deltaPoint = {x:0,y:0};
          let frameScale = this.width / this.scene.width;

          const dragStart = (event: PointerEvent | TouchEvent) => {
            if (event.type === 'touchstart') {
              const touchEvent = event as TouchEvent;
              startPoint = {x:touchEvent.touches[0].clientX, y:touchEvent.touches[0].clientY};
            } else {
              const pointerEvent = event as PointerEvent;
              startPoint = {x:pointerEvent.clientX, y:pointerEvent.clientY};
            }
            endPoint = startPoint;
            deltaPoint = {x:0,y:0}
            self.fieldElement.addEventListener('mousemove', dragStep);
            self.fieldElement.addEventListener('mouseup', dragEnd);
          };

          const dragStep = (event: PointerEvent | TouchEvent) => {
            deltaPoint = Utils.diffPoints(endPoint, startPoint);
            const nowPoint = Utils.eventPoint(event);
            const immediateDeltaPoint =  Utils.diffPoints(nowPoint, endPoint);
            endPoint = nowPoint;
            self.pan(Utils.scalePoint(immediateDeltaPoint, frameScale));
            self.drawCurrentFrame();
          };

          const dragEnd = (event: PointerEvent | TouchEvent) => {
            self.fieldElement.removeEventListener('mouseup', dragEnd);
            self.fieldElement.removeEventListener('mousedown', dragStart);
            self.fieldElement.removeEventListener('mousemove', dragStep);
            self.state.mode = oldMode;
          };

          this.fieldElement.addEventListener('mousedown', dragStart);
          this.resize();
        }
      },

      deleteScene: {
        label: "Delete Scene",
        hotkey: ['Alt+Backspace'],
        async listener(this: Penciltest) {
          const sceneName = await this.ui.selectSceneName('Choose a scene to delete from local browser storage:');
          if (typeof sceneName === 'string' && sceneName) {
            if (await this.deleteScene(sceneName)) {
              this.ui.showFeedback(`Deleted scene: ${sceneName}`);
            }
          }
        }
      },

      exportScene: {
        label: "Export JSON file",
        hotkey: ['Ctrl+S', 'Alt+E'],
        cancelComplementKeyEvent: true,
        async listener(this: Penciltest) {
          this.scene.setModified();
          if (!this.scene.name) {
            await this.ui.triggerAppAction('renameScene')
          }
          const packedScene = await PenciltestVersions.packScene(this.scene);
          const blob = new Blob([JSON.stringify(packedScene, null, '  ')], {type:'application/json'});
          const url = globalThis.URL.createObjectURL(blob);
          const fileName = (packedScene.name || 'untitled') + '.penciltest.json';
          await Utils.downloadFromUrl(url, fileName);
        }
      },

      importScene: {
        label: "Import JSON file",
        hotkey: ['Ctrl+O'],
        cancelComplementKeyEvent: true,
        async listener(this: Penciltest) {
          const promptMessage = 'Load a scene JSON file';
          const promptOptions:FilePromptOptions = {
            accept:'.json,application/json',
            loadAs: 'text',
            submitOnChange: true
          };
          const [sceneJSON, filePath] = await Utils.promptForFile(promptMessage, promptOptions);
          try {
            await this.setScene(JSON.parse(sceneJSON), true);
          } catch(e) {
            console.error(e);
          }
          //this.saveScene(false);
        }
      },

      linkAudio: {
        label: "Load Audio",
        hotkey: ['Alt+A'],
        async listener(this: Penciltest, notice:string = '') {
          const promptMessage = `Audio file${notice ? ' ('+notice+')' : ''}: `;
          const promptOptions:FilePromptOptions = {
            accept:'audio/*',
            loadAs:'uri',
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
        listener(this: Penciltest) { this.destroyAudio(); }
      },

      shiftAudioEarlier: {
        label: "Shift Audio Earlier",
        hotkey: ['['],
        title: "Decrease the offset of the audio playback",
        listener(this: Penciltest) {
          if (!this.scene.audio) {
            this.scene.audio = {offset:0};
          }
          this.scene.audio.offset--;
          this.ui.updateStatus();
          this.ui.showFeedback(`Audio shift: ${this.scene.audio.offset} s`);
        }
      },

      shiftAudioLater: {
        label: "Shift Audio Later",
        title: "Increase the offset of the audio playback",
        hotkey: [']'],
        listener(this: Penciltest) {
          if (!this.scene?.audio?.offset) {
            this.scene.audio = {offset:0};
          }
          this.scene.audio.offset++;
          this.ui.updateStatus();
          this.ui.showFeedback(`Audio shift: ${this.scene.audio.offset} s`);
        }
      },

      toggleInterfaceHelp: {
        label: "Help",
        hotkey: ['?'],
        listener(this: Penciltest) { this.ui.toggleInterfaceHelp(); }
      },

      reset: {
        label: "Reset",
        title: "Reset the app's state and settings. Helpful if the app has stopped working.",
        async listener(this: Penciltest) {
          if (await Utils.confirm(`Are you sure you want to reset? This is generally a last resort to work around bugs.`)) {
            this.resetOptionsAndState();
          }
        }
      },

      eraser: {
        label: "Eraser",
        hotkey: ['E'],
        listener(this: Penciltest) {
          this.useTool(
            this.state.toolStack[0] == PenciltestTools.ERASER
              ? this.state.toolStack[1]
              : PenciltestTools.ERASER
          );
        }
      },
    };

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

  async triggerAppAction(optionName: string, ...args: Array<any>): Promise<any> {
    if (typeof this.appActions[optionName]?.listener === 'function') {
      await this.appActions[optionName].listener.apply(this.controller, args);
    }
    return await this.handleAppReaction(optionName);
  }

  async handleAppReaction(optionName: string, ...args: Array<any>): Promise<any> {
    if (typeof this.appActions[optionName]?.action === 'function') {
      return await this.appActions[optionName].action.apply(this.controller, args);
    }
    return null;
  }

  menuWalker(level:Array<any>) {
    let markup = '';
    for (let key of level) {
      if (typeof key === 'string') {
        const { label, text, title } = {
          label: '',
          text: '',
          title: '',
          ...this.appActions[key]
        };

        markup += `<li rel=\"${key}\"`;

        if (title) {
          markup += ` title=\"${title}\"`;
        }

        markup += `>${text}`;

        if (label) {
          markup += `<label>${label}</label>`;
        }

        markup += `</li>`;
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

    this.pointer = {coords:{x:0,y:0}};

    const getEventPageXY = function(event: PointerEvent | TouchEvent):Point {
      let eventLocation: { pageX: any; pageY: any; };
      if (/^touch/.test(event.type)) {
        eventLocation = (event as TouchEvent).touches[0];
      } else {
        eventLocation = event as PointerEvent;
      }

      return {x: eventLocation.pageX, y: eventLocation.pageY} as Point;
    };

    //const trackFromEvent = (pageCoords: any) => self.pointer.coords = pageCoords; // DELME: unused @1785514531

    const fieldMouseDownListener = function(event: PointerEvent | TouchEvent) {
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
          this.triggerAppAction('undo');
        }
        this.clearGesture();
        this.recordGesture(event as TouchEvent, this.fieldBounds);
        this.currentGesture.startFrameNumber = this.controller.scene.current.frameNumber;
      } else {
        const pointerEvent = event as PointerEvent
        if (pointerEvent.button === 2) {
          return true; // allow context menu
        } else {
          this.hideMenu();
        }

        if (pointerEvent.button === 1) { this.controller.useTool(PenciltestTools.ERASER); } // mouse middle button; can map stylus eraser to this

        const pagePoint = getEventPageXY(pointerEvent);
        self.controller.track(
          pagePoint.x - self.controller.fieldContainer.offsetLeft,
          pagePoint.y - self.controller.fieldContainer.offsetTop
        );
        this.uiListeners.move = mouseMoveListener.bind(this);
        this.uiListeners.up = mouseUpListener.bind(this);

        document.body.addEventListener('mousemove', this.uiListeners.move);
        document.body.addEventListener('touchmove', this.uiListeners.move);
        document.body.addEventListener('mouseup', this.uiListeners.up);
        document.body.addEventListener('touchend', this.uiListeners.up);
      }
    };

    var mouseMoveListener = function(event: PointerEvent | TouchEvent) {
      // this.previousEvent = event
      event.preventDefault();
      if ((event.type === 'touchmove') && ((event as TouchEvent).touches.length > 2)) {
        this.recordGesture(event as TouchEvent, this.fieldBounds);
        return this.progressGesture(this.describeGesture(this.fieldBounds));
      } else {
        const pagePoint = getEventPageXY(event as PointerEvent);
        Object.assign(this.pointer.coords, pagePoint);
        if (this.controller.state.mode === PenciltestModes.DRAWING) {
          return self.controller.track(
            pagePoint.x - self.controller.fieldContainer.offsetLeft,
            pagePoint.y - self.controller.fieldContainer.offsetTop
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
      return this.triggerAppAction('eraser');
    };

    const contextMenuListener = function(event: PointerEvent | TouchEvent) {
      event.preventDefault();
      if (!this.previousEvent || !this.previousEvent.type.match(/^touch/)) {
        return this.toggleMenu(getEventPageXY(event));
      }
    };

    const globalMouseDownListener = function(event: PointerEvent | TouchEvent) {
      if (this.menuIsVisible && !this.components.menu.getElement().contains(event.target)) {
        this.hideMenu();
      }
    };

    const statusClickListener = function(event: PointerEvent | TouchEvent) {
      const targetElement = event.target as HTMLElement
      if (typeof targetElement?.hasAttribute !== 'function' || !targetElement.hasAttribute('rel')) { return; }
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

    this.uiListeners = {
      globalDown: globalMouseDownListener.bind(this),
      statusClick: statusClickListener.bind(this),
      fieldDown: fieldMouseDownListener.bind(this),
      context: contextMenuListener.bind(this),
      tool: toggleToolListener.bind(this),
      help() { self.triggerAppAction('toggleInterfaceHelp'); }
    };

    this.components.appStatus.getElement().addEventListener('click', this.uiListeners.statusClick);
    this.components.sceneStatus.getElement().addEventListener('click', this.uiListeners.statusClick);
    this.controller.fieldElement.addEventListener('mousedown', this.uiListeners.fieldDown);
    this.controller.fieldElement.addEventListener('touchstart', this.uiListeners.fieldDown);
    this.controller.fieldElement.addEventListener('contextmenu', this.uiListeners.context);
    this.controller.container.addEventListener('mousedown', this.uiListeners.globalDown);
    this.controller.container.addEventListener('touchstart', this.uiListeners.globalDown);
    this.components.toggleTool.getElement().addEventListener('click', this.uiListeners.tool);
    this.components.toggleMenu.getElement().addEventListener('click', this.uiListeners.context);
    return this.components.toggleHelp.getElement().addEventListener('click', this.uiListeners.help);
  }

  recordGesture(event: TouchEvent, bounds: Bounds) {
    if (!this.currentGesture) {
      this.currentGesture = {
        touches: event.targetTouches.length,
        origin: Utils.eventPoint(event)
      };
    }

    this.currentGesture.last = Utils.eventPoint(event);
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
    for (let name in this.appActions) {
      const action = this.appActions[name];
      if (!action.triggerOnMove && action.gesture && action.gesture.test(gestureDescription)) {
        this.controller.options.debug && console.debug("action '%s' triggered by gesture '%s'", name, gestureDescription);
        this.triggerAppAction(name);
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
    for (let name in this.appActions) {
      const action = this.appActions[name];
      if (action.triggerOnMove && action.gesture && action.gesture.test(gestureDescription)) {
        this.triggerAppAction(name);
        return;
      }
    }
  }

  async selectSceneName(message: string): Promise<string | boolean> {
    const sceneNames = this.controller.getSceneNames();
    if (sceneNames.length) {
      if (message == null) { message = 'Choose a scene'; }
      const selectedSceneName = await Utils.select(message, sceneNames, this.controller.scene.name );
      if (selectedSceneName) {
        return selectedSceneName;
      } else {
        Utils.alert("No scene by that name.");
      }
    } else {
      Utils.alert("You don't have any saved scenes yet.");
    }

    return false;
  }

  updateMenuOption(optionElement: HTMLElement) {
    const optionName = optionElement.getAttribute('rel');
    if (typeof this.controller.options[optionName] === 'boolean') {
      return Utils.toggleClass(optionElement, 'enabled', this.controller.options[optionName]);
    }
  }

  addMenuListeners() {
    const ui = this;
    this.menuItemElements = this.components.menu.getElement().querySelectorAll('LI');

    const menuOptionListener = function(this:HTMLElement, event:KeyboardEvent | PointerEvent | TouchEvent) {
      event.stopImmediatePropagation();
      if (this.classList.contains('group')) {
        Utils.toggleClass(this, 'collapsed');
        ui.menuItemElements.forEach((itemElement) => {
          if (!itemElement.contains(this) && itemElement.classList.contains('group') && !itemElement.classList.contains('collapsed')) {
            itemElement.classList.add('collapsed');
          }
        });
      } else if (this.hasAttribute('rel')) {
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

          } else {

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

    const keyboardListener = function(event: KeyboardEvent) {
      if (!globalThis.pauseKeyboardListeners) {
        const combo = Utils.describeKeyCombo(event);
        const actionName = self.keyBindings[event.type][combo];

        if (actionName || (actionName === null)) {
          event.preventDefault();

          if (actionName) {
            self.triggerAppAction(actionName, event);
          }
        }
      }
    };

    // console.log "#{event.type}-#{combo} (#{event.keyCode})" if event.keyCode isnt 0

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
        return self.triggerAppAction('nextFrame');
      } else {
        return self.triggerAppAction('prevFrame');
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

      for (let name in this.appActions) {
        const action = this.appActions[name];
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
      const appStatuses = [];

      let versionStatus = `v${Penciltest.version}`
      if (this.controller?.scene?.version && this.controller.version !== this.controller.scene.version) {
        versionStatus += ` (@v${this.controller.scene.version})`
      }
      appStatuses.push(`<span rel="upgrade">${versionStatus}</span>`);

      appStatuses.push(`<span title="Current mode. If you're stuck, try the Reset option in Settings.">${this.controller.state.mode}</span>`);

      appStatuses.push(`<span title="Drawing smoothing factor (click to change)" rel="smoothing">~${this.controller.options.smoothing}</span>`);

      appStatuses.push(`<span title="Current scene name (click to rename)" rel="renameScene"><small>SCN:</small>${this.controller.scene.name || 'untitled'}</span>`);

      this.components.appStatus.setHTML(`${appStatuses.join(' | ')}`);

      const sceneStatuses = [];

      const framerate = this.controller?.scene?.framerate;
      if (framerate) {
        let rateInfo = `<small>FPS:</small>${framerate}`;

        const hold = this.controller.getCurrentFrame()?.hold;
        if (hold) {
          rateInfo+=`/<span title="Holding this frame for ${hold} exposures.">${hold}</span>`
        }

        sceneStatuses.push(`<span rel="framerate" title="Frame rate (FPS) and current frame's hold duration. Click to change FPS.">${rateInfo}</span>`);
      }

      sceneStatuses.push(`<small>frame:</small>${this.controller.scene.current.frameNumber + 1}/${this.controller.scene.frames.length}`);

      sceneStatuses.push(`<span title="The time position of the START of the current frame, as HH:MM:SS. Click to insert many frames." rel="insertSeconds"><small>time:</small>${Utils.getTimecode(this.controller.scene.current.frames[this.controller.scene.current.frameNumber].time)}</span>`);
      if (this.controller.scene.audio?.offset) {
        sceneStatuses.push(`${this.controller.scene.audio.offset >= 0 ? '+' : ''}${this.controller.scene.audio.offset}`);
      }

      this.components.sceneStatus.setHTML(`<div class="frame">${sceneStatuses.join(' | ')}</div>`);
      this.components.toggleTool.getElement().className = `toggle-tool fa fa-${this.controller.state.toolStack[0]}`;// FIXME: use a helper to do this
    }
    // ELSE, hide status? @1785792939
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

      this.menuItemElements.forEach((option) => {
        if (option.hasAttribute('rel')) {
          this.updateMenuOption(option);
        }
      });
    }
  }

  hideMenu() {
    //console.info(`called hideMenu`); // XXX
    if (this.menuIsVisible) {
      this.menuIsVisible = false;
      return Utils.toggleClass(this.components.menu.getElement(), 'active', false);
    }
  }

  toggleMenu(coords: Point) {
    if (this.menuIsVisible) { return this.hideMenu(); } else { return this.showMenu(coords); }
  }

  showFeedback(message: any, duration: number = 2000) {
    if (!this.feedbackElement) {
      this.feedbackElement = new PenciltestUIComponent({id: 'pt-feedback', parent: this});
    }
    this.feedbackElement.setHTML(message);
    this.feedbackElement.getElement().style.opacity = 1;

    clearTimeout(this.feedbackTimeout);
    const hideFeedback = () => this.feedbackElement.getElement().style.opacity = 0;
    return this.feedbackTimeout = setTimeout(hideFeedback, duration);
  }

  expandSelection(from:number = NaN, to:number = NaN) {
    if (isNaN(from)) {
      from = this.controller.scene.current.frameNumber;
    }
    if (isNaN(to)) {
      to = from;
    }
    from = Math.min(this.controller.scene.current.frames.length - 1, Math.max(0, from));
    to = Math.min(this.controller.scene.current.frames.length - 1, Math.max(0, to));
    if (!this.controller.state.frameSelection) {
      this.controller.state.frameSelection = {start:from};
    }
    this.controller.state.frameSelection.end = to;
    const selectionCount = Math.abs(this.controller.state.frameSelection.end - this.controller.state.frameSelection.start) + 1;
    this.showFeedback(`Selecting ${selectionCount} frame${selectionCount !== 1 ? 's' : ''}`);
  }

  clearSelection() {
    delete this.controller.state.frameSelection;
  }
}
