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

Utils.keyCodes = {}
for code in [0...256]
  name = Utils.keyCodeNames[code] or String.fromCharCode code
  if name
    Utils.keyCodes[name] = code
    Utils.keyCodeNames[code] ?= name

Utils.shiftKeyCodes = {}
Utils.shiftKeyCodes[code] = name for name, code of Utils.shiftKeyCodeNames
