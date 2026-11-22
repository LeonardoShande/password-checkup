# Registro de cambios

Formato libre, en español. Fechas en UTC-5 (hora del proyecto).

## v1.5.0

- **Logo nuevo**: un cofre cibernético (estilo bloques, tipo *voxel*) en morado/magenta/cian, con remaches y una gema luminosa como cerradura. Reemplaza el escudo anterior en `public/logo.svg`, `public/favicon.svg` y el símbolo inline de `index.html`/`lab.html`.
- **Más dinamismo en las secciones educativas**:
  - Las tarjetas de amenazas aparecen con una animación suave al llegar con el scroll (se puede desactivar con *reducir movimiento*).
  - El panel "Más info" se despliega y se repliega animado (antes aparecía/desaparecía de golpe), y la tarjeta abierta se resalta.
  - El icono de cada tarjeta reacciona levemente al pasar el cursor.
- **Bordes y jerarquía visual más claros**: una línea en degradado (cian→magenta) separa cada bloque grande de la página; los bordes de las tarjetas tienen más contraste; la tarjeta y el panel abiertos se distinguen del resto.
- **Sonido opcional**: un botón "Sonido" en la cabecera activa pequeños efectos *lofi/tecnológicos* sintetizados en el navegador (sin archivos de audio) para abrir/cerrar tarjetas, cambiar de pestaña, activar el modo ASCII, la terminal del laboratorio y los resultados del diccionario/SQLi. Está **apagado por defecto** y se recuerda la preferencia.
- **Estructura de repositorio**: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, plantillas de *issue* y de *pull request* en `.github/`.

## v1.4.0

- **Herramientas de defensa** (sección 06): despliegue "¿Qué es un CAPTCHA y cómo funciona?" con tipos, límites y cómo usarlo bien (la verificación siempre en el servidor).
- **Laboratorio de ataques** (`/lab.html`, también en el menú "Laboratorio"): cuatro pestañas simuladas con datos ficticios (diccionario, inyección SQL, hash paso a paso, terminal).
- Iconos en la sección 06 que abren cada herramienta en el laboratorio.
- El laboratorio no tiene scripts en línea (CSP) y construye el DOM sin `innerHTML`; hay pruebas que lo verifican.

## v1.3.0

- Diseño renovado: puntaje con brillo y escala de 5 niveles, lista de ataques con barra de color por riesgo, amenazas en rejilla de 2 columnas, titular con degradado y sellos de privacidad en el hero.

## v1.2.0

- Modo ASCII para toda la página (botón en la cabecera), con paletas oscura (terminal de fósforo verde) y clara (papel e tinta).

## v1.1.0

- Intro animada "SECURITY TECH" con logo y arte ASCII (se salta con ESC, toque o botón).
- Menú lateral con resaltado por scroll; tema oscuro/claro con arte ASCII espacial.
- Panel "Cómo podrían vulnerarla" en vivo mientras se escribe; sin espacios en la contraseña.
- Sección avanzada: analizador de URL y revisión de cabeceras de seguridad.
- Fuentes educativas más fiables (CISA, NIST, OWASP, MDN, Google, FIDO, HIBP).
- Zip reproducible y verificable con diseño ASCII.

## v1.0.0

- Primera versión: check-up de contraseñas con puntaje por entropía, panel de amenazas, explicaciones de cookies/registros y backend Node sin dependencias.
