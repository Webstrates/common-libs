// Webstrate object will be undefined on webstrate loaded as static webstrate (e.g., /webstrate?raw)
;
(function(exports) {
    if (typeof webstrate !== 'undefined') {

        // External webstrates count.
        let externalWebstratesCount = 0;

        /**
         * Fire external webstrates loaded event on window.
         */
        const fireExternalWebstratesLoaded = function() {
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
        const isECMA2015Supported = function() {
            return ("fetch" in window);
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

                // console.log('add iframe at index %i', index);
                if (index < 0) {
                    this._queue.push(iframe);
                } else {
                    this._queue.splice(index, 0, iframe);
                }

                // this.print();
            }

            remove(iframe) {
                let idx;
                if ((idx = idx = this._queue.indexOf(iframe)) > -1) {
                    this._queue.splice(idx, 1);
                }

                // this.print();
            }

            forEach(func) {
                return this._queue.forEach(func);
            }

            get length() {
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
        }

        const externalWebstrateSelector = 'script[type="webstrate/javascript"],link[type="webstrate/css"],wscript[type="webstrate/javascript"],wlink[type="webstrate/css"]';

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

            // Add transient container to load external scripts.
            const transient = document.createElement('transient');
            transient.setAttribute('type', 'external-webstrates-iframes');

            // Hide external webstrates
            transient.style.display = 'none';

            // Append container to load external webstrates.
            document.body.appendChild(transient);

            // Listen to any webstrate that is transcluded in the current window. If the
            // transcluded webstrate is a webstrate loaded by definition of a <wscript />
            // tag, then the content in the #webstrate element is received, eventually
            // transformed using babel, and executed in the window context.
            webstrate.on("transcluded", webstrateId => {
                // console.debug(`transcluded ${webstrateId} in ${window.location.href}`);

                const getTranscludedExternalWebstrate = () => {
                    const iframes = document.querySelectorAll('transient[type="external-webstrates-iframes"] iframe[webstrate-id="' + webstrateId + '"]:not([handled="true"])');

                    let readyIframe;
                    Array.from(iframes).forEach(iframe => {
                        const iframeWindow = iframe.contentWindow;
                        if (iframeWindow.webstrate && iframeWindow.webstrate.transcluded) {
                            readyIframe = iframe;
                        }
                    });
                    return readyIframe;
                }

                const iframe = getTranscludedExternalWebstrate();
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

                // Add the content of the external webstrate inside of the script/link element and within a transient element so it
                // does not get synced with sharedb.
                const sourceElement = iframe.sourceElement;
                const container = document.createElement("transient");
                sourceElement.appendChild(container);

                // Iterate through all elements and execute their contents.
                const content = getContent(contentElements);

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
            const executeJavaScript = function(webstrateId, selector, container, content) {

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
                    content = Babel.transform(content, { presets: ['es2015'] }).code;
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
            const executeCss = function(webstrateId, selector, container, content, targets) {

                // Apply styles
                const applyStyles = (content) => {
                    // Add styles
                    style.innerHTML = content;

                    // WebKit hack :(
                    style.appendChild(document.createTextNode(""));
                }

                // Create the <style> tag
                const style = document.createElement("style");
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

                Array.from(targets).forEach(target => {

                    // Create an observer instance to listen for changes on the external webstrate.
                    const observer = new MutationObserver(mutations => {
                        // Iterate through all elements and execute their contents.
                        const content = getContent(targets);
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
            const loadExternalWebstrates = function(externalWebstrates) {

                // Number of external webstrates, which is used to trigger external webstrates loaded event.
                externalWebstratesCount = externalWebstrates.length;

                // No external webstrates to load.
                if (externalWebstratesCount === 0) {
                    fireExternalWebstratesLoaded();
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

                // Load all external webstrates in an iframe.
                Array.from(externalWebstrates).forEach((externalWebstrate, i) => {

                    let src = externalWebstrate.getAttribute('src');
                    if (externalWebstrate.tagName.toLowerCase() === "link") {
                        src = externalWebstrate.getAttribute('href');
                    }

                    // Support for legacy wscript and wlink elements.
                    if (externalWebstrate.tagName.toLowerCase() === "wscript") {
                        console.warn(`<wscript></wscript> is @deprecated. Use <script type="webstrate/javascript" src="${src}"></script> for element %o.`, externalWebstrate);
                    } else if (externalWebstrate.tagName.toLowerCase() === "wlink") {
                        console.warn(`<wlink /> is @deprecated. Use <link type="webstrate/css" rel="stylesheet" href="${src}" /> for element %o.`, externalWebstrate);
                    }

                    // Get only webstrate id if webstrate script is defined with as absolute or relative path.
                    let webstrateId = src;
                    let idx;
                    if ((idx = webstrateId.lastIndexOf('/')) > -1) {
                        webstrateId = webstrateId.substring(idx + 1, webstrateId.length);
                    }

                    const contentType = externalWebstrate.getAttribute('type');
                    if (!contentType) {
                        console.warn(`Missing content type attribute on ${webstrateId} reference. It should either be type="webstrate/javascript" or type="webstrate/css".`);
                        return;
                    }

                    // Selector for element(s) that contain(s) the script(s) or css definition(s). (the content has to be plain text)
                    const selector = externalWebstrate.getAttribute('selector') || '#webstrate';

                    // Create iframe to load external script.
                    const iframe = document.createElement('iframe');

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
            const externalWebstrates = document.querySelectorAll(externalWebstrateSelector);

            // console.debug(`Found ${externalWebstrates.length} external webstrates. Loading them now.`);
            loadExternalWebstrates(externalWebstrates);

            // Export loadExternalWebstrates API.
            exports.loadExternalWebstrates = loadExternalWebstrates;
        });
    }
}).call({}, window);