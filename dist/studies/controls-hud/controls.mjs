import {installGrandTouringHud} from './gt-hud.mjs?v=racing-pedals-1';
export function pedalAmount(clientY, top, height) {
  return Math.max(0, Math.min(1, (top + height - 12 - clientY) / Math.max(1, height - 24)));
}

const proportionalVariants = ['precision', 'sport', 'digital'];

export function installControlsHud({canDrive}) {
  const sheet = document.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = new URL('./controls.css', import.meta.url).href;
  document.head.append(sheet);
  const designSheet = document.createElement('link');
  designSheet.rel = 'stylesheet';
  designSheet.href = new URL('./designs.css', import.meta.url).href;
  document.head.append(designSheet);
  const gt = installGrandTouringHud();
  const root = document.getElementById('drive-console');
  const pedals = [...root.querySelectorAll('button[data-drive-target]')];
  const pedalReadouts = {};
  for (const [name, selector] of [['throttle', '.gas-face'], ['brake', '.brake-face']]) {
    const value = document.createElement('span');
    value.className = 'pedal-meter';
    value.setAttribute('aria-hidden', 'true');
    value.innerHTML = '<b>0</b><small>%</small>';
    root.querySelector(selector).append(value);
    pedalReadouts[name] = value.querySelector('b');
  }
  const meters = document.createElement('div');
  meters.id = 'study-inputs';
  meters.innerHTML = '<span>가속 <b data-readout="throttle">0%</b></span><span>제동 <b data-readout="brake">0%</b></span><span>조향 <b data-readout="steer">중앙</b></span>';
  document.getElementById('hud').append(meters);
  const timing = document.createElement('p');
  timing.id = 'study-pause-time';
  document.querySelector('#pause-menu .compact').append(timing);

  let variant = 'classic';
  let proportional = false;
  const pointers = new Map();
  const levels = {throttle: 0, brake: 0};
  const release = id => {
    const pointer = pointers.get(id);
    if (!pointer) return;
    pointers.delete(id);
    levels.throttle = levels.brake = 0;
    if (pointer.element.hasPointerCapture(id)) pointer.element.releasePointerCapture(id);
  };
  function clear() {
    for (const id of [...pointers.keys()]) release(id);
    levels.throttle = levels.brake = 0;
  }
  function route(event) {
    levels.throttle = levels.brake = 0;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('button[data-drive-target]');
    if (!target || !pedals.includes(target)) return;
    const rect = target.getBoundingClientRect();
    levels[target.dataset.driveTarget] = pedalAmount(event.clientY, rect.top, rect.height);
  }
  for (const element of pedals) {
    element.addEventListener('pointerdown', event => {
      if (!proportional) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!canDrive() || (event.pointerType === 'mouse' && event.button !== 0) || pointers.size) return;
      pointers.set(event.pointerId, {element});
      element.setPointerCapture(event.pointerId);
      route(event);
    }, true);
    element.addEventListener('pointermove', event => {
      if (!pointers.has(event.pointerId)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      route(event);
    }, true);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      element.addEventListener(type, event => {
        if (!pointers.has(event.pointerId)) return;
        event.stopImmediatePropagation();
        release(event.pointerId);
      }, true);
    }
  }
  function setVariant(value, buttonPedals = false) {
    if (!['classic', 'minimal', 'precision', 'sport', 'digital', 'gt'].includes(value)) throw new Error('Unknown control design');
    clear();
    variant = value;
    proportional = !buttonPedals && proportionalVariants.includes(value);
    document.body.toggleAttribute('data-study-button-pedals', value === 'gt' || buttonPedals);
    document.body.dataset.controlsDesign = value;
    for (const pedal of pedals) {
      if (proportional) {
        pedal.setAttribute('aria-label', pedal.dataset.driveTarget === 'throttle' ? '가속량 · 아래 0% 위 100%' : '제동량 · 아래 0% 위 100%');
      } else {
        pedal.setAttribute('aria-label', pedal.dataset.driveTarget === 'throttle' ? '가속' : '브레이크');
      }
    }
  }
  function applyInput(input, steer = 0) {
    if (proportional && pointers.size) {
      input.throttle = levels.throttle;
      input.brake = levels.brake;
    }
    for (const name of ['throttle', 'brake']) {
      const amount = Math.round(Number(input[name]) * 100);
      root.style.setProperty('--' + name + '-amount', String(Number(input[name])));
      pedalReadouts[name].textContent = amount;
      meters.querySelector('[data-readout="' + name + '"]').textContent = amount + '%';
    }
    gt.input(input, steer);
    const steering = Math.round(Math.abs(steer) * 100);
    meters.querySelector('[data-readout="steer"]').textContent = steering < 1 ? '중앙' : (steer > 0 ? '좌 ' : '우 ') + steering + '%';
    timing.textContent = '주행 시간 ' + document.getElementById('time').textContent;
  }
  setVariant('classic');
  addEventListener('blur', clear);
  addEventListener('resize', clear);
  addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  return {
    frozen: true, setVariant, applyInput, clear,
    updateTelemetry: gt.update,
    snapshot: () => ({variant, pointers: pointers.size, levels: {...levels}})
  };
}
