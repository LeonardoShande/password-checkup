#!/usr/bin/env node
'use strict';

/**
 * Genera una versión ESTÁTICA (sin servidor Node) para abrirla desde cualquier lugar, incluido el celular.
 *
 *   npm run static      ->  dist/site/   (carpeta lista para subir a un hosting de archivos)
 *
 * Qué hace:
 *   1. Copia public/ y los módulos compartidos de src/ (scoring, attacks, urlcheck) a dist/site/.
 *   2. Cambia las rutas absolutas (/api/…, /shared/…, /styles.css…) por relativas (./…),
 *      para que funcionen también dentro de una subcarpeta (p. ej. usuario.github.io/repo/).
 *   3. Guarda las respuestas de /api/content y de las dos demos como archivos JSON estáticos.
 *      Las demos de cookies y registros se capturan en ESTE momento: son datos de ejemplo, no tuyos.
 *
 * Límite: sin servidor no hay cabeceras de seguridad (CSP, HSTS…). La app sigue funcionando,
 * y la contraseña se analiza igualmente en el navegador: nunca se envía a ningún sitio.
 */

const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('../server');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'site');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else if (entry.isFile()) fs.copyFileSync(src, dst);
  }
}

// Reescribe rutas absolutas a relativas en los archivos de texto que las usan.
function relativize(file) {
  let s = fs.readFileSync(file, 'utf8');
  s = s.replace(/(href|src)="\//g, '$1="./').replace(/'\/api\//g, "'./api/").replace(/"\/api\//g, '"./api/');
  fs.writeFileSync(file, s);
}

async function capture(server) {
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const saved = {};
  for (const route of ['/api/content', '/api/demo/session', '/api/demo/logs']) {
    const res = await fetch(base + route, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${route} respondió ${res.status}`);
    saved[route] = await res.text();
  }
  return saved;
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  copyDir(path.join(ROOT, 'public'), OUT);
  copyDir(path.join(ROOT, 'src'), path.join(OUT, 'shared'));
  for (const f of ['scoring.js', 'attacks.js', 'urlcheck.js', 'content.js']) {
    const p = path.join(OUT, 'shared', f);
    if (!fs.existsSync(p)) throw new Error('Falta ' + f);
  }
  // Solo se publican los módulos que el navegador necesita.
  for (const f of fs.readdirSync(path.join(OUT, 'shared'))) {
    if (!['scoring.js', 'attacks.js', 'urlcheck.js'].includes(f)) fs.rmSync(path.join(OUT, 'shared', f));
  }

  for (const f of ['index.html', 'lab.html', 'app.js', 'theme.js', 'intro.js', 'art.js', 'ascii.js', 'sound.js']) {
    const p = path.join(OUT, f);
    if (fs.existsSync(p)) relativize(p);
  }

  const server = createApp({ rateMax: 1000 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let saved;
  try {
    saved = await capture(server);
  } finally {
    server.close();
  }
  const apiDir = path.join(OUT, 'api');
  fs.mkdirSync(path.join(apiDir, 'demo'), { recursive: true });
  // Sin extensión: el navegador lo lee con res.json(), así que el tipo MIME no importa.
  fs.writeFileSync(path.join(apiDir, 'content'), saved['/api/content']);
  fs.writeFileSync(path.join(apiDir, 'demo', 'session'), saved['/api/demo/session']);
  fs.writeFileSync(path.join(apiDir, 'demo', 'logs'), saved['/api/demo/logs']);

  console.log(`Sitio estático listo en ${path.relative(ROOT, OUT)}/`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
