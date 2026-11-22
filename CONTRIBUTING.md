# Contribuir a Security Tech

Gracias por tu interés. El proyecto es intencionalmente simple: **cero dependencias**, HTML/CSS/JS planos y Node puro. Cualquier cambio debería mantener esa filosofía.

## Antes de empezar

1. Requiere **Node.js 20 o superior**.
2. Instala nada (no hay `npm install` que valga, no hay dependencias de producción). Clona y ejecuta:
   ```bash
   npm start        # http://127.0.0.1:3000
   npm run dev       # con recarga automática
   npm test          # 56 pruebas (node:test), sin instalar nada
   ```

## Estructura rápida

| Carpeta/archivo | Qué es |
|---|---|
| `server.js` | Backend (Node `http`, sin dependencias) |
| `src/` | Lógica compartida Node/navegador: puntaje, ataques, analizador de URL, contenido educativo |
| `public/` | Frontend: `index.html` (check-up) y `lab.html` (laboratorio simulado), CSS y JS |
| `test/` | Pruebas con `node:test` |
| `scripts/` | Empaquetado reproducible (`package.js`), verificación (`verify.js`), sitio estático (`static-site.js`), HTML único (`single-html.js`) |

## Reglas que el proyecto sigue siempre

- **Sin dependencias de producción.** Si crees que hace falta una librería, probablemente se pueda resolver con \~50 líneas propias; ábrelo a discusión en un issue primero.
- **Sin `innerHTML` con datos.** El DOM se construye con `createElement`/`textContent` (ver el helper `h()` en `app.js`/`lab.js`).
- **CSP estricta, sin scripts ni estilos inline.** Cualquier JS o CSS nuevo va en su propio archivo `.js`/`.css`.
- **La contraseña nunca sale del navegador.** No añadas un endpoint que la reciba.
- **El laboratorio de ataques (`lab.html`) es 100% simulado.** Nada de red real, nada de objetivos reales: solo datos ficticios dentro del propio archivo.
- Todo cambio de frontend debería probarse en **modo oscuro, claro y ASCII**, y en una vista de escritorio y una de móvil.

## Flujo para un cambio

1. Crea una rama descriptiva (`feat/…`, `fix/…`).
2. Haz el cambio y añade o actualiza pruebas en `test/` cuando corresponda.
3. Corre `npm test` y, si tocaste algo de empaquetado, `npm run package && npm run verify -- dist/*.zip`.
4. Abre un *pull request* describiendo el cambio y cómo lo probaste (incluye capturas si es algo visual).

## Reportar un problema de seguridad

No lo abras como issue público. Sigue las instrucciones de [SECURITY.md](SECURITY.md).
