```
____   _____   ____  _   _  ____   ___  _____ __   __
/ ___| | ____| / ___|| | | ||  _ \ |_ _||_   _|\ \ / /
\___ \ |  _|  | |    | | | || |_) | | |   | |   \ V /
 ___) || |___ | |___ | |_| ||  _ <  | |   | |    | |
|____/ |_____| \____| \___/ |_| \_\|___|  |_|    |_|

 _____  _____   ____  _   _
|_   _|| ____| / ___|| | | |
  | |  |  _|  | |    | |_| |
  | |  | |___ | |___ |  _  |
  |_|  |_____| \____||_| |_|
```

<p align="center"><img src="public/logo.svg" alt="Logo de Security Tech" width="120"></p>

# Security Tech · Check-up de contraseñas

Página educativa donde escribes una contraseña y, debajo, ves **qué tan segura es** y **de cuántas formas podrían vulnerarla en la web**. Backend Node sin dependencias + frontend HTML/CSS/JS.
```
`
 .      *       _.-""""""-._      .            /\        +
    .        .-'  .   .     '-.        *      /  \    .
   ==========.-----------------.==========   | () |
   *         '.   .    .   .  .'       .     |    |  *
         .      '-.......-'       +        /_|____|_\
`
```
## Novedades de la v1.5

