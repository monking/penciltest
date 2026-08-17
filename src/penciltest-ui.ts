class PenciltestUI extends PenciltestUIComponent {
  appActions: AppActionsList;
  menuOptions: Array<any>;
  currentGesture: PenciltestGesture;
  controller: Penciltest;
  feedbackTimeout: number;
  previousEvent: AnyPointerEvent | WheelEvent | KeyboardEvent | null;
  pointer: Mark;
  menuItemElements: Array<HTMLElement>;
  keyBindings: { keydown: {}; keyup: {}; };
  isMenuVisible: any;
  feedbackComponent: PenciltestUIComponent;
  defaultDragOptions: PenciltestDragOptions;

  // action and listener functions are called in controller scope


  constructor(initOptions:PenciltestUIComponentOptions, components:PenciltestUIComponentDict = {}) {
    const options = {
      className: 'penciltest-ui',
      children: [],
      ...initOptions,
      key: 'penciltestUI',
    };

    options.children.unshift({
      key: 'fieldContainer',
      parent: 'penciltestUI',
      className: 'field-container',
      children: [{
        key: 'field',
        className: "field",
      }]
    });

    super(options, components);

    this.menuOptions = [
      {
        _icons: [
          'firstFrame',
          'prevFrame',
          'playPause',
          'nextFrame',
          'lastFrame',
        ],
      },
      {
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
          'config',
          'renderer',
          'reset',
          'debug',
          'showStatus',
        ],
      },
      'toggleInterfaceHelp',
    ];

    this.appActions = {
      showMenu: {
        label: "Show Menu",
        hotkey: ['F'],
        gesture: /4 still/,
        listener(this: Penciltest) {
          this.ui.toggleMenu(this.ui.pointer || {x: 10, y: 10});
        }
      },

      renderer: {
        label: "Set Renderer",
        async listener(this: Penciltest) {
          let renderer: any;
          const self = this;
          const selectedRenderer = await Utils.promptSelect(
            'Set renderer',
            [Renderers.CANVAS, Renderers.SVG],
            this.options.renderer
          );
          self.setOptions({renderer: selectedRenderer as Renderers.CANVAS | Renderers.SVG})
        },
        action(this: Penciltest) {
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
          }
          this.goToFrame(toFrame);
          this.stop();
          this.scrubAudio();
        }
      },

      firstFrame: {
        label: "First Frame",
        text: '\u23EE',
        hotkey: ['Home','PgUp'],
        hotkeyModifiers: ['Shift'],
        gesture: /2 left from .* (bottom|middle)/,
        cancelComplementKeyEvent: true,
        listener(this: Penciltest, event) {
          const toFrame = 0
          if ((event as KeyboardEvent)?.shiftKey) {
            this.ui.expandSelection(this.scene.current.frameNumber, toFrame);
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
          }
          this.goToFrame(toFrame);
          this.stop();
        }
      },

      'select all frames': {
        label: lc('%u{select} %{scene}'),
        title: lc('select all frames'),
        hotkey: ['Ctrl+A'],
        cancelComplementKeyEvent: true,
        listener(this: Penciltest, event) {
          this.state.frameSelection = {start: 0, end: this.scene.frames.length - 1};
          this.ui.showFeedback({text:lc(`%u{select}ed all ${this.scene.frames.length} %{frame}s`)});
        }
      },

      copyFrames: {
        label: "Copy Frames/Strokes",
        hotkey: ['C'],
        hotkeyModifiers: ['Control'],
        listener(this: Penciltest) {
          const [ copiedFrames ] = this.copyFrames();
          this.ui.showFeedback({text:lc(`%u{copied} ${copiedFrames.length} %{frame}${copiedFrames.length !== 1 ? 's' : ''}`)});
          this.ui.clearSelection();
        }
      },

      pasteFrames: {
      label: "Paste Frames",
        hotkey: ['V'],
        hotkeyModifiers: ['Control'],
        listener(this: Penciltest) {
          this.pasteFrames();
          this.ui.showFeedback({text:`Pasted ${this.copyBuffer.length} frame${this.copyBuffer.length !== 1 ? 's' : ''}`});
          this.ui.clearSelection();
          this.scrubAudio();
        }
      },

      pasteStrokes: {
        label: "Paste Strokes",
        hotkey: ['Shift+V'],
        listener(this: Penciltest) {
          this.pasteStrokes()
          this.ui.showFeedback({text:'Pasted strokes'});
        }
      },

      insertFrameBefore: {
        label: "Insert Frame Before",
        hotkey: ['Shift+I'],
        gesture: /2 still from left top/,
        listener(this: Penciltest) {
          const newIndex = this.scene.current.frameNumber;
          this.scene.newFrame(newIndex);
          this.goToFrame(newIndex);
          this.scrubAudio();
          this.ui.showFeedback({text:'Inserted frame before'});
        }
      },

      insertFrameAfter: {
        label: "Insert Frame After",
        hotkey: ['I', 'Shift+D'],
        gesture: /2 still from right top/,
        listener(this: Penciltest) {
          const newIndex = this.scene.current.frameNumber + 1;
          this.scene.newFrame(newIndex);
          this.goToFrame(newIndex);
          this.scrubAudio();
          this.ui.showFeedback({text:'Inserted frame after'});
        }
      },

      insertSeconds: {
        label: "Insert Seconds",
        hotkey: ['Alt+Shift+I'],
        async listener(this: Penciltest) {
          const newIndex = this.scene.current.frameNumber + 1;
          const secondsInput = await Utils.prompt('# of seconds to insert: ', 1);
          if (typeof secondsInput !== 'string') { return; }
          const seconds = Number(secondsInput);
          const insertFrameCount = Math.floor(this.scene.framerate / (this.scene.getFrameHold() * seconds));
          this.scene.newFrame(newIndex, insertFrameCount);
          this.goToFrame(newIndex);
          this.ui.showFeedback({text:`Inserted ${insertFrameCount} frames, beginnging at frame ${newIndex}`});
        }
      },

      undo: {
        label: "Undo",
        title: "Remove the last line drawn",
        hotkey: ['Z', 'Ctrl+Z'],
        gesture: /3 still from left/,
        repeat: true,
        listener(this: Penciltest) {
          this.undo();
          this.ui.showFeedback({text:`Undo`});
        }
      },

      redo: {
        label: "Redo",
        title: "Put back a line removed by 'Undo'",
        hotkey: ['Shift+Z','Ctrl+Shift+Z','Ctrl+Y'],
        gesture: /3 still from right/,
        repeat: true,
        listener(this: Penciltest) {
          this.redo();
          this.ui.showFeedback({text:`Redo`});
        }
      },

      strokeColor: {
        label: "Line Color",
        async listener(this: Penciltest) {
          const strokeColor = await Utils.prompt('line color: ', this.scene.strokeColor, {'input':'color'});
          if (strokeColor) {
            this.setOptions({strokeColor});
          }
        },
        action(this: Penciltest) {
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
          if (this.sceneRenderer) {
            this.sceneRenderer.options.background = this.options.background;
          }
          this.drawCurrentFrame()
        }
      },

      framerate: {
        label: "Frame rate",
        async listener(this: Penciltest) {
          const oldFrameRate = this.scene.framerate;
          const newFramerate = Number(await Utils.prompt(`${lc('set framerate')}:<br><small>FPS, frames per second</small>`, this.scene.framerate));
          if (newFramerate === null) {
            return;
          }
          if (newFramerate && newFramerate !== oldFrameRate) {
            const newOptions:PenciltestOptions = {framerate: newFramerate};
            const [ isMultiple, absFactor, factorError, newIsLarger ] = Utils.isMultiple(newFramerate, oldFrameRate, 0.002);
            const promptMessage = `Adjust all frame hold times?\nThe new frame rate is ${isMultiple ? 'exactly' : `approximately`} ${absFactor} times ${newIsLarger ? 'faster' : 'slower'} than before${isMultiple ? '' : ` (${Utils.toDecimal(factorError, 3)} off)`}.`
            const factor = newIsLarger ? absFactor : 1/absFactor;
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
        action(this: Penciltest) {
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
        action(this: Penciltest) { Utils.toggleClass(this.ui.getElement(), 'hide-cursor', this.options.hideCursor); },
      },

      onionSkin: {
        label: "Onion Skin",
        hotkey: ['O'],
        gesture: /2 down from center (bottom|middle)/,
        title: "show previous and next frames in red and blue",
        listener(this: Penciltest) {
          this.setOptions({onionSkin: !this.options.onionSkin});
          this.ui.showFeedback({text: `Onion skin: ${this.options.onionSkin ? 'ON' : 'OFF'}`})
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
          this.ui.showFeedback({text:`Dropped ${frames.length} frame${frames.length !== 1 ? 's' : ''}`});
          this.ui.clearSelection();
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
          this.ui.showFeedback({text:`Cut ${frames.length} frame${frames.length !== 1 ? 's' : ''}`});
          this.ui.clearSelection();
        }
      },

      smoothing: {
        label: "Smoothing…",
        title: "How much your lines will be smoothed as you draw",
        hotkey: ['Shift+S'],
        async listener(this: Penciltest) {
          const promptOptions = {
            input: 'range', 
            inputAttrs: {
              min: 0,
              max: 5,
              step: 0.1
            },
						labelLogic: (smoothing:string) => smoothing
          };
          const smoothing = await Utils.prompt('Smoothing', this.options.smoothing, promptOptions);
          if (smoothing === null) {
            return;
          }
					this.setOptions({smoothing: Number(smoothing)});
        },
        action(this: Penciltest) {
          this.ui.updateStatusBar();
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
        listener(this: Penciltest) { this.setOptions({debug: !this.options.debug}); },
        action(this: Penciltest) {
          if (this.scene) { this.scene.debug = this.options.debug; }
          if (this.sceneRenderer) { this.sceneRenderer.options.debug = this.options.debug; }
          if (this.toolRenderer) { this.toolRenderer.options.debug = this.options.debug; }
          this.ui.updateStatusBar();
        }
      },

      showStatus: {
        label: "Show status bar",
        hotkey: ['Tab'],
        cancelComplementKeyEvent: true,
        hotkeyUp: false,
        title: "Show/hide the scene status bar",
        listener(this: Penciltest, event:Event) {
          const keyEvent = event as KeyboardEvent;
          if (keyEvent && (keyEvent.altKey || keyEvent.shiftKey || keyEvent.ctrlKey)) {
            // FIXME Avoid toggling if alt+tabbing into application. This only gets halfway there.
            return;
          }
          this.setOptions({showStatus: !this.options.showStatus});
        },
        action(this: Penciltest) {
          this.components.statusBar.getElement().classList.toggle('hidden', !this.options.showStatus);
          this.resize();
          this.ui.updateStatusBar();
        },
      },

      loop: {
        label: "Loop",
        hotkey: ['L'],
        gesture: /2 up from center (bottom|middle)/,
        listener(this: Penciltest) {
          this.setOptions({ loop: !this.options.loop });
          this.ui.showFeedback({text:`Loop: ${this.options.loop ? 'ON' : 'OFF'}`});
        }
      },

      scrubAudio: {
        label: "Scrub audio",
        hotkey: ['A'],
        title: "Play audio at the current frame when changing frames, other than regular playback.",
        listener(this: Penciltest) {
          this.setOptions({ scrubAudio: !this.options.scrubAudio });
          this.ui.showFeedback({text:`Scrub audio: ${this.options.scrubAudio ? 'ON' : 'OFF'}`});
          if (this.state.mode === PenciltestMode.DRAWING) {
            if (this.options.scrubAudio) {
              this.scrubAudio();
            } else {
              this.pauseAudio();
            }
          }
        }
      },

      muteAudio: {
        label: "Toggle Mute",
        hotkey: ['M'],
        listener(this: Penciltest) {
          this.setPlayback({ muteAudio: !this.playback.muteAudio });
          this.ui.showFeedback({text:`Mute: ${this.playback.muteAudio ? 'ON' : 'OFF'}`});
        },
        action(this: Penciltest) {
          this.ui.handleAppReaction('volume');
        }
      },

      splitFrame: {
        label: "Split frame",
        hotkey: ['B'],
        title: "Split the current frame into two.",
        async listener(this: Penciltest) {
          const startingFrameHold = this.scene.getFrameHold();
          if (startingFrameHold < 2) {
            this.ui.showFeedback({text:'Frame must be held for 2 or more exposures to split'});
            return;
          }
          let splitOffset = Math.floor(startingFrameHold/2);
          if (startingFrameHold > 2) {
            const promptOptions = {
              input: 'range',
              inputAttrs: {
                min: 1,
                max: startingFrameHold - 1
              },
              labelLogic: (offset:string) => offset
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
        async listener(this: Penciltest) {
          try {
            this.scene.setModified();
            if (!this.scene.name) {
              await this.ui.triggerAppAction('renameScene')
            }
            await this.saveScene()
            this.ui.showFeedback({text:`Saved scene '${this.scene.name}' to browser local storage`});
          } catch(e) {
            console.error(e);
            this.ui.showFeedback({text:`Unable to save scene: ${e.message}`});
          }
        }
      },

      renameScene: {
        label: "Rename Scene",
        hotkey: ['F2'],
        async listener(this: Penciltest) {
          const newName = await Utils.prompt(lc('%u{scene} %{name}')+":", this.scene.name);
          if (newName) {
            this.scene.name = newName;
            this.ui.updateStatusBar();
          }
        },
        action() {
          document.title = `✏️ ${this.scene.name} -- penciltest`;
        }
      },

      loadScene: {
        label: "Load from browser",
        hotkey: ['Shift+O'],
        gesture: /3 up from center (bottom|middle)/,
        async listener(this: Penciltest) {
          const sceneName = await this.ui.selectSceneName('Choose a scene to load');
          if (sceneName) {
            try {
              const [ scene, context ] = await this.loadScene(sceneName as string);
              if (scene !== null) {
                if (context.fromVersion !== context.toVersion) {
                  this.ui.showFeedback({text:lc(`%{Migrated scene data} %{from a to b}`, {a:context.fromVersion, b:context.toVersion})});
                } else {
                  this.ui.showFeedback({text:`Loaded scene: ${this.scene.name}`});
                }
              }
            } catch(reason) {
              console.error(reason);
              return;
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
            this.newScene({
              debug: this.options.debug
            })
          }
        }
      },

      renderGif: {
        label: "Render GIF (FIXME)",
        hotkey: ['Shift+G'],
        async listener(this: Penciltest) {
          this.setMode(PenciltestMode.RENDERING);
          this.ui.updateStatusBar();
          const exporter = new PenciltestRenderExporter(this);
          const gifURL = await exporter.renderGif();

          if (gifURL === null) {
            this.setPreviousMode();
            return;
          }

          const gifInstructions = PenciltestUIComponent.restore({
            key: 'gifInstructions',
            html: "Click/touch image to download.<br>Click/touch outside GIF to close.",
            style: {
              position: 'relative',
              color: 'white',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.5)'
            }
          }, this.components);

          const gifImage = PenciltestUIComponent.restore({
            key: 'gifImage',
            tagName: 'img',
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
          }, this.components);

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
          }, this.components);

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
          }, this.components, true);

          const gifCloseHandler = (event: AnyPointerEvent | KeyboardEvent) => {
            if (event.type === 'keydown') {
              if ((event as KeyboardEvent).key !== 'Escape') { return; }
            } else if (event.target !== gifImage.getElement()) {
              return;
            }
            gifContainer.getElement().removeEventListener('click', gifCloseHandler);
            gifContainer.getElement().removeEventListener('touchend', gifCloseHandler);
            globalThis.document.body.removeEventListener('keydown', gifCloseHandler);

            gifContainer.getElement().remove();
            this.setPreviousMode();
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
        async listener(this: Penciltest) {
          const sceneDimensions = this.scene.getDimensions();
          const dimensionsResponse = await Utils.prompt('Scene height & aspect (W/H)', `${sceneDimensions.height} ${sceneDimensions.aspectRatio}`)
          if (!dimensionsResponse) {
            return;
          }
          const dimensions = dimensionsResponse.split(' ');
          this.scene.height = Number(dimensions[0])
          this.scene.aspectRatio = dimensions[1]
          this.resize()
        }
      },

      panFrame: {
        label: "Move frame contents",
        title: lc('toggle move'),
        hotkey: ['P'],
        async listener(this: Penciltest) {
          this.toggleTool(PenciltestTool.MOVE, [PenciltestTool.PENCIL]);

          if (this.state.toolStack[0] !== PenciltestTool.MOVE) { return; }

          const offset:Point = await this.ui.interactivePan();
          this.ui.showFeedback({text:`Panned this frame: ${Utils.toDecimal(offset.x, 0)}, ${Utils.toDecimal(offset.y, 0)}`});
        }
      },

      rescueFrame: {
        label: "Rescue frame(s') contents",
        title: "Move the contents of the selected frames to the center of the canvas. Useful after resizing or panning them out of view.",
        async listener(this: Penciltest) {
          const [ frames ] = this.getSelectedFrames();

          const selectionBounds = this.getFrameBounds(frames);

          const fieldCenter = PtSpace.rectCenter(this.scene.getDimensions());
          const contentCenter = PtSpace.rectCenter(selectionBounds);
          const deltaPoint = PtSpace.diffPoints(fieldCenter, contentCenter);

          this.moveFrameContents(deltaPoint, frames);

          this.drawCurrentFrame();
        }
      },

      moveFrameContents: {
        label: "Move frame contents",
        title: "Move the contents of ALL the frames in the scene. Useful after resizing.",
        hotkey: ['Shift+P'],
        async listener(this: Penciltest) {
          const offset:Point = await this.ui.interactivePan(this.scene.frames);
          this.ui.showFeedback({text:`Panned whole scene: ${Utils.toDecimal(offset.x, 0)}, ${Utils.toDecimal(offset.y, 0)}`});
        }
      },

      deleteScene: {
        label: "Delete Scene",
        hotkey: ['Alt+Backspace'],
        async listener(this: Penciltest) {
          const sceneName = await this.ui.selectSceneName(lc('choose a scene to delete')+':');
          if (typeof sceneName === 'string' && sceneName) {
            if (await this.deleteScene(sceneName)) {
              this.ui.showFeedback({text:`Deleted scene: ${sceneName}`});
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
          const packedScene = await this.migrator.packScene(this.scene);
          const blob = new Blob([JSON.stringify(packedScene, null, '  ')], {type:'application/json'});
          const url = globalThis.URL.createObjectURL(blob);
          const fileName = (packedScene.name || 'untitled') + '.penciltest.json';
          await Utils.downloadFromUrl(url, fileName);
        }
      },

      importScene: {
        label: lc("%{Import} %{JSON file}"),
        hotkey: ['Ctrl+O'],
        cancelComplementKeyEvent: true,
        async listener(this: Penciltest) {
          const promptMessage = 'Load a scene JSON file';
          const promptOptions:FilePromptOptions = {
            accept:'.json,application/json',
            loadAs: 'text',
            submitOnChange: true
          };
          try {
            const inputFile = await Utils.promptForFile(promptMessage, promptOptions);
            if (inputFile === null) { return []; }
            const [sceneJSON, filePath] = inputFile;
            await this.setScene(JSON.parse(sceneJSON));
          } catch(reason) {
            console.error(reason);
            this.ui.showFeedback({text:`ERROR: ${reason.message}`});
          }
        }
      },

      linkAudio: {
        label: "Load Audio",
        hotkey: ['Shift+A'],
        async listener(this: Penciltest, event:any, notice:string = '') {
          const promptMessage = `Audio file${notice ? ' ('+notice+')' : ''}: `;
          const promptOptions:FilePromptOptions = {
            accept:'audio/*',
            loadAs:'uri',
            submitOnChange: true
          };
          try {
            const inputFile = await Utils.promptForFile(promptMessage, promptOptions);
            if (inputFile === null) { return; }
            const [uri, filePath] = inputFile;
            if (uri) {
              this.loadAudio(uri, filePath);
            }
          } catch(e) {
            console.error(e);
            this.ui.showFeedback({text:`Audio file error: ${e.message}`});
          }
        }
      },

      unloadAudio: {
        label: "Unload Audio",
        listener(this: Penciltest) { this.destroyAudio(); }
      },

      volume: {
        label: "Volume",
        hotkey: ['v'],
        async listener(this: Penciltest, event:any) {
          const combo = Utils.describeKeyCombo(event as KeyboardEvent);
          const promptOptions:FilePromptOptions = {
            input: 'range',
            inputAttrs: {
              min: 0,
              max: 100
            }
          };
          const inputVolume:string | null = await Utils.prompt(`Audio volume`, promptOptions)
          if (inputVolume !== null) {
            this.scene.audio.volume = Number(inputVolume);
          }
        },
        action(this: Penciltest) {
          if (this.audioElement) {
            this.audioElement.volume = this.playback.muteAudio ? 0 : this.scene.audio.volume / 100;
          }
        }
      },

      volumeStep: {
        hotkey: ['9','0'],
        repeat: true,
        async listener(this: Penciltest, event:any) {
          const combo = Utils.describeKeyCombo(event as KeyboardEvent);
          let change = 0;
          if (combo === '9') {
            change -= 5;
          } else if (combo === '0') {
            change += 5;
          }

          this.scene.setVolume(change, true);
          this.ui.showFeedback({text:`Volume: ${this.scene.audio.volume}%`});
        }
      },

      smallerTool: {
        label: "Smaller tool",
        hotkey: ['['],
        repeat: true,
        title: lc('smaller tool'),
        listener(this: Penciltest) {
          if (this.state.mode !== PenciltestMode.DRAWING) { return; }
          switch(this.state.toolStack[0]) {
            case PenciltestTool.ERASER:
              this.setOptions({eraserWidth: Math.max(1, this.options.eraserWidth - 1)});
              break;
            default:
              this.setOptions({strokeWidth: Math.max(1, this.options.strokeWidth - 1)});
              break;
          }
        },
        action(this: Penciltest) {
          this.drawTool({metadataTimeout: 3000});
        }
      },

      largerTool: {
        label: "Larger tool",
        hotkey: [']'],
        repeat: true,
        title: lc('larger tool'),
        listener(this: Penciltest) {
          if (this.state.mode !== PenciltestMode.DRAWING) { return; }
          switch(this.state.toolStack[0]) {
            case PenciltestTool.ERASER:
              this.setOptions({eraserWidth: Math.min(256, this.options.eraserWidth + 1)});
              break;
            default:
              this.setOptions({strokeWidth: Math.min(256, this.options.strokeWidth + 1)});
              break;
          }
        },
        action(this: Penciltest) {
          this.drawTool({metadataTimeout: 3000});
        }
      },

      shiftAudioEarlier: {
        label: "Shift Audio Earlier",
        hotkey: ['Shift+['],
        repeat: true,
        title: "Decrease the offset of the audio playback",
        listener(this: Penciltest) {
          if (!this.scene.audio) {
            this.scene.audio = {offset:0};
          }
          this.scene.audio.offset -= 0.1;
          this.ui.updateStatusBar();
          this.ui.showFeedback({text:`Audio shift: ${Utils.toDecimal(this.scene.audio.offset, 1, {prefix:true})} s`});
          this.scrubAudio();
        }
      },

      shiftAudioLater: {
        label: "Shift Audio Later",
        title: "Increase the offset of the audio playback",
        hotkey: ['Shift+]'],
        repeat: true,
        listener(this: Penciltest) {
          if (!this.scene?.audio?.offset) {
            this.scene.audio = {offset:0};
          }
          this.scene.audio.offset += 0.1;
          this.ui.updateStatusBar();
          this.ui.showFeedback({text:`Audio shift: ${Utils.toDecimal(this.scene.audio.offset, 1, {prefix:true})} s`});
          this.scrubAudio();
        }
      },

      config: {
        label: "Configuration",
        hotkey: ['Ctrl+,'],
        async listener(this: Penciltest) {
          // Range input param order: value after min/max
          // FIXME: Object parameters are not reliably in order, so perhaps the
          // `value` param should be held for last assignment... Unless doing
          // so would trigger an `onchange` event.
          const onionColorDef:PenciltestUIComponentOptions = {
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

          const onionOpacityDef:PenciltestUIComponentOptions = {
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

          const onionRadiusDef:PenciltestUIComponentOptions = {
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
                    const label = components.onionSkinFrameRadiusLabel.getElement();
                    const input = e.target as HTMLInputElement;
                    if (label && input) {
                      label.innerText = input.value;
                    }
                  },
                },
              },
            ],
          };

          const minimumPressureDef:PenciltestUIComponentOptions = {
            text: lc('%u{minimum pencil pressure}'),
            children: [
              {
                tagName: 'label',
                key: 'minimumPressureLabel',
                text: String(this.options.minimumPressure || 0),
                attr: {
                  for: 'minimumPressure',
                },
              },
              {
                key: 'minimumPressure',
                tagName: 'input',
                attr: {
                  id: 'minimumPressure',
                  type: 'range',
                  min: '0',
                  max: '1',
                  step: 'any',
                  value: String(this.options.minimumPressure || 0),
                },
                on: {
                  'input': (e, components) => {
                    const label = components.minimumPressureLabel.getElement();
                    const input = e.target as HTMLInputElement;
                    if (label && input) {
                      label.innerText = Utils.toDecimal(Number(input.value), 2);
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
            minimumPressureDef,
          ];

          const promptOptions = {
            inputKeys: [
              'onionSkinBackwardColor',
              'onionSkinForwardColor',
              'onionSkinBackwardOpacity',
              'onionSkinForwardOpacity',
              'onionSkinFrameRadius',
              'minimumPressure',
            ],
            className: 'config',
          };

          const configInput = await Utils.promptForm('<h3>Configuration</h3>', configInputDef, promptOptions);
          if (configInput === null) { return; }

          const options:PenciltestOptions = {
            onionSkinFrameRadius: Number(configInput.onionSkinFrameRadius),
            minimumPressure: Number(configInput.minimumPressure),
          };

          options.onionSkinBackwardColor = Utils.getColorChannels(configInput.onionSkinBackwardColor) as Color;
          options.onionSkinBackwardColor[3] = Number(configInput.onionSkinBackwardOpacity) / 255;
          options.onionSkinForwardColor = Utils.getColorChannels(configInput.onionSkinForwardColor) as Color;
          options.onionSkinForwardColor[3] = Number(configInput.onionSkinForwardOpacity) / 255;

          this.setOptions(options);
          this.drawCurrentFrame();
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
        title: lc('toggle eraser'),
        hotkey: ['E'],
        listener(this: Penciltest) {
          this.toggleTool(PenciltestTool.ERASER, [PenciltestTool.PENCIL]);
        }
      },

      hideMenu: {
        label: 'Show/Hide menu',
        hotkey: ['Esc'],
        listener(this: Penciltest) {
          this.ui.hideMenu();
          this.ui.clearSelection(true);
        }
      },
    };

    this.defaultDragOptions = {
      startTarget: this.getElement(),
      moveTarget: this.getElement(),
      endTarget: this.getElement(),
      coordinateScope: 'page',
      touchLimit: 5,
    };

    const startingComponents: Array<PenciltestUIComponentOptions> = [
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

  async triggerAppAction(optionName: string, event:Event = null, ...rest: Array<any>): Promise<any> {
    if (event) {
      const keyEvent = event as KeyboardEvent;
      if (this.appActions[optionName]?.repeat !== true && keyEvent.repeat) { return; }
    }
    if (typeof this.appActions[optionName]?.listener === 'function') {
      await this.appActions[optionName].listener.apply(this.controller, [event].concat(rest));
    }
    return await this.handleAppReaction(optionName);
  }

  async handleAppReaction(optionName: string, event:Event = null, ...rest: Array<any>): Promise<any> {
    if (event) {
      const keyEvent = event as KeyboardEvent;
      if (this.appActions[optionName]?.repeat !== true && keyEvent.repeat) { return; }
    }
    if (typeof this.appActions[optionName]?.action === 'function') {
      return await this.appActions[optionName].action.apply(this.controller, [event].concat(rest));
    }
    return null;
  }

  menuWalker(level:Array<any>, parent:PenciltestUIComponent): void {
    for (let entry of level) {
      if (typeof entry === 'string') {
        const entryConfig:PenciltestUIComponentOptions = {
          parent,
          tagName: 'li',
          key: entry,
          attr: {
            rel: entry
          },
          children: []
        }

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
      } else {
        for (let groupName in entry as object) {
          const group = entry[groupName];
          const groupHeadConfig:PenciltestUIComponentOptions = {
            tagName: 'li',
            key: `menuGroup_${groupName}`,
            children: [],
            parent,
          };
          if (groupName === '_icons') {
            groupHeadConfig.className = 'icons';
          } else {
            groupHeadConfig.className = 'group collapsed';
            groupHeadConfig.children.push({ tagName: 'label', text: groupName });
          }
          const groupHeadComponent = new PenciltestUIComponent(groupHeadConfig, this.components);

          const groupMenuConfig:PenciltestUIComponentOptions = {
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

    this.pointer = {x: 0, y: 0}; // FIXME Smoothing may make this origin evident.

    let fieldBounds;
    const updateFieldBounds = () => {
      fieldBounds = {
        x: 0,
        y: 0,
        width: this.controller.width,
        height: this.controller.height
      };
    };

    const fieldPointerPressListener = (event: AnyPointerEvent) => {
      if (this.isMenuVisible) { return; }
      this.previousEvent = event;

      const focusedInput = document.querySelector(':focus') as HTMLElement;
      if (focusedInput) {
        focusedInput.blur();
      }

      if (this.controller.state.mode !== PenciltestMode.DRAWING) { return; }
      event.preventDefault();
      if ((event.type === 'touchstart') && ((event as TouchEvent).touches.length > 1)) {
        this.controller.cancelStroke();
        updateFieldBounds();
        if (!this.currentGesture) {
          this.triggerAppAction('undo');
        }
        this.clearGesture();
        this.recordGesture(event as TouchEvent, fieldBounds);
        this.currentGesture.startFrameNumber = this.controller.scene.current.frameNumber;
      } else {
        const pointerEvent = event as PointerEvent
        if (pointerEvent.button === 2) {
          return true; // allow context menu
        } else {
          this.hideMenu();
        }

        if (pointerEvent.button === 1) { // middle click
          if (event.shiftKey) {
            this.controller.useTool(PenciltestTool.ERASER);
          } else {
            this.interactivePan([], event);
            return;
          }
        }

        this.controller.state.pointerMode = PointerMode.PRESS;

        globalThis.addEventListener('pointerup', globalPointerUpListener);
        globalThis.addEventListener('touchend', globalPointerUpListener);

        fieldPointerMoveListener(event);
      }
    };

    const fieldPointerMoveListener = (event: AnyPointerEvent) => {
      const isDown = this.controller.state.pointerMode === PointerMode.PRESS;

      event.preventDefault();

      if ((event.type === 'touchmove') && ((event as TouchEvent).touches.length > 2)) {
        this.recordGesture(event as TouchEvent, fieldBounds);
        this.progressGesture(this.describeGesture(fieldBounds));
      } else {
        const pagePoint = Utils.eventPoint(event, 'page');
        Object.assign(this.pointer, pagePoint);
        const offsetPoint = {
          x: this.components.field.getElement().offsetLeft,
          y: this.components.field.getElement().offsetTop,
        };
        const trackPoint = PtSpace.diffPoints(pagePoint, offsetPoint) as Mark;
        const pointerEvent = event as PointerEvent;
        if ("pressure" in pointerEvent) {
          trackPoint.weight = this.controller.renormalizePressure(pointerEvent.pressure);
        }
        if (this.controller.state.mode === PenciltestMode.DRAWING) {
          this.controller.track(trackPoint);
        }
      }
    };

    const globalPointerUpListener = (event: AnyPointerEvent) => {
      this.controller.state.pointerMode = PointerMode.HOVER;

      const mouseEvent = event as MouseEvent;
      this.previousEvent = event;
      if ((event.type === 'mouseup') && ((mouseEvent).button === 2)) {
        return true; // allow context menu
      } else {
        if ((event.type === 'touchend') && this.currentGesture) {
          this.doGesture(this.describeGesture(fieldBounds, 'final'));
          this.clearGesture();
        }
        if (mouseEvent.button === 1) {
          this.controller.usePreviousTool();
          this.controller.drawCurrentFrame(); // wipe tool cursor
        }
        globalThis.removeEventListener('pointerup', globalPointerUpListener);
        globalThis.removeEventListener('touchend', globalPointerUpListener);
        return this.controller.lift();
      }
    };

    const contextMenuListener = (event: AnyPointerEvent) => {
      const targetElement = event.target as HTMLElement;
      //const targetComponent = PenciltestUIComponent.find(targetElement, this.components);
      if (targetElement === this.components.toggleMenu.getElement() || this.components.fieldContainer.getElement().contains(targetElement)) {
        event.preventDefault();
        this.toggleMenu(Utils.eventPoint(event));
      }
    };

    const globalPointerPressListener = (event: AnyPointerEvent) => {
      if (this.isMenuVisible && !this.components.contextMenu.getElement().contains(event.target as Node)) {
        event.stopImmediatePropagation();
        event.preventDefault();
        this.hideMenu();
      }
    };

    const statusClickListener = (event: AnyPointerEvent) => {
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
    // this.getElement().addEventListener 'touchstart', preventPinchZoomHandler, true
    // globalThis.addEventListener 'touchmove', preventPinchZoomHandler, true
    // this.getElement().addEventListener 'touchmove', preventPinchZoomHandler, true

    const helpListener = () => this.triggerAppAction('toggleInterfaceHelp')

    this.components.appStatus.getElement().addEventListener('click', statusClickListener);
    this.components.sceneStatus.getElement().addEventListener('click', statusClickListener);
    this.components.fieldContainer.getElement().addEventListener('pointerdown', fieldPointerPressListener);
    this.components.fieldContainer.getElement().addEventListener('touchstart', fieldPointerPressListener);
    globalThis.addEventListener('pointermove', fieldPointerMoveListener);
    //globalThis.addEventListener('touchmove', fieldPointerMoveListener);
    this.getElement().addEventListener('contextmenu', contextMenuListener);
    this.getElement().addEventListener('pointerdown', globalPointerPressListener);
    //this.getElement().addEventListener('touchstart', globalPointerPressListener);
    this.components.toggleMenu.getElement().addEventListener('click', contextMenuListener);
    this.components.toggleHelp.getElement().addEventListener('click', helpListener);
  }

  recordGesture(event: TouchEvent, bounds: Rect) {
    if (!this.currentGesture) {
      this.currentGesture = {
        touches: event.targetTouches.length,
        origin: Utils.eventPoint(event, "page", 5)
      };
    }

    this.currentGesture.last = Utils.eventPoint(event, "page", 5);
    this.currentGesture.delta = PtSpace.diffPoints(this.currentGesture.last, this.currentGesture.origin);
    return this.currentGesture.deltaNormalized = {
      x: this.currentGesture.delta.x / bounds.width,
      y: this.currentGesture.delta.y / bounds.height
    };
  }

  clearGesture() {
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

  describeGesture(gestureBounds: any, extra: string = ''): string {
    let description = String(this.currentGesture.touches);
    description += ' ' + this.describeMotion( this.currentGesture.origin, this.currentGesture.last );
    description += ' from ' + this.describePosition( this.currentGesture.origin, gestureBounds );
    if (extra) { description += ` ${extra}`; }

    if (this.controller.options.debug) { console.log(`gesture: ${description}`); }

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
      return  await Utils.promptSelect(message, sceneNames, this.controller.scene.name );
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
    this.menuItemElements = Array.from(this.components.contextMenu.getElement().querySelectorAll('li'));

    const menuOptionListener = function(this:HTMLElement, event:KeyboardEvent | AnyPointerEvent) {
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
          if (action.repeat || !action.hotkeyUp) {
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

    const keyboardListener = (event: KeyboardEvent) => {
      if (Utils.anyGlobalPromises()) { return; }
      const htmlTarget = event.target as HTMLElement;
      if (htmlTarget.hasAttribute('contenteditable')) {
        if (event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey)) {
          htmlTarget.blur();
        }
      } else if (!htmlTarget.matches('input')) {
        const combo = Utils.describeKeyCombo(event);
        if (event.keyCode !== 0 && this.controller.options.debug) { console.log(`${event.type}-${combo} (${event.keyCode})`); }
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

    document.body.addEventListener('keydown', (event: any) => keyboardListener(event));
    document.body.addEventListener('keyup', (event: any) => keyboardListener(event));
  }

  addOtherListeners() {
    this.components.fieldContainer.getElement().addEventListener('wheel', (event: WheelEvent) => {
      if (this.isMenuVisible) {
        return;
      }
      event.preventDefault();
      if (event.deltaY > 0) {
        if (event.ctrlKey) {
          this.triggerAppAction('largerTool');
        } else {
          this.triggerAppAction('nextFrame');
        }
      } else {
        if (event.ctrlKey) {
          this.triggerAppAction('smallerTool');
        } else {
          this.triggerAppAction('prevFrame');
        }
      }
    });
    globalThis.addEventListener('beforeunload', (event: BeforeUnloadEvent) => {
      this.controller.putStoredData('app', 'options', this.controller.options);
      this.controller.putStoredData('app', 'state', this.controller.state);
      if (this.controller.hasUnsavedChanges) {
        const msg = "You have unsaved changes. Press 'S' to save."
        this.showFeedback({text:msg});
        event.preventDefault();
        event.returnValue = msg;
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
    if (this.controller.options.showStatus) {

      const statusComponentDefinitions: Array<PenciltestUIComponentOptions> = [
        {
          key: "statusVersion",
          tagName: 'span',
          text: `v${this.controller.state.version}${this.controller.scene.instrument?.version && this.controller.state.version !== this.controller.scene.instrument.version ? ` (@v${this.controller.scene.instrument.version})` : ''}`,
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
          key: "current scene name",
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
              attr: {'contenteditable': 'true'},
              on: {
                input: (e) => this.controller.scene.name = (e.target as HTMLElement).innerText,
                focus: (e) => {
                  if ((e.target as HTMLElement).innerText === lc('untitled')) { (e.target as HTMLElement).innerText = ''; }
                },
                blur: (e) => {
                  this.handleAppReaction('renameScene');
                  this.updateStatusBar();
                }
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
              text: String((this.controller.scene.current?.frameNumber || 0) + 1),
              attr: {
                title: lc('currentFrameNumber')
              }
            },
            {
              key: 'statusFrameTotal',
              tagName: 'span',
              text: `/${this.controller.scene.frames?.length || 1}`,
              attr: {
                title: lc('total frames')
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
              text: Utils.toTimecode(this.controller.scene.current.frames[this.controller.scene.current.frameNumber]?.time || 0, 3),
              attr: {
                title: lc('currentFrameTime')
              }
            },
            {
              key: 'statusTotalTime',
              tagName: 'span',
              text: '/'+Utils.toTimecode((this.controller.scene.current.frames.length > 0 ? this.controller.scene.current.frames[this.controller.scene.current.frames.length - 1].time : 0) + (this.controller.scene.current.singleFrameDuration || 0), 3),
              attr: {
                title: lc('%u{scene} %{duration}')
              }
            }
          ],
          parent: 'sceneStatus'
        },
        {
          key: "frame rate status",
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
              text: `${this.controller.scene?.framerate || '…'}`
            },
            {
              key: 'statusFrameHold',
              tagName: 'span',
              text: `/${this.controller.scene.getFrameHold()}`,
              attr: {
                title: lc('exposures holding current frame')
              }
            }
          ],
          attr: {
            title: lc('frame rate status'),
          },
          parent: 'sceneStatus'
        },
        {
          key: 'statusAudioOffset',
          tagName: 'span',
          parent: 'sceneStatus',
          text: this.controller.scene.audio?.offset ? `${this.controller.scene.audio.offset >= 0 ? '+' : ''}${Utils.toDecimal(this.controller.scene.audio.offset, 1)}` : '-',
          attr: {
            title: lc('audio timing')
          }
        }
      ];

      statusComponentDefinitions.forEach((config) => {
        const component = PenciltestUIComponent.restore(config, this.components);
      });

    }
    // ELSE, hide status? @1785792939
  }

  showMenu(coords: Point) {
    if (!this.isMenuVisible) {
      if (!coords) {
        coords = {x: 10, y: 10, ...this.pointer};
      }

      // To avoid appearing under the cursor, for an accidental mouseup before
      // making a selection. +UX uuid:f02e29fc-b820-4a8f-ae5f-c57df8b4d989
      coords.y++;
      coords.x++;

      this.isMenuVisible = true;
      const menuElement = this.components.contextMenu.getElement();
      Utils.toggleClass(menuElement, 'active', true);

      const maxRight = 0;
      const maxBottom = 0;

      if (coords.x > (document.body.offsetWidth - maxRight - menuElement.offsetWidth)) {
        menuElement.style.right = `${maxRight}px`;
        menuElement.style.left = "auto";
      } else {
        menuElement.style.left = `${coords.x}px`;
        menuElement.style.right = "auto";
      }

      if (coords.y > (document.body.offsetHeight - maxBottom - menuElement.offsetHeight)) {
        menuElement.style.top = "auto";
        menuElement.style.bottom = `${maxBottom}px`;
        menuElement.style['max-height'] = `${document.body.offsetHeight - maxBottom}px`;
      } else {
        menuElement.style.top = `${coords.y}px`;
        menuElement.style.bottom = "auto";
        menuElement.style['max-height'] = `${document.body.offsetHeight-coords.y}px`;
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

  toggleMenu(coords: Point) {
    if (this.isMenuVisible) { return this.hideMenu(); } else { return this.showMenu(coords); }
    return this.isMenuVisible;
  }

  showFeedback(config:PenciltestUIComponentOptions, duration: number = 0) {
    if (!duration) {
      duration = 2000;
      let length = 0;
      if ("text" in config) {
        length = config.text.length
      } else if ("html" in config) {
        length = config.html.length
      }
      if (length) {
        duration += 8000 * Utils.normalize(length, 100);
      }
    }
    const feedbackComponent = PenciltestUIComponent.restore({
      ...config,
      style: { opacity: '1',  ...config.style },
      attr: { ...config.attr, id: 'pt-feedback'},
      key: 'showFeedback',
      parent: this
    }, this.components);

    clearTimeout(this.feedbackTimeout);
    const hideFeedback = () => feedbackComponent.setContent({ style: { opacity: '0' } });
    setTimeout(() => { // Nesting timeout to allow "pausing", as in beforeunload alert.
      this.feedbackTimeout = setTimeout(hideFeedback, duration);
    }, 0);

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
    this.showFeedback({text:`Selecting ${selectionCount} frame${selectionCount !== 1 ? 's' : ''}`});
  }

  clearSelection(showFeedback:boolean = false) {
    if (this.controller.state.frameSelection) {
      delete this.controller.state.frameSelection;
      if (showFeedback) {
        this.showFeedback({text:`Cleared selectedFrameNumbers`});
      }
    }
  }

  handleDrag(options: PenciltestDragOptions) {
    const {
      startTarget,
      moveTarget,
      endTarget,
      onstart,
      onmove,
      onend,
      alreadyStartedEvent,
      coordinateScope,
      touchLimit,
    } = {
      ...this.defaultDragOptions,
      ...options
    };

    let startPoint:Point, endPoint:Point;
    startPoint = endPoint = {x:0,y:0};

    const dragStart = (event: AnyPointerEvent) => {
      //event.preventDefault();
      //event.stopImmediatePropagation();
      startPoint = Utils.eventPoint(event, coordinateScope, touchLimit);
      endPoint = startPoint;
      moveTarget.addEventListener('mousemove', dragMove);
      endTarget.addEventListener('mouseup', dragEnd);
      this.getElement().classList.add('dragging');
      if (typeof onstart === 'function') {
        onstart.apply(this, [event]);
      }
    };

    const dragMove = (event: AnyPointerEvent) => {
      event.stopPropagation();
      const nowPoint = Utils.eventPoint(event, coordinateScope, touchLimit);
      if (typeof onmove === 'function') {
        const immediateDeltaPoint =  PtSpace.diffPoints(nowPoint, endPoint);
        const totalDeltaPoint = PtSpace.diffPoints(endPoint, startPoint);
        onmove.apply(this, [event, immediateDeltaPoint, totalDeltaPoint]);
        endPoint = nowPoint;
      }
    };

    const dragEnd = (event: AnyPointerEvent) => {
      //event.preventDefault();
      event.stopImmediatePropagation();
      this.getElement().classList.remove('dragging');
      endTarget.removeEventListener('mouseup', dragEnd);
      if (!alreadyStartedEvent) {
        startTarget.removeEventListener('mousedown', dragStart);
      }
      moveTarget.removeEventListener('mousemove', dragMove);
      const totalDeltaPoint = PtSpace.diffPoints(endPoint, startPoint);
      if (typeof onend === 'function') {
        onend.apply(this, [event, totalDeltaPoint]);
      }
    };

    if (alreadyStartedEvent) {
      dragStart(alreadyStartedEvent);
    } else {
      startTarget.addEventListener('mousedown', dragStart);
    }
  }

  async interactivePan(selectedFrameNumbers:Array<PenciltestFrame> = [], alreadyStartedEvent:AnyPointerEvent | null = null): Promise<Point> {
    // TODO Select specific strokes to move.  #f063eb1f-b09a-44c1-8582-83711b2d10e8
    return new Promise((resolve, reject) => {
      this.controller.useTool(PenciltestTool.MOVE);

      this.controller.resize();
      let frameScale = this.controller.width / this.controller.scene.getDimensions().width;
      if (selectedFrameNumbers.length === 0) {
        [ selectedFrameNumbers ] = this.controller.getSelectedFrames();
      }
      const previewFrameSelection = Utils.getIntersection(this.controller.getVisibleFrames(), selectedFrameNumbers);
      if (previewFrameSelection.length === 0) {
        previewFrameSelection.push(selectedFrameNumbers[0]);
      }

      this.handleDrag({
        alreadyStartedEvent,
        coordinateScope: 'page',
        startTarget: this.components.field.getElement(),
        onstart: () => {
          this.controller.setMode(PenciltestMode.WORKING);
        },
        onmove: (event:AnyPointerEvent, immediateDeltaPoint:Point, totalDeltaPoint:Point) => {
          const scaledDelta = PtSpace.scalePoint(immediateDeltaPoint, 1/frameScale)
          this.controller.moveFrameContents(scaledDelta, previewFrameSelection);
          this.controller.drawCurrentFrame();
        },
        onend: (event:AnyPointerEvent, totalDeltaPoint:Point) => {
          this.controller.setPreviousMode();
          this.controller.usePreviousTool();
          const scaledTotalDelta = PtSpace.scalePoint(totalDeltaPoint, 1/frameScale);
          if (previewFrameSelection !== selectedFrameNumbers) {
            this.controller.moveFrameContents(PtSpace.negatePoint(scaledTotalDelta), previewFrameSelection);
            this.controller.moveFrameContents(scaledTotalDelta, selectedFrameNumbers);
          }
          resolve(scaledTotalDelta);
        }
      });
    });
  }
}
