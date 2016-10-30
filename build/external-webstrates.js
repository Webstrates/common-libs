'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Webstrate object will be undefined on webstrate loaded as static webstrate (e.g., /webstrate?static)
if (typeof webstrate !== 'undefined') {
    (function () {

        /**
         * Returns true if ECMA2015 is supported by the browser.
         */
        var isECMA2015Supported = function isECMA2015Supported() {
            return "fetch" in window;
        };

        var LoadOrderQueue = function () {
            function LoadOrderQueue() {
                _classCallCheck(this, LoadOrderQueue);

                this._queue = [];
            }

            _createClass(LoadOrderQueue, [{
                key: 'add',
                value: function add(iframe) {

                    var loadOrder = parseInt(iframe.getAttribute('load-order'));

                    var index = this._queue.findIndex(function (queuedIFrame) {
                        var queueIFrameLoadOrder = parseInt(queuedIFrame.getAttribute('load-order'));
                        return loadOrder < queueIFrameLoadOrder;
                    });

                    // console.log('add iframe at index %i', index);
                    if (index < 0) {
                        this._queue.push(iframe);
                    } else {
                        this._queue.splice(index, 0, iframe);
                    }

                    // this.print();
                }
            }, {
                key: 'remove',
                value: function remove(iframe) {
                    var idx = void 0;
                    if ((idx = idx = this._queue.indexOf(iframe)) > -1) {
                        this._queue.splice(idx, 1);
                    }

                    // this.print();
                }
            }, {
                key: 'forEach',
                value: function forEach(func) {
                    return this._queue.forEach(func);
                }
            }, {
                key: 'length',
                get: function get() {
                    return this._queue.length;
                }

                // print() {
                //   let print = '';
                //   this._queue.forEach(iframe => {
                //     const webstrateId = iframe.getAttribute('webstrate-id');
                //     const loadOrder = parseInt(iframe.getAttribute('load-order'));

                //     if (print === "") {
                //       print = `${webstrateId}=${loadOrder}`;
                //     }
                //     else {
                //       print = `${print},${webstrateId}=${loadOrder}`;
                //     }
                //   });
                //   console.log(print);
                // }

            }]);

            return LoadOrderQueue;
        }();

        var selector = 'wscript[type="webstrate/javascript"],wlink[type="webstrate/css"]';

        // Wait for main webstrate to be loaded.
        webstrate.on("loaded", function () {
            // console.debug('webstrates external script library loaded document=%o, window=%o', document, window.location.href);

            var currentLoadOrderIndex = -1;
            var iframeQueue = new LoadOrderQueue();

            // Add transient container to load external scripts.
            var transient = document.createElement('transient');
            transient.setAttribute('type', 'webstrates-external-scripts');

            // Hide external webstrates
            transient.style.display = 'none';

            var body = document.querySelector('body');
            body.appendChild(transient);

            // Listen to any webstrate that is transcluded in the current window. If the
            // transcluded webstrate is a webstrate loaded by definition of a <wscript />
            // tag, then the content in the #webstrate element is received, eventually
            // transformed using babel, and executed in the window context.
            webstrate.on('transcluded', function (webstrateId) {
                // console.debug(`transcluded ${webstrateId} in ${window.location.href}`);

                var iframe = document.querySelector('transient iframe[webstrate-id="' + webstrateId + '"]');
                if (iframe) {
                    var loadOrder = parseInt(iframe.getAttribute('load-order'));
                    // console.log('loaded %o which has load order %i', webstrateId, loadOrder);

                    if (currentLoadOrderIndex + 1 >= loadOrder) {
                        (function () {
                            ++currentLoadOrderIndex;

                            execute(iframe);

                            var executedIFrames = [];
                            iframeQueue.forEach(function (iframe, index) {
                                var loadOrder = parseInt(iframe.getAttribute('load-order'));
                                if (currentLoadOrderIndex + 1 >= loadOrder) {
                                    executedIFrames.push(iframe);
                                    execute(iframe);
                                    ++currentLoadOrderIndex;
                                }
                            });

                            executedIFrames.forEach(function (iframe) {
                                iframeQueue.remove(iframe);
                            });
                        })();
                    } else {
                        // Content loaded but has to be queued because its off loading order.
                        iframeQueue.add(iframe);
                    }
                }
            });

            /**
             * Execute external webstrate content loaded with iframe.
             * 
             * @param HTMLIFrameElement Iframe element, which was used to load external webstrate content.
             */
            var execute = function execute(iframe) {
                var frameDocument = iframe.contentDocument;
                var webstrateId = iframe.getAttribute('webstrate-id');
                var contentType = iframe.getAttribute('content-type');
                var contentId = iframe.getAttribute('content-id');

                // console.log('executing %o in load order %o and queue has %i', webstrateId, currentLoadOrderIndex, iframeQueue.length);
                // iframeQueue.print();

                var contentElement = frameDocument.querySelector('#' + contentId);
                if (!contentElement) {
                    console.warn('Element pre#' + contentId + ' in webstrate ' + webstrateId + ' not found. Ignore loading contents.');
                    return;
                }

                // Add the content of the external webstrate inside of the script/link element and within a transient element so it
                // does not get synced with sharedb.
                var sourceElement = iframe.sourceElement;
                var container = document.createElement("transient");
                sourceElement.appendChild(container);

                var content = frameDocument.querySelector('#' + contentId).innerText;
                if (content) {
                    switch (contentType) {
                        case "webstrate/javascript":
                            executeJavaScript(webstrateId, container, content);
                            break;
                        case "webstrate/css":
                            executeCss(webstrateId, container, content, contentElement);
                            break;
                    }
                }
            };

            /**
             * @param  {} content
             */
            var executeJavaScript = function executeJavaScript(webstrateId, container, content) {

                var script = document.createElement("script");
                container.appendChild(script);

                // Add sourcemap functionality to script
                content = content + '\n//# sourceURL=' + webstrateId;

                if (!isECMA2015Supported() && typeof Babel !== 'undefined' && Babel.transform) {
                    // console.debug(`Transforming content to XXX compatible JavaScript.`);
                    content = Babel.transform(content, { presets: ['es2015'] }).code;
                }

                if (_typeof(window.webstrates) && window.webstrates.debug) {
                    console.debug('Executing script with %i charachters.', content.length);
                }

                var textNode = document.createTextNode(content);
                script.appendChild(textNode);
            };

            /**
             * @param  {} content
             */
            var executeCss = function executeCss(webstrateId, container, content, target) {

                // Apply styles
                var applyStyles = function applyStyles(content) {
                    // Add styles
                    style.innerHTML = content;

                    // WebKit hack :(
                    style.appendChild(document.createTextNode(""));
                };

                // Create the <style> tag
                var style = document.createElement("style");
                applyStyles(content);

                // Add the <style> element to the page
                container.appendChild(style);

                // Create an observer instance to listen for changes on the external webstrate.
                var observer = new MutationObserver(function (mutations) {
                    applyStyles(target.innerText);
                });

                // configuration of the observer:
                var config = {
                    childList: true,
                    attributes: true,
                    characterData: true,
                    subtree: true,
                    attributeOldValue: true,
                    characterDataOldValue: true
                };

                // Pass in the target node, as well as the observer options
                observer.observe(target, config);
            };

            /**
             * This function loads external webstrates by creating an iframe for each script
             * and adds it to the transient tag, so it does not get persisted in sharedb.
             * 
             * @param NodeList externalWebstrates A list of external webstrates to load.
             */
            var loadExternalWebstrates = function loadExternalWebstrates(externalWebstrates) {
                for (var i = 0; i < externalWebstrates.length; i++) {
                    var externalWebstrate = externalWebstrates[i];

                    var src = externalWebstrate.getAttribute('src');

                    // Get only webstrate id if webstrate script is defined with as absolute or relative path.
                    var webstrateId = src;
                    var idx = void 0;
                    if ((idx = webstrateId.lastIndexOf('/')) > -1) {
                        webstrateId = webstrateId.substring(idx + 1, webstrateId.length);
                    }

                    var contentType = externalWebstrate.getAttribute('type');
                    if (!contentType) {
                        console.warn('Missing content type attribute on ' + webstrateId + ' reference. It should either be type="webstrate/javascript" or type="webstrate/css".');
                        continue;
                    }

                    // Element that contains the script or css definition. (the content has to be plain text)
                    var contentId = externalWebstrate.getAttribute('content-id') || 'webstrate';

                    // Create iframe to load external script.
                    var iframe = document.createElement('iframe');

                    // The external webstrates load order. 
                    iframe.setAttribute('load-order', i);

                    // The webstrate-id defines the origin of the script.
                    iframe.setAttribute('webstrate-id', webstrateId);

                    // The content-type defines external webstrates content type.
                    // TODO: Ideally the content-type attribute is set on the <pre /> element in the external webstrate that holds the actual content.
                    iframe.setAttribute('content-type', contentType);

                    // The content-id defines the script content container in the extenal script webstrate. It defaults
                    // to #webstrate.
                    iframe.setAttribute('content-id', contentId);

                    // Define the external webstrate as source.
                    iframe.setAttribute('src', src);

                    // Set external webstrate HTML element as source element for later reference.
                    iframe.sourceElement = externalWebstrate;

                    // Load external script.
                    transient.appendChild(iframe);
                }
            };

            // Get all external webstrates.
            var externalWebstrates = document.querySelectorAll(selector);
            // console.debug(`Found ${externalWebstrates.length} external webstrates. Loading them now.`);
            loadExternalWebstrates(externalWebstrates);
        });
    })();
}