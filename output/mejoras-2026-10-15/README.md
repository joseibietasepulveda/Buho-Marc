# Evidencia visual · 15 de octubre de 2026

Capturas reales de Chromium contra la aplicación local con datos ficticios. Escritorio 1440×1000; móvil 390×844, sin desbordamiento horizontal. No son maquetas ni consultas a clientes reales.

- [Mis Marcas y terceros](brands.png).
- [Vigilancia: una fila por cruce](watch.png), [umbral y controles de IA](threshold.png), [vista móvil](watch-mobile.png).
- [Clases vinculadas debajo de agrupación](linked-classes.png).
- [Pago disponible desde la tarjeta](payment-before.png), [pago informado y Deshacer](payment-after.png).
- [PDF de ejemplo](informe-ejemplo.pdf), [Word de ejemplo](informe-ejemplo.docx), [página 1](informe-pagina-1.png), [página 2](informe-pagina-2.png).

El informe usa una conclusión escrita expresamente para QA. No se presenta como resultado de una llamada al modelo. PDF: ambas páginas renderizadas e inspeccionadas; Word: generación y estructura/XML verificados en pruebas, sin renderizado de Word en esta ronda.

## Reproducir UI

Requiere dependencias del proyecto y Playwright con Chromium disponible. Los puertos/directorio siguientes son exclusivos de esta ronda; elegir otros si están ocupados.

```sh
BUHO_LOCAL_PORT=3107 BUHO_LOCAL_DB_PORT=55447 BUHO_LOCAL_DATA_DIR="$PWD/.buho-local/improvements" npm run dev:local
```

En otra terminal del mismo clon, sembrar únicamente su base ficticia. El script rechaza bases con host/nombre/puerto distintos del ambiente local esperado. La contraseña siguiente es la predeterminada pública del lanzador local, no una credencial de producción.

```sh
DATABASE_URL=postgresql://postgres:buho-local-only@127.0.0.1:55447/buho_local BUHO_LOCAL_DB_PORT=55447 node --import ./tests/ts-loader.mjs tests/portfolio-ui-seed.mjs
node tests/portfolio-ui-browser.mjs
```

Si Playwright está en un runtime externo, establecer `PLAYWRIGHT_MODULE` a su `index.mjs`; `BUHO_UI_SESSION_FILE`, `BUHO_UI_ORIGIN` y `BUHO_UI_OUTPUT` permiten cambiar sesión local, puerto y carpeta de capturas. Los archivos de sesión quedan dentro de `.buho-local`, excluido de Git.

El navegador bloquea peticiones fuera de 127.0.0.1. Cambia únicamente las banderas de proveedor/configuración de las respuestas GET locales para mostrar las pantallas reales sobre los fixtures; listas, filtros y pago/reversión usan los endpoints y PostgreSQL locales. No habilita proveedor externo ni llave de IA. Verifica el botón de búsqueda sin clase, selección vinculada 7→8, enlace oficial, terceros, pago sin abrir detalle, reversión y errores de navegador.

## Reproducir documentos

```sh
node --import ./tests/ts-loader.mjs tests/portfolio-report-example.mjs
pdftoppm -scale-to 1200 -png output/mejoras-2026-10-15/informe-ejemplo.pdf output/mejoras-2026-10-15/informe-pagina
```

La renderización produjo dos páginas. Poppler informó una advertencia de Fontconfig del runtime; ambas imágenes resultaron legibles y completas. No se instalaron dependencias de producción para generar esta evidencia.
