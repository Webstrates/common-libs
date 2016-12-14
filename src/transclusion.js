// Webstrate object will be undefined on webstrate loaded as static webstrate (e.g., /webstrate?raw)
;
(function (exports) {

    // Module storage.
    const module = {
        babelConfig: {
            presets: ['es2015', 'es2016', 'es2017']
        }
    };

    if (typeof webstrate !== 'undefined') {

        const addCSSRule = (sheet, selector, rules, index = 0) => {
            if ("insertRule" in sheet) {
                sheet.insertRule(selector + "{" + rules + "}", index);
            }
            else if ("addRule" in sheet) {
                sheet.addRule(selector, rules, index);
            }
        }

        // Use it!
        addCSSRule(document.styleSheets[0], "transclude", "display: block;");
        addCSSRule(document.styleSheets[0], "transclude > transient > iframe", "display: block; width: 100%; height: 100%; border: 0;");

        // External webstrates count.
        let webstratesCount = 0;

        /**
         * Fire external webstrates loaded event on window.
         */
        const fireWebstratesTranscluded = function () {
            // Create the event.
            var event = new CustomEvent('externalwebstratesloaded', {
                bubbles: false,
            });

            // target can be any Element or other EventTarget.
            window.dispatchEvent(event);
        };

        /**
         * Returns true if ECMA2015 is supported by the browser.
         */
        const isECMA2015Supported = function () {
            return ("fetch" in window || "Promise" in window);
        }

        class LoadOrderQueue {

            constructor() {
                this._queue = [];
            }

            add(iframe) {

                const loadOrder = parseInt(iframe.getAttribute('load-order'));

                const index = this._queue.findIndex(queuedIFrame => {
                    const queueIFrameLoadOrder = parseInt(queuedIFrame.getAttribute('load-order'));
                    return loadOrder < queueIFrameLoadOrder;
                });

                if (index < 0) {
                    this._queue.push(iframe);
                } else {
                    this._queue.splice(index, 0, iframe);
                }
            }

            remove(iframe) {
                let idx;
                if ((idx = idx = this._queue.indexOf(iframe)) > -1) {
                    this._queue.splice(idx, 1);
                }
            }

            forEach(func) {
                return this._queue.forEach(func);
            }

            get length() {
                return this._queue.length;
            }
        }

        const getContent = (contentElements) => {
            return Array.from(contentElements).map(contentElement => {
                return contentElement.innerText;
            }).join('\n\n');
        }

        // Wait for main webstrate to be loaded.
        webstrate.on("loaded", () => {
            // console.debug('webstrates external script library loaded document=%o, window=%o', document, window.location.href);

            let currentLoadOrderIndex = -1;
            const iframeQueue = new LoadOrderQueue();

            // Add transient container to load webstrates.
            const transient = document.createElement('transient');
            transient.setAttribute('type', 'transcluded-webstrates');

            // Hide transcluded webstrates
            transient.style.display = 'none';

            // Append container to load webstrates.
            document.body.appendChild(transient);

            // Listen to any webstrate that is transcluded in the current window. If the
            // transcluded webstrate is a webstrate loaded by definition of a <wscript />
            // tag, then the content in the #webstrate element is received, eventually
            // transformed using babel, and executed in the window context.
            webstrate.on("transcluded", webstrateId => {
                // console.debug(`transcluded ${webstrateId} in ${window.location.href}`);

                const getTranscludedWebstrate = () => {
                    const iframes = document.querySelectorAll('transient[type="transcluded-webstrates"] iframe[webstrate-id="' + webstrateId + '"]:not([handled="true"])');

                    let readyIframe;
                    Array.from(iframes).forEach(iframe => {
                        const iframeWindow = iframe.contentWindow;
                        if (iframeWindow.webstrate && iframeWindow.webstrate.transcluded) {
                            readyIframe = iframe;
                        }
                    });
                    return readyIframe;
                }

                const iframe = getTranscludedWebstrate();
                if (iframe) {
                    iframe.setAttribute("handled", "true");

                    const loadOrder = parseInt(iframe.getAttribute('load-order'));
                    // console.log('loaded %o which has load order %i', webstrateId, loadOrder);

                    if ((currentLoadOrderIndex + 1) >= loadOrder) {
                        ++currentLoadOrderIndex;

                        execute(iframe);

                        const executedIFrames = [];
                        iframeQueue.forEach((iframe, index) => {
                            const loadOrder = parseInt(iframe.getAttribute('load-order'));
                            if ((currentLoadOrderIndex + 1) >= loadOrder) {
                                executedIFrames.push(iframe);
                                execute(iframe);
                                ++currentLoadOrderIndex;
                            }
                        });

                        executedIFrames.forEach(iframe => {
                            iframeQueue.remove(iframe);
                        });
                    } else {
                        // Content loaded but has to be queued because its off loading order.
                        iframeQueue.add(iframe);
                    }
                }

                // Check if all transcluded webstrates have been loaded and executed.
                if (webstratesCount === currentLoadOrderIndex + 1) {
                    fireWebstratesTranscluded();
                }
            });

            /**
             * Execute transcluded webstrate content loaded with iframe.
             * 
             * @param HTMLIFrameElement Iframe element, which was used to load a webstrate.
             */
            const execute = (iframe) => {
                const frameDocument = iframe.contentDocument;
                const webstrateId = iframe.getAttribute('webstrate-id');
                const contentType = iframe.getAttribute('content-type');
                const selector = iframe.getAttribute('selector');

                // console.log('executing %o in load order %o and queue has %i', webstrateId, currentLoadOrderIndex, iframeQueue.length);
                // iframeQueue.print();

                const contentElements = frameDocument.querySelectorAll(selector);
                if (!contentElements || !contentElements.length) {
                    console.warn(`No element for selector "${selector}" found in webstrate ${webstrateId}. Ignore loading contents.`);
                    return;
                }

                // Add the content of the webstrate inside of a transient element so it does not get synced with sharedb.
                const sourceElement = iframe.sourceElement;
                const container = document.createElement("transient");
                sourceElement.appendChild(container);

                switch (contentType) {
                    case "text/html":
                        transcludeAsIFrame(webstrateId, selector, container, contentElements, iframe);
                        break;
                    case "text/javascript":
                        executeJavaScript(webstrateId, selector, container, contentElements);
                        break;
                    case "text/css":
                        executeCss(webstrateId, selector, container, contentElements);
                        break;
                }
            };

            /**
             * tbd.
             * TODO This function is a proof-of-concept and needs testing.
             * 
             * @param {any} webstrateId
             * @param {any} selector
             * @param {any} container
             * @param {any} contentElements
             * @param {any} iframe
             */
            const transcludeAsIFrame = function (webstrateId, selector, container, contentElements, iframe) {

                // Apply styles
                const appendContent = (content) => {
                    container.innerHTML = "";

                    Array.from(contentElements).forEach(contentElement => {
                        Array.from(contentElement.cloneNode(true).childNodes).forEach(node => {
                            container.appendChild(node);
                        });
                    });
                }

                appendContent(contentElements);

                // Configuration of the observer:
                var config = {
                    childList: true,
                    attributes: true,
                    characterData: true,
                    subtree: true,
                    attributeOldValue: true,
                    characterDataOldValue: true
                };

                Array.from(contentElements).forEach(contentElement => {

                    // Create an observer instance to listen for changes on the transcluded webstrate.
                    const observer = new MutationObserver(mutations => {
                        appendContent(contentElements);
                    });

                    // Pass in the target node, as well as the observer options
                    observer.observe(contentElement, config);
                });
            };

            /**
             * @param  {} content
             */
            const executeJavaScript = function (webstrateId, selector, container, contentElements) {

                // Get script contents.
                let content = getContent(contentElements);

                const script = document.createElement("script");
                container.appendChild(script);

                // Add sourcemap functionality to script
                content = `${content}\n//# sourceURL=${webstrateId}`;

                // Append selector to sourcemap to distinguish code.
                if (selector) {
                    content += selector;
                }

                if (!isECMA2015Supported() && typeof Babel !== 'undefined' && Babel.transform) {
                    // console.debug(`Transforming content to XXX compatible JavaScript.`);
                    content = Babel.transform(content, module.babelConfig).code;
                }

                if (typeof window.webstrates && window.webstrates.debug) {
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
            const executeCss = function (webstrateId, selector, container, contentElements) {

                // Apply styles
                const applyStyles = (content) => {
                    // Add styles
                    style.innerHTML = content;

                    // WebKit hack :(
                    style.appendChild(document.createTextNode(""));
                }

                // Create the <style> tag
                const style = document.createElement("style");

                // Get style contents.
                const content = getContent(contentElements);
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

                Array.from(contentElements).forEach(contentElement => {

                    // Create an observer instance to listen for changes on the transcluded webstrate.
                    const observer = new MutationObserver(mutations => {
                        // Iterate through all elements and execute their contents.
                        const content = getContent(contentElements);
                        applyStyles(content);
                    });

                    // Pass in the target node, as well as the observer options
                    observer.observe(contentElement, config);
                });
            };

            /**
             * This function loads webstrates by creating an iframe for each script
             * and adds it to the transient tag, so it does not get persisted in sharedb.
             * 
             * @param NodeList transcludees A list of webstrates to load.
             */
            module.transclude = function (transcludees) {

                // Number of webstrates, which is used to trigger webstrates transcluded event.
                webstratesCount = transcludees.length;

                // No webstrate to load.
                if (webstratesCount === 0) {
                    fireWebstratesTranscluded();
                    return;
                }

                let maxLoadOrder = 0;
                Array.from(document.querySelectorAll('iframe[load-order]')).forEach(iframe => {
                    // +1 to compensate for load-order, which starts at index 0
                    const currentLoadOrder = Number(iframe.getAttribute("load-order")) + 1;
                    if (currentLoadOrder > maxLoadOrder) {
                        maxLoadOrder = currentLoadOrder;
                    }
                });

                // Load all webstrates in individual iframes.
                let i = 0;
                Array.from(transcludees).forEach(transcludee => {

                    let src = transcludee.getAttribute('src');
                    if (transcludee.tagName.toLowerCase() === "link") {
                        src = transcludee.getAttribute('href');
                    }

                    // Get only webstrate id if webstrate script is defined with as absolute or relative path.
                    let webstrateId = src;
                    let idx;
                    if ((idx = webstrateId.lastIndexOf('/')) > -1) {
                        webstrateId = webstrateId.substring(idx + 1, webstrateId.length);
                    }

                    const contentType = transcludee.getAttribute('type');
                    if (!contentType) {
                        const iframeTransient = document.createElement("transient");
                        const iframe = document.createElement('iframe');
                        iframe.setAttribute('src', src);
                        iframeTransient.appendChild(iframe);
                        transcludee.appendChild(iframeTransient);
                        return;
                    }

                    // Selector for element(s) that contain(s) the script(s) or css definition(s). (the content has to be plain text)
                    const selector = transcludee.getAttribute('selector') || '#webstrate';

                    // Create iframe to load webstrate.
                    const iframe = document.createElement('iframe');

                    // The webstrates load order. 
                    iframe.setAttribute('load-order', i + maxLoadOrder);
                    ++i;

                    // The webstrate-id defines the origin of the script.
                    iframe.setAttribute('webstrate-id', webstrateId);

                    // The content-type defines webstrates content type.
                    // TODO: Ideally the content-type attribute is set on the <pre /> element in the external webstrate that holds the actual content.
                    iframe.setAttribute('content-type', contentType);

                    // The selector defines the script or style content container in the webstrate. It defaults
                    // to #webstrate.
                    iframe.setAttribute('selector', selector);

                    // Define the webstrate as source.
                    iframe.setAttribute('src', src);

                    // Set webstrate HTML element as source element for later reference.
                    iframe.sourceElement = transcludee;

                    // Load webstrate.
                    transient.appendChild(iframe);
                });
            };

            // Get all transclude.
            const transcludees = document.querySelectorAll('transclude');

            // console.debug(`Found ${transcludees.length} webstrates. Loading them now.`);
            module.transclude(transcludees);
        });
    }

    // Export module.
    exports.Transclusion = module;

}).call({}, window);