# common-libs

## Loading External Webstrates

The common libs provide support for loading external JavaScript or CSS webstrates. In order to do so, the `external-webstrates.js` bootstrap script has to be added in a webstrate. Currently, we serve the `external-webstrates.js` via [https://rawgit.com](rawgit.com). Eventually, the bootstrap script will be part of the Webstrates core and loading it then will be obsolete.

For example:

```html
<html>
  <head>
    <!-- Bootstrap Loader - Library to load external JavaScript/CSS defined in a webstrate -->
    <script type="text/javascript" src="https://rawgit.com/Webstrates/common-libs/dev/build/external-webstrates.js"></script>
  </head>
  <body>
    ...
  </body>
</html>
```

After the `external-webstrates.js` has loaded, it will look in the `document` for `wlink[type"webstrate/css"]` and `wscript[type="webstrate/javascript"]` elements, and load the `src` as external webstrates in 'transient' `iframe`s.

The following document loads the two external webstrates `external-script.js` and `external-style.js`.

```html
<html>
  <head>
    <!-- Bootstrap Loader - Library to load external JavaScript/CSS defined in a webstrate -->
    <script type="text/javascript" src="https://rawgit.com/Webstrates/common-libs/dev/build/external-webstrates.js"></script>

    <!-- Content defined in pre#webstrate is loaded via external webstrate library and
    executed afterwards in the exact order in which the wscript/wlink tags are defined -->
    <wscript type="webstrate/javascript" src="/external-script.js"></wscript>
    <wlink type="webstrate/css" src="/external-style.css"></wlink>
  </head>
  <body>
    ...
  </body>
```

Once an `iframe` transcludes, the external script gets the content from an element with id `#webstrate`, adds this content as transient child to the respective `wlink` or `wscript` element. The `external-webstrates.js` takes care of script and style loading order. To mimic browsers' default loading behavior, all external webstrate scripts and styles are executed in the order, in which they have been defined in the document.

The following two html documents exemplify the necessary DOM structure of external webstrates. The `external-webstrates.js` executes everything in `#webstrate`.

Example of scaffolding containing JavaScript (external-script.js):

```html
<html>
  <body>
    <pre id="webstrate">
      // JavaScript content
      console.log("Hello external webstrate!");
    </pre>
  </body>
</html>
```

Example of scaffolding containing CSS (external-style.css):

```html
<html>
  <body>
    <pre id="webstrate">
      // CSS content
      body {
        background: deeppink;
      }
    </pre>
  </body>
</html>
```
  
## Contribution

Please report bugs or submit feature requests.
