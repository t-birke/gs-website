'use strict'


hwCore = angular.module 'hwWebCore', []


hwCore.value 'API_HOST', 'dev.hellowins.com:5555'
#hwCore.value 'API_HOST', 'localhost:5555'

hwCore.value 'API_VERSION', 'v1'


hwCore.value 'DEBUG', true


hwCore.factory 'CoreAPI', ['$http', 'API_HOST', 'API_VERSION', ($http, API_HOST, API_VERSION) ->

  SERVER = 'http://' + API_HOST + '/api/'
  basicData = {}

  buildUrl = (path) ->
    SERVER + API_VERSION + path

  getConfig = () ->
    withCredentials: true

  get: (path, config={}) ->
    $http.get buildUrl(path), angular.extend(getConfig(), config)

  post: (path, data=null, config={}) ->
    body = if data then angular.extend(basicData, data: data) or basicData
    $http.post buildUrl(path), body, angular.extend(getConfig(), config)

  put: (path, data=null, config={}) ->
    body = if data then angular.extend(basicData, data: data) or basicData
    $http.put buildUrl(path), body, angular.extend(getConfig(), config)

  head: (path, config={}) ->
    $http.head buildUrl(path), angular.extend(getConfig(), config)

  del: (path, config={}) ->
    $http.delete buildUrl(path), angular.extend(getConfig(), config)

]


hwCore.factory 'Socket', ['$rootScope', 'API_HOST', 'DEBUG', '$log', ($rootScope, API_HOST, DEBUG, $log) ->

  host = 'ws://' + API_HOST + '/'

  service =

    queue: []

    channels: {}

    command_map: {}

    connect: () ->

      self = this

      this.ws = new WebSocket(host)
   
      this.ws.onmessage = (evt) ->
        message = angular.fromJson evt.data
        if message.action
          # FIXME
          command = if message.action.name then message.action.name else message.action
        channel = message.stream

        if DEBUG
          $log.log 'socket', message

        if service.channels[channel]
          service.channels[channel](message)

        if command && service.command_map[command]
          for listener in service.command_map[command]
            listener(message.data)
     
      this.ws.onopen = (evt) ->
        if DEBUG
          $log.log 'socket connect', self.queue
     
      this.ws.onerror = (evt) ->
        if DEBUG
          $log.log 'socket error', self.ws

      this.ws.onclose = (evt) ->
        self.ws = null
        if DEBUG
          $log.log 'socket closed', self.ws
   
    on: (command_str, callback) ->
      unless command_str in service.command_map
        service.command_map[command_str] = []
      service.command_map[command_str].push callback
   
    off: (command_str, callback) ->
      if service.command_map[command_str]
        delete service.command_map[command_str]

    subscribe: (stream, cb) ->
      service.channels[stream] = cb

    send: (msg) ->
      if DEBUG
        $log.log 'send socket', msg
      if this.ws
        this.ws.send JSON.stringify msg
      else
        this.queue.push msg

    clearQueue: ->
      while this.queue.length
        this.send this.queue.shift()

    check: ->
      if !this.ws
        $rootScope.reconnectSocket()

    close: ->
      this.queue = []
      this.channels = {}
      this.command_map = {}
      this.ws.close()

]
