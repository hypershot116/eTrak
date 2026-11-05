// Serves the production web build (dist/) with the headers expo-sqlite needs on web.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT) || 3000;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

async function find(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const base = join(root, clean);
  if (!base.startsWith(root)) return null;
  for (const p of [base, base + '.html', join(base, 'index.html')]) {
    try {
      if ((await stat(p)).isFile()) return p;
    } catch {}
  }
  return null;
}

createServer(async (req, res) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-cache');
  const { pathname } = new URL(req.url, 'http://localhost');
  const file = await find(pathname);
  if (!file) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
  res.end(await readFile(file));
}).listen(port, () => console.log(`eTrak production build: http://localhost:${port}`));
