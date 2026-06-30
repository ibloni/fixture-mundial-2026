# Fixture Mundial FIFA 2026

Editor web simple para cargar, consultar y proyectar el fixture del Mundial FIFA 2026.

## Estructura

- `index.html`: estructura base de la app.
- `css/styles.css`: estilos generales y layout responsive.
- `js/app.js`: navegacion entre vistas y render de grupos.
- `js/data/teams.js`: equipos disponibles.
- `js/data/groups.js`: composicion inicial de los 12 grupos.

## Uso

Abrir `index.html` en el navegador. No requiere servidor ni dependencias externas, salvo la fuente cargada desde Google Fonts.

## Datos

La base actual deja cargados los tres paises anfitriones y espacios `TBD` para completar los grupos. Cuando se cargue informacion oficial o pronosticos, se actualizan `js/data/teams.js` y `js/data/groups.js`.
