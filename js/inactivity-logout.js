// Cierre de sesión automático por inactividad — coexiste con que la sesión
// ahora persiste al cerrar la pestaña (ver login.js: el token vive en
// localStorage, no sessionStorage).
//
// Como localStorage se comparte entre pestañas del mismo sitio, el reloj de
// inactividad TAMBIÉN se comparte: en vez de que cada pestaña cuente sus
// propios minutos con un setTimeout en memoria (que se pierde al cerrar la
// pestaña), se guarda una marca de tiempo `lastActivityAt` en localStorage
// y cada pestaña abierta la chequea periódicamente contra el reloj real.
// Esto da, gratis, dos comportamientos que queremos:
//   1) Cerrar la pestaña NO resetea el reloj — si pasaron los 5 minutos
//      mientras estaba cerrada, se cierra sesión apenas se reabre, sin
//      esperar a que se cumplan otros 5 minutos desde cero.
//   2) Actividad en una pestaña mantiene viva la sesión en las demás
//      pestañas abiertas del mismo sitio (decisión de producto: si hay
//      alguien usando el sitio en cualquier pestaña, no tiene sentido
//      cerrarle la sesión a las otras).
//
// Este archivo asume que la página que lo carga ya validó que hay un token
// en localStorage (dashboard.js / admin.js redirigen a login.html si no lo
// hay, ANTES de que este script llegue a ejecutarse) — no vuelve a chequear
// sesión por su cuenta, salvo por inactividad ya vencida al cargar (ver
// chequearAlCargar).
//
// Reutiliza las clases .modal-overlay/.modal/.modal-message/.modal-actions
// que ya existen en css/dashboard.css (mismas que usa confirmModal) — no
// hace falta CSS nuevo, y el modal se inyecta solo, así que basta con
// agregar <script src="js/inactivity-logout.js"></script> a cualquier
// página autenticada para tener el comportamiento, sin tocar su HTML.
(function () {
  const INACTIVIDAD_MS = 10 * 60 * 1000; // 10 minutos — configurable, se mantiene así a propósito
  const CUENTA_REGRESIVA_S = 10; // 10 segundos para cancelar el cierre
  const CHEQUEO_INTERVALO_MS = 2000; // cada cuánto se revisa el reloj compartido

  const CLAVE_ULTIMA_ACTIVIDAD = 'lastActivityAt';
  const EVENTOS_ACTIVIDAD = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

  // Umbral mínimo entre escrituras a localStorage por actividad — evita
  // escribir en cada pixel de un mousemove continuo; no afecta la precisión
  // real (2s de margen es insignificante contra un umbral de minutos).
  const THROTTLE_MS = 1000;

  let timerChequeoPeriodico = null;
  let timerCuentaRegresiva = null;
  let segundosRestantes = CUENTA_REGRESIVA_S;
  let ultimaEscritura = 0;
  let modalEl = null;

  function marcarActividad() {
    localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(Date.now()));
  }

  function ultimaActividadRegistrada() {
    const valor = Number(localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD));
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  }

  function crearModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.className = 'modal-overlay';
    modalEl.id = 'inactividadModal';
    modalEl.innerHTML = `
      <div class="modal">
        <p class="modal-message">
          Tu sesión está por cerrarse por inactividad.<br>
          Se cerrará en <strong id="inactividadSegundos">${CUENTA_REGRESIVA_S}</strong> segundos.
        </p>
        <div class="modal-actions">
          <button type="button" class="btn" id="inactividadSeguirBtn">Seguir conectado</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);
    document.getElementById('inactividadSeguirBtn').addEventListener('click', cancelarCierreSesion);
    return modalEl;
  }

  function cerrarSesionPorInactividad() {
    localStorage.removeItem('token');
    localStorage.removeItem(CLAVE_ULTIMA_ACTIVIDAD);
    window.location.href = 'login.html?sesion_expirada=1';
  }

  function mostrarAviso() {
    crearModal();
    segundosRestantes = CUENTA_REGRESIVA_S;
    document.getElementById('inactividadSegundos').textContent = segundosRestantes;
    modalEl.classList.add('open');

    clearInterval(timerCuentaRegresiva);
    timerCuentaRegresiva = setInterval(() => {
      segundosRestantes -= 1;
      const span = document.getElementById('inactividadSegundos');
      if (span) span.textContent = segundosRestantes;
      if (segundosRestantes <= 0) {
        clearInterval(timerCuentaRegresiva);
        cerrarSesionPorInactividad();
      }
    }, 1000);
  }

  function ocultarAviso() {
    clearInterval(timerCuentaRegresiva);
    if (modalEl) modalEl.classList.remove('open');
  }

  // Cancela el cierre de sesión — requiere una acción explícita del usuario
  // ("Seguir conectado"), no cualquier movimiento de mouse mientras el aviso
  // ya está en pantalla, para que un roce accidental no reinicie el reloj
  // sin que el usuario realmente haya vuelto a la página.
  function cancelarCierreSesion() {
    ocultarAviso();
    marcarActividad();
  }

  // Chequeo periódico contra el reloj COMPARTIDO (localStorage) — no un
  // timer propio de esta pestaña. Así, si otra pestaña tuvo actividad
  // recién, esta pestaña lo ve en el próximo chequeo (a lo sumo
  // CHEQUEO_INTERVALO_MS de atraso) y no muestra el aviso de la nada.
  function chequearInactividad() {
    const ultimaActividad = ultimaActividadRegistrada();
    if (ultimaActividad === null) {
      // No debería pasar (login.js siempre estampa la marca al iniciar
      // sesión), pero si pasa, se trata como actividad recién ahora en vez
      // de cerrar sesión por un dato faltante.
      marcarActividad();
      return;
    }

    const inactivoPorMs = Date.now() - ultimaActividad;

    if (modalEl && modalEl.classList.contains('open')) {
      // El aviso ya está mostrándose en ESTA pestaña — si otra pestaña tuvo
      // actividad mientras tanto, se refleja acá y se cierra el aviso solo,
      // sin esperar a que la persona haga clic en "Seguir conectado".
      if (inactivoPorMs < INACTIVIDAD_MS) ocultarAviso();
      return;
    }

    if (inactivoPorMs >= INACTIVIDAD_MS) mostrarAviso();
  }

  EVENTOS_ACTIVIDAD.forEach((evento) => {
    document.addEventListener(evento, () => {
      // Mientras el aviso ya está abierto, la actividad "de fondo" no lo
      // cancela sola — ver cancelarCierreSesion.
      if (modalEl && modalEl.classList.contains('open')) return;

      const ahora = Date.now();
      if (ahora - ultimaEscritura < THROTTLE_MS) return;
      ultimaEscritura = ahora;
      marcarActividad();
    }, { passive: true });
  });

  // Reacciona al toque a los cambios de OTRAS pestañas (el evento 'storage'
  // solo se dispara en pestañas distintas a la que hizo el cambio, nunca en
  // la propia) — si el token desapareció (logout en otra pestaña, o esta
  // misma función en otra pestaña), esta pestaña también cierra sesión, sin
  // esperar al próximo chequeo periódico.
  window.addEventListener('storage', (evento) => {
    if (evento.key === 'token' && evento.newValue === null) {
      window.location.href = 'login.html?sesion_expirada=1';
    }
  });

  // Al cargar/reabrir la pestaña: si ya pasaron los 5 minutos mientras
  // estaba cerrada (o en otra pestaña sin que esta se enterara), se cierra
  // sesión directo, SIN el aviso de 10 segundos — no tiene sentido avisarle
  // a alguien que recién está abriendo la página en este momento.
  function chequearAlCargar() {
    const ultimaActividad = ultimaActividadRegistrada();
    if (ultimaActividad !== null && Date.now() - ultimaActividad >= INACTIVIDAD_MS) {
      cerrarSesionPorInactividad();
      return;
    }
    marcarActividad();
  }

  chequearAlCargar();
  timerChequeoPeriodico = setInterval(chequearInactividad, CHEQUEO_INTERVALO_MS);
})();
