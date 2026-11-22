/* Laboratorio de ataques SIMULADOS (educativo).
 *
 * Todo funciona sobre datos ficticios que viven en este archivo: no hay red, no hay objetivos
 * reales y el texto se inserta siempre con textContent (nunca innerHTML).
 * Los hashes son MD5/SHA-256 calculados sobre contraseñas de juguete.
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  // ---------- Datos del laboratorio (ficticios) ----------
  var USERS = [
    { id: 1, user: 'ana', md5: 'c5bb693b8a7cd71e96856b143796c66b', pass: 'verano2024' },
    { id: 2, user: 'luis', md5: 'd8578edf8458ce06fbc5bb76a58c5ca4', pass: 'qwerty' },
    { id: 3, user: 'admin', md5: '5f4dcc3b5aa765d61d8327deb882cf99', pass: 'password' }
  ];
  // Lista de palabras del laboratorio, en el orden en que la probaría un atacante, con su MD5.
  var WORDLIST = [
    { w: '123456', md5: 'e10adc3949ba59abbe56e057f20f883e' },
    { w: 'password', md5: '5f4dcc3b5aa765d61d8327deb882cf99' },
    { w: 'qwerty', md5: 'd8578edf8458ce06fbc5bb76a58c5ca4' },
    { w: 'letmein', md5: '0d107d09f5bbe40cade3de5c71e9e9b7' },
    { w: 'verano2024', md5: 'c5bb693b8a7cd71e96856b143796c66b' },
    { w: 'tigre99', md5: '060a1e98e2bca9cd5aaa94675e31905f' },
    { w: 'Lab#2024', md5: 'd86f4fac11fd3c8583be495bb7300f93' }
  ];
  var SALTED_EXAMPLE = { salt: 'x9Qz', sha256: '3ae4b35c12ebf9c5dd0f5b925a41a7cddee46c868d3ac5561f7109e5bc159d73' };

  function findUser(name) {
    for (var i = 0; i < USERS.length; i++) if (USERS[i].user === name) return USERS[i];
    return null;
  }

  // ---------- Utilidades de DOM seguras ----------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ---------- Tema y ASCII (mismo comportamiento que la página principal) ----------
  function syncThemeUi() {
    var dark = document.documentElement.getAttribute('data-theme') !== 'light';
    $('theme-icon').textContent = dark ? '☀' : '☾';
    $('theme-label').textContent = dark ? 'Modo claro' : 'Modo oscuro';
    $('theme-toggle').setAttribute('aria-pressed', String(!dark));
  }
  function syncAsciiUi() {
    var on = window.AsciiMode && window.AsciiMode.isOn();
    $('ascii-state').textContent = on ? 'ON' : 'OFF';
    $('ascii-toggle').setAttribute('aria-pressed', String(!!on));
  }
  function syncSoundUi() {
    var on = !!(window.SecSound && window.SecSound.isOn());
    $('sound-state').textContent = on ? 'ON' : 'OFF';
    $('sound-toggle').setAttribute('aria-pressed', String(on));
  }
  $('theme-toggle').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('sec-theme', next); } catch (e) { /* almacenamiento bloqueado */ }
    if (window.AsciiMode) window.AsciiMode.refresh();
    syncThemeUi();
    if (window.SecSound) window.SecSound.play('tab');
  });
  $('ascii-toggle').addEventListener('click', function () {
    if (!window.AsciiMode) return;
    window.AsciiMode.set(!window.AsciiMode.isOn());
    window.AsciiMode.refresh();
    syncAsciiUi();
    if (window.SecSound) window.SecSound.play(window.AsciiMode.isOn() ? 'toggleOn' : 'toggleOff');
  });
  $('sound-toggle').addEventListener('click', function () {
    if (!window.SecSound) return;
    window.SecSound.set(!window.SecSound.isOn());
    syncSoundUi();
    window.SecSound.play('toggleOn');
  });

  // ---------- Pestañas ----------
  var TABS = ['diccionario', 'sqli', 'hash', 'terminal'];
  var tabButtons = TABS.map(function (t) { return $('tab-' + t); });

  function showTab(name, focus) {
    if (TABS.indexOf(name) === -1) name = 'diccionario';
    TABS.forEach(function (t) {
      var on = t === name;
      $('tab-' + t).setAttribute('aria-selected', String(on));
      $('tab-' + t).tabIndex = on ? 0 : -1;
      $('panel-' + t).hidden = !on;
    });
    if (focus) $('tab-' + name).focus();
    if (name === 'terminal') $('term-input').focus({ preventScroll: true });
    if (window.SecSound) window.SecSound.play('tab');
    try { history.replaceState(null, '', '#' + name); } catch (e) { /* ignorar */ }
  }

  tabButtons.forEach(function (btn, i) {
    btn.addEventListener('click', function () { showTab(TABS[i]); });
    btn.addEventListener('keydown', function (ev) {
      var dir = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      ev.preventDefault();
      var j = (i + dir + TABS.length) % TABS.length;
      showTab(TABS[j], true);
    });
  });
  window.addEventListener('hashchange', function () { showTab(location.hash.slice(1)); });

  // ---------- 1. Diccionario ----------
  var select = $('dict-target');
  USERS.forEach(function (u) {
    var opt = el('option', null, u.user);
    opt.value = u.user;
    select.appendChild(opt);
  });
  var runId = 0;

  $('dict-run').addEventListener('click', function () {
    var target = findUser(select.value);
    var log = $('dict-log');
    var summary = $('dict-summary');
    var button = $('dict-run');
    var id = ++runId;
    log.textContent = '';
    summary.textContent = '';
    button.disabled = true;
    var i = 0;
    (function step() {
      if (id !== runId) return; // otra ejecución la reemplazó
      if (i >= WORDLIST.length) {
        summary.textContent = 'La lista se agotó sin coincidencias: la clave no está en el diccionario.';
        button.disabled = false;
        return;
      }
      var attempt = WORDLIST[i];
      i++;
      var hit = attempt.md5 === target.md5;
      log.appendChild(el('li', hit ? 'hit' : null,
        'Probando «' + attempt.w + '» → MD5 ' + attempt.md5.slice(0, 8) + '…  ' + (hit ? '¡coincide!' : 'no coincide')));
      if (window.SecSound) window.SecSound.play(hit ? 'hit' : 'click');
      if (hit) {
        summary.textContent = 'Encontrada en el intento ' + i + ' de ' + WORDLIST.length +
          '. Con una clave única y larga, esta lista no bastaría.';
        button.disabled = false;
        return;
      }
      setTimeout(step, 420);
    })();
  });

  // ---------- 2. Inyección SQL (simulada) ----------
  var mode = 'vuln';
  var BYPASS = /'\s*(or|OR|Or)\s*'?\d+'?\s*=\s*'?\d+|'\s*--/;

  function setMode(next) {
    mode = next;
    $('sqli-vuln').setAttribute('aria-pressed', String(next === 'vuln'));
    $('sqli-safe').setAttribute('aria-pressed', String(next === 'safe'));
    renderSqli();
  }

  function renderSqli() {
    var u = $('sqli-user').value;
    var p = $('sqli-pass').value;
    var q = $('sqli-query');
    var result = $('sqli-result');
    var explain = $('sqli-explain');
    if (mode === 'vuln') {
      q.textContent = "SELECT id FROM usuarios\n  WHERE usuario = '" + u + "'\n  AND clave_md5 = MD5('" + '•'.repeat(p.length) + "')";
    } else {
      q.textContent = 'SELECT id FROM usuarios\n  WHERE usuario = ?      -- valor: ' + JSON.stringify(u) +
        '\n  AND clave_md5 = MD5(?)  -- valor oculto';
    }
    if (!u && !p) {
      result.textContent = '';
      explain.textContent = '';
      return;
    }
    var injected = mode === 'vuln' && BYPASS.test(u);
    var user = findUser(u);
    var ok = !injected && user && p === user.pass;
    if (window.SecSound) window.SecSound.play(injected ? 'error' : ok ? 'hit' : 'click');
    if (injected) {
      result.className = 'lab-result bad';
      result.textContent = '⚠️ Acceso concedido sin conocer la contraseña. El texto del usuario cambió la consulta.';
      explain.textContent = "El comilla (') cierra el texto del usuario y lo que sigue se vuelve lógica SQL: «OR 1=1» siempre es verdadero, y «--» convierte el resto en un comentario que se ignora.";
    } else if (ok) {
      result.className = 'lab-result good';
      result.textContent = 'Acceso correcto como «' + user.user + '».';
      explain.textContent = mode === 'vuln'
        ? 'Funciona, pero aun así el servidor es vulnerable a la inyección: prueba a escribir una comilla en el usuario.'
        : 'Inicio de sesión correcto. El dato del usuario nunca se interpretó como SQL.';
    } else {
      result.className = 'lab-result';
      result.textContent = 'Usuario o contraseña incorrectos.';
      explain.textContent = mode === 'safe'
        ? 'En la versión segura, el texto de usuario se trata siempre como texto literal, incluso si contiene comillas o SQL.'
        : 'Prueba una comilla o «\' OR \'1\'=\'1» en el campo usuario, y mira cómo cambia la consulta.';
    }
  }

  $('sqli-vuln').addEventListener('click', function () { setMode('vuln'); });
  $('sqli-safe').addEventListener('click', function () { setMode('safe'); });
  $('sqli-form').addEventListener('submit', function (ev) { ev.preventDefault(); renderSqli(); });
  $('sqli-user').addEventListener('input', renderSqli);
  $('sqli-pass').addEventListener('input', renderSqli);
  renderSqli();

  // ---------- 3. Hash paso a paso ----------
  var STEPS = [
    {
      title: '1 · Conseguir la tabla',
      body: [
        'Tras una fuga o una inyección SQL, el atacante consigue la tabla de usuarios. Lo importante: contiene hashes, no contraseñas.',
        'Tabla de ejemplo (ficticia):'
      ],
      table: true
    },
    {
      title: '2 · Identificar el algoritmo',
      body: [
        'Los hashes tienen una forma reconocible. Cuenta sus caracteres y mira su prefijo.',
        'MD5 → 32 caracteres hexadecimales. SHA-1 → 40. SHA-256 → 64. bcrypt → empieza por $2b$ o $2y$. Argon2 → empieza por $argon2id$.',
        'Los tres de hex sin sal son malas noticias: se calculan muy rápido.'
      ]
    },
    {
      title: '3 · Comparar con listas conocidas',
      body: [
        'Como MD5 no usa sal, el mismo texto da siempre el mismo hash. Un atacante calcula el hash de millones de palabras una sola vez y busca coincidencias en la tabla.',
        'Prueba el ataque de diccionario en la pestaña «Diccionario»: la clave «qwerty» aparece en pocos intentos.'
      ]
    },
    {
      title: '4 · Por qué la velocidad importa',
      body: [
        'Un equipo moderno puede probar miles de millones de hashes MD5 por segundo. Con bcrypt o Argon2, cada intento cuesta mucho más (miles por segundo o menos), a propósito.',
        'Esta diferencia convierte días de cálculo en siglos para las mismas contraseñas.'
      ]
    },
    {
      title: '5 · Cómo lo evita un sitio bien hecho',
      body: [
        'Sal única por usuario: el mismo texto da hashes distintos y no sirven las tablas precalculadas.',
        'Función lenta y diseñada para contraseñas: bcrypt, scrypt o Argon2id.',
        'Ejemplo con sal (SHA-256, solo para ilustrar la sal; hoy se prefiere Argon2):',
        'sal = "' + SALTED_EXAMPLE.salt + '"  →  ' + SALTED_EXAMPLE.sha256.slice(0, 24) + '…',
        'Además: 2FA, límite de intentos y comprobar si la clave apareció en filtraciones.'
      ]
    }
  ];
  var stepIndex = 0;

  function renderStepList() {
    var list = $('hash-steps');
    list.textContent = '';
    STEPS.forEach(function (s, i) {
      var li = el('li');
      var b = el('button', i === stepIndex ? 'lab-step on' : 'lab-step', s.title.split(' · ')[0]);
      b.type = 'button';
      b.setAttribute('aria-label', s.title);
      b.setAttribute('aria-current', i === stepIndex ? 'step' : 'false');
      b.addEventListener('click', function () { stepIndex = i; renderStep(); });
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  function renderStep() {
    var s = STEPS[stepIndex];
    var view = $('hash-view');
    view.textContent = '';
    view.appendChild(el('h3', null, s.title));
    s.body.forEach(function (t) { view.appendChild(el('p', null, t)); });
    if (s.table) {
      var wrap = el('div', 'table-scroll');
      var table = el('table');
      var thead = el('thead');
      var hr = el('tr');
      ['Usuario', 'Hash guardado (MD5, sin sal)'].forEach(function (t) { hr.appendChild(el('th', null, t)); });
      thead.appendChild(hr);
      table.appendChild(thead);
      var tbody = el('tbody');
      USERS.forEach(function (u) {
        var tr = el('tr');
        tr.appendChild(el('td', null, u.user));
        tr.appendChild(el('td', 'mono', u.md5));
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      view.appendChild(wrap);
    }
    $('hash-counter').textContent = 'Paso ' + (stepIndex + 1) + ' de ' + STEPS.length;
    $('hash-prev').disabled = stepIndex === 0;
    $('hash-next').disabled = stepIndex === STEPS.length - 1;
    renderStepList();
  }

  $('hash-prev').addEventListener('click', function () { if (stepIndex > 0) { stepIndex--; renderStep(); } });
  $('hash-next').addEventListener('click', function () { if (stepIndex < STEPS.length - 1) { stepIndex++; renderStep(); } });
  renderStep();

  // ---------- 4. Terminal simulada ----------
  var termLog = $('term-log');
  var termInput = $('term-input');
  var history_ = [];
  var historyPos = 0;

  function printLine(text, cls) {
    termLog.appendChild(el('div', 'term-line' + (cls ? ' ' + cls : ''), text));
    termLog.scrollTop = termLog.scrollHeight;
  }

  var HELP = [
    'Comandos disponibles:',
    '  help              muestra esta ayuda',
    '  ls                lista los archivos del laboratorio',
    '  dump              muestra la tabla de usuarios (hashes MD5 sin sal)',
    '  sqli <usuario>    muestra la consulta vulnerable para ese usuario',
    '  crack <usuario>   prueba el diccionario del laboratorio contra ese hash',
    '  clear             limpia la pantalla',
    'Los datos son ficticios: solo existen dentro de esta página.'
  ];

  function runCommand(raw) {
    var line = raw.trim();
    if (!line) return;
    printLine('lab@seguro:~$ ' + line, 'cmd');
    var parts = line.split(/\s+/);
    var cmd = parts[0].toLowerCase();
    var arg = parts[1] || '';

    switch (cmd) {
      case 'help':
        HELP.forEach(function (t) { printLine(t); });
        break;
      case 'ls':
        printLine('usuarios.db   (tabla «usuarios»: 3 filas, hash MD5 sin sal)');
        printLine('wordlist.txt  (7 palabras comunes del laboratorio)');
        break;
      case 'dump':
        printLine('id  usuario  hash_md5');
        USERS.forEach(function (u) { printLine(u.id + '   ' + u.user + '     ' + u.md5); });
        break;
      case 'sqli': {
        var u = findUser(arg);
        if (!u && arg) { printLine('sqli: no existe el usuario «' + arg + '»', 'err'); break; }
        var payload = arg || "x";
        printLine("SELECT id FROM usuarios WHERE usuario = '" + payload + "' AND clave_md5 = MD5(?)");
        printLine('Prueba la misma consulta con: sqli \' OR \'1\'=\'1  (verás el efecto)');
        break;
      }
      case 'crack': {
        var target = findUser(arg);
        if (!target) { printLine('crack: indica un usuario de «dump», por ejemplo: crack luis', 'err'); if (window.SecSound) window.SecSound.play('error'); break; }
        printLine('Probando ' + WORDLIST.length + ' palabras contra el hash de «' + target.user + '»…');
        var found = null;
        WORDLIST.forEach(function (w, i) {
          var hit = w.md5 === target.md5;
          printLine('  [' + (i + 1) + '] ' + w.w + ' → ' + (hit ? 'COINCIDE' : 'no'), hit ? 'ok' : '');
          if (hit && !found) found = w.w;
        });
        printLine(found ? 'Clave recuperada: ' + found + '  (intentos: ' + WORDLIST.length + ' como máximo)' : 'Ninguna palabra coincide.', found ? 'ok' : 'err');
        if (window.SecSound) window.SecSound.play(found ? 'hit' : 'error');
        break;
      }
      case 'clear':
        termLog.textContent = '';
        break;
      default:
        printLine('orden no reconocida: ' + cmd + '  (escribe help)', 'err');
        if (window.SecSound) window.SecSound.play('error');
    }
  }

  $('term-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var value = termInput.value;
    if (value.trim()) { history_.push(value); historyPos = history_.length; }
    runCommand(value);
    termInput.value = '';
  });
  termInput.addEventListener('keypress', function () { if (window.SecSound) window.SecSound.play('type'); });
  termInput.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowUp' && history_.length) {
      ev.preventDefault();
      historyPos = Math.max(0, historyPos - 1);
      termInput.value = history_[historyPos];
    } else if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      historyPos = Math.min(history_.length, historyPos + 1);
      termInput.value = historyPos < history_.length ? history_[historyPos] : '';
    }
  });
  document.querySelectorAll('[data-cmd]').forEach(function (b) {
    b.addEventListener('click', function () {
      showTab('terminal');
      runCommand(b.getAttribute('data-cmd'));
    });
  });
  printLine('Bienvenido al laboratorio simulado. Escribe help para empezar.');

  // ---------- Arranque ----------
  syncThemeUi();
  syncAsciiUi();
  syncSoundUi();
  var initial = location.hash.slice(1);
  showTab(TABS.indexOf(initial) === -1 ? 'diccionario' : initial);

  // ---------- Sonido de clic genérico (las pestañas y la terminal ya tienen el suyo) ----------
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('.btn, .chip, .lab-step');
    if (!t || !window.SecSound) return;
    if (t.id === 'theme-toggle' || t.id === 'ascii-toggle' || t.id === 'sound-toggle') return;
    if (t.getAttribute('role') === 'tab') return;
    window.SecSound.play('click');
  });
})();
