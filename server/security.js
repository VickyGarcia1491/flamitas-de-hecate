import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + (await scrypt(password, salt, 64)).toString('hex');
}
export async function verifyPassword(password, hash) {
  const [salt, value] = hash.split(':');
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(value, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export const tokenHash = value => createHash('sha256').update(value).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
export function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
export function text(value, max = 300, required = true) {
  if (typeof value !== 'string' || value.length > max || /[<>\u0000-\u001f]/.test(value) || (required && !value.trim())) fail('Revisá los campos: hay texto vacío, demasiado largo o caracteres no permitidos.');
  return value.trim();
}
export function email(value) {
  value = text(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail('Ingresá un email válido.');
  return value;
}
export function password(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) fail('La contraseña debe tener entre 12 y 128 caracteres.');
  return value;
}
export function validateTree(value, key = '') {
  if (typeof value === 'string') {
    if (key === 'imagen') {
      if (value.length > 2800000 || !(/^[^<>"\\/:]+\.(jpeg|jpg|png|webp|gif)$/i.test(value) || /^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(value))) fail('Usá una imagen JPG, PNG, WEBP o GIF de hasta 2 MB.');
    } else if (value.length > 10000 || /[<>\u0000]/.test(value)) fail('Hay caracteres no permitidos en los datos.');
  } else if (Array.isArray(value)) value.forEach(v => validateTree(v, key));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => validateTree(v, k));
  else if (typeof value === 'number' && !Number.isFinite(value)) fail('Número no válido.');
}
