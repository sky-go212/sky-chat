import { CODE_FORMATS } from './constants.js';

export function isValidCode(code) {
  return CODE_FORMATS.UTAMA.test(code) || CODE_FORMATS.USR.test(code);
}

export function isAdminCode(code) {
  return code?.startsWith('ADMIN-') || false;
}

export function isUtamaCode(code) {
  return CODE_FORMATS.UTAMA.test(code);
}

export function isKontakCode(code) {
  return CODE_FORMATS.USR.test(code);
}
