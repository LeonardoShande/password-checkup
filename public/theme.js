/* Se carga en <head> y de forma síncrona para evitar parpadeos:
 *  - aplica el tema guardado (o el del sistema) ANTES de pintar;
 *  - decide si se muestra la intro (una vez por sesión del navegador).
 * Todo el acceso a almacenamiento va en try/catch: puede estar bloqueado. */
(function () {
  'use strict';
  var root = document.documentElement;

  var theme = null;
  try { theme = localStorage.getItem('sec-theme'); } catch (e) { /* almacenamiento bloqueado */ }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  root.setAttribute('data-theme', theme);

  // Modo ASCII (desactivado por defecto): se recuerda la elección.
  var ascii = 'off';
  try { ascii = localStorage.getItem('sec-ascii') === 'on' ? 'on' : 'off'; } catch (e) { /* ignorar */ }
  root.setAttribute('data-ascii', ascii);

  var seen = false;
  try { seen = sessionStorage.getItem('sec-intro-seen') === '1'; } catch (e) { /* ignorar */ }
  if (!seen) {
    root.classList.add('intro-on');
    // Red de seguridad: si intro.js no carga, la página nunca queda bloqueada.
    window.__introFailsafe = setTimeout(function () { root.classList.remove('intro-on'); }, 12000);
  }
})();
