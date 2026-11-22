/* Intro animada "SECURITY TECH".
 *  - Se puede saltar con ESC, tocando/pulsando la pantalla o con el botón "Saltar".
 *  - Se muestra una vez por sesión (theme.js decide) y se puede repetir desde el menú o el pie.
 *  - Respeta prefers-reduced-motion (intro mucho más corta y sin animaciones). */
(function () {
  'use strict';

  var root = document.documentElement;
  var intro = document.getElementById('intro');
  var app = document.getElementById('app');
  if (!intro) return;

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var DURATION = reduce ? 1500 : 5200;
  var running = false;
  var timer = null;
  var lastFocus = null;
  var skipBtn = document.getElementById('intro-skip');

  // Fuente de bloques 5x5 (solo las letras que usa el rótulo).
  var FONT = {
    S: [' ████', '█    ', ' ███ ', '    █', '████ '],
    E: ['█████', '█    ', '████ ', '█    ', '█████'],
    C: [' ████', '█    ', '█    ', '█    ', ' ████'],
    U: ['█   █', '█   █', '█   █', '█   █', ' ███ '],
    R: ['████ ', '█   █', '████ ', '█  █ ', '█   █'],
    I: ['█████', '  █  ', '  █  ', '  █  ', '█████'],
    T: ['█████', '  █  ', '  █  ', '  █  ', '  █  '],
    Y: ['█   █', ' █ █ ', '  █  ', '  █  ', '  █  '],
    H: ['█   █', '█   █', '█████', '█   █', '█   █']
  };

  function render(word) {
    var rows = [];
    for (var r = 0; r < 5; r++) {
      var line = [];
      for (var i = 0; i < word.length; i++) line.push(FONT[word[i]][r]);
      rows.push(line.join('  '));
    }
    return rows.join('\n');
  }

  function buildStars() {
    var box = document.getElementById('intro-stars');
    if (!box || box.children.length) return;
    var chars = ['.', '·', '*', '+', '.'];
    for (var i = 0; i < 46; i++) {
      var s = document.createElement('span');
      s.className = 'istar';
      s.textContent = chars[i % chars.length];
      s.style.left = (Math.random() * 100).toFixed(1) + '%';
      s.style.top = (Math.random() * 100).toFixed(1) + '%';
      s.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';
      box.appendChild(s);
    }
  }

  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); finish(); }
  }
  function onPointer() { finish(); }

  function finish() {
    if (!running) return;
    running = false;
    clearTimeout(timer);
    clearTimeout(window.__introFailsafe);
    try { sessionStorage.setItem('sec-intro-seen', '1'); } catch (e) { /* ignorar */ }
    document.removeEventListener('keydown', onKey, true);
    intro.removeEventListener('pointerdown', onPointer);
    intro.classList.add('out');
    setTimeout(function () {
      root.classList.remove('intro-on');
      intro.classList.remove('out', 'run');
      if (app) app.removeAttribute('inert');
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignorar */ } }
    }, reduce ? 0 : 450);
  }

  function start() {
    if (running) return;
    running = true;
    lastFocus = document.activeElement;
    clearTimeout(window.__introFailsafe);
    root.classList.add('intro-on');
    if (app) app.setAttribute('inert', '');
    intro.classList.remove('out', 'run');
    void intro.offsetWidth; // reinicia las animaciones CSS
    intro.classList.add('run');
    document.addEventListener('keydown', onKey, true);
    intro.addEventListener('pointerdown', onPointer);
    if (skipBtn) skipBtn.focus({ preventScroll: true });
    timer = setTimeout(finish, DURATION);
  }

  document.getElementById('intro-l1').textContent = render('SECURITY');
  document.getElementById('intro-l2').textContent = render('TECH');
  buildStars();

  window.SecurityIntro = { play: start, skip: finish };
  if (root.classList.contains('intro-on')) start();
})();
