'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../server');
const content = require('../src/content');

function start(options) {
  const server = createApp(options);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}`, port });
    });
  });
}

const stop = (server) => new Promise((resolve) => server.close(resolve));

// fetch normaliza "../"; http.get permite enviar la ruta cruda.
function rawGet(port, rawPath) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: rawPath }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

test('sirve la página y los assets con las cabeceras de seguridad', async () => {
  const { server, base } = await start();
  try {
    for (const p of ['/', '/styles.css', '/app.js', '/theme.js', '/intro.js', '/art.js', '/ascii.js', '/sound.js', '/lab.html', '/lab.js', '/lab.css', '/logo.svg', '/favicon.svg',
      '/shared/scoring.js', '/shared/attacks.js', '/shared/urlcheck.js']) {
      const res = await fetch(base + p);
      assert.equal(res.status, 200, p);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
      assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
      assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
      assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
    }
    const html = await (await fetch(base + '/')).text();
    assert.match(html, /Check-up de contraseñas/);
    assert.doesNotMatch(html, /<script>[^<]/, 'no debe haber scripts inline (CSP)');
  } finally { await stop(server); }
});

test('/api/content devuelve todas las secciones con lo necesario', async () => {
  const { server, base } = await start();
  try {
    const data = await (await fetch(base + '/api/content')).json();
    assert.equal(data.sections.length, content.sections.length);
    const ids = data.sections.map((s) => s.id);
    for (const needed of ['brute-force', 'leaks', 'phishing', 'cookies', 'logs', 'defense']) {
      assert.ok(ids.includes(needed), needed);
    }
    for (const s of data.sections) {
      assert.ok(s.title && s.summary && s.details.length, s.id);
      for (const l of s.links || []) assert.match(l.url, /^https:\/\//);
    }
    assert.equal(new Set(ids).size, ids.length, 'ids únicos');
  } finally { await stop(server); }
});

test('el motor de puntaje del navegador es el mismo archivo que usan los tests', async () => {
  const { server, base } = await start();
  try {
    const served = await (await fetch(base + '/shared/scoring.js')).text();
    assert.match(served, /window|root\.PasswordScoring/);
    assert.match(served, /function analyze/);
  } finally { await stop(server); }
});

test('demo de cookies: HttpOnly en la protegida y no en la descuidada', async () => {
  const { server, base } = await start();
  try {
    const res = await fetch(base + '/api/demo/session');
    assert.equal(res.status, 200);
    const setCookie = res.headers.getSetCookie();
    assert.equal(setCookie.length, 2);
    const sid = setCookie.find((c) => c.startsWith('demo_sid='));
    const prefs = setCookie.find((c) => c.startsWith('demo_prefs='));
    assert.match(sid, /HttpOnly/);
    assert.match(sid, /SameSite=Strict/);
    assert.doesNotMatch(prefs, /HttpOnly/);

    const data = await res.json();
    const realSid = sid.split(';')[0].split('=')[1];
    assert.doesNotMatch(JSON.stringify(data), new RegExp(realSid), 'el valor de la cookie HttpOnly no debe repetirse en el cuerpo');
  } finally { await stop(server); }
});

test('registro: guarda lo mínimo, sin query string, y solo muestra las entradas propias', async () => {
  const { server, base } = await start();
  try {
    await fetch(base + '/?password=SuperSecreta123&user=ana');
    await fetch(base + '/api/content');
    const body = await (await fetch(base + '/api/demo/logs')).json();
    const text = JSON.stringify(body);

    assert.ok(body.entries.some((e) => e.path === '/api/content'));
    assert.ok(body.entries.every((e) => /^[0-9a-f]{8}$/.test(e.ip)), 'IP anonimizada');
    assert.doesNotMatch(text, /SuperSecreta123/);
    assert.doesNotMatch(text, /password=/);
    assert.doesNotMatch(text, /127\.0\.0\.1/);
  } finally { await stop(server); }
});

test('rechaza métodos que no sean GET/HEAD y rutas inexistentes', async () => {
  const { server, base } = await start();
  try {
    const post = await fetch(base + '/api/content', { method: 'POST', body: 'password=abc' });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get('allow'), 'GET, HEAD');
    assert.equal((await fetch(base + '/api/nada')).status, 404);
    assert.equal((await fetch(base + '/no-existe.html')).status, 404);
    // No existe un endpoint que reciba contraseñas.
    assert.equal((await fetch(base + '/api/analyze', { method: 'POST', body: 'x' })).status, 405);
  } finally { await stop(server); }
});

test('no permite salir de public/ (path traversal) ni leer dotfiles', async () => {
  const { server, port } = await start();
  try {
    for (const p of ['/../package.json', '/..%2f..%2fpackage.json', '/%2e%2e/server.js', '/..%5c..%5cserver.js', '/.env', '/a/%00b']) {
      const r = await rawGet(port, p);
      assert.notEqual(r.status, 200, p);
      assert.doesNotMatch(r.body, /"name": "password-checkup"|createApp/, p);
    }
    assert.equal((await rawGet(port, '//evil.example/x')).status, 400);
  } finally { await stop(server); }
});

test('limita las peticiones a /api/* por IP (429 + Retry-After)', async () => {
  const { server, base } = await start({ rateMax: 5, rateWindowMs: 60_000 });
  try {
    const statuses = [];
    for (let i = 0; i < 8; i++) statuses.push((await fetch(base + '/api/health')).status);
    assert.deepEqual(statuses.slice(0, 5), [200, 200, 200, 200, 200]);
    assert.equal(statuses[5], 429);
    const limited = await fetch(base + '/api/health');
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    // Los archivos estáticos no cuentan para el límite.
    assert.equal((await fetch(base + '/')).status, 200);
  } finally { await stop(server); }
});

test('solo se exponen los módulos compartidos de la lista blanca (no el resto de src/ ni el servidor)', async () => {
  const { server, base, port } = await start();
  try {
    for (const p of ['/shared/content.js', '/shared/server.js', '/shared/../server.js', '/src/content.js', '/server.js', '/package.json']) {
      const r = await rawGet(port, p);
      assert.notEqual(r.status, 200, p);
    }
    assert.equal((await fetch(base + '/shared/urlcheck.js')).status, 200);
  } finally { await stop(server); }
});

test('HSTS solo se envía cuando la conexión es HTTPS (detrás de un proxy de confianza)', async () => {
  const { server, base } = await start({ trustProxy: true });
  try {
    const plain = await fetch(base + '/');
    assert.equal(plain.headers.get('strict-transport-security'), null);
    const secure = await fetch(base + '/', { headers: { 'x-forwarded-proto': 'https' } });
    assert.match(secure.headers.get('strict-transport-security'), /max-age=31536000/);
  } finally { await stop(server); }
});

test('/api/content incluye los grupos y la sección avanzada de web real', async () => {
  const { server, base } = await start();
  try {
    const data = await (await fetch(base + '/api/content')).json();
    const groups = new Set(data.sections.map((s) => s.group));
    assert.deepEqual([...groups].sort(), ['advanced', 'defense', 'threats']);
    assert.ok(data.sections.find((s) => s.id === 'web-real' && s.demo === 'webcheck'));
  } finally { await stop(server); }
});

test('el HTML tiene intro con pista de ESC/tap, menú lateral y no usa scripts ni estilos inline', async () => {
  const { server, base } = await start();
  try {
    const html = await (await fetch(base + '/')).text();
    assert.match(html, /id="intro"/);
    assert.match(html, /<kbd>ESC<\/kbd>[\s\S]*toca la pantalla[\s\S]*saltar/);
    assert.match(html, /class="rail"/);
    assert.match(html, /id="ascii-toggle"/);
    assert.match(html, /id="ascii-banner"/);
    assert.match(html, /id="sound-toggle"/);
    assert.match(html, /<details class="disclosure">/);
    assert.match(html, /href="\/lab\.html#sqli"/);
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/, 'sin scripts en línea (CSP)');
    for (const id of ['inicio', 'probar', 'resultados', 'amenazas', 'avanzado', 'defensa']) {
      assert.match(html, new RegExp(`id="${id}"`), id);
      assert.match(html, new RegExp(`href="#${id}"`), `menú → ${id}`);
    }
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/, 'sin <script> inline');
    assert.doesNotMatch(html, /\sstyle="/, 'sin atributos style (CSP)');
    assert.doesNotMatch(html, /\son[a-z]+="/, 'sin manejadores inline');
  } finally { await stop(server); }
});

test('página del laboratorio: pestañas, terminal y sin scripts en línea', async () => {
  const { server, base } = await start();
  try {
    const html = await (await fetch(base + '/lab.html')).text();
    for (const tab of ['diccionario', 'sqli', 'hash', 'terminal']) {
      assert.match(html, new RegExp(`id="tab-${tab}"`), tab);
      assert.match(html, new RegExp(`id="panel-${tab}"`), tab);
    }
    assert.match(html, /id="term-input"/);
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/, 'sin scripts en línea (CSP)');
    assert.doesNotMatch(html, /innerHTML/, 'el DOM se construye sin innerHTML');
  } finally {
    await stop(server);
  }
});
