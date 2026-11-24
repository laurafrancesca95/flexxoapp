// De brandbook-componenten (bundle.js) lezen React van window.React.
// Dit bestand moet vóór bundle.js geïmporteerd worden.
import * as React from "react";

declare global {
  interface Window {
    React: typeof React;
  }
}

window.React = React;
