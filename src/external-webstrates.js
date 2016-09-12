/**
 * Returns true if ECMA2015 is supported by the browser.
 */
const isECMA2015Supported = function () {
  return ("fetch" in window);
}

const selector = 'wscript[type="webstrate/javascript"],wlink[type="webstrate/css"]';

// Wait for main webstrate to be loaded.
webstrate.on("loaded", () => {
  // console.debug('webstrates external script library loaded document=%o, window=%o', document, window.location.href);

  let currentLoadOrderIndex = -1;
  const iframeQueue = [];

  // Add transient container to load external scripts.
  const transient = document.createElement('transient');
  transient.setAttribute('type', 'webstrates-external-scripts');

  // Hide external webstrates
  transient.style.display = 'none';

  const body = document.querySelector('body');
  body.appendChild(transient);

  // Listen to any webstrate that is transcluded in the current window. If the
  // transcluded webstrate is a webstrate loaded by definition of a <wscript />
  // tag, then the content in the #webstrate element is received, eventually
  // transformed using babel, and executed in the window context.
  webstrate.on('transcluded', webstrateId => {
    // console.debug(`transcluded ${webstrateId} in ${window.location.href}`);

    const iframe = document.querySelector('transient iframe[webstrate-id="' + webstrateId + '"]');
    if (iframe) {
      console.log('loaded %o', webstrateId);
      const loadOrder = parseInt(iframe.getAttribute('load-order'));

      if ((currentLoadOrderIndex + 1) >= loadOrder) {
        ++currentLoadOrderIndex;
        execute(iframe);

        for (let i = 0; i < iframeQueue.length; i++) {
          const iframe = iframeQueue[i];
          const loadOrder = parseInt(iframe.getAttribute('load-order'));
          if ((currentLoadOrderIndex + 1) >= loadOrder) {
            ++currentLoadOrderIndex;
            iframeQueue.splice(i, 1);
            --i;
            execute(iframe);
          }
        }
      }
      else {
        // Content loaded but has to be queued because its off loading order.
        iframeQueue.push(iframe);
      }
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
    const contentId = iframe.getAttribute('content-id');

    console.log('executing %o', webstrateId);

    const contentElement = frameDocument.querySelector(`#${contentId}`);
    if (!contentElement) {
      console.warn(`Element pre#${contentId} in webstrate ${webstrateId} not found. Ignore loading contents.`);
      return;
    }

    // Add the content of the external webstrate inside of the script/link element and within a transient element so it
    // does not get synced with sharedb.
    const sourceElement = iframe.sourceElement;
    const container = document.createElement("transient");
    sourceElement.appendChild(container);

    let content = frameDocument.querySelector(`#${contentId}`).innerText;
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
  const executeJavaScript = function (webstrateId, container, content) {

    const script = document.createElement("script");
    container.appendChild(script);

    // Add sourcemap functionality to script
    content = `${content}\n//# sourceURL=${webstrateId}`;

    if (!isECMA2015Supported() && Babel) {
      // console.debug(`Transforming content to XXX compatible JavaScript.`);
      content = Babel.transform(content, { presets: ['es2015'] }).code;
    }

    // window.eval.call(window, content); // It seems that script.innerHTML already evals the content. Great! No explicit eval needed.
    script.innerHTML = content;
  };

  /**
   * @param  {} content
   */
  const executeCss = function (webstrateId, container, content, target) {

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

    // Create an observer instance to listen for changes on the external webstrate.
    const observer = new MutationObserver(mutations => {
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
  const loadExternalWebstrates = function (externalWebstrates) {
    for (let i = 0; i < externalWebstrates.length; i++) {
      let externalWebstrate = externalWebstrates[i];

      const src = externalWebstrate.getAttribute('src');

      // Get only webstrate id if webstrate script is defined with as absolute or relative path.
      let webstrateId = src;
      let idx;
      if ((idx = webstrateId.lastIndexOf('/')) > -1) {
        webstrateId = webstrateId.substring(idx + 1, webstrateId.length);
      }

      const contentType = externalWebstrate.getAttribute('type');
      if (!contentType) {
        console.warn(`Missing content type attribute on ${webstrateId} reference. It should either be type="webstrate/javascript" or type="webstrate/css".`);
        continue;
      }

      // Element that contains the script or css definition. (the content has to be plain text)
      const contentId = externalWebstrate.getAttribute('content-id') || 'webstrate';

      // Create iframe to load external script.
      const iframe = document.createElement('iframe');

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
  const externalWebstrates = document.querySelectorAll(selector);
  // console.debug(`Found ${externalWebstrates.length} external webstrates. Loading them now.`);
  loadExternalWebstrates(externalWebstrates);
});