'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Webstrate object will be undefined on webstrate loaded as static webstrate (e.g., /webstrate?raw)
;
(function (exports) {
    if (typeof webstrate !== 'undefined') {

        // External webstrates count.
        var externalWebstratesCount = 0;

        /**
         * Fire external webstrates loaded event on window.
         */
        var fireExternalWebstratesLoaded = function fireExternalWebstratesLoaded() {
            // Create the event.
            var event = new CustomEvent('externalwebstratesloaded', {
                bubbles: false
            });

            // target can be any Element or other EventTarget.
            window.dispatchEvent(event);
        };

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

        var externalWebstrateSelector = 'script[type="webstrate/javascript"],link[type="webstrate/css"],wscript[type="webstrate/javascript"],wlink[type="webstrate/css"]';

        var getContent = function getContent(contentElements) {
            return Array.from(contentElements).map(function (contentElement) {
                return contentElement.innerText;
            }).join('\n\n');
        };

        // Wait for main webstrate to be loaded.
        webstrate.on("loaded", function () {
            // console.debug('webstrates external script library loaded document=%o, window=%o', document, window.location.href);

            var currentLoadOrderIndex = -1;
            var iframeQueue = new LoadOrderQueue();

            // Add transient container to load external scripts.
            var transient = document.createElement('transient');
            transient.setAttribute('type', 'external-webstrates-iframes');

            // Hide external webstrates
            transient.style.display = 'none';

            // Append container to load external webstrates.
            document.body.appendChild(transient);

            // Listen to any webstrate that is transcluded in the current window. If the
            // transcluded webstrate is a webstrate loaded by definition of a <wscript />
            // tag, then the content in the #webstrate element is received, eventually
            // transformed using babel, and executed in the window context.
            webstrate.on("transcluded", function (webstrateId) {
                // console.debug(`transcluded ${webstrateId} in ${window.location.href}`);

                var getTranscludedExternalWebstrate = function getTranscludedExternalWebstrate() {
                    var iframes = document.querySelectorAll('transient[type="external-webstrates-iframes"] iframe[webstrate-id="' + webstrateId + '"]:not([handled="true"])');

                    var readyIframe = void 0;
                    Array.from(iframes).forEach(function (iframe) {
                        var iframeWindow = iframe.contentWindow;
                        if (iframeWindow.webstrate && iframeWindow.webstrate.transcluded) {
                            readyIframe = iframe;
                        }
                    });
                    return readyIframe;
                };

                var iframe = getTranscludedExternalWebstrate();
                if (iframe) {
                    iframe.setAttribute("handled", "true");

                    var loadOrder = parseInt(iframe.getAttribute('load-order'));
                    // console.log('loaded %o which has load order %i', webstrateId, loadOrder);

                    if (currentLoadOrderIndex + 1 >= loadOrder) {
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
                    } else {
                        // Content loaded but has to be queued because its off loading order.
                        iframeQueue.add(iframe);
                    }
                }

                // Check if all external webstrates have been loaded and executed.
                if (externalWebstratesCount === currentLoadOrderIndex + 1) {
                    fireExternalWebstratesLoaded();
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
                var selector = iframe.getAttribute('selector');

                // console.log('executing %o in load order %o and queue has %i', webstrateId, currentLoadOrderIndex, iframeQueue.length);
                // iframeQueue.print();

                var contentElements = frameDocument.querySelectorAll(selector);
                if (!contentElements || !contentElements.length) {
                    console.warn('No element for selector "' + selector + '" found in webstrate ' + webstrateId + '. Ignore loading contents.');
                    return;
                }

                // Add the content of the external webstrate inside of the script/link element and within a transient element so it
                // does not get synced with sharedb.
                var sourceElement = iframe.sourceElement;
                var container = document.createElement("transient");
                sourceElement.appendChild(container);

                // Iterate through all elements and execute their contents.
                var content = getContent(contentElements);

                if (content) {
                    switch (contentType) {
                        case "webstrate/javascript":
                            executeJavaScript(webstrateId, selector, container, content);
                            break;
                        case "webstrate/css":
                            executeCss(webstrateId, selector, container, content, contentElements);
                            break;
                    }
                }
            };

            /**
             * @param  {} content
             */
            var executeJavaScript = function executeJavaScript(webstrateId, selector, container, content) {

                var script = document.createElement("script");
                container.appendChild(script);

                // Add sourcemap functionality to script
                content = content + '\n//# sourceURL=' + webstrateId;

                // Append selector to sourcemap to distinguish code.
                if (selector) {
                    content += selector;
                }

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
             * TODO Optimize style replacement on mutations. Use a text node for each target in targets and then replace
             * a text node's content when the corresponding target mutates.
             */
            var executeCss = function executeCss(webstrateId, selector, container, content, targets) {

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

                // Configuration of the observer:
                var config = {
                    childList: true,
                    attributes: true,
                    characterData: true,
                    subtree: true,
                    attributeOldValue: true,
                    characterDataOldValue: true
                };

                Array.from(targets).forEach(function (target) {

                    // Create an observer instance to listen for changes on the external webstrate.
                    var observer = new MutationObserver(function (mutations) {
                        // Iterate through all elements and execute their contents.
                        var content = getContent(targets);
                        applyStyles(content);
                    });

                    // Pass in the target node, as well as the observer options
                    observer.observe(target, config);
                });
            };

            /**
             * This function loads external webstrates by creating an iframe for each script
             * and adds it to the transient tag, so it does not get persisted in sharedb.
             * 
             * @param NodeList externalWebstrates A list of external webstrates to load.
             */
            var loadExternalWebstrates = function loadExternalWebstrates(externalWebstrates) {

                // Number of external webstrates, which is used to trigger external webstrates loaded event.
                externalWebstratesCount = externalWebstrates.length;

                // No external webstrates to load.
                if (externalWebstratesCount === 0) {
                    fireExternalWebstratesLoaded();
                    return;
                }

                var maxLoadOrder = 0;
                Array.from(document.querySelectorAll('iframe[load-order]')).forEach(function (iframe) {
                    // +1 to compensate for load-order, which starts at index 0
                    var currentLoadOrder = Number(iframe.getAttribute("load-order")) + 1;
                    if (currentLoadOrder > maxLoadOrder) {
                        maxLoadOrder = currentLoadOrder;
                    }
                });

                // Load all external webstrates in an iframe.
                Array.from(externalWebstrates).forEach(function (externalWebstrate, i) {

                    var src = externalWebstrate.getAttribute('src');
                    if (externalWebstrate.tagName.toLowerCase() === "link") {
                        src = externalWebstrate.getAttribute('href');
                    }

                    // Support for legacy wscript and wlink elements.
                    if (externalWebstrate.tagName.toLowerCase() === "wscript") {
                        console.warn('<wscript></wscript> is @deprecated. Use <script type="webstrate/javascript" src="' + src + '"></script> for element %o.', externalWebstrate);
                    } else if (externalWebstrate.tagName.toLowerCase() === "wlink") {
                        console.warn('<wlink /> is @deprecated. Use <link type="webstrate/css" rel="stylesheet" href="' + src + '" /> for element %o.', externalWebstrate);
                    }

                    // Get only webstrate id if webstrate script is defined with as absolute or relative path.
                    var webstrateId = src;
                    var idx = void 0;
                    if ((idx = webstrateId.lastIndexOf('/')) > -1) {
                        webstrateId = webstrateId.substring(idx + 1, webstrateId.length);
                    }

                    var contentType = externalWebstrate.getAttribute('type');
                    if (!contentType) {
                        console.warn('Missing content type attribute on ' + webstrateId + ' reference. It should either be type="webstrate/javascript" or type="webstrate/css".');
                        return;
                    }

                    // Selector for element(s) that contain(s) the script(s) or css definition(s). (the content has to be plain text)
                    var selector = externalWebstrate.getAttribute('selector') || '#webstrate';

                    // Create iframe to load external script.
                    var iframe = document.createElement('iframe');

                    // The external webstrates load order. 
                    iframe.setAttribute('load-order', i + maxLoadOrder);

                    // The webstrate-id defines the origin of the script.
                    iframe.setAttribute('webstrate-id', webstrateId);

                    // The content-type defines external webstrates content type.
                    // TODO: Ideally the content-type attribute is set on the <pre /> element in the external webstrate that holds the actual content.
                    iframe.setAttribute('content-type', contentType);

                    // The selector defines the script or style content container in the external webstrate. It defaults
                    // to #webstrate.
                    iframe.setAttribute('selector', selector);

                    // Define the external webstrate as source.
                    iframe.setAttribute('src', src);

                    // Set external webstrate HTML element as source element for later reference.
                    iframe.sourceElement = externalWebstrate;

                    // Load external script.
                    transient.appendChild(iframe);
                });
            };

            // Get all external webstrates.
            var externalWebstrates = document.querySelectorAll(externalWebstrateSelector);

            // console.debug(`Found ${externalWebstrates.length} external webstrates. Loading them now.`);
            loadExternalWebstrates(externalWebstrates);

            // Export loadExternalWebstrates API.
            exports.loadExternalWebstrates = loadExternalWebstrates;
        });
    }
}).call({}, window);