#!/usr/bin/env node
/**
 * Dev server for M-Lab Speed Test
 *
 * - Does a full initial build (staging env)
 * - Watches src/ for changes and incrementally syncs them to dist/
 *   (skips the slow Sentry bundle on incremental rebuilds)
 * - Serves dist/ on http://localhost:8080
 *
 * Usage:  npm run dev
 */

'use strict';

const fs      = require('fs');
const http    = require('http');
const path    = require('path');

const ROOT         = path.join(__dirname, '..');
const SRC          = path.join(ROOT, 'src');
const DIST         = path.join(ROOT, 'dist');
const NODE_MODULES = path.join(ROOT, 'node_modules');

const PORT = process.env.PORT || 8069;

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
  '.otf':  'font/otf',
  '.pdf':  'application/pdf',
  '.pot':  'text/plain',
  '.po':   'text/plain',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function relSrc(full) {
  return path.relative(SRC, full);
}

// ── Full initial build ────────────────────────────────────────────────────────

function fullBuild() {
  console.log('[dev] Full build...');

  if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });

  copyDir(SRC, DIST);
  copyDir(path.join(SRC, 'assets', 'fonts'), path.join(DIST, 'fonts'));

  // Translations
  const convertTranslations = require('./po-to-json');
  convertTranslations(path.join(DIST, 'translations'));

  // Libraries
  const libDest = path.join(DIST, 'libraries');
  fs.mkdirSync(libDest, { recursive: true });
  const ndt7Pkg = path.join(NODE_MODULES, '@m-lab', 'ndt7', 'src');
  copyFile(path.join(ndt7Pkg, 'ndt7.js'),                 path.join(libDest, 'ndt7.js'));
  copyFile(path.join(ndt7Pkg, 'ndt7-upload-worker.js'),   path.join(libDest, 'ndt7-upload-worker.js'));
  copyFile(path.join(ndt7Pkg, 'ndt7-download-worker.js'), path.join(libDest, 'ndt7-download-worker.js'));
  const msakPkg = path.join(NODE_MODULES, '@m-lab', 'msak', 'dist');
  copyFile(path.join(msakPkg, 'msak.min.js'), path.join(libDest, 'msak.min.js'));

  // Sentry bundle (only on full build — slow)
  const esbuild = require('esbuild');
  esbuild.buildSync({
    entryPoints: [path.join(SRC, 'js', 'sentry-entry.js')],
    bundle: true,
    minify: false,          // faster in dev
    outfile: path.join(DIST, 'js', 'sentry.bundle.js'),
    format: 'iife',
  });

  // env.js — always staging in dev
  fs.writeFileSync(
    path.join(DIST, 'js', 'env.js'),
    `const mlabEnvName = "staging";\nconst mlabSentryDsn = "";\n`
  );

  console.log('[dev] Build complete.\n');
}

// ── Incremental file sync ─────────────────────────────────────────────────────

// Debounce map: srcPath → timer
const debounceMap = new Map();

function onSrcChange(eventType, srcFilePath) {
  // Ignore directory events and non-existent paths (vim swapfiles etc.)
  try {
    const stat = fs.statSync(srcFilePath);
    if (stat.isDirectory()) return;
  } catch {
    return; // file was deleted or temp file — skip
  }

  // Debounce 80 ms to coalesce rapid editor saves
  if (debounceMap.has(srcFilePath)) {
    clearTimeout(debounceMap.get(srcFilePath));
  }
  debounceMap.set(srcFilePath, setTimeout(() => {
    debounceMap.delete(srcFilePath);
    syncFile(srcFilePath);
  }, 80));
}

function syncFile(srcFilePath) {
  const rel      = relSrc(srcFilePath);
  const destPath = path.join(DIST, rel);

  try {
    copyFile(srcFilePath, destPath);
    const ts = new Date().toLocaleTimeString();
    console.log(`[dev] ${ts}  updated → dist/${rel}`);
  } catch (err) {
    console.error(`[dev] Failed to sync ${rel}:`, err.message);
  }
}

function watchSrc() {
  // fs.watch with recursive works on macOS and Windows
  fs.watch(SRC, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    onSrcChange(eventType, path.join(SRC, filename));
  });
  console.log(`[dev] Watching src/ for changes…`);
}

// ── HTTP server ───────────────────────────────────────────────────────────────

function serveFile(res, filePath, urlPath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Try index.html fallback for directory URLs
      if (err.code === 'ENOENT' || err.code === 'EISDIR') {
        const fallback = path.join(filePath, 'index.html');
        fs.readFile(fallback, (err2, data2) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end(`404 Not Found: ${urlPath}`);
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data2);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
      return;
    }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

function startServer() {
  const server = http.createServer((req, res) => {
    // Strip query string
    let urlPath = req.url.split('?')[0];

    // Decode URI and normalise
    try { urlPath = decodeURIComponent(urlPath); } catch {}
    urlPath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');

    let filePath = path.join(DIST, urlPath);
    serveFile(res, filePath, urlPath);
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[dev] Serving  →  http://localhost:${PORT}\n`);
  });
}

// ── Entry point ───────────────────────────────────────────────────────────────

fullBuild();
watchSrc();
startServer();
