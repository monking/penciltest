###
global: document, window
###

Utils =

  toggleClass: (element, className, presence = null) ->
    added = false
    classes = element.className.split /\s+/
    classIndex = classes.indexOf className
    if classIndex > -1
      classes.splice classIndex, 1 if presence isnt true
    else if presence isnt false
      classes.push className
      added = true
    element.className = classes.join ' '
    added

  inherit: (child = {}, ancestors...) ->
    for ancestor in ancestors
      if ancestor
        for key, value of ancestor
          child[key] = ancestor[key] if typeof child[key] is 'undefined'
    child

  log: ->
    # window.location.hash = arguments[0].toString()
    console.log arguments[0]

  alert: ->
    window.alert arguments[0]

  confirm: ->
    window.confirm arguments[0]

  prompt: ->
    window.prompt arguments[0], arguments[1]

  keyCodeNames:
    8   : 'Backspace'
    16  : 'Shift'
    17  : 'Ctrl'
    18  : 'Alt'
    32  : 'Space'
    33  : 'PgUp'
    34  : 'PgDn'
    35  : 'End'
    36  : 'Home'
    37  : 'Left'
    38  : 'Up'
    39  : 'Right'
    40  : 'Down'
    46  : 'Delete'
    91  : 'Super'
    188 : ','
    190 : '.'
    186 : ';'
    187 : '='
    189 : '-'
    191 : '/'
    219 : '['
    221 : ']'
    222 : '\''

  shiftKeyCodeNames:
    48  : ')'
    49  : '!'
    50  : '@'
    51  : '#'
    52  : '$'
    53  : '%'
    54  : '^'
    55  : '&'
    56  : '*'
    57  : '('
    79  : ')'
    187 : '+'
    189 : '_'
    191 : '?'

  getKeyCodeName: (keyCode, shiftKey) ->
    if shiftKey and @shiftKeyCodeNames.hasOwnProperty keyCode
      name = @shiftKeyCodeNames[keyCode]
    else if @keyCodeNames.hasOwnProperty keyCode
      name = @keyCodeNames[keyCode]
    else
      name = String.fromCharCode keyCode # sometimes correct; use keyCodeNames

    name

  describeKeyCombo: (event) ->
    combo = []
    combo.push 'Super' if event.metaey
    combo.push 'Ctrl' if event.ctrlKey
    combo.push 'Alt' if event.altKey
    if not @shiftKeyCodeNames.hasOwnProperty event.keyCode
      combo.push 'Shift' if event.shiftKey

    keyName = @getKeyCodeName event.keyCode, event.shiftKey
    combo.push keyName if not /^Ctrl|Alt|Shift$/.test keyName

    combo.join '+'

  averagePoints: (event) ->
    sumPoints = x: 0, y: 0
    for point in event.targetTouches
      sumPoints.x += point.x
      sumPoints.y += point.y

    sumPoints.x /= event.targetTouches.length
    sumPoints.y /= event.targetTouches.length

    sumPoints

  recordGesture: (event) ->
    if not @currentGesture
      @currentGesture =
        touches: event.targetTouches.length
        origin: Utils.averagePoints event
        origin: Utils.averagePoints event

    @currentGesture.last = Utils.averagePoints event

  describePosition: (coordinates, bounds) ->
    positionDescriptors =
      0.00: x: 'left', y: 'top'
      0.33: x: 'center', y: 'middle'
      0.67: x: 'right', y: 'bottom'

    positionRatio =
      x: coordinates.x / bounds.width
      y: coordinates.y / bounds.height

    positionDescription = {}
    for descriptors, minRatio in positionDescriptors
      if positionRatio.x > minRatio then positionDescription.x = descriptors.x
      if positionRatio.y > minRatio then positionDescription.y = descriptors.y

    positionDescription.x + ' ' + positionDescription.y

  describeMotion: (startCoordinates, endCoordinates) ->
    motionThreshold = 10

    delta =
      x: endCoordinates.x - startCoordinates.x
      y: endCoordinates.y - startCoordinates.y

    delta.absX = Math.abs delta.x
    delta.absY = Math.abs delta.y

    if delta.absX + delta.absY < motionThreshold # TODO: find hypotenuse
        description = 'still'
    else if delta.absX > delta.absY
      description = if delta.x > 0 then 'right' else 'left'
    else
      description = if delta.y > 0 then 'down' else 'up'

  describeGesture: (gestureBounds) ->
    describeMotion( @currentGesture.origin, @currentGesture.last )
    + ' from ' + Utils.describePosition( @currentGesture.origin, gestureBounds )

  getDecimal: (value, precision, type = Number) ->
    factor = Math.pow 10, precision
    output = Math.round(value * factor) / factor

    if type is String
      parts = output.toString().split '.'
      if parts.length is 1
        parts.push '0'
      parts[1] += '0' while parts[1].length < precision
      output = parts.join '.'

    output

Utils.keyCodes = {}
for code in [0...256]
  name = Utils.keyCodeNames[code] or String.fromCharCode code
  if name
    Utils.keyCodes[name] = code
    Utils.keyCodeNames[code] ?= name

Utils.shiftKeyCodes = {}
Utils.shiftKeyCodes[code] = name for name, code of Utils.shiftKeyCodeNames
