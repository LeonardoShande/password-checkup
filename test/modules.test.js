'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/scoring');
const A = require('../src/attacks');
const U = require('../src/urlcheck');
const content = require('../src/content');

// ----------------------------------------------------------------- attacks
test('attacks: sin contraseña no hay nada que evaluar', () => {
  const r = A.assess(S.analyze(''));
  assert.deepEqual(r.items, []);
  assert.equal(r.headline, '');
});

test('attacks: contraseña común => riesgo alto en lo que depende de ella', () => {
  const r = A.assess(S.analyze('password'));
  const byId = Object.fromEntries(r.items.map((i) => [i.id, i]));
  assert.equal(byId.online.risk, 'alto');
  assert.equal(byId.dictionary.risk, 'alto');
  assert.equal(byId.leak.risk, 'alto');
  assert.match(r.headline, /listas de ataque/);
});

test('attacks: clave fuerte => riesgos de adivinación bajos; phishing/malware/cookies son independientes', () => {
  const r = A.assess(S.analyze('k7#Vq9!mZp2$Lx8@'));
  const byId = Object.fromEntries(r.items.map((i) => [i.id, i]));
  assert.equal(byId.online.risk, 'bajo');
  assert.equal(byId.dictionary.risk, 'bajo');
  assert.equal(byId.leak.risk, 'bajo');
  for (const id of ['phishing', 'malware', 'cookies', 'stuffing']) assert.equal(byId[id].risk, 'indep', id);
  assert.match(r.headline, /Resiste/);
});

test('attacks: si apareció en filtraciones todo lo que depende de ella pasa a alto', () => {
  const r = A.assess(S.analyze('k7#Vq9!mZp2$Lx8@'), { breachCount: 1234 });
  const byId = Object.fromEntries(r.items.map((i) => [i.id, i]));
  for (const id of ['online', 'dictionary', 'leak', 'stuffing']) assert.equal(byId[id].risk, 'alto', id);
  assert.match(r.headline, /filtraciones/);
});

test('attacks: cada item apunta a una tarjeta que existe en el contenido', () => {
  const ids = new Set(content.sections.map((s) => s.id));
  for (const item of A.assess(S.analyze('hola')).items) assert.ok(ids.has(item.card), item.card);
});

// ----------------------------------------------------------------- scoring: espacios
test('scoring: el checklist marca la falta de espacios', () => {
  const ok = S.analyze('Xk9#mQ2$vL7!').checks.find((c) => c.id === 'spaces');
  const bad = S.analyze('hola mundo').checks.find((c) => c.id === 'spaces');
  assert.equal(ok.ok, true);
  assert.equal(bad.ok, false);
});

// ----------------------------------------------------------------- urlcheck
const ids = (r) => r.checks.map((c) => `${c.level}:${c.id}`);

test('urlcheck: un sitio normal no levanta alertas', () => {
  const r = U.analyze('https://accounts.google.com/signin');
  assert.equal(r.ok, true);
  assert.equal(r.domain, 'google.com');
  assert.equal(r.risk, 'bajo');
  assert.ok(ids(r).includes('ok:https'));
  assert.ok(ids(r).includes('ok:brand'));
});

test('urlcheck: HTTP sin cifrar es grave', () => {
  const r = U.analyze('http://example.com/login');
  assert.equal(r.risk, 'alto');
  assert.ok(ids(r).includes('bad:https'));
});

test('urlcheck: dominio real escondido al final (suplantación de marca)', () => {
  for (const url of ['https://paypal.com.login-seguro.example/verificar', 'https://mail.google.com.evil.co/', 'https://secure-apple-id.xyz']) {
    const r = U.analyze(url);
    assert.equal(r.risk, 'alto', url);
    assert.ok(ids(r).includes('bad:brand'), url);
  }
});

test('urlcheck: sustituciones tipo leet y errores tipográficos', () => {
  assert.ok(ids(U.analyze('https://paypa1.com')).some((x) => x.endsWith(':brand')));
  assert.ok(ids(U.analyze('https://rnicrosoft.com')).some((x) => x.endsWith(':brand')));
  assert.ok(ids(U.analyze('https://gooogle.com')).some((x) => x.endsWith(':brand')));
});

test('urlcheck: dominios oficiales no se marcan', () => {
  for (const url of ['https://www.google.com', 'https://github.com/x', 'https://user.github.io', 'https://www.bbva.pe', 'https://www.paypal.com/signin']) {
    const r = U.analyze(url);
    assert.ok(!ids(r).some((x) => x.endsWith(':brand') && !x.startsWith('ok')), url);
    assert.equal(r.risk, 'bajo', url);
  }
});

test('urlcheck: truco de la arroba, IP, puntycode, puerto, params sensibles, esquema peligroso', () => {
  assert.ok(ids(U.analyze('https://google.com@evil.example/')).includes('bad:userinfo'));
  assert.ok(ids(U.analyze('https://203.0.113.9/login')).includes('bad:ip'));
  assert.ok(ids(U.analyze('https://192.168.1.5/')).includes('info:ip'));
  assert.ok(ids(U.analyze('https://xn--pypal-4ve.com')).includes('warn:punycode'));
  assert.ok(ids(U.analyze('https://example.com:8443/login')).includes('warn:port'));
  assert.ok(ids(U.analyze('https://example.com/login?user=a&password=secreto')).includes('bad:params'));
  const js = U.analyze('javascript:alert(1)');
  assert.equal(js.risk, 'alto');
  assert.ok(ids(js).includes('bad:scheme'));
});

test('urlcheck: acortadores, TLD de riesgo y exceso de subdominios', () => {
  assert.ok(ids(U.analyze('https://bit.ly/abc')).includes('warn:shortener'));
  assert.ok(ids(U.analyze('https://ofertas.xyz')).includes('warn:tld'));
  assert.ok(ids(U.analyze('https://a.b.c.d.example.com')).includes('warn:subdomains'));
});

test('urlcheck: sin protocolo se asume https y se avisa', () => {
  const r = U.analyze('example.com/inicio');
  assert.equal(r.ok, true);
  assert.ok(ids(r).includes('info:https'));
});

test('urlcheck: entradas inválidas devuelven error legible, sin lanzar', () => {
  for (const input of ['', '   ', 'no es una url', 'https://', 'x'.repeat(5000), null, undefined]) {
    const r = U.analyze(input);
    assert.equal(r.ok, false, String(input).slice(0, 20));
    assert.ok(r.error.length > 5);
  }
});

test('urlcheck: dominio registrable con sufijos de dos niveles', () => {
  assert.equal(U.registrableDomain('www.bbva.com.pe'), 'bbva.com.pe');
  assert.equal(U.registrableDomain('login.banco.com.estafa.xyz'), 'estafa.xyz');
  assert.equal(U.registrableDomain('example.com'), 'example.com');
});

// ----------------------------------------------------------------- contenido
test('contenido: grupos válidos, ids únicos y todo lo necesario', () => {
  const groups = new Set(['threats', 'advanced', 'defense']);
  const seen = new Set();
  for (const s of content.sections) {
    assert.ok(groups.has(s.group), `${s.id}: grupo ${s.group}`);
    assert.ok(!seen.has(s.id), `id repetido ${s.id}`);
    seen.add(s.id);
    assert.ok(s.title && s.summary && s.details.length, s.id);
    for (const b of s.details) assert.ok(['p', 'h', 'ul', 'code'].includes(b.type), `${s.id}: bloque ${b.type}`);
  }
  assert.ok(content.sections.some((s) => s.group === 'advanced' && s.demo === 'webcheck'));
});

test('contenido: las fuentes son de organismos de referencia (nada de enciclopedias abiertas)', () => {
  const allowed = content.ALLOWED_LINK_HOSTS;
  let count = 0;
  for (const s of content.sections) {
    for (const l of s.links || []) {
      count++;
      const url = new URL(l.url);
      assert.equal(url.protocol, 'https:', l.url);
      assert.ok(allowed.some((h) => url.hostname === h || url.hostname.endsWith('.' + h)), `${s.id}: dominio no permitido ${url.hostname}`);
      assert.doesNotMatch(url.hostname, /wikipedia|wikimedia|fandom|blogspot|medium\.com/, l.url);
    }
  }
  assert.ok(count >= 15);
});
