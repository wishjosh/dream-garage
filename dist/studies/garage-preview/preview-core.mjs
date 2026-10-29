import {normalizeSave} from '../../garage-core.mjs';
export {createPreviewSession} from '../../garage-preview-core.mjs';
export const PREVIEW_CATEGORIES=['paint','wheels'];
export function createDemoSave(){return normalizeSave({version:1,coins:700,owned:['paint-mint','wheels-gold']});}
