'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build, buildZip, scanForSecrets, sha256 } = require('../scripts/package');
const { verifyZip } = require('../scripts/verify');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-'));

test('el paquete es reproducible: dos construcciones dan exactamente el mismo zip', () => {
  const a = build({ outDir: tmp() });
  const b = build({ outDir: tmp() });
  assert.equal(a.digest, b.digest);
  assert.equal(sha256(fs.readFileSync(a.zipPath)), a.digest);
  assert.match(fs.readFileSync(a.shaPath, 'utf8'), /^[0-9a-f]{64} {2}password-checkup-v[\d.]+\.zip\n$/);
});

test('el paquete pasa la verificación y solo contiene lo permitido', () => {
  const r = build({ outDir: tmp() });
  const v = verifyZip(r.zipPath);
  assert.deepEqual(v.problems, []);
  assert.equal(v.ok, true);

  const root = `${r.name}/`;
  for (const f of v.files) {
    assert.ok(f.startsWith(root), f);
    assert.doesNotMatch(f, /node_modules|(^|\/)dist\/|\.git\/|\.env|\.zip$|\.log$/, f);
    const hidden = f.slice(root.length).split('/').filter((s) => s.startsWith('.'));
    for (const h of hidden) assert.ok(['.github', '.gitignore'].includes(h), `oculto no permitido: ${f}`);
  }
  for (const needed of ['SHA256SUMS', 'MANIFEST.txt', 'README.md', 'SECURITY.md', 'server.js', 'public/index.html', 'public/intro.js', '.github/workflows/release.yml']) {
    assert.ok(v.files.includes(root + needed), `falta ${needed}`);
  }
});

test('el comentario del zip es ASCII y el MANIFEST lleva el diseño ASCII', () => {
  const r = build({ outDir: tmp() });
  const buf = fs.readFileSync(r.zipPath);
  const len = buf.readUInt16LE(buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])) + 20);
  const comment = buf.subarray(buf.length - len).toString('latin1');
  assert.match(comment, /SECURITY TECH/);
  assert.doesNotMatch(comment, /[^\x20-\x7e\r\n]/);
  const manifest = buf.toString('utf8');
  assert.match(manifest, /\+={10,}\+/);
  assert.match(manifest, /COMO VERIFICAR LA INTEGRIDAD/);
});

test('detecta un archivo alterado (CRC y SHA-256)', () => {
  const r = build({ outDir: tmp() });
  const buf = Buffer.from(fs.readFileSync(r.zipPath));
  const at = buf.indexOf(Buffer.from('createServer'));
  assert.ok(at > 0);
  buf[at] ^= 0x01; // cambia un solo bit dentro de server.js
  const tampered = path.join(tmp(), 'x.zip');
  fs.writeFileSync(tampered, buf);
  const v = verifyZip(tampered);
  assert.equal(v.ok, false);
  assert.ok(v.problems.some((p) => /CRC-32/.test(p)), v.problems.join('|'));
});

test('detecta un .sha256 que no coincide', () => {
  const r = build({ outDir: tmp() });
  fs.writeFileSync(r.shaPath, `${'0'.repeat(64)}  x.zip\n`);
  const v = verifyZip(r.zipPath);
  assert.equal(v.ok, false);
  assert.ok(v.problems.some((p) => /\.sha256/.test(p)));
});

test('rechaza zip-slip, rutas absolutas, duplicados y enlaces simbólicos', () => {
  const dir = tmp();
  const make = (entries) => {
    const f = path.join(dir, `z${Math.random()}.zip`);
    fs.writeFileSync(f, buildZip(entries.map(([name, data]) => ({ name, data: Buffer.from(data) }))));
    return verifyZip(f);
  };
  assert.ok(make([['pkg/../../evil.sh', 'x'], ['pkg/SHA256SUMS', '']]).problems.some((p) => /Ruta insegura/.test(p)));
  assert.ok(make([['/etc/passwd', 'x'], ['pkg/SHA256SUMS', '']]).problems.some((p) => /Ruta insegura/.test(p)));
  assert.ok(make([['pkg\\evil.exe', 'x'], ['pkg/SHA256SUMS', '']]).problems.some((p) => /Ruta insegura/.test(p)));
  assert.ok(make([['pkg/a', '1'], ['pkg/a', '2'], ['pkg/SHA256SUMS', '']]).problems.some((p) => /duplicada/.test(p)));
  assert.ok(make([['pkg/a', '1'], ['otra/b', '2']]).problems.some((p) => /única carpeta raíz/.test(p)));
  assert.ok(make([['pkg/a', '1']]).problems.some((p) => /Falta SHA256SUMS/.test(p)));
});

test('detecta archivos no cubiertos o sobrantes en SHA256SUMS', () => {
  const dir = tmp();
  const a = Buffer.from('hola');
  const good = `${sha256(a)}  a.txt\n`;
  const extra = `${good}${'f'.repeat(64)}  fantasma.txt\n`;
  const write = (sums, files) => {
    const f = path.join(dir, `s${Math.random()}.zip`);
    fs.writeFileSync(f, buildZip([...files, { name: 'pkg/SHA256SUMS', data: Buffer.from(sums) }]));
    return verifyZip(f);
  };
  assert.equal(write(good, [{ name: 'pkg/a.txt', data: a }]).ok, true);
  assert.ok(write(extra, [{ name: 'pkg/a.txt', data: a }]).problems.some((p) => /fantasma/.test(p)));
  assert.ok(write(good, [{ name: 'pkg/a.txt', data: a }, { name: 'pkg/b.txt', data: a }]).problems.some((p) => /no cubierto/.test(p)));
  assert.ok(write(`${sha256(Buffer.from('otro'))}  a.txt\n`, [{ name: 'pkg/a.txt', data: a }]).problems.some((p) => /SHA-256 distinto/.test(p)));
});

test('el escáner de secretos y rutas locales funciona', () => {
  const file = (name, text) => ({ name, data: Buffer.from(text) });
  const fakeAws = 'AKIA' + 'IOSFODNN7EXAMPLE';
  const fakePem = '-----BEGIN ' + 'RSA PRIVATE KEY-----';
  const localPath = '/ho' + 'me/claude/proyecto';
  const found = scanForSecrets([file('a.js', `const k = "${fakeAws}"`), file('b.pem', fakePem), file('c.md', `ruta ${localPath}`), file('ok.md', 'nada raro')]);
  assert.deepEqual(found.map((f) => f.file).sort(), ['a.js', 'b.pem', 'c.md']);
  assert.deepEqual(scanForSecrets([file('ok.md', 'contraseña: ejemplo')]), []);
});

test('el repositorio real no contiene secretos ni rutas locales', () => {
  const { collect } = require('../scripts/package');
  assert.deepEqual(scanForSecrets(collect().files), []);
});

test('reconstruir desde el zip extraído da el MISMO hash (verificación independiente)', () => {
  const { collect } = require('../scripts/package');
  const original = build({ outDir: tmp() });

  // Simula "unzip": todos los archivos + los generados (MANIFEST.txt y SHA256SUMS)
  const copy = tmp();
  for (const f of collect().files) {
    const dest = path.join(copy, f.name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, f.data);
  }
  fs.writeFileSync(path.join(copy, 'MANIFEST.txt'), 'generado anteriormente');
  fs.writeFileSync(path.join(copy, 'SHA256SUMS'), 'generado anteriormente');

  const rebuilt = build({ root: copy, outDir: tmp() });
  assert.equal(rebuilt.digest, original.digest);
  assert.deepEqual(verifyZip(rebuilt.zipPath).problems, []);
});
