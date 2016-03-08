###
global: document, window
###

class Penciltest

  modes:
    DRAWING: 'drawing'
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
    frameRate: 24
    frameHold: 2
    onionSkin: true
    smoothing: 3
    onionSkinRange: 4
    renderer: 'canvas'
    onionSkinOpacity: 0.5

  state:
    version: '0.0.6'
    mode: Penciltest.prototype.modes.DRAWING

  # metadata generated while interpreting the film data
  current:
    frameIndex: []
    exposureIndex: []
    exposures: 0
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

    @setOptions @options # do all the option actions

    @newFilm()

    if @state.version isnt Penciltest.prototype.state.version
      @state.version = PenciltestLegacy.update @, @state.version, Penciltest.prototype.state.version

    @resize()

    window.pt = @

  setOptions: (options) ->
    @options = Utils.inherit(
      options
      @options or {}
      Penciltest.prototype.state
    )

    for key, value of options
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
      index = @film.frames.length

    @lift()
    @film.frames.splice index, 0, frame
    @buildFilmMeta()

  getCurrentFrame: ->
    @film.frames[@current.frameNumber]

  getCurrentStroke: ->
    @getCurrentFrame().strokes[@currentStrokeIndex or 0]

  mark: (x,y) ->
    x = Utils.getDecimal x, 1
    y = Utils.getDecimal y, 1

    if not @currentStrokeIndex
      @getCurrentFrame().strokes ?= []
      @currentStrokeIndex = @getCurrentFrame().strokes.length
      @getCurrentFrame().strokes.push []
      @renderer.moveTo x, y
    else
      @renderer.lineTo x, y

    frameScale = @film.width / @width
    @getCurrentStroke().push @scaleCoordinates [x, y], frameScale
    if @state.mode is Penciltest.prototype.modes.DRAWING
      @renderer.render()

    @clearRedo()
    @unsavedChanges = true

  track: (x,y) ->
    coords =
      x: x
      y: y

    makeMark = false

    if not @currentStrokeIndex?
      @markPoint = coords
      @markBuffer = []
      makeMark = true

    @markBuffer.push coords

    @markPoint.x = (@markPoint.x * @options.smoothing + x) / (@options.smoothing + 1)
    @markPoint.y = (@markPoint.y * @options.smoothing + y) / (@options.smoothing + 1)

    if @markBuffer.length > @state.smoothDrawInterval
      @markBuffer = []
      makeMark = true

    @mark @markPoint.x, @markPoint.y if makeMark

  updateCurrentFrame: (segment) ->
    @drawCurrentFrame()

  goToFrame: (newIndex) ->
    newIndex = Math.max 0, Math.min @film.frames.length - 1, newIndex

    @current.frameNumber = newIndex
    @current.frame = @film.frames[@current.frameNumber]

    if @state.mode isnt Penciltest.prototype.modes.PLAYING
      @seekToAudioAtExposure newIndex
    @drawCurrentFrame()

  seekToAudioAtExposure: (frameNumber) ->
    if @film.audio
      seekTime = ( @current.frameIndex[frameNumber].time - @film.audio.offset ) * @singleFrameDuration
      @seekAudio seekTime

  play: ->
    self = @
    @playDirection ?= 1
    if @current.frameNumber < @film.frames.length - 1
      @framesHeld = 0
    else
      @framesHeld = -1
      @goToFrame 0

    stepListener = ->
      self.framesHeld++
      currentFrame = self.getCurrentFrame()
      if self.framesHeld >= currentFrame.hold
        self.framesHeld = 0
        newIndex = self.current.frameNumber + self.playDirection
        if newIndex >= self.film.frames.length or newIndex < 0
          if self.options.loop
            newIndex = (newIndex + self.film.frames.length) % self.film.frames.length
            self.goToFrame newIndex
          else
            self.stop()
        else
          self.goToFrame newIndex

    @stop()
    stepListener()
    @playInterval = setInterval stepListener, 1000 / @options.frameRate
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

  drawCurrentFrame: ->
    @renderer.clear()
    if @options.onionSkin
      for i in [1..@options.onionSkinRange]
        if @current.frameNumber >= i
          @drawFrame(
            @current.frameNumber - i
            {
              color: [255, 0, 0],
              opacity: Math.pow @options.onionSkinOpacity, i
            }
          )
        if @current.frameNumber < @film.frames.length - i
          @drawFrame(
            @current.frameNumber + i
            {
              color: [0, 0, 255],
              opacity: Math.pow @options.onionSkinOpacity, i
            }
          )
    @drawFrame @current.frameNumber
    @ui.updateStatus()

  drawFrame: (frameIndex, overrides) ->
    @renderer.setLineOverrides overrides if overrides
    frameScale = @width / @film.width

    for stroke in @film.frames[frameIndex].strokes
      @renderer.path @scaleStroke stroke, frameScale

    @renderer.clearLineOverrides()
    @renderer.options.lineWeight = frameScale

  scaleStroke: (stroke, factor) ->
    @scaleCoordinates coords, factor for coords in stroke

  scaleCoordinates: (coords, factor) ->
    newCoords = [
      coords[0] * factor
      coords[1] * factor
    ]
    newCoords.push  coords.slice 2
    newCoords

  cancelStroke: ->
    @markBuffer = []
    @currentStrokeIndex = null

  lift: ->
    if @markBuffer && @markBuffer.length
      last = @markBuffer.pop()
      @mark last.x, last.y
      @markBuffer = []
    @currentStrokeIndex = null

  dropFrame: ->
    @film.frames.splice @current.frameNumber, 1
    @current.frameNumber-- if @current.frameNumber >= @film.frames.length and @current.frameNumber > 0
    if @film.frames.length is 0
      @newFrame()

    @buildFilmMeta()
    @drawCurrentFrame()

  smoothFrame: (index, amount) ->
    if not amount
      amount = Number Utils.prompt 'How much to smooth? 1-5', 2
    smoothingBackup = @options.smoothing
    @options.smoothing = amount
    frame = @film.frames[index]
    oldStrokes = JSON.parse JSON.stringify frame.strokes
    @lift()
    frame.strokes = []
    @current.frameNumber = index
    @renderer.clear()
    for stroke in oldStrokes
      for segment in stroke
        @track.apply @, segment
      @lift()

    @options.smoothing = smoothingBackup

  smoothFilm: (amount) ->
    if @state.mode is Penciltest.prototype.modes.DRAWING
      if Utils.confirm 'Would you like to smooth every frame of this film?'
        if not amount
          amount = Number Utils.prompt 'How much to smooth? 1-5', 2
        @state.mode = Penciltest.prototype.modes.BUSY
        lastIndex = @film.frames.length - 1
        for frame in [0..lastIndex]
          @smoothFrame frame, amount
        @state.mode = Penciltest.prototype.modes.DRAWING
    else
      Utils.log 'Unable to alter film while playing'

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
    @buildFilmMeta()
    @ui.updateStatus()

  newFilm: ->
    @film =
      name: ''
      version: Penciltest.prototype.state.version
      aspect: '16:9'
      width: 960
      frames: []

    @newFrame()
    @goToFrame 0

  getFilmNames: ->
    filmNamePattern = /^film:/
    filmNames = []
    for storageName of window.localStorage
      reference = @decodeStorageReference storageName
      if reference and reference.namespace is 'film'
        filmNames.push reference.name
    filmNames

  encodeStorageReference: (namespace, name) ->
    "#{namespace}:#{name}"

  decodeStorageReference: (encoded) ->
    if match = encoded.match /^(app|film):(.*)/
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

  saveFilm: ->
    name = window.prompt "what will you name your film?", @film.name
    if name
      @film.name = name
      @putStoredData 'film', name, @film
      @unsavedChanges = false

  selectFilmName: (message) ->
    filmNames = @getFilmNames()
    if filmNames.length
      message ?= 'Choose a film'
      selectedFilmName = window.prompt "#{message}:\n\n#{filmNames.join '\n'}"

      if selectedFilmName and filmNames.indexOf selectedFilmName is -1
        for filmName in filmNames
          selectedFilmName = filmName if RegExp(selectedFilmName).test filmName

      if selectedFilmName and filmNames.indexOf( selectedFilmName ) isnt -1
        return selectedFilmName
      else
        Utils.alert "No film by that name."
    else
      Utils.alert "You don't have any saved films yet."

    false

  setFilm: (film) ->
    @film = film
    @buildFilmMeta()
    if @film.audio and @film.audio.url
      @loadAudio @film.audio.url
    else
      @destroyAudio()
    @goToFrame 0
    @ui.updateStatus()
    @unsavedChanges = false
    @resize() # FIXME

  loadFilm: ->
    if name = @selectFilmName 'Choose a film to load'
      @setFilm @getStoredData 'film', name

  deleteFilm: ->
    if filmName = @selectFilmName 'Choose a film to DELETE...FOREVER'
      window.localStorage.removeItem @encodeStorageReference 'film', filmName

  buildFilmMeta: ->
    @current.frameIndex = []
    @current.exposureIndex = []
    @current.exposures = 0

    for i in [0...@film.frames.length]
      frame = @film.frames[i]
      frameMeta =
        id: i
        exposure: @current.exposures
        duration: frame.hold * @singleFrameDuration
        time: @current.exposures * @singleFrameDuration
      @current.frameIndex.push frameMeta
      @current.exposureIndex.push frameMeta for [1...frame.hold]
      @current.exposures += @film.frames[i].hold

    @current.duration = @current.exposures * @singleFrameDuration

  getFrameDuration: (frameNumber = @current.frameNumber) ->
    frame = @film.frames[frameNumber]
    frame.hold / @options.frameRate

  loadAudio: (audioURL) ->
    @film.audio ?= {}
    @film.audio.url = audioURL
    @film.audio.offset = 0
    @unsavedChanges = true
    if not @audioElement
      @audioElement = document.createElement 'audio'
      @audioElement.preload = true
      @fieldContainer.appendChild @audioElement
    else
      @pauseAudio()
    @audioElement.src = audioURL

  destroyAudio: ->
    if @film.audio
      delete @film.audio
    if @audioElement
      @pauseAudio()
      @audioElement.remove()
      @audioElement = null

  pauseAudio: ->
    @audioElement.pause() if @audioElement and not @audioElement.paused

  playAudio: ->
    @audioElement.play() if @audioElement and @audioElement.paused

  seekAudio: (time) ->
    console.log(time)
    ( @audioElement.currentTime = time ) if @audioElement

  scrubAudio: ->
    Utils.log 'scrubAudio'
    self = @
    console.log @current # XXX
    @seekToAudioAtExposure @current.frameNumber
    clearTimeout @scrubAudioTimeout
    @playAudio()
    @scrubAudioTimeout = setTimeout(
      -> self.pauseAudio()
      Math.max @getFrameDuration( @current.frameNumber ) * 1000, 100
    )

  resize: ->
    containerWidth = @container.offsetWidth
    containerHeight = @container.offsetHeight
    if @options.showStatus
      containerHeight -= 36
    aspect = @film.aspect or '16:9'
    aspectParts = aspect.split ':'
    aspectNumber = aspectParts[0] / aspectParts[1]
    containerAspect = containerWidth / containerHeight

    if containerAspect > aspectNumber
      @width = Math.floor containerHeight * aspectNumber
      @height = containerHeight
    else
      @width = containerWidth
      @height = Math.floor containerWidth / aspectNumber

    @fieldContainer.style.width = "#{@width}px"
    @fieldContainer.style.height = "#{@height}px"
    @renderer.resize @width, @height
    @drawCurrentFrame()
