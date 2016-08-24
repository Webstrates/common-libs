var WebstratesEventManager = (function () {

  var _eventHandlers = {};

  this.version = "0.0.1";

  this.on = function (name, handler) {

    if (typeof handler !== 'function') {
      throw new Error('handler needs to be a function');
    }

    if (!_eventHandlers[name]) {
      _eventHandlers[name] = [handler];
    }
    else {
      _eventHandlers[name].push(handler);
    }
  };

  this.off = function (name, handler) {

    if (typeof handler !== 'function') {
      throw new Error('handler needs to be a function');
    }

    var idx;
    if (!_eventHandlers[name] || (idx = _eventHandlers[name].indexOf(handler)) < 0) {
      throw new Error('handler not registered');
    }

    _eventHandlers[name].splice(idx, 1);
  };

  this.trigger = function (name, event) {

    var handlers = _eventHandlers[name];
    if (handlers) {
      for (var i = 0; i < handlers.length; i++) {
        handlers[i].call(this, event);
      }
    }
  };

  return this;
}).call({});

/**
 * Once the webstrate loaded, receive the WebstratesEventManager object from
 * the parent window. Thereby all windows in the webstrate have access to
 * the same WebstratesEventManager object.
 */
webstrate.on('loaded', function () {
  if (!window.parent) {
    window.WebstratesEventManager = WebstratesEventManager;
  }
  else {
    window.WebstratesEventManager = window.parent.WebstratesEventManager;
  }
});