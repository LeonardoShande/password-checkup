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

+==========================================================================+
| PASSWORD-CHECKUP  ::  paquete v1.5.0                                     |
|                                                                          |
| Generado ........ 2026-01-01T00:00:00.000Z (fecha fija: reproducible)    |
| Archivos ........ 43                                                     |
| Tamano total .... 305674 bytes                                           |
| Formato ......... zip "stored", permisos 0644, sin archivos ocultos      |
+==========================================================================+

     BYTES  SHA-256 (16)       RUTA
  --------  ----------------  ----------------------------
      463  b05878164d4e522a  .github/ISSUE_TEMPLATE/bug_report.md
       27  13064e7bea658e01  .github/ISSUE_TEMPLATE/config.yml
      255  60aa69466e237f2a  .github/ISSUE_TEMPLATE/feature_request.md
      181  0441af0b0be728f5  .github/dependabot.yml
      615  f7c92ae3efefed37  .github/pull_request_template.md
      546  4371d11cc1c8cd1c  .github/workflows/ci.yml
      434  03b971fd98683df3  .github/workflows/codeql.yml
     1069  af8716a9bfbbef96  .github/workflows/release.yml
       64  a612697c15a198d5  .gitignore
     3079  b4a4b0e850a8de6a  CHANGELOG.md
     1275  6868f2e3b872e5cf  CODE_OF_CONDUCT.md
     2381  86c32cbc4f51b03f  CONTRIBUTING.md
     1068  996cf396eb19289b  LICENSE
    10857  d7e1c320577b6faf  README.md
     1495  342405e3bcf0414d  SECURITY.md
      785  85b5a8c04188c71c  package.json
    33807  abfec959c4792ab8  public/app.js
     1997  13aa6bceb59ad91e  public/art.js
     4029  b3293ac239554f01  public/ascii.js
     1651  50635edc451fa353  public/favicon.svg
    16502  2f082607c82a8ba2  public/index.html
     4011  f44211b730b5cf50  public/intro.js
     6733  ad0c77cc814267dd  public/lab.css
    11695  07c593bb94d4204c  public/lab.html
    17775  00e5269b9efeea1d  public/lab.js
     2557  d53d48bd1741f1e4  public/logo.svg
     3914  48f12ce77f27c120  public/sound.js
    45559  609bea3e44dcaab6  public/styles.css
     1273  5d45cd6726eebc0a  public/theme.js
     1325  3a566605f8710744  scripts/banner.js
    11642  54c5429d67552b2c  scripts/package.js
     5353  723fbe5ac62dab1a  scripts/single-html.js
     3822  b37c61db904ec882  scripts/static-site.js
     7594  ff6a88d1e029b827  scripts/verify.js
    10790  317e936408178e72  server.js
     4480  d5152dbd1aafd031  src/attacks.js
    24204  b1b8be866f869477  src/content.js
    20028  fcee46dd724bfae1  src/scoring.js
    11450  e7df0ea4309f4f5c  src/urlcheck.js
     7301  4699ebbd355d38e2  test/modules.test.js
     6474  2cd6d0f7721bdf5b  test/package.test.js
     5246  c7f1ce32ee46a1e9  test/scoring.test.js
     9868  a3dc00cafe07654e  test/server.test.js

+--------------------------------------------------------------------------+
| COMO VERIFICAR LA INTEGRIDAD                                             |
|                                                                          |
| 1) sha256sum -c password-checkup-v1.5.0.zip.sha256     (junto al .zip)   |
| 2) unzip el .zip, entra a la carpeta y ejecuta:                          |
|        sha256sum -c SHA256SUMS                                           |
| 3) o bien:  node scripts/verify.js <archivo.zip>                         |
|                                                                          |
| Si algun archivo no coincide, NO ejecutes el contenido.                  |
| Reconstruir:  npm run package   (mismo contenido = mismo hash)           |
+--------------------------------------------------------------------------+