- **Logo nuevo**: un cofre cibernético (estilo bloques, tipo *voxel*) en morado/magenta/cian con una gema luminosa como cerradura, reemplazando el escudo anterior.
- **Más dinamismo**: las tarjetas de amenazas aparecen con una animación suave al hacer scroll, el panel "Más info" se despliega animado (en vez de aparecer de golpe) y la tarjeta abierta se resalta.
- **Bordes y jerarquía más claros**: una línea en degradado separa cada bloque grande de la página y los bordes de las tarjetas tienen más contraste.
- **Sonido opcional**: botón "Sonido" en la cabecera con efectos *lofi/tecnológicos* sintetizados en el navegador (sin archivos de audio), apagado por defecto.
- **Estructura de repositorio**: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md` y plantillas de *issue*/*pull request*.

El historial completo de versiones (v1.0 a v1.4) está en [CHANGELOG.md](CHANGELOG.md).

## Ejecutar

Requiere **Node.js 20 o superior**.

```bash
npm start            # http://127.0.0.1:3000
npm run dev          # con recarga automática
npm test             # tests (node:test, sin instalar nada)
npm run package      # genera dist/password-checkup-vX.Y.Z.zip seguro
npm run static       # genera dist/site/: versión sin servidor para abrirla en el celular
```

| Variable      | Por defecto | Para qué                                                                  |
|---------------|-------------|---------------------------------------------------------------------------|
| `PORT`        | `3000`      | Puerto                                                                    |
| `HOST`        | `127.0.0.1` | Usa `0.0.0.0` en contenedores o hosting                                   |
| `TRUST_PROXY` | _(vacío)_   | `1` si hay un proxy de confianza (IP real, `https` real y cabecera HSTS) |

## Verla en el celular (sin servidor)

1. Ejecuta `npm run static`. Se crea `dist/site/`.
2. Sube esa carpeta a un hosting de archivos estáticos con HTTPS (por ejemplo **Netlify Drop**, arrastrando la carpeta, o **GitHub Pages**).
3. Abre el enlace en el navegador del celular.

Limitaciones de la versión estática: no tiene cabeceras de seguridad del servidor (CSP, HSTS), y las demos de cookies y registros muestran **datos de ejemplo** capturados al generarla.

## Estructura

```text
password-checkup/
├── server.js              Backend (Node http, sin dependencias)
├── src/
│   ├── scoring.js         Puntaje de contraseñas (compartido Node/navegador)
│   ├── attacks.js         «Cómo podrían vulnerarla» a partir del análisis
│   ├── urlcheck.js        Analizador de URL (sin red)
│   └── content.js         Contenido educativo y fuentes
├── public/
│   ├── index.html · styles.css · app.js
│   ├── theme.js           Tema sin parpadeo + decide si hay intro
│   ├── intro.js           Intro animada (ESC / tap / botón)
│   ├── art.js             Arte ASCII espacial y rótulo (oscuro y claro)
│   ├── ascii.js           Motor del modo ASCII (marcos, barra, textura)
│   ├── sound.js           Efectos de sonido sintetizados (lofi/tech), opcionales
│   ├── lab.html · lab.js · lab.css   Laboratorio de ataques simulados
│   └── logo.svg · favicon.svg   Cofre cibernético (logo)
├── scripts/
│   ├── package.js · verify.js · banner.js   Zip reproducible y su verificación
│   ├── static-site.js     Sitio estático (sin servidor), para subir a un hosting
│   └── single-html.js     Versión en 1 archivo .html, para abrir con doble clic
├── test/                  56 pruebas (puntaje, URL, servidor, laboratorio, paquete)
├── .github/               CI, CodeQL, Release con atestación, Dependabot, plantillas
├── CONTRIBUTING.md · CODE_OF_CONDUCT.md · CHANGELOG.md · SECURITY.md
└── LICENSE                MIT (reemplaza `<TU NOMBRE>` antes de publicar)
```

## Cómo se calcula el puntaje

1. **Entropía ingenua** = `longitud × log2(tamaño del alfabeto)` (26 minúsculas, 26 mayúsculas, 10 dígitos, 33 símbolos, 20 otros).
2. **Entropía efectiva**: cada patrón detectado «cuesta» menos bits que escribirlo al azar.

   | Patrón                                  | Coste en bits                             |
   |-----------------------------------------|-------------------------------------------|
   | Palabra o clave común (con leet)        | 11 (+1 mayúscula, +1 por sustitución)     |
   | Patrón de teclado (`asdf`)              | bits/carácter + log2(largo) + 2           |
   | Secuencia (`abc`, `4567`)               | bits/carácter + log2(largo) + 1           |
   | Repetición (`aaaa`) / bloque (`abcabc`) | bits/carácter + log2(repeticiones)        |
   | Año (`1998`)                            | 7                                         |

3. **Bits → puntaje** por tramos: <28 → 0–19 · 28–35 → 20–39 · 36–59 → 40–59 · 60–79 → 60–79 · ≥80 → 80–100.
4. **Topes**: común → máx. 5 · casi todo patrones → máx. 25 · <8 caracteres → máx. 39 · <12 → máx. 79.
5. **Tiempos** (promedio = mitad del espacio): web con límite (100/h), web sin límite (10/s), base robada con hash lento (10 mil/s) y con hash rápido (10 mil millones/s).

### Limitaciones

- El diccionario es **pequeño a propósito**; un atacante real usa millones de entradas. En producción combina esto con [zxcvbn](https://github.com/dropbox/zxcvbn) o una lista de filtraciones.
- El analizador de URL es una **heurística**: sin alertas no significa que el sitio sea legítimo.
- Rechazar espacios es una decisión de diseño del verificador. NIST SP 800-63B recomienda que *los sitios* los acepten, pero muchos los recortan, así que aquí se sugiere separar con `-` o `_`.

## Seguridad y privacidad de la app

- **La contraseña nunca llega al servidor** (no existe `/api/analyze`).
- **CSP estricta** sin inline, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP/CORP y **HSTS** cuando la conexión es HTTPS.
- **Registro mínimo**: método, ruta *sin query string*, estado, duración, IP anonimizada (SHA-256 con sal por arranque) y navegador.
- **Límite de peticiones** en `/api/*`, bloqueo de path traversal y lista blanca de los únicos módulos que se exponen en `/shared/`.
- DOM construido con `createElement`/`textContent`; sin `innerHTML` con datos.

## 🔐 Seguridad del zip

`npm run package` genera `dist/password-checkup-vX.Y.Z.zip` y su `.sha256`:

```text
+-----------------------------+----------------------------------------------+
| Lista blanca                | solo archivos regulares; sin node_modules,   |
|                             | .git, dist, .env, ocultos ni symlinks        |
| Escáner de secretos         | claves privadas, tokens, rutas locales: si   |
|                             | aparece algo, NO genera el paquete           |
| Reproducible                | orden fijo, fecha fija, permisos 0644, sin   |
|                             | compresión: mismo código = mismo hash        |
| SHA256SUMS + MANIFEST.txt   | hash de cada archivo dentro del zip          |
| <zip>.sha256                | hash del zip, aparte                         |
| Verificador                 | rutas seguras (anti zip-slip), límites (anti |
|                             | zip-bomb), CRC-32, hashes y carpeta raíz     |
| Release con atestación      | procedencia firmada con Sigstore (Actions)   |
+-----------------------------+----------------------------------------------+
```

```bash
sha256sum -c password-checkup-v1.4.0.zip.sha256      # integridad del zip
node scripts/verify.js password-checkup-v1.4.0.zip   # revisión interna completa
unzip -z password-checkup-v1.4.0.zip                 # banner y comandos de verificación
```

> La integridad **no es confidencialidad**: el zip no va cifrado. Si necesitas cifrarlo, hazlo aparte (por ejemplo con `age` o 7-Zip AES-256) y comparte la clave por otro canal.

Más detalles y cómo reportar vulnerabilidades: [SECURITY.md](SECURITY.md).

## API

| Método | Ruta                                          | Descripción                                    |
|--------|-----------------------------------------------|------------------------------------------------|
| GET    | `/api/health`                                 | Estado                                         |
| GET    | `/api/content`                                | Secciones por grupo (amenazas, avanzado, defensa) |
| GET    | `/api/demo/session`                           | 2 cookies de demostración y sus atributos      |
| GET    | `/api/demo/logs`                              | Tus últimas entradas del registro (IP anónima) |
| GET    | `/shared/scoring.js · attacks.js · urlcheck.js` | Módulos compartidos con el navegador           |

## Publicar en GitHub

Antes de publicar, reemplaza `<TU NOMBRE>` en `LICENSE`.

**Repositorio nuevo** (con `gh`, el CLI de GitHub):

```bash
cd password-checkup
git init -b main
git add .
git commit -m "Security Tech v1.5"
gh repo create password-checkup --public --source=. --push

# Release firmada con atestación:
git tag v1.5.0 && git push --tags
```

**Subirlo a un repositorio que ya existe:**

```bash
cd password-checkup
git init -b main
git add .
git commit -m "Security Tech v1.5"
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
git tag v1.5.0 && git push --tags
```

Después de subirlo, en *Settings → Code security* activa Dependabot y los avisos privados de seguridad (los workflows de `.github/` ya están listos: CI, CodeQL y Release con atestación de procedencia).

## Licencia

MIT. Ver `LICENSE`.
