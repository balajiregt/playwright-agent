import { createHash } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');

export async function confinedFile(root: string, relative: string) {
  const realRoot = await realpath(root);
  const target = await realpath(path.resolve(root, relative));
  if (!target.startsWith(realRoot + path.sep)) throw new Error('File is outside the declared evidence root');
  if (!['.ts', '.json', '.yml', '.yaml', '.md'].includes(path.extname(target)) || path.basename(target).startsWith('.')) {
    throw new Error('Unsupported evidence file type');
  }
  return target;
}
