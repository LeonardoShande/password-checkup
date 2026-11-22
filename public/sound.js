/* Motor de sonido "lofi/tecnológico" para Security Tech.
 *
 * No usa archivos de audio: cada efecto es un tono corto sintetizado con la Web Audio API
 * (osciladores + un filtro paso-bajo, para que suene más "lofi" que un bip agudo).
 * Está APAGADO por defecto (los navegadores bloquean el audio sin que el usuario interactúe antes,
 * y además es mejor no sonar sin permiso). El botón de la cabecera lo activa, y queda recordado
 * en localStorage. Respeta "reducir movimiento" como pista de que el usuario prefiere menos estímulos,
 * pero el control real es el botón: activar/desactivar manda sobre cualquier preferencia.
 *
 * API: window.SecSound = { isOn(), set(bool), play(name) }
 */
(function () {
  'use strict';

  var KEY = 'sec-sound';
  var ctx = null;
  var on = false;
  try { on = localStorage.getItem(KEY) === 'on'; } catch (e) { /* almacenamiento bloqueado */ }

  function getCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  }

  // Un tono breve con envolvente (ataque rápido, caída suave) y un filtro que le quita brillo,
  // para que recuerde a un synth lofi en vez de a una alarma.
  function tone(freq, opts) {
    var c = getCtx();
    if (!c) return;
    opts = opts || {};
    var dur = opts.dur || 0.14;
    var type = opts.type || 'sine';
    var gainPeak = opts.gain != null ? opts.gain : 0.07;
    var now = c.currentTime;

    var osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), now + dur);

    var filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(opts.cutoff || 1800, now);

    var gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filter).connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  // "Acordes" cortos: varias notas a la vez, para los sonidos de abrir/cerrar/activar.
  function chord(freqs, opts) { freqs.forEach(function (f) { tone(f, opts); }); }

  var SOUNDS = {
    click: function () { tone(520, { type: 'triangle', dur: 0.07, gain: 0.05, cutoff: 2200 }); },
    toggleOn: function () { chord([392, 587], { type: 'triangle', dur: 0.16, gain: 0.055, cutoff: 2400, slideTo: 700 }); },
    toggleOff: function () { chord([392, 294], { type: 'triangle', dur: 0.16, gain: 0.05, cutoff: 1400, slideTo: 220 }); },
    open: function () { tone(330, { type: 'sine', dur: 0.18, gain: 0.06, cutoff: 1600, slideTo: 480 }); },
    close: function () { tone(330, { type: 'sine', dur: 0.14, gain: 0.05, cutoff: 1200, slideTo: 220 }); },
    tab: function () { tone(440, { type: 'square', dur: 0.06, gain: 0.03, cutoff: 1500 }); },
    hit: function () { chord([660, 880], { type: 'square', dur: 0.12, gain: 0.05, cutoff: 2600 }); },
    error: function () { tone(180, { type: 'sawtooth', dur: 0.2, gain: 0.05, cutoff: 900, slideTo: 90 }); },
    type: function () { tone(1200 + Math.random() * 300, { type: 'square', dur: 0.025, gain: 0.018, cutoff: 3000 }); },
  };

  function isOn() { return on; }

  function set(next) {
    on = !!next;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* almacenamiento bloqueado */ }
    if (on) { getCtx(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
  }

  function play(name) {
    if (!on) return;
    var fn = SOUNDS[name];
    if (!fn) return;
    if (ctx && ctx.state === 'suspended') ctx.resume();
    try { fn(); } catch (e) { /* el audio puede fallar en algunos navegadores; no debe romper la página */ }
  }

  window.SecSound = { isOn: isOn, set: set, play: play };
})();
