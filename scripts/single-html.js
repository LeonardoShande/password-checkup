#!/usr/bin/env node
'use strict';

/**
 * Genera versiones en UN SOLO archivo .html (CSS, JS, datos y logo incluidos), que se abren
 * directamente con doble clic o desde el celular, sin servidor ni conexión para la app.
 *
 *   npm run html   ->  dist/offline/password-checkup.html  y  dist/offline/laboratorio.html
 *
 * Requiere haber ejecutado antes `npm run static` (usa sus datos de /api).
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'dist', 'site');
const OUT = path.join(ROOT, 'dist', 'offline');
const PUB = path.join(ROOT, 'public');
const SRC = path.join(ROOT, 'src');

const read = (p) => fs.readFileSync(p, 'utf8');
// Evita que el contenido cierre accidentalmente la etiqueta <script> o <style>.
const safe = (s) => s.replace(/<\/(script|style)/gi, '<\\/$1');
const inlineJs = (code) => '<script>\n' + safe(code) + '\n</script>';
const inlineCss = (code) => '<style>\n' + safe(code) + '\n</style>';

function replaceLinkCss(html, href, css) {
  const tag = `<link rel="stylesheet" href="${href}">`;
  if (!html.includes(tag)) throw new Error('No encuentro ' + tag);
  return html.replace(tag, () => inlineCss(css));
}
function replaceScript(html, src, code) {
  const tag = `<script src="${src}"></script>`;
  if (!html.includes(tag)) throw new Error('No encuentro ' + tag);
  return html.replace(tag, () => inlineJs(code));
}
function replaceAll(html, from, to) {
  if (!html.includes(from)) throw new Error('No encuentro ' + from);
  return html.split(from).join(to);
}

function favicon() {
  return 'data:image/svg+xml,' + encodeURIComponent(read(path.join(PUB, 'favicon.svg')));
}

function buildApp() {
  let html = read(path.join(PUB, 'index.html'));
  html = replaceLinkCss(html, '/styles.css', read(path.join(PUB, 'styles.css')));
  html = replaceLinkCss(html, '/lab.css', read(path.join(PUB, 'lab.css')));
  html = replaceAll(html, '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    `<link rel="icon" href="${favicon()}" type="image/svg+xml">`);
  html = replaceScript(html, '/theme.js', read(path.join(PUB, 'theme.js')));
  html = replaceScript(html, '/ascii.js', read(path.join(PUB, 'ascii.js')));
  html = replaceScript(html, '/intro.js', read(path.join(PUB, 'intro.js')));
  html = replaceScript(html, '/sound.js', read(path.join(PUB, 'sound.js')));
  html = replaceScript(html, '/shared/scoring.js', read(path.join(SRC, 'scoring.js')));
  html = replaceScript(html, '/shared/attacks.js', read(path.join(SRC, 'attacks.js')));
  html = replaceScript(html, '/shared/urlcheck.js', read(path.join(SRC, 'urlcheck.js')));
  html = replaceScript(html, '/art.js', read(path.join(PUB, 'art.js')));

  // Datos de la API, incrustados. app.js los lee en lugar de pedirlos al servidor.
  const data = {
    '/api/content': JSON.parse(read(path.join(SITE, 'api', 'content'))),
    '/api/demo/session': JSON.parse(read(path.join(SITE, 'api', 'demo', 'session'))),
    '/api/demo/logs': JSON.parse(read(path.join(SITE, 'api', 'demo', 'logs'))),
  };
  const dataScript = '<script>window.SEC_OFFLINE=' + safe(JSON.stringify(data)) + ';</script>';

  // app.js: si hay datos incrustados, no hace peticiones de red (solo cambia getJson).
  let app = read(path.join(PUB, 'app.js'));
  const marker = 'function getJson(url) {';
  if (!app.includes(marker)) throw new Error('No encuentro getJson en app.js');
  app = app.replace(marker, marker + "\n    if (window.SEC_OFFLINE && Object.prototype.hasOwnProperty.call(window.SEC_OFFLINE, url)) {\n      return Promise.resolve(window.SEC_OFFLINE[url]);\n    }");
  html = replaceAll(html, '<script src="/app.js"></script>', dataScript + '\n' + inlineJs(app));

  // Enlaces: el laboratorio es el otro archivo, en la misma carpeta.
  html = replaceAll(html, 'href="/lab.html', 'href="laboratorio.html');
  html = html.replace(/<script src="\/[^"]+"><\/script>/g, () => { throw new Error('Quedó un script externo'); });
  html = html.replace(/<link rel="stylesheet" href="\/[^"]+">/g, () => { throw new Error('Quedó un CSS externo'); });
  return html;
}

function buildLab() {
  let html = read(path.join(PUB, 'lab.html'));
  html = replaceLinkCss(html, '/styles.css', read(path.join(PUB, 'styles.css')));
  html = replaceLinkCss(html, '/lab.css', read(path.join(PUB, 'lab.css')));
  html = replaceAll(html, '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    `<link rel="icon" href="${favicon()}" type="image/svg+xml">`);
  html = replaceScript(html, '/theme.js', read(path.join(PUB, 'theme.js')));
  html = replaceScript(html, '/ascii.js', read(path.join(PUB, 'ascii.js')));
  html = replaceScript(html, '/sound.js', read(path.join(PUB, 'sound.js')));
  html = replaceScript(html, '/lab.js', read(path.join(PUB, 'lab.js')));
  html = replaceAll(html, 'href="/"', 'href="password-checkup.html"');
  html = html.replace(/<script src="\/[^"]+"><\/script>/g, () => { throw new Error('Quedó un script externo en el laboratorio'); });
  return html;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'password-checkup.html'), buildApp());
fs.writeFileSync(path.join(OUT, 'laboratorio.html'), buildLab());
console.log('Listo: dist/offline/password-checkup.html y dist/offline/laboratorio.html');
