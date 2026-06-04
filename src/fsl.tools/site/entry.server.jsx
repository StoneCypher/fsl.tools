import React from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './app.jsx';

/** Render the homepage to a hydratable HTML string (build-time only). */
export function render() {
  return renderToString(<App/>);
}
