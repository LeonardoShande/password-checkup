/* Motor del "modo ASCII" (se carga en <head>, justo después de theme.js).
 *
 * Genera con JavaScript las imágenes SVG (en data: URI) que el CSS usa para dibujar con
 * caracteres: marcos +---+ con | laterales, la barra de progreso ####...., la textura de
 * fondo y las líneas. Se generan por tema (oscuro/claro) y se publican como variables CSS
 * (--af-*). Escribir variables con style.setProperty es CSSOM, así que cumple la CSP
 * estricta (no hay estilos inline en el HTML).
 *
 * API: window.AsciiMode = { isOn(), set(bool), refresh() } */
(function () {
  'use strict';

  var root = document.documentElement;
  var W = 7;   // ancho de una "celda" de carácter
  var H = 14;  // alto de una celda
  var FONT = "ui-monospace,Menlo,Consolas,DejaVu Sans Mono,monospace";

  var INK = {
    dark:  { frame: 'rgb(72,190,110)', dim: 'rgb(52,120,75)', tex: 'rgb(95,240,138)', texA: 0.09 },
    light: { frame: 'rgb(60,100,70)',  dim: 'rgb(130,155,130)', tex: 'rgb(30,70,40)', texA: 0.10 }
  };

  function uri(svg) { return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'; }

  function text(x, y, ch, extra) {
    return "<text x='" + x + "' y='" + y + "' " + (extra || '') + '>' + ch + '</text>';
  }

  // Marco 3x3 celdas: esquinas "+", bordes "-" y "|". Se usa con border-image (slice 14 7).
  function frame(ink) {
    var w = W * 3, h = H * 3, b = 11; // b = línea base dentro de la celda
    var t = '';
    [0, 1, 2].forEach(function (row) {
      var y = row * H + b;
      if (row === 1) { t += text(W * 0.5, y, '|') + text(W * 2.5, y, '|'); return; }
      t += text(W * 0.5, y, '+') + text(W * 1.5, y, '-') + text(W * 2.5, y, '+');
    });
    return uri("<svg xmlns='http://www.w3.org/2000/svg' width='" + w + "' height='" + h + "' viewBox='0 0 " + w + ' ' + h + "'>" +
      "<g font-family='" + FONT + "' font-size='11.6' text-anchor='middle' fill='" + ink + "'>" + t + '</g></svg>');
  }

  // Máscara de un carácter (solo canal alfa): la usa la barra de progreso para pintar con el color del nivel.
  function mask(ch) {
    return uri("<svg xmlns='http://www.w3.org/2000/svg' width='" + W + "' height='" + H + "' viewBox='0 0 " + W + ' ' + H + "'>" +
      text(W / 2, 11, ch, "font-family='" + FONT + "' font-size='11.6' font-weight='700' text-anchor='middle' fill='black'") + '</svg>');
  }

  function glyph(ch, ink) {
    return uri("<svg xmlns='http://www.w3.org/2000/svg' width='" + W + "' height='" + H + "' viewBox='0 0 " + W + ' ' + H + "'>" +
      text(W / 2, 11, ch, "font-family='" + FONT + "' font-size='11.6' text-anchor='middle' fill='" + ink + "'") + '</svg>');
  }

  // Textura de fondo: unos pocos caracteres sueltos, como ruido de terminal.
  function texture(ink, alpha) {
    var dots = [['.', 14, 18], ['+', 96, 34], [':', 150, 14], ['*', 52, 70], ['.', 126, 76], ["'", 28, 46],
      ['+', 160, 62], ['.', 74, 10], [',', 8, 80], ['-', 112, 54], ['.', 40, 30], ['*', 170, 88], ['.', 90, 94]];
    var body = dots.map(function (d) { return text(d[1], d[2], d[0]); }).join('');
    return uri("<svg xmlns='http://www.w3.org/2000/svg' width='180' height='104' viewBox='0 0 180 104'>" +
      "<g font-family='" + FONT + "' font-size='12' fill='" + ink + "' fill-opacity='" + alpha + "'>" + body + '</g></svg>');
  }

  function refresh() {
    var theme = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    var c = INK[theme];
    var set = function (k, v) { root.style.setProperty(k, v); };
    set('--af-frame', frame(c.frame));
    set('--af-hash', mask('#'));
    set('--af-track', glyph('.', c.dim));
    set('--af-rule', glyph('-', c.dim));
    set('--af-texture', texture(c.tex, c.texA));
  }

  function isOn() { return root.getAttribute('data-ascii') === 'on'; }

  function set(on) {
    root.setAttribute('data-ascii', on ? 'on' : 'off');
    try { localStorage.setItem('sec-ascii', on ? 'on' : 'off'); } catch (e) { /* almacenamiento bloqueado */ }
  }

  window.AsciiMode = { isOn: isOn, set: set, refresh: refresh };
  refresh();
})();
