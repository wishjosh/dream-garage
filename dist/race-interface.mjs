import {installGrandTouringHud} from './studies/controls-hud/gt-hud.mjs?v=racing-pedals-1';

export function installRaceHud() {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./studies/controls-hud/controls.css', import.meta.url).href;
  document.head.append(stylesheet);

  document.body.dataset.controlsDesign = 'gt';
  document.body.setAttribute('data-study-button-pedals', '');
  return installGrandTouringHud();
}
