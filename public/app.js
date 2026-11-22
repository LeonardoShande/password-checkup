/* Frontend de Security Tech · Check-up de contraseñas.
 * - La contraseña se analiza AQUÍ (PasswordScoring / PasswordAttacks) y nunca se envía al servidor.
 * - El contenido, la demo de cookies y la de registros vienen del backend.
 * - El analizador de URL (UrlCheck) tampoco usa la red: no abre la dirección que analizas.
 * - Todo el DOM se construye con createElement/textContent (sin innerHTML con datos). */
(function () {
  'use strict';

  var Scoring = window.PasswordScoring;
  var Attacks = window.PasswordAttacks;
  var UrlCheck = window.UrlCheck;
  var Art = window.SpaceArt || {};
  var $ = function (id) { return document.getElementById(id); };

  var els = {
    pw: $('pw'), toggle: $('toggle'), hibp: $('hibp'), hibpStatus: $('hibp-status'),
    empty: $('empty'), analysis: $('analysis'), srStatus: $('sr-status'), spaceMsg: $('space-msg'),
    cards: $('cards'), advCards: $('advanced-cards'), defCards: $('defense-cards'), chips: $('chips'),
    theme: $('theme-toggle'), themeIcon: $('theme-icon'), themeLabel: $('theme-label'),
  };

  var state = { analysis: null, breachCount: 0 };
  var riskTargets = [];
  var cardIndex = new Map();
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js'); // activa animaciones que dependen de JS (progresivo)

  // ---------- Utilidades de DOM ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    Array.prototype.slice.call(arguments, 2).forEach(function add(child) {
      if (Array.isArray(child)) return child.forEach(add);
      if (child == null || child === false) return;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  // ---------- Tema (oscuro/claro) ----------
  function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function syncThemeUi() {
    var light = currentTheme() === 'light';
    els.themeIcon.textContent = light ? '☾' : '☀';
    els.themeLabel.textContent = light ? 'Modo oscuro' : 'Modo claro';
    els.theme.setAttribute('aria-pressed', String(!light));
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#f1f5ff' : '#070a17');
  }
  els.theme.addEventListener('click', function () {
    var next = currentTheme() === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('sec-theme', next); } catch (e) { /* almacenamiento bloqueado */ }
    syncThemeUi();
    if (window.AsciiMode) window.AsciiMode.refresh(); // los marcos ASCII se regeneran con los colores del tema
    if (window.SecSound) window.SecSound.play('tab');
  });
  syncThemeUi();

  // ---------- Modo ASCII (diseño de toda la página) ----------
  var asciiBtn = $('ascii-toggle');
  var asciiState = $('ascii-state');
  function syncAsciiUi() {
    var on = !!(window.AsciiMode && window.AsciiMode.isOn());
    asciiBtn.setAttribute('aria-pressed', String(on));
    asciiState.textContent = on ? 'ON' : 'OFF';
  }
  asciiBtn.addEventListener('click', function () {
    if (!window.AsciiMode) return;
    window.AsciiMode.set(!window.AsciiMode.isOn());
    window.AsciiMode.refresh();
    syncAsciiUi();
    if (window.SecSound) window.SecSound.play(window.AsciiMode.isOn() ? 'toggleOn' : 'toggleOff');
  });
  syncAsciiUi();

  // ---------- Sonido (efectos lofi/tecnológicos, apagados por defecto) ----------
  var soundBtn = $('sound-toggle');
  var soundState = $('sound-state');
  function syncSoundUi() {
    var on = !!(window.SecSound && window.SecSound.isOn());
    soundBtn.setAttribute('aria-pressed', String(on));
    soundState.textContent = on ? 'ON' : 'OFF';
  }
  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      if (!window.SecSound) return;
      window.SecSound.set(!window.SecSound.isOn());
      syncSoundUi();
      window.SecSound.play('toggleOn'); // confirma de inmediato que ya suena (o el último antes de apagar)
    });
    syncSoundUi();
  }

  // ---------- Arte ASCII y estrellas ----------
  $('art-dark').textContent = Art.dark || '';
  $('art-light').textContent = Art.light || '';
  $('horizon').textContent = Art.horizon || '';
  $('ascii-banner').textContent = Art.banner || '';

  (function buildStars() {
    var box = $('starfield');
    var chars = ['·', '.', '*', '+', '·', '.'];
    var n = window.innerWidth < 700 ? 34 : 72;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span');
      s.className = 'star s' + (i % 3);
      s.textContent = chars[i % chars.length];
      s.style.left = (Math.random() * 100).toFixed(1) + '%';
      s.style.top = (Math.random() * 100).toFixed(1) + '%';
      s.style.animationDelay = (Math.random() * 6).toFixed(2) + 's';
      box.appendChild(s);
    }
  })();

  // ---------- Menú lateral: resaltado según el scroll ----------
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.rail a[data-nav]'));
  function setActive(id) {
    navLinks.forEach(function (a) {
      if (a.getAttribute('data-nav') === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  navLinks.forEach(function (a) { a.addEventListener('click', function () { setActive(a.getAttribute('data-nav')); }); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-35% 0px -60% 0px' });
    navLinks.forEach(function (a) { var s = $(a.getAttribute('data-nav')); if (s) io.observe(s); });
  }
  setActive('inicio');

  $('rail-top').addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  function playIntro() { if (window.SecurityIntro) window.SecurityIntro.play(); }
  $('rail-intro').addEventListener('click', playIntro);
  $('footer-intro').addEventListener('click', playIntro);

  // ---------- Textos ----------
  var LEVEL_MESSAGES = {
    'very-weak': 'Un atacante la adivinaría en segundos o minutos.',
    'weak': 'Se rompería con rapidez si alguien lo intenta de verdad.',
    'fair': 'Resiste ataques casuales, pero no una base de datos robada.',
    'strong': 'Buena protección frente a la mayoría de ataques de adivinación.',
    'very-strong': 'Excelente: adivinarla no es realista con la tecnología actual.',
  };
  var RISK_LABEL = { alto: 'Riesgo alto', medio: 'Riesgo medio', bajo: 'Riesgo bajo', indep: 'Depende de tus hábitos', none: 'Sin analizar' };

  // ---------- Resultado del análisis ----------
  function effectiveScore() {
    return state.breachCount > 0 ? Math.min(state.analysis.score, 5) : state.analysis.score;
  }
  function stat(label, value) { return h('div', { class: 'stat' }, h('dt', null, label), h('dd', null, value)); }

  function attackCard(assessment) {
    return h('div', { class: 'card attacks-card', id: 'ataques' },
      h('h3', null, '🎯 Cómo podrían vulnerarla ahora mismo'),
      h('p', { class: 'headline' }, assessment.headline),
      h('ul', { class: 'attacks' }, assessment.items.map(function (item) {
        return h('li', { class: 'attack', 'data-risk': item.risk },
          h('div', null, h('p', { class: 'a-title' }, item.title), h('p', { class: 'a-text' }, item.text)),
          h('div', { class: 'a-side' },
            h('span', { class: 'risk', 'data-risk': item.risk }, RISK_LABEL[item.risk]),
            h('button', { type: 'button', class: 'btn btn-sm', 'aria-label': 'Más información: ' + item.title,
              onclick: function () { openCard(item.card); } }, 'Más info →')));
      })));
  }

  function renderAnalysis() {
    var a = state.analysis;
    if (!a || a.empty) {
      els.empty.hidden = false;
      els.analysis.hidden = true;
      clear(els.analysis);
      updateRisks();
      return;
    }

    var score = effectiveScore();
    var level = Scoring.levelFor(score);
    var breached = state.breachCount > 0;

    var scoreCard = h('div', { class: 'card score-card', 'data-level': level.id },
      h('div', { class: 'score-num' }, String(score), h('small', null, '/100')),
      h('div', null,
        h('p', { class: 'score-level' }, level.label),
        h('p', { class: 'score-msg' }, breached
          ? 'Esta contraseña ya apareció en filtraciones: cualquiera puede probarla primero.'
          : LEVEL_MESSAGES[level.id])),
      h('div', { class: 'meter', role: 'progressbar', 'aria-label': 'Puntaje de seguridad',
        'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(score) },
      h('div', { class: 'meter-fill' })),
      h('div', { class: 'meter-scale', 'aria-hidden': 'true' },
        ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'].map(function (t) { return h('span', null, t); })));
    scoreCard.querySelector('.meter-fill').style.width = score + '%';

    var parts = [scoreCard];
    if (breached) {
      parts.push(h('div', { class: 'banner', role: 'alert' },
        '⚠️ Apareció ' + state.breachCount.toLocaleString('es') + ' veces en filtraciones conocidas. Aunque parezca fuerte, no la uses.'));
    }

    parts.push(attackCard(Attacks.assess(a, { breachCount: state.breachCount })));

    if (a.capReasons.length) {
      parts.push(h('div', { class: 'card' }, h('h3', null, 'Por qué no sube más'),
        h('ul', { class: 'tips' }, a.capReasons.map(function (r) { return h('li', null, r); }))));
    }

    var classCount = ['lower', 'upper', 'digit'].filter(function (k) { return a.classes[k]; }).length + (a.classes.symbol || a.classes.other ? 1 : 0);
    parts.push(h('dl', { class: 'stats' },
      stat('Longitud', a.length + ' caracteres'),
      stat('Entropía efectiva', a.effectiveBits + ' bits'),
      stat('Tipos de caracteres', classCount + ' de 4')));

    parts.push(h('div', { class: 'card' }, h('h3', null, 'Criterios clásicos'),
      h('ul', { class: 'checklist' }, a.checks.map(function (c) {
        return h('li', { class: c.ok ? 'ok' : 'fail' },
          h('span', { class: 'mark', 'aria-hidden': 'true' }, c.ok ? '✓' : '✕'),
          h('span', { class: 'label' },
            h('span', { class: 'sr-only' }, c.ok ? 'Cumple: ' : 'No cumple: '), c.label,
            c.ok ? null : h('span', { class: 'tip' }, c.hint)));
      }))));

    if (a.patterns.length) {
      parts.push(h('div', { class: 'card' }, h('h3', null, 'Patrones que un atacante aprovecharía'),
        h('ul', { class: 'found' }, a.patterns.map(function (p) { return h('li', null, p.note); }))));
    }

    parts.push(h('div', { class: 'card' }, h('h3', null, '¿Cuánto tardaría en adivinarse?'),
      h('div', { class: 'table-scroll' }, h('table', null,
        h('thead', null, h('tr', null, h('th', null, 'Escenario'), h('th', null, 'Tiempo estimado'), h('th', null, 'Riesgo'))),
        h('tbody', null, a.crackTimes.map(function (t) {
          return h('tr', null,
            h('td', null, t.label, h('small', null, t.detail)),
            h('td', null, breached ? 'al instante' : t.human),
            h('td', null, h('span', { class: 'risk', 'data-risk': breached ? 'alto' : t.risk }, RISK_LABEL[breached ? 'alto' : t.risk])));
        }))))));

    if (a.suggestions.length) {
      parts.push(h('div', { class: 'card' }, h('h3', null, 'Cómo mejorarla'),
        h('ul', { class: 'tips' }, a.suggestions.map(function (s) { return h('li', null, s); }))));
    }

    clear(els.analysis);
    els.analysis.append(h('div', { class: 'stack' }, parts));
    els.empty.hidden = true;
    els.analysis.hidden = false;
    updateRisks();
  }

  // ---------- Etiquetas de riesgo en las tarjetas ----------
  function riskFor(rule) {
    var a = state.analysis;
    if (rule.type === 'independent') return 'indep';
    if (!a || a.empty) return 'none';
    if (state.breachCount > 0) return 'alto';
    if (rule.type === 'scenario') {
      var t = a.crackTimes.filter(function (x) { return x.id === rule.id; })[0];
      return t ? t.risk : 'none';
    }
    if (rule.type === 'predictability') return a.predictability;
    return 'none';
  }
  function updateRisks() {
    riskTargets.forEach(function (t) {
      var risk = riskFor(t.rule);
      t.badge.setAttribute('data-risk', risk);
      t.badge.textContent = RISK_LABEL[risk];
    });
  }

  // ---------- Tarjetas "Más info" ----------
  function renderBlock(block) {
    if (block.type === 'ul') return h('ul', null, block.items.map(function (i) { return h('li', null, i); }));
    if (block.type === 'code') return h('pre', { class: 'code' }, block.text);
    if (block.type === 'h') return h('h4', { class: 'sub' }, block.text);
    return h('p', null, block.text);
  }

  function setOpen(button, panel, open, animate) {
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? 'Menos info ▲' : 'Más info ▼';
    var card = panel.closest ? panel.closest('.thr') : null;
    if (card) card.classList.toggle('is-open', open);
    if (window.SecSound) window.SecSound.play(open ? 'open' : 'close');
    if (!animate || prefersReduced) {
      panel.hidden = !open;
      panel.style.maxHeight = '';
      return;
    }
    // Despliegue animado: anima max-height en vez de alternar "hidden" de golpe.
    panel.classList.add('animating');
    if (open) {
      panel.hidden = false;
      panel.style.maxHeight = '0px';
      // Fuerza el reflow para que el navegador aplique 0px antes de animar al alto real.
      void panel.offsetHeight;
      panel.style.maxHeight = panel.scrollHeight + 'px';
    } else {
      panel.style.maxHeight = panel.scrollHeight + 'px';
      void panel.offsetHeight;
      panel.style.maxHeight = '0px';
    }
    panel.addEventListener('transitionend', function onEnd(ev) {
      if (ev.target !== panel || ev.propertyName !== 'max-height') return;
      panel.removeEventListener('transitionend', onEnd);
      panel.classList.remove('animating');
      if (open) { panel.style.maxHeight = 'none'; } else { panel.hidden = true; panel.style.maxHeight = ''; }
    });
  }

  function buildCard(section) {
    var panelId = 'panel-' + section.id;
    var panel = h('div', { class: 'thr-panel', id: panelId, hidden: true },
      section.details.map(renderBlock),
      section.tips && section.tips.length
        ? [h('h4', null, 'Qué puedes hacer'), h('ul', { class: 'tips' }, section.tips.map(function (t) { return h('li', null, t); }))] : null,
      section.demo ? buildDemo(section.demo) : null,
      section.links && section.links.length
        ? [h('h4', null, 'Fuentes y más lectura'),
          h('ul', { class: 'links' }, section.links.map(function (l) {
            return h('li', null, h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.label));
          }))] : null);

    var button = h('button', { type: 'button', class: 'btn', 'aria-expanded': 'false', 'aria-controls': panelId }, 'Más info');
    button.addEventListener('click', function () { setOpen(button, panel, button.getAttribute('aria-expanded') !== 'true', true); });

    var hasRisk = section.risk && section.risk.type !== 'none';
    var badge = h('span', { class: 'risk', 'data-risk': 'none' });
    if (hasRisk) riskTargets.push({ badge: badge, rule: section.risk });

    var card = h('article', { class: 'card thr', id: section.id },
      h('div', { class: 'thr-head' },
        h('span', { class: 'thr-icon', 'aria-hidden': 'true' }, section.icon),
        h('h3', { class: 'thr-title' }, section.title),
        hasRisk ? badge : null),
      h('p', { class: 'thr-sum' }, section.summary),
      h('div', { class: 'thr-actions' }, button),
      panel);
    card._open = function (animate) { setOpen(button, panel, true, animate !== false); };
    card._button = button;
    return card;
  }

  function openCard(id) {
    var card = cardIndex.get(id);
    if (!card) return;
    card._open(true);
    card.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* ignorar */ }
    card._button.focus({ preventScroll: true });
  }

  // ---------- Aparición progresiva de las tarjetas al hacer scroll ----------
  function revealCards() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.thr'));
    if (prefersReduced || !('IntersectionObserver' in window)) {
      cards.forEach(function (c) { c.classList.add('in-view'); });
      return;
    }
    var seen = 0;
    var ioReveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = Math.min(seen, 5) * 60; // breve escalonado, con tope para listas largas
        seen++;
        el.style.transitionDelay = delay + 'ms';
        el.classList.add('in-view');
        ioReveal.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    cards.forEach(function (c) { ioReveal.observe(c); });
  }

  // ---------- Demos respaldadas por el backend ----------
  function getJson(url) {
    return fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } }).then(function (res) {
      if (!res.ok) throw new Error(res.status === 429 ? 'Demasiadas solicitudes, espera un momento.' : 'El servidor respondió ' + res.status);
      return res.json();
    });
  }

  function demoShell(title, buttonLabel, run) {
    var out = h('div', { class: 'demo-out', 'aria-live': 'polite' });
    var btn = h('button', { type: 'button', class: 'btn' }, buttonLabel);
    btn.addEventListener('click', function () {
      btn.disabled = true;
      run().then(function (node) { clear(out); out.append(node); })
        .catch(function (err) { clear(out); out.append(h('p', null, '⚠️ ' + err.message)); })
        .then(function () { btn.disabled = false; });
    });
    return h('div', { class: 'demo' }, h('h4', null, title), btn, out);
  }

  function cookieDemo() {
    return demoShell('🧪 Demo: cookies de este servidor', 'Ver cookies de demostración', function () {
      return getJson('/api/demo/session').then(function (data) {
        var visible = '';
        try { visible = document.cookie; } catch (e) { /* cookies bloqueadas */ }
        return h('div', null,
          h('h5', null, 'Lo que envió el servidor (cabeceras Set-Cookie)'),
          data.cookies.map(function (c) {
            return h('div', null,
              h('pre', { class: 'code' }, 'Set-Cookie: ' + c.header),
              h('p', { class: c.protected ? 'badge-ok' : 'badge-bad' }, (c.protected ? '✅ ' : '⚠️ ') + c.note));
          }),
          h('h5', null, 'Lo que vería un script malicioso (XSS) en esta página'),
          h('pre', { class: 'code' }, 'document.cookie → ' + JSON.stringify(visible)),
          h('p', null, 'Fíjate: solo aparece la cookie descuidada. La protegida con HttpOnly queda fuera del alcance de JavaScript.'),
          h('h5', null, 'Qué hace cada atributo'),
          h('ul', null, data.flags.map(function (f) { return h('li', null, h('strong', null, f.flag + ': '), f.meaning); })),
          h('p', null, data.note));
      });
    });
  }

  function logsDemo() {
    return demoShell('🧪 Demo: tu rastro en el registro del servidor', 'Ver mis registros', function () {
      return getJson('/api/demo/logs').then(function (data) {
        if (!data.entries.length) return h('p', null, 'Aún no hay entradas tuyas.');
        return h('div', null,
          h('div', { class: 'table-scroll' }, h('table', null,
            h('thead', null, h('tr', null, ['Hora (UTC)', 'Método', 'Ruta', 'Estado', 'ms', 'IP anónima', 'Navegador'].map(function (t) { return h('th', null, t); }))),
            h('tbody', null, data.entries.map(function (e) {
              return h('tr', null,
                h('td', null, e.time.slice(11, 19)), h('td', null, e.method), h('td', null, e.path),
                h('td', null, String(e.status)), h('td', null, String(e.ms)), h('td', null, e.ip), h('td', null, e.ua));
            })))),
          h('p', null, data.note));
      });
    });
  }

  // ---------- Avanzado: ¿es segura esta web? ----------
  var VC_MARK = { ok: '✓', info: 'i', warn: '!', bad: '✕' };
  var VC_SR = { ok: 'Correcto: ', info: 'Información: ', warn: 'Aviso: ', bad: 'Grave: ' };
  var VC_VERDICT = { alto: 'Riesgo alto', medio: 'Riesgo medio', bajo: 'Sin señales evidentes' };

  function checkList(rows) {
    return h('ul', { class: 'vc-list' }, rows.map(function (c) {
      return h('li', { 'data-level': c.level },
        h('span', { class: 'vc-mark', 'aria-hidden': 'true' }, VC_MARK[c.level]),
        h('span', null, h('span', { class: 'sr-only' }, VC_SR[c.level]), h('strong', null, c.title),
          h('span', { class: 'vc-detail' }, c.detail)));
    }));
  }

  function renderUrlResult(r) {
    if (!r.ok) return h('p', { class: 'vc-error' }, '⚠️ ' + r.error);
    return h('div', null,
      h('p', { class: 'vc-verdict', 'data-risk': r.risk, role: 'status' }, h('strong', null, VC_VERDICT[r.risk] + ' · '), r.summary),
      r.domain ? h('p', { class: 'vc-domain' }, 'Dominio real: ', h('code', null, r.domain), ' ',
        h('small', null, '(es lo que importa; lo demás es adorno)')) : null,
      checkList(r.checks));
  }

  var EXAMPLES = [
    ['Sitio normal', 'https://www.google.com'],
    ['Sin HTTPS', 'http://paypal.com'],
    ['Dominio escondido', 'https://paypal.com.login-seguro.example/verificar'],
    ['Letras parecidas', 'https://paypa1.com'],
    ['Truco de la @', 'https://google.com@evil.example/login'],
  ];

  function truncate(text, n) { return text.length > n ? text.slice(0, n - 1) + '…' : text; }

  function checkThisPage() {
    return fetch(location.pathname || '/', { method: 'HEAD', cache: 'no-store' }).then(function (res) {
      var g = function (n) { return res.headers.get(n); };
      var https = location.protocol === 'https:';
      var local = ['localhost', '127.0.0.1', '[::1]'].indexOf(location.hostname) !== -1;
      var csp = g('content-security-policy') || '';
      var hsts = g('strict-transport-security');
      var rows = [
        { level: https ? 'ok' : (local ? 'info' : 'bad'), title: 'Conexión HTTPS',
          detail: https ? 'Esta página llegó cifrada.' : (local ? 'Estás en HTTP porque es localhost (normal al desarrollar). En un sitio real sería un problema grave.' : 'Esta página NO usa HTTPS: no escribas contraseñas aquí.') },
        { level: window.isSecureContext ? 'ok' : 'warn', title: 'Contexto seguro del navegador',
          detail: window.isSecureContext ? 'El navegador la trata como segura (permite criptografía y funciones sensibles).' : 'El navegador no la considera un contexto seguro.' },
        { level: hsts ? 'ok' : (https ? 'warn' : 'info'), title: 'Strict-Transport-Security (HSTS)',
          detail: hsts ? 'Presente (' + hsts + '). Obliga al navegador a usar siempre HTTPS con este sitio.' : (https ? 'Falta: una primera visita por HTTP podría ser interceptada.' : 'Solo se envía sobre HTTPS; por eso aquí no aparece.') },
        { level: csp ? 'ok' : 'warn', title: 'Content-Security-Policy',
          detail: csp ? 'Presente: limita qué scripts y recursos carga la página (frena el XSS). ' + truncate(csp, 110) : 'Falta: un script inyectado tendría más libertad.' },
        { level: g('x-content-type-options') === 'nosniff' ? 'ok' : 'warn', title: 'X-Content-Type-Options',
          detail: g('x-content-type-options') === 'nosniff' ? 'nosniff: el navegador no «adivina» tipos de archivo peligrosos.' : 'Falta nosniff.' },
        { level: g('referrer-policy') ? 'ok' : 'warn', title: 'Referrer-Policy',
          detail: g('referrer-policy') ? 'Valor «' + g('referrer-policy') + '»: no filtra la dirección de origen a otros sitios.' : 'Falta: la URL podría filtrarse en la cabecera Referer.' },
        { level: /frame-ancestors/.test(csp) || g('x-frame-options') ? 'ok' : 'warn', title: 'Protección contra clickjacking',
          detail: /frame-ancestors/.test(csp) || g('x-frame-options') ? 'Otros sitios no pueden incrustar esta página en un marco para engañarte con clics.' : 'Falta frame-ancestors o X-Frame-Options.' },
      ];
      return h('div', null, checkList(rows),
        h('p', null, 'En otro sitio, tu navegador no deja leer sus cabeceras desde una página ajena (por seguridad). Hazlo con las herramientas de desarrollo: ' +
          'F12 → Red → clic en el documento → «Cabeceras de respuesta», o pega la dirección en Security Headers (enlace en las fuentes).'));
    });
  }

  function webCheckDemo() {
    var input = h('input', { type: 'text', id: 'url-input', class: 'url-input', autocomplete: 'off', spellcheck: 'false',
      autocapitalize: 'none', maxlength: '2048', placeholder: 'Pega aquí una dirección: https://…', 'aria-label': 'Dirección web a analizar' });
    var out = h('div', { class: 'demo-out', 'aria-live': 'polite' });

    function run(value) {
      if (typeof value === 'string') input.value = value;
      clear(out);
      out.append(renderUrlResult(UrlCheck.analyze(input.value)));
    }
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } });

    var headerOut = h('div', { class: 'demo-out', 'aria-live': 'polite' });
    var headerBtn = h('button', { type: 'button', class: 'btn' }, 'Revisar las cabeceras de esta página');
    headerBtn.addEventListener('click', function () {
      headerBtn.disabled = true;
      checkThisPage().then(function (node) { clear(headerOut); headerOut.append(node); })
        .catch(function (err) { clear(headerOut); headerOut.append(h('p', null, '⚠️ No se pudo revisar: ' + err.message)); })
        .then(function () { headerBtn.disabled = false; });
    });

    return h('div', { class: 'demo' },
      h('h4', null, '🧪 Herramienta 1: analiza una dirección antes de abrirla'),
      h('p', null, 'Pega un enlace sospechoso. No se abre ni se envía a ningún servidor: se analiza aquí mismo.'),
      h('div', { class: 'vc-row' }, input, h('button', { type: 'button', class: 'btn', onclick: function () { run(); } }, 'Analizar')),
      h('div', { class: 'examples' }, 'Prueba con:', EXAMPLES.map(function (ex) {
        return h('button', { type: 'button', class: 'chip', onclick: function () { run(ex[1]); } }, ex[0]);
      })),
      out,
      h('hr', { class: 'demo-sep' }),
      h('h4', null, '🧪 Herramienta 2: revisa las cabeceras de seguridad (esta página)'),
      headerBtn, headerOut);
  }

  function buildDemo(kind) {
    if (kind === 'cookies') return cookieDemo();
    if (kind === 'logs') return logsDemo();
    if (kind === 'webcheck') return webCheckDemo();
    return null;
  }

  // ---------- Carga del contenido ----------
  function loadContent() {
    return getJson('/api/content').then(function (data) {
      var groups = { threats: els.cards, advanced: els.advCards, defense: els.defCards };
      Object.keys(groups).forEach(function (k) { clear(groups[k]); });
      clear(els.chips);

      data.sections.forEach(function (section) {
        var card = buildCard(section);
        cardIndex.set(section.id, card);
        (groups[section.group] || groups.threats).append(card);
        if (section.open) card._open(false);
        if (section.group === 'threats' && section.short) {
          els.chips.append(h('button', { type: 'button', class: 'chip', onclick: function () { openCard(section.id); } },
            section.icon + ' ' + section.short));
        }
      });
      updateRisks();
      revealCards();

      var hash = decodeURIComponent(location.hash.slice(1));
      if (hash && cardIndex.has(hash)) openCard(hash);
    }).catch(function (err) {
      clear(els.cards);
      els.cards.append(h('p', { class: 'loading' }, 'No se pudo cargar el contenido: ' + err.message));
    });
  }

  // ---------- Filtraciones (opcional, k-anonimato con Have I Been Pwned) ----------
  function sha1Hex(text) {
    if (!window.crypto || !window.crypto.subtle) return Promise.reject(new Error('Se necesita HTTPS (o localhost) para calcular el hash.'));
    return window.crypto.subtle.digest('SHA-1', new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('').toUpperCase();
    });
  }

  var breachToken = 0;
  function setHibp(text, kind) {
    els.hibpStatus.textContent = text;
    if (kind) els.hibpStatus.setAttribute('data-state', kind); else els.hibpStatus.removeAttribute('data-state');
  }

  function checkBreach(password) {
    var token = ++breachToken;
    setHibp('Comprobando…', '');
    return sha1Hex(password).then(function (hash) {
      return fetch('https://api.pwnedpasswords.com/range/' + hash.slice(0, 5), { headers: { 'Add-Padding': 'true' } })
        .then(function (res) {
          if (!res.ok) throw new Error('el servicio respondió ' + res.status);
          return res.text();
        }).then(function (text) {
          if (token !== breachToken) return;
          var suffix = hash.slice(5);
          var count = 0;
          text.split('\n').forEach(function (line) {
            var parts = line.trim().split(':');
            if (parts[0] === suffix) count = parseInt(parts[1], 10) || 0;
          });
          state.breachCount = count;
          if (count > 0) setHibp('⚠️ Apareció ' + count.toLocaleString('es') + ' veces en filtraciones.', 'bad');
          else setHibp('✅ No aparece en las filtraciones conocidas (eso no la hace automáticamente segura).', 'good');
          renderAnalysis();
        });
    }).catch(function (err) {
      if (token === breachToken) { state.breachCount = 0; setHibp('No se pudo comprobar: ' + err.message, ''); }
    });
  }

  // ---------- Entrada de contraseña: sin espacios ----------
  var WS = /[\s​-‍⁠﻿]/g;
  var spaceTimer = null;

  function notifySpace() {
    els.spaceMsg.textContent = 'Sin espacios: no se admiten en la contraseña. Usa - o _ para separar palabras.';
    els.pw.classList.remove('shake');
    void els.pw.offsetWidth;
    els.pw.classList.add('shake');
    clearTimeout(spaceTimer);
    spaceTimer = setTimeout(function () { els.spaceMsg.textContent = ''; }, 4000);
  }
  els.pw.addEventListener('animationend', function () { els.pw.classList.remove('shake'); });

  function sanitize() {
    var raw = els.pw.value;
    var clean = raw.replace(WS, '');
    if (clean !== raw) {
      var pos = els.pw.selectionStart == null ? raw.length : els.pw.selectionStart;
      var before = raw.slice(0, pos);
      var removedBefore = before.length - before.replace(WS, '').length;
      els.pw.value = clean;
      try { els.pw.setSelectionRange(pos - removedBefore, pos - removedBefore); } catch (e) { /* ignorar */ }
      notifySpace();
    }
    return clean;
  }

  els.pw.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); notifySpace(); }
  });
  // Teclado móvil / IME: solo se bloquea cuando lo tecleado ES un espacio. Si se pega
  // un texto con espacios no se cancela todo: el evento "input" lo limpia y conserva el resto.
  els.pw.addEventListener('beforeinput', function (e) {
    if (e.inputType === 'insertText' && typeof e.data === 'string' && e.data !== '' && /^\s+$/.test(e.data)) {
      e.preventDefault();
      notifySpace();
    }
  });

  var breachTimer = null;
  var srTimer = null;

  els.pw.addEventListener('input', function () {
    var value = sanitize();
    state.analysis = Scoring.analyze(value);
    state.breachCount = 0;
    breachToken++;
    setHibp('', '');
    renderAnalysis();

    clearTimeout(srTimer);
    srTimer = setTimeout(function () {
      els.srStatus.textContent = state.analysis.empty ? '' : 'Puntaje ' + state.analysis.score + ' de 100: ' + state.analysis.level.label + '.';
    }, 700);

    clearTimeout(breachTimer);
    if (els.hibp.checked && value) breachTimer = setTimeout(function () { checkBreach(value); }, 700);
  });

  els.toggle.addEventListener('click', function () {
    var show = els.pw.type === 'password';
    els.pw.type = show ? 'text' : 'password';
    els.toggle.textContent = show ? 'Ocultar' : 'Mostrar';
    els.toggle.setAttribute('aria-pressed', String(show));
  });

  els.hibp.addEventListener('change', function () {
    clearTimeout(breachTimer);
    breachToken++;
    state.breachCount = 0;
    setHibp('', '');
    if (els.hibp.checked && els.pw.value) checkBreach(els.pw.value);
    else renderAnalysis();
  });

  loadContent();

  // ---------- Sonido de clic genérico para botones y chips ----------
  // (el de abrir/cerrar "Más info" ya suena en setOpen; aquí evitamos duplicarlo)
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('.btn, .chip');
    if (!t || !window.SecSound) return;
    if (t.id === 'theme-toggle' || t.id === 'ascii-toggle' || t.id === 'sound-toggle') return;
    if (t.hasAttribute('aria-expanded')) return;
    window.SecSound.play('click');
  });
})();
