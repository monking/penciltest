class PenciltestUIComponent

  options:
    tagName: 'div'
    className: null
    id: null
    parent: document.body # DOM Element or PenciltestUIComponent

  constructor: (options) ->
    @options = Utils.inherit {}, options, PenciltestUIComponent.prototype.options
    @createElement()

  createElement: ->
    @el = {}

    @el.container = document.createElement @options.tagName
    @el.container.className = @options.className if @options.className
    @el.container.id = @options.id if @options.id

    @appendTo @options.parent

  appendTo: (parent) ->
    if typeof parent.appendComponent is 'function'
      parent.appendComponent this
    else
      parent.appendChild @el.container

  appendComponent: (component) ->
    @el.container.appendChild component.el.container

  getElement: -> @el.container

  setHTML: (markup) ->
    @el.container.innerHTML = markup
