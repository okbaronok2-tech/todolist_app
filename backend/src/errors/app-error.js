import { CODES } from './codes.js';

export class AppError extends Error {
  constructor(code, message) {
    if (!(code in CODES)) throw new Error(`unknown error code: ${code}`);
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = CODES[code];
  }
}
