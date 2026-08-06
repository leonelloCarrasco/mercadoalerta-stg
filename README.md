# MercadoAlerta

Terminal de monitoreo de Mercado Público. Configura alertas por monto, región y categoría para Licitaciones y Compras Ágiles, y recibe avisos automáticos por email o Telegram apenas aparece algo que calza con lo que buscas.

Este repositorio contiene el frontend estático (landing + dashboard de la app). El backend (API de auth, empresas, alertas y notificaciones) vive en otro servicio, consumido vía `API_BASE`.

## Estructura

- `index.html` — landing pública (planes, cómo funciona, FAQ).
- `dashboard.html` — panel de alertas del usuario autenticado.
- `login.html`, `register.html`, `forgot-password.html`, `reset-password.html` — flujo de autenticación.
- `pre-registro-empresa.html` — registro/validación de RUT de la empresa antes de crear el primer usuario.
- `simular-pago.html` — simulación de pago para pruebas de planes.
- `css/`, `js/` — estilos y scripts de cada página (mismo nombre base que su `.html`).
- `assets/` — logo, íconos e imágenes.
- `docs/` — copia publicada vía GitHub Pages.

## Autenticación y API

El token de sesión se guarda en `sessionStorage` (no `localStorage`) para reducir el riesgo de robo vía XSS. Cada página protegida (`dashboard.html`) redirige a `login.html` si no hay token.

`API_BASE` apunta a `http://localhost:3000` en desarrollo local y a `https://api.mercadoalerta.cl` en producción.

## Deploy

El sitio se sirve como estático. El dominio de la landing está definido en `CNAME` (`mercadoalerta.cl`).
