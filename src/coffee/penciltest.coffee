###
global: document, window
###

class Penciltest

  modes:
    DRAWING: 'drawing'
    ERASING: 'erasing'
    BUSY: 'working'
    PLAYING: 'playing'

  availableRenderers:
    canvas: CanvasRenderer
    svg: SVGRenderer

  options:
    container: 'body'
    hideCursor: false
    loop: true
    showStatus: true
    frameHold: 2
    onionSkin: true
    smoothing: 1
    onionSkinFrameRadius: 4
    lineColor: 'black'
    lineWeight: 1
    background: 'white'
    renderer: 'canvas'
    onionSkinOpacity: 0.5

  state:
    version: '0.2.13'
    mode: Penciltest.prototype.modes.DRAWING
    toolStack: ['pencil','eraser']

  # metadata generated while interpreting the scene data
  current:
    frames: []
    exposures: []
    exposureCount: 0
    exposureNumber: 0
    frameNumber: 0

  constructor: (options) ->
    @state = Utils.inherit(
      @getStoredData 'app', 'state'
      Penciltest.prototype.state
    )

    @options = Utils.inherit( # set options without triggering actions
      @getStoredData 'app', 'options'
      options
      Penciltest.prototype.options
    )

    @container = document.querySelector @options.container
    @container.className = 'penciltest-app'

    @buildContainer()

    @ui = new PenciltestUI( this )

    @newScene()

    @setOptions @options # do all the option actions

    if @state.version isnt Penciltest.prototype.state.version
      @state.version = PenciltestLegacy.update @, @state.version, Penciltest.prototype.state.version

    @resize()

    window.pt = @

  setOptions: (newOptions) ->
    @options = Utils.inherit(
      newOptions
      @options or {}
      Penciltest.prototype.state
    )

    for key, value of newOptions
      @ui.appActions[key].action.call @ if key of @ui.appActions and @ui.appActions[key].action

  buildContainer: ->
    markup = '<div class="field-container">' +
      '<div class="field"></div>' +
    '</div>'

    @container.innerHTML = markup

    @fieldContainer = @container.querySelector '.field-container'
    @fieldElement = @container.querySelector '.field'

  newFrame: (index = null) ->
    frame =
      hold: @options.frameHold
      strokes: []

    if index is null
      index = @scene.frames.length

    @lift()
    @scene.frames.splice index, 0, frame
    @buildSceneMeta()

  getCurrentFrame: ->
    @scene.frames[@current.frameNumber]

  getCurrentStroke: ->
    @getCurrentFrame().strokes[@currentStrokeIndex or 0]

  mark: (x,y) ->
    debugger
    x = Utils.getDecimal x, 1
    y = Utils.getDecimal y, 1

    if not @currentStrokeIndex
      @getCurrentFrame().strokes ?= []
      @currentStrokeIndex = @getCurrentFrame().strokes.length
      @getCurrentFrame().strokes.push []
      @renderer.moveTo x, y
    else
      @renderer.lineTo x, y

    @getCurrentStroke().push @scaleCoordinates [x, y], 1 / @zoomFactor
    if @state.mode is Penciltest.prototype.modes.DRAWING
      @renderer.render()

    @clearRedo()
    @unsavedChanges = true

  track: (x,y) ->
    coords =
      x: x
      y: y

    if @state.toolStack[0] == 'eraser'
      screenPoint = [x, y]
      point = @scaleCoordinates screenPoint, 1 / @zoomFactor
      done = false
      currentFrame = @getCurrentFrame()
      screenEraseRadius = 10
      @drawCurrentFrame()
      for stroke, strokeIndex in currentFrame.strokes
        for segment in stroke
          realEraseRadius = screenEraseRadius / @zoomFactor
          if Math.abs(point[0] - segment[0]) < realEraseRadius && Math.abs(point[1] - segment[1]) < realEraseRadius
            currentFrame.strokes.splice strokeIndex, 1
            @drawCurrentFrame()
            done = true
          if done then break
        if done then break
      @renderer.rect screenPoint[0] - screenEraseRadius, screenPoint[1] - screenEraseRadius, screenEraseRadius * 2, screenEraseRadius * 2, null, 'red'

    else
      if not @currentStrokeIndex?
        @markPoint = coords
        @markBuffer = []

      @markBuffer.push coords

      # TODO  Mark multiple points per @options.smoothing
      @markPoint.x = (@markPoint.x * @options.smoothing + x) / (@options.smoothing + 1)
      @markPoint.y = (@markPoint.y * @options.smoothing + y) / (@options.smoothing + 1)

      # TODO  Use previous mark for velocity, to interpolate `smoothing`×
      if @markBuffer.length > @state.smoothDrawInterval
        @markBuffer = []

      @mark @markPoint.x, @markPoint.y

  updateCurrentFrame: (segment) ->
    @drawCurrentFrame()

  resolveFrameNumber: (inputIndex) ->
    realIndex = inputIndex
    if @options.loop
      realIndex = (realIndex + @scene.frames.length) % @scene.frames.length while realIndex < 0 || realIndex >= @scene.frames.length
    else
      realIndex = Math.max 0, Math.min @scene.frames.length - 1, realIndex
    realIndex

  goToFrame: (targetFrameNumber, overrides) ->
    selectedFrameNumber = @resolveFrameNumber targetFrameNumber

    @current.frameNumber = selectedFrameNumber
    @current.frame = @scene.frames[@current.frameNumber]

    if @state.mode isnt Penciltest.prototype.modes.PLAYING
      @seekAudioToFrame selectedFrameNumber
    @drawCurrentFrame(overrides)

  seekAudioToFrame: (frameNumber) ->
    if @scene.audio
      Utils.log(@current.frames[frameNumber])
      seekTime = @current.frames[frameNumber].time - @scene.audio.offset
      @seekAudio seekTime

  play: ->
    self = @
    @playDirection ?= 1
    if @current.frameNumber < @scene.frames.length # i.e. it is a frame in the scene (in case @current.frameNumber was
      @framesHeld = 0
      @goToFrame @current.frameNumber # reset the audio position to the _beginning_ of the current frame
    else
      @framesHeld = -1
      @goToFrame 0

    stepListener = (firstStep) ->
      self.framesHeld++
      currentFrame = self.getCurrentFrame()
      newIndex = self.current.frameNumber + self.playDirection
      if self.framesHeld >= currentFrame.hold || ( firstStep && newIndex == self.scene.frames.length )
        self.framesHeld = 0
        if newIndex >= self.scene.frames.length or newIndex < 0
          if self.options.loop || firstStep
            newIndex = (newIndex + self.scene.frames.length) % self.scene.frames.length
            self.goToFrame newIndex
            self.seekAudioToFrame 0
          else
            self.stop()
        else
          self.goToFrame newIndex

    @stop()
    stepListener(true)
    @playInterval = setInterval stepListener, 1000 / @scene.framerate
    @lift()
    @state.mode = Penciltest.prototype.modes.PLAYING
    @playAudio()

  stop: ->
    @pauseAudio() if @audioElement
    clearInterval @playInterval
    if @state.mode is Penciltest.prototype.modes.PLAYING
      @state.mode = Penciltest.prototype.modes.DRAWING

  togglePlay: ->
    if @state.mode isnt Penciltest.prototype.modes.BUSY
      if @state.mode is Penciltest.prototype.modes.PLAYING then @stop() else @play()

  drawCurrentFrame: (overrides) ->
    # NOTE: This draws the background, while drawFrame() does not.
    return if not @renderer or not @scene.frames.length

    @renderer.clear()

    if @scene.background
      @renderer.rect 0, 0, @width, @height, @scene.background

    if @options.onionSkin
      for i in [1..@options.onionSkinFrameRadius]
        previousFrameNumber = @resolveFrameNumber(@current.frameNumber - i)
        if previousFrameNumber != @current.frameNumber
          @drawFrame(
            previousFrameNumber
            Object.assign(
              {},
              overrides,
              {
                lineColor: [255, 0, 0],
                lineOpacity: Math.pow @options.onionSkinOpacity, i
              }
            )
          )
        nextFrameNumber = @resolveFrameNumber(@current.frameNumber + i)
        if nextFrameNumber != @current.frameNumber
          @drawFrame(
            nextFrameNumber
            Object.assign(
              {},
              overrides,
              {
                lineColor: [0, 255, 255],
                lineOpacity: Math.pow @options.onionSkinOpacity, i
              }
            )
          )
    @renderer.composeOptions()
    @drawFrame @current.frameNumber, overrides
    @ui.updateStatus()

  drawFrame: (frameNumber, overrides) ->
    return if !@width or !@height

    @renderer.composeOptions overrides if overrides

    for stroke in @scene.frames[frameNumber].strokes
      @renderer.path @scaleStroke stroke, @zoomFactor

  scaleStroke: (stroke, factor) ->
    @scaleCoordinates coords, factor for coords in stroke

  scaleCoordinates: (coords, factor) ->
    newCoords = [
      coords[0] * factor
      coords[1] * factor
    ]
    newCoords.push  coords.slice 2
    newCoords

  useTool: (toolName) ->
    index = @state.toolStack.indexOf(toolName)
    if index > -1
      @state.toolStack.unshift(@state.toolStack.splice(index, 1)[0])

  cancelStroke: ->
    @markBuffer = []
    @currentStrokeIndex = null

  lift: ->
    if @markBuffer && @markBuffer.length
      last = @markBuffer.pop()
      @mark last.x, last.y
      @markBuffer = []
    @currentStrokeIndex = null
    if @state.toolStack[0] == 'eraser'
      @drawCurrentFrame()

  copyFrame: (frame = @getCurrentFrame()) ->
    if frame.strokes.length
      @copyBuffer = Utils.clone frame

  pasteFrame: ->
    if @copyBuffer
      newFrameNumber = @current.frameNumber + 1
      @scene.frames.splice newFrameNumber, 0, Utils.clone(@copyBuffer)
      @buildSceneMeta()
      @goToFrame(newFrameNumber)

  pasteStrokes: ->
    if @copyBuffer
      @scene.frames[@current.frameNumber].strokes = @scene.frames[@current.frameNumber].strokes.concat(Utils.clone(@copyBuffer.strokes))
      @drawCurrentFrame()

  clearStrokes: ->
    @scene.frames[@current.frameNumber].strokes = []
    @drawCurrentFrame()

  cutFrame: ->
    droppedFrame = @dropFrame()
    @copyFrame droppedFrame if droppedFrame.strokes.length

  dropFrame: ->
    droppedFrame = @getCurrentFrame()
    @scene.frames.splice @current.frameNumber, 1
    @current.frameNumber-- if @current.frameNumber >= @scene.frames.length and @current.frameNumber > 0
    if @scene.frames.length is 0
      @newFrame()

    @buildSceneMeta()
    @drawCurrentFrame()

    droppedFrame

  smoothFrame: (index, amount) ->
    self = @
    smooth = (amount) ->
      amount = Number amount
      smoothingBackup = self.options.smoothing
      self.options.smoothing = amount
      frame = self.scene.frames[index]
      oldStrokes = JSON.parse JSON.stringify frame.strokes
      self.lift()
      frame.strokes = []
      self.current.frameNumber = index
      self.renderer.clear()
      for stroke in oldStrokes
        for segment in stroke
          self.track.apply self, segment
        self.lift()

    @options.smoothing = smoothingBackup
    if amount
      Utils.prompt 'How much to smooth? 1-5', 2, smooth
    else
      smooth amount

  smoothScene: (amount) ->
    self = @
    if @state.mode is Penciltest.prototype.modes.DRAWING
      Utils.confirm 'Would you like to smooth every frame of this scene?', ->
        beginSmoothingScene = (amount) ->
          amount = Number amount
          self.state.mode = Penciltest.prototype.modes.BUSY
          lastIndex = self.scene.frames.length - 1
          for frame in [0..lastIndex]
            self.smoothFrame frame, amount
          self.state.mode = Penciltest.prototype.modes.DRAWING
        if not amount
          Utils.prompt 'How much to smooth? 1-5', 2, beginSmoothingScene
        else
          beginSmoothingScene amount
    else
      Utils.log 'Unable to alter scene while playing'

  undo: ->
    if @getCurrentFrame().strokes and @getCurrentFrame().strokes.length
      @redoQueue ?= []
      @redoQueue.push @getCurrentFrame().strokes.pop()
      @unsavedChanges = true
      @drawCurrentFrame()

  redo: ->
    if @redoQueue and @redoQueue.length
      @getCurrentFrame().strokes.push @redoQueue.pop()
      @unsavedChanges = true
      @drawCurrentFrame()

  clearRedo: ->
    @redoQueue = []

  setCurrentFrameHold: (newHold) ->
    @getCurrentFrame().hold = Math.max 1, newHold
    @buildSceneMeta()
    @ui.updateStatus()

  defaultScene: (sceneData = null) ->
    now = new Date()
    nowString = now.toISOString()
    scene = 
      name: ''
      dateModified: nowString
      dateCreated: nowString
      uuid: null
      instrument:
        name: 'io.lovejoy.penciltest'
        version: Penciltest.prototype.state.version
      aspect: '1:1'
      width: 1024
      framerate: 12
      background: @options.background
      lineColor: @options.lineColor
      lineWeight: @options.lineWeight
      frames: []

    if sceneData
      Object.assign scene, sceneData

    if scene.uuid == null
      crypto?.randomUUID()
    else if scene == false
      delete scene.uuid

    scene

  newScene: ->
    @scene = @defaultScene()

    @unsavedChanges = false

    @newFrame()
    @goToFrame 0

  getSceneNames: ->
    sceneNamePattern = /^scene:/
    sceneNames = []
    for storageName of window.localStorage
      reference = @decodeStorageReference storageName
      if reference and reference.namespace is 'scene'
        sceneNames.push reference.name
    sceneNames

  encodeStorageReference: (namespace, name) ->
    "#{namespace}:#{name}"

  decodeStorageReference: (encoded) ->
    if match = encoded.match /^(app|scene):(.*)/
      {
        namespace: match[1]
        name: match[2]
      }
    else
      false

  getStoredData: (namespace, name) ->
    storageName = @encodeStorageReference namespace, name
    JSON.parse window.localStorage.getItem storageName

  putStoredData: (namespace, name, data) ->
    storageName = @encodeStorageReference namespace, name
    window.localStorage.setItem storageName, JSON.stringify data

  saveScene: ->
    self = @
    @scene.dateModified = (new Date()).toISOString()
    Utils.prompt "what will you name your scene?", @scene.name, (name) ->
      if name
        self.scene.name = name
        self.scene.dateModified = (new Date()).toISOString()
        self.putStoredData 'scene', name, self.scene
        self.unsavedChanges = false

  renderGif: ->
    self = @
    beginRenderingGif = (gifConfigurationString) ->
      gifConfiguration = (gifConfigurationString || '512 2').split ' '
      # configure for rendering
      # dimensions = [64, 64]
      dimensions = self.getSceneDimensions()
      # while rendering is only useful at one size, save the step # dimensions = ().split 'x'
      maxGifDimension = parseInt gifConfiguration[0], 10
      gifLineWeight = parseInt gifConfiguration[1], 10
      if dimensions.width > maxGifDimension
        dimensions.width = maxGifDimension
        dimensions.height = maxGifDimension / dimensions.aspect
      else if dimensions.height > maxGifDimension
        dimensions.height = maxGifDimension
        dimensions.width = maxGifDimension * dimensions.aspect

      self.forceDimensions =
        width: dimensions.width
        height: dimensions.height
      # rebuild renderer to ensure correct resolution for capture
      self.ui.appActions.renderer.action()
      self.resize()

      oldRendererType = self.options.renderer
      self.setOptions renderer: 'canvas'
      self.ui.appActions.renderer.action()

      gifRenderOverrides = 
        lineWeight: gifLineWeight

      baseFrameDelay = 1000 / self.scene.framerate
      frameNumber = 0

      # prepare encoder
      gifEncoder = new GIFEncoder()
      # gifEncoder.setSize dimensions.width, dimensions.height # no use: uses the original dimensions of the canvas, regardless of its current size
      gifEncoder.setRepeat 0
      gifEncoder.setDelay baseFrameDelay
      gifEncoder.start()

      for frameNumber in [0...self.scene.frames.length]
        self.goToFrame frameNumber, gifRenderOverrides
        gifEncoder.setDelay baseFrameDelay * self.getCurrentFrame().hold # FIXME no good; how to set individual delays for each fram in gifEncoder?
        gifEncoder.addFrame self.renderer.context

      gifEncoder.finish()
      blobUrl = URL.createObjectURL(new Blob([new Uint8Array(gifEncoder.stream().bin).buffer], { type: "image/gif" }))

      gifElementId = 'rendered_gif'
      gifElement = document.getElementById gifElementId
      gifLinkId = 'rendered_gif_link'
      gifLink = document.getElementById gifLinkId
      if not gifElement
        gifElement = document.createElement 'img'
        gifElement.id = gifElementId
        gifCss =
          position: 'absolute'
          top: '50%'
          left: '50%'
          transform: 'translateX(-50%) translateY(-50%)'
          maxWidth: '80%'
          maxHeight: '80%'
        Object.assign gifElement.style, gifCss
        gifContainer = document.createElement 'div'
        containerCss =
          position: 'absolute'
          top: '0px'
          left: '0px'
          bottom: '0px'
          right: '0px'
          backgroundColor: 'rgba(0,0,0,0.5)'
        Object.assign gifContainer.style, containerCss
        gifInstructions = document.createElement 'div'
        containerCss =
          position: 'relative'
          color: 'white'
          textAlign: 'center'
          backgroundColor: 'rgba(0,0,0,0.5)'
        Object.assign gifInstructions.style, containerCss
        gifLink = document.createElement 'a'
        gifInstructions.innerHTML = "Click/touch image to download.<br>Click/touch outside GIF to close."
        gifLink.appendChild gifElement
        gifContainer.appendChild gifLink
        gifContainer.appendChild gifInstructions
        document.body.appendChild gifContainer

        gifCloseHandler = (event) ->
          if event.target isnt gifElement || ( event.type = 'keydown' && event.key == 'escape' )
            gifContainer.removeEventListener 'click', gifCloseHandler
            gifContainer.removeEventListener 'touchend', gifCloseHandler
            document.body.removeEventListener 'keydown', gifCloseHandler
            gifContainer.remove()

        gifContainer.addEventListener 'click', gifCloseHandler
        gifContainer.addEventListener 'touchend', gifCloseHandler
        document.body.addEventListener 'keydown', gifCloseHandler

      gifElement.src = blobUrl
      gifLink.href = blobUrl
      gifLink.download = (self.scene.name || 'untitled')+'.penciltest.gif'

      # TODO 1) render each frame small in canvas
      # TODO 2) append with the corect duration to a GIF in memory
      # TODO 3) draw the GIF as a `data:` URL, prompting to right-click and save'

      # reset to user's configuration
      self.setOptions renderer: oldRendererType
      self.forceDimensions = null
      self.resize()

    gifSize = Math.min 512, self.scene.width
    lineWeight = 1
    Utils.prompt 'GIF size & line weight (px)', gifSize+' '+lineWeight, beginRenderingGif

  selectSceneName: (message, callback) ->
    sceneNames = @getSceneNames()
    if sceneNames.length
      message ?= 'Choose a scene'
      Utils.select message, sceneNames, @scene.name, (selectedSceneName) ->
        if selectedSceneName
          callback selectedSceneName
        else
          Utils.alert "No scene by that name."
    else
      Utils.alert "You don't have any saved scenes yet."

    false

  setScene: (scene) ->
    @scene = Object.assign @defaultScene({uuid:false}), scene
    @buildSceneMeta()
    if @scene.audio and @scene.audio.url
      @loadAudio @scene.audio.url
    else
      @destroyAudio()
    if @renderer
      @renderer.options.background = @scene.background if @scene.background
      @renderer.options.lineColor = @scene.lineColor if @scene.lineColor
      @renderer.options.lineWeight = @scene.lineWeight if @scene.lineWeight
    @goToFrame 0
    @ui.updateStatus()
    @unsavedChanges = false
    @resize() # FIXME

  loadScene: ->
    self = @
    @selectSceneName 'Choose a scene to load', (name) ->
      self.setScene self.getStoredData 'scene', name

  deleteScene: ->
    self = @
    @selectSceneName 'Choose a scene to DELETE...FOREVER', (sceneName) ->
      window.localStorage.removeItem self.encodeStorageReference 'scene', sceneName

  buildSceneMeta: ->
    @current.frames = []
    @current.exposures = []
    @current.exposureCount = 0
    @current.singleFrameDuration = 1 / @scene.framerate

    for i in [0...@scene.frames.length]
      frame = @scene.frames[i]
      frameMeta =
        id: i
        exposure: @current.exposureCount
        duration: frame.hold * @current.singleFrameDuration
        time: @current.exposureCount * @current.singleFrameDuration
      @current.frames.push frameMeta
      @current.exposures.push frameMeta for [1...frame.hold]
      @current.exposureCount += @scene.frames[i].hold

    @current.duration = @current.exposureCount * @current.singleFrameDuration

  getFrameDuration: (frameNumber = @current.frameNumber) ->
    frame = @scene.frames[frameNumber]
    frame.hold / @scene.framerate

  loadAudio: (audioURL) ->
    @scene.audio ?= {}
    @scene.audio.url = audioURL
    @scene.audio.offset = 0
    @unsavedChanges = true
    if not @audioElement # TODO: abstract away from browser
      @audioElement = document.createElement 'audio'
      @audioElement.preload = true
      @fieldContainer.appendChild @audioElement
    else
      @pauseAudio()
    @audioElement.src = audioURL

  destroyAudio: ->
    if @scene.audio
      delete @scene.audio
    if @audioElement
      @pauseAudio()
      @audioElement.remove()
      @audioElement = null

  pauseAudio: ->
    @audioElement.pause() if @audioElement and not @audioElement.paused

  playAudio: ->
    @audioElement.play() if @audioElement and @audioElement.paused

  seekAudio: (time) ->
    ( @audioElement.currentTime = time ) if @audioElement

  scrubAudio: ->
    self = @
    Utils.log 'scrubAudio', @current.frameNumber
    @seekAudioToFrame @current.frameNumber
    clearTimeout @scrubAudioTimeout
    @playAudio()
    @scrubAudioTimeout = setTimeout(
      -> self.pauseAudio()
      Math.max @getFrameDuration * 1000, 100
    )

  pan: (deltaPoint) ->
    for frame in @scene.frames
      for stroke in frame.strokes
        for segment in stroke
          segment[0] += deltaPoint[0]
          segment[1] += deltaPoint[1]

  getSceneDimensions: ->
    aspect = @scene.aspect or '1:1'
    aspectParts = aspect.split ':'
    dimensions = 
      width: @scene.width
      aspect: aspectParts[0] / aspectParts[1]
    dimensions.height = Math.ceil dimensions.width / dimensions.aspect
    dimensions

  resize: ->
    if @forceDimensions
      containerWidth = @forceDimensions.width
      containerHeight = @forceDimensions.height
    else
      containerWidth = @container.offsetWidth
      containerHeight = @container.offsetHeight
      if @options.showStatus
        containerHeight -= 36
    sceneDimensions = @getSceneDimensions()
    containerAspect = containerWidth / containerHeight

    if containerAspect > sceneDimensions.aspect
      @width = Math.floor containerHeight * sceneDimensions.aspect
      @height = containerHeight
    else
      @width = containerWidth
      @height = Math.floor containerWidth / sceneDimensions.aspect

    @fieldContainer.style.width = "#{@width}px"
    @fieldContainer.style.height = "#{@height}px"
    @renderer.resize @width, @height
    @zoomFactor = @width / @scene.width
    @renderer.options.lineWeight = @zoomFactor * @scene.lineWeight
    @drawCurrentFrame()
