// CRM-Scale server. Faults require CRM_SCALE_BENCHMARK=1 and a known CRM_SCALE_FAULT.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApi } from './api.mjs';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const port = Number(process.env.PORT ?? 4300);
const fault = process.env.CRM_SCALE_FAULT || null;
if (fault && process.env.CRM_SCALE_BENCHMARK !== '1') throw new Error('Faults require CRM_SCALE_BENCHMARK=1');
const api = createApi({ fault });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

http.createServer(async (req, res) => {
  try {
    if (await api(req, res)) return;
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    const file = pathname.startsWith('/assets/') && !pathname.includes('..') ? path.join(publicDir, pathname) : path.join(publicDir, 'index.html');
    const data = await fs.readFile(file);
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`CRM-Scale on http://127.0.0.1:${port}${fault ? ` (fault: ${fault})` : ''}`));
