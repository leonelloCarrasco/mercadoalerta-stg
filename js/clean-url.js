/**
 * Limpia el ".html" que se ve en la barra de direcciones — SOLO en
 * producción (mismo criterio de hostname que ya usa API_BASE en el resto
 * del proyecto). No toca ningún link ni dispara ninguna navegación nueva:
 * usa history.replaceState, que solo cambia lo que se ve en la barra sin
 * recargar nada.
 *
 * A propósito NO corre en localhost/127.0.0.1: la mayoría de los
 * servidores locales simples (python -m http.server, live-server, abrir el
 * archivo directo) no saben resolver una URL sin extensión de vuelta a su
 * .html — si acá también reescribiéramos la URL y alguien refrescara la
 * página, el servidor local tiraría 404. En producción (GitHub Pages) esto
 * no pasa: resuelve /dashboard -> dashboard.html sin configuración.
 *
 * Se incluye en el <head> de cada página HTML del sitio.
 */
(function () {
  const esLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (esLocal) return;

  const path = window.location.pathname;
  if (!path.endsWith('.html')) return;

  const limpia = path === '/index.html'
    ? '/'
    : path.replace(/\.html$/, '');

  history.replaceState(null, '', limpia + window.location.search + window.location.hash);
})();
