(function() {
  'use strict';
  var hwCore,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  hwCore = angular.module('hwWebCore', []);

  hwCore.value('API_HOST', 'dev.hellowins.com:5555');

  hwCore.value('API_VERSION', 'v1');

  hwCore.value('DEBUG', true);

  hwCore.factory('CoreAPI', [
    '$http', 'API_HOST', 'API_VERSION', function($http, API_HOST, API_VERSION) {
      var SERVER, basicData, buildUrl, getConfig;
      SERVER = 'http://' + API_HOST + '/api/';
      basicData = {};
      buildUrl = function(path) {
        return SERVER + API_VERSION + path;
      };
      getConfig = function() {
        return {
          withCredentials: true
        };
      };
      return {
        get: function(path, config) {
          if (config == null) {
            config = {};
          }
          return $http.get(buildUrl(path), angular.extend(getConfig(), config));
        },
        post: function(path, data, config) {
          var body;
          if (data == null) {
            data = null;
          }
          if (config == null) {
            config = {};
          }
          body = data ? angular.extend(basicData, {
            data: data
          }) || basicData : void 0;
          return $http.post(buildUrl(path), body, angular.extend(getConfig(), config));
        },
        put: function(path, data, config) {
          var body;
          if (data == null) {
            data = null;
          }
          if (config == null) {
            config = {};
          }
          body = data ? angular.extend(basicData, {
            data: data
          }) || basicData : void 0;
          return $http.put(buildUrl(path), body, angular.extend(getConfig(), config));
        },
        head: function(path, config) {
          if (config == null) {
            config = {};
          }
          return $http.head(buildUrl(path), angular.extend(getConfig(), config));
        },
        del: function(path, config) {
          if (config == null) {
            config = {};
          }
          return $http["delete"](buildUrl(path), angular.extend(getConfig(), config));
        }
      };
    }
  ]);

  hwCore.factory('Socket', [
    '$rootScope', 'API_HOST', 'DEBUG', '$log', function($rootScope, API_HOST, DEBUG, $log) {
      var host, service;
      host = 'ws://' + API_HOST + '/';
      return service = {
        queue: [],
        channels: {},
        command_map: {},
        connect: function() {
          var self;
          self = this;
          this.ws = new WebSocket(host);
          this.ws.onmessage = function(evt) {
            var channel, command, listener, message, _i, _len, _ref, _results;
            message = angular.fromJson(evt.data);
            if (message.action) {
              command = message.action.name ? message.action.name : message.action;
            }
            channel = message.stream;
            if (DEBUG) {
              $log.log('socket', message);
            }
            if (service.channels[channel]) {
              service.channels[channel](message);
            }
            if (command && service.command_map[command]) {
              _ref = service.command_map[command];
              _results = [];
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                listener = _ref[_i];
                _results.push(listener(message.data));
              }
              return _results;
            }
          };
          this.ws.onopen = function(evt) {
            if (DEBUG) {
              return $log.log('socket connect', self.queue);
            }
          };
          this.ws.onerror = function(evt) {
            if (DEBUG) {
              return $log.log('socket error', self.ws);
            }
          };
          return this.ws.onclose = function(evt) {
            self.ws = null;
            if (DEBUG) {
              return $log.log('socket closed', self.ws);
            }
          };
        },
        on: function(command_str, callback) {
          if (__indexOf.call(service.command_map, command_str) < 0) {
            service.command_map[command_str] = [];
          }
          return service.command_map[command_str].push(callback);
        },
        off: function(command_str, callback) {
          if (service.command_map[command_str]) {
            return delete service.command_map[command_str];
          }
        },
        subscribe: function(stream, cb) {
          return service.channels[stream] = cb;
        },
        send: function(msg) {
          if (DEBUG) {
            $log.log('send socket', msg);
          }
          if (this.ws) {
            return this.ws.send(JSON.stringify(msg));
          } else {
            return this.queue.push(msg);
          }
        },
        clearQueue: function() {
          var _results;
          _results = [];
          while (this.queue.length) {
            _results.push(this.send(this.queue.shift()));
          }
          return _results;
        },
        check: function() {
          if (!this.ws) {
            return $rootScope.reconnectSocket();
          }
        },
        close: function() {
          this.queue = [];
          this.channels = {};
          this.command_map = {};
          return this.ws.close();
        }
      };
    }
  ]);

}).call(this);
