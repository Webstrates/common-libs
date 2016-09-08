'use strict';

var EventManager = function () {

  var _eventHandlers = {};

  this.version = "0.0.1";

  /**
   * Register event handler function for a given event name.
   *  
   * @param String name Event name.
   * @param Function handler Event handler function.
   */
  this.on = function (name, handler) {

    if (typeof handler !== 'function') {
      throw new Error('handler needs to be a function');
    }

    if (!_eventHandlers[name]) {
      _eventHandlers[name] = [handler];
    } else {
      _eventHandlers[name].push(handler);
    }
  };

  /**
   * Remove handler function registered to named events.
   * 
   * @param String name Event name.
   * @param Function handler Event handler function.
   */
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

  /**
   * Trigger an event with name and an event object. Each handler function registered with
   * the event name will be called with the event object as first parameter.
   * 
   * @param String name Event name.
   * @param {} event Event object.
   */
  this.trigger = function (name, event) {
    var _this = this;

    var handlers = _eventHandlers[name];
    if (handlers) {
      handlers.forEach(function (handler) {
        handler.call(_this, event);
      });
    }
  };

  return this;
}.call({});

/**
 * Once the webstrate loaded, receive the WebstratesEventManager object from
 * the parent window. Thereby all windows in the webstrate have access to
 * the same WebstratesEventManager object.
 */
webstrate.on('loaded', function () {
  if (window.parent === window) {
    webstrate.eventManager = EventManager;
  } else {
    var parentWindow = window.parent;
    while (parentWindow && parentWindow.parent !== parentWindow) {
      parentWindow = parentWindow.parent;
    }
    webstrate.eventManager = parentWindow.webstrate.eventManager;
  }
});