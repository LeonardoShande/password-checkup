'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/scoring');

test('contraseña vacía o no-string: resultado vacío sin errores', () => {
  for (const input of ['', undefined, null, 42]) {
    const r = S.analyze(input);
    assert.equal(r.empty, true);
    assert.equal(r.score, 0);
  }
});

test('contraseñas comunes quedan "muy débil" (tope 5)', () => {
  for (const pw of ['password', 'Password', '123456', 'qwerty', 'contraseña', 'iloveyou']) {
    const r = S.analyze(pw);
    assert.ok(r.score <= 5, `${pw} -> ${r.score}`);
    assert.equal(r.isCommon, true, pw);
    assert.equal(r.level.id, 'very-weak');
  }
});

test('trucos leet sobre palabras comunes no engañan', () => {
  for (const pw of ['P@ssw0rd!', 'Password123!', 'Contraseña2024!', 'Hunter2']) {
    const r = S.analyze(pw);
    assert.ok(r.score < 25, `${pw} -> ${r.score}`);
    assert.equal(r.predictability, 'alto', pw);
  }
});

test('detecta secuencias, teclado, repeticiones, bloques y años', () => {
  const types = (pw) => S.analyze(pw).patterns.map((p) => p.type);
  assert.ok(types('xx4567yy').includes('sequence'));
  assert.ok(types('zzhgfzz').includes('sequence'));
  assert.ok(types('zz8765zz').includes('sequence'));
  // "1234" es una clave tan común que se clasifica como palabra común, no como secuencia
  assert.ok(types('xx1234yy').includes('common'));
  assert.ok(types('mmasdfmm').includes('keyboard'));
  assert.ok(types('hola!!!!').includes('repeat'));
  assert.ok(types('abcabcabc').includes('block'));
  assert.ok(types('zzz1998zzz').includes('year'));
});

test('contraseña corta nunca pasa de "débil" aunque sea aleatoria', () => {
  const r = S.analyze('Xk9#mQ');
  assert.ok(r.score <= 39);
  assert.ok(r.capReasons.length > 0);
});

test('menos de 12 caracteres no puede ser "muy fuerte"', () => {
  const r = S.analyze('k7#Vq9!mZp2');
  assert.ok(r.score <= 79);
});

test('contraseña larga y aleatoria es "muy fuerte"', () => {
  const r = S.analyze('k7#Vq9!mZp2$Lx8@');
  assert.ok(r.score >= 80, `score ${r.score}`);
  assert.equal(r.level.id, 'very-strong');
  assert.equal(r.checks.every((c) => c.ok), true);
});

test('una frase larga de palabras no comunes puntúa muy alto', () => {
  const r = S.analyze('caballo-nube-lampara-sol-trueno');
  assert.ok(r.score >= 80);
});

test('más longitud => más puntaje (mismo alfabeto, sin patrones)', () => {
  const short = S.analyze('Xk9#mQ2$').score;
  const longer = S.analyze('Xk9#mQ2$vL7!').score;
  const longest = S.analyze('Xk9#mQ2$vL7!tR5&').score;
  assert.ok(short < longer && longer < longest, `${short} < ${longer} < ${longest}`);
});

test('el puntaje siempre está entre 0 y 100 y la curva es monótona', () => {
  let prev = -1;
  for (let bits = 0; bits <= 300; bits += 5) {
    const s = S.scoreFromBits(bits);
    assert.ok(s >= 0 && s <= 100);
    assert.ok(s >= prev, `no monótona en ${bits}`);
    prev = s;
  }
  assert.equal(S.scoreFromBits(0), 0);
  assert.equal(S.scoreFromBits(1000), 100);
});

test('levelFor respeta los umbrales', () => {
  const id = (n) => S.levelFor(n).id;
  assert.equal(id(0), 'very-weak');
  assert.equal(id(19), 'very-weak');
  assert.equal(id(20), 'weak');
  assert.equal(id(39), 'weak');
  assert.equal(id(40), 'fair');
  assert.equal(id(59), 'fair');
  assert.equal(id(60), 'strong');
  assert.equal(id(79), 'strong');
  assert.equal(id(80), 'very-strong');
  assert.equal(id(100), 'very-strong');
});

test('checklist: marca lo que falta con una pista', () => {
  const r = S.analyze('hola');
  const byId = Object.fromEntries(r.checks.map((c) => [c.id, c]));
  assert.equal(byId.length.ok, false);
  assert.equal(byId.upper.ok, false);
  assert.equal(byId.digit.ok, false);
  assert.equal(byId.symbol.ok, false);
  assert.equal(byId.lower.ok, true);
  assert.ok(byId.length.hint.length > 0);
});

test('tiempos: 4 escenarios, ordenados de más lento a más rápido', () => {
  const r = S.analyze('Xk9#mQ2$vL7!');
  assert.equal(r.crackTimes.length, 4);
  const secs = r.crackTimes.map((t) => t.seconds);
  for (let i = 1; i < secs.length; i++) assert.ok(secs[i] < secs[i - 1]);
  for (const t of r.crackTimes) assert.ok(['alto', 'medio', 'bajo'].includes(t.risk));
});

test('humanTime formatea en español', () => {
  assert.equal(S.humanTime(0.2), 'al instante');
  assert.equal(S.humanTime(1), '1 segundo');
  assert.equal(S.humanTime(45), '45 segundos');
  assert.equal(S.humanTime(3600 * 5), '5 horas');
  assert.equal(S.humanTime(86400 * 3), '3 días');
  assert.equal(S.humanTime(31557600 * 3), '3 años');
  assert.equal(S.humanTime(31557600 * 300), '3 siglos');
  assert.equal(S.humanTime(31557600 * 5000), '5 mil años');
  assert.equal(S.humanTime(31557600 * 5e6), '5 millones de años');
  assert.equal(S.humanTime(Infinity), 'más de mil millones de años');
});

test('robustez: unicode y entradas enormes no fallan ni se cuelgan', () => {
  assert.doesNotThrow(() => S.analyze('contraseña-ñandú-日本語-🔑🔑'));
  const t = Date.now();
  const r = S.analyze('a1B!'.repeat(5000));
  assert.ok(Date.now() - t < 1000, 'demasiado lento');
  assert.equal(r.truncated, true);
  assert.equal(r.length, S.MAX_ANALYZED_LENGTH);
});
