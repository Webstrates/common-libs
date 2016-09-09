/**
 * Returns true if ECMA2015 is supported by the browser.
 */
var isECMA2015Supported = function () {
  return ("fetch" in window);
}

// Wait for main webstrate to be loaded.
webstrate.on("loaded", function (webstrateId, clientId, user) {

  // console.debug('webstrates external script library loaded');

  // Add transient container to load external scripts.
  const transient = document.createElement('transient');
  transient.setAttribute('type', 'webstrates-external-scripts');
  const body = document.querySelector('body');
  body.appendChild(transient);

  // Listen to any webstrate that is transcluded in the current window. If the
  // transcluded webstrate is a webstrate loaded by definition of a <wscript />
  // tag, then the content in the #webstrate element is received, eventually
  // transformed using babel, and executed in the window context.
  window.webstrate.on('transcluded', function (webstrateId) {
    const iframe = document.querySelector('transient iframe[webstrate-id="' + webstrateId + '"]');
    if (iframe) {
      const frameDocument = iframe.contentDocument;
      const contentId = iframe.getAttribute('content-id');

      const contentElement = frameDocument.querySelector(`#${contentId}`);
      if (!contentElement) {
        console.warn(`Element pre#${contentId} in webstrate ${webstrateId} not found. Ignore loading contents.`);
        return;
      }

      let content = frameDocument.querySelector(`#${contentId}`).innerText;
      if (content) {
        if (!isECMA2015Supported() && Babel) {
          console.debug(`Transforming content to XXX compatible JavaScript.`);
          content = Babel.transform(content, { presets: ['es2015'] }).code;
        }
        window.eval.call(window, content);
      }
    }
  });

  // Get all Webstrates external scripts.
  const wscripts = document.querySelectorAll('wscript[type="webstrates/javascript"]');
  console.debug(`${wscripts.length} webstrates/javascript scripts found`);

  for (let i = 0; i < wscripts.length; i++) {
    let wscript = wscripts[i];

    const src = wscript.getAttribute('src');

    // Get only webstrate id if webstrate script is defined with as absolute or relative path.
    let webstrateId = src;
    let idx;
    if ((idx = webstrateId.lastIndexOf('/')) > -1) {
      webstrateId = webstrateId.substring(idx + 1, webstrateId.length);
    }

    const contentId = wscript.getAttribute('content-id') || 'webstrate';

    // Create iframe to load external script.
    const iframe = document.createElement('iframe');

    // The webstrate-id defines the origin of the script.
    iframe.setAttribute('webstrate-id', webstrateId);

    // The content-id defines the script content container in the extenal script webstrate. It defaults
    // to #webstrate.
    iframe.setAttribute('content-id', contentId);

    // Define the external webstrate as source.
    iframe.setAttribute('src', src);

    // Hide ewbstrate
    iframe.style.display = 'none';

    // Load external script.
    transient.appendChild(iframe);
  };
});