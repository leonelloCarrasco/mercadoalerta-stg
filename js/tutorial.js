/**
 * Tour guiado de bienvenida — se dispara solo la primera vez que el usuario
 * entra al dashboard (ver verificarTutorialOnboarding, enganchado desde
 * cargarUsuario() en dashboard.js) y también se puede volver a ver a mano
 * desde Ayuda (#verTourDeNuevoBtn).
 *
 * Motor: Driver.js v1 (CDN, cargado antes que este script en dashboard.html).
 * Reglas acordadas para este tour:
 *  - 7 pasos, uno por sección del sidebar: Inicio, Alertas, Notificaciones,
 *    Búsquedas, Oportunidades, Análisis de Precios, Análisis de Procesos.
 *  - Cada paso ENTRA a la sección real (mostrarSeccion, ya existe en
 *    dashboard.js) y muestra un overlay de ejemplo NO interactivo sobre el
 *    contenedor real — no se insertan datos falsos en las listas/tablas
 *    reales, así no hay nada que "limpiar" del lado de los datos.
 *  - El paso de Alertas resalta puntualmente el botón "+ Crear Alerta"
 *    (abrirNuevaAlertaBtn) en vez de la sección genérica.
 *  - Cualquier cierre del tour (terminarlo, la X, click afuera, Esc) cuenta
 *    como "visto" — no se vuelve a mostrar solo. Eso se maneja en un único
 *    lugar: el callback onDestroyed a nivel de instancia.
 */

const TUTORIAL_SECCIONES_MOBILE_EN_MAS = ['oportunidades', 'analisis', 'ia'];

/** Sección → contenedor real donde va el overlay mockeado. */
const TUTORIAL_CONTENEDOR_MOCK = {
  inicio: 'secInicio',
  notificaciones: 'historyCard',
  busquedas: 'busquedasCard',
  oportunidades: 'oportunidadesCard',
  analisis: 'analisisCard',
  ia: 'analisisMisAnalisisCard',
};

/**
 * Sección → id fijo del recuadro mockeado — ESTE es el elemento que Driver.js
 * resalta y usa como referencia para ubicar el popover, NO la tarjeta
 * completa. Resaltar la tarjeta completa (que incluye el mensaje de "vacío"
 * más el mock) la deja demasiado alta, y Driver.js termina superponiendo el
 * popover encima del contenido en vez de dejarlo debajo — resaltando solo
 * el recuadro chico del mock, siempre queda espacio limpio alrededor.
 */
const TUTORIAL_MOCK_ID = {
  notificaciones: 'tutorialMockNotificaciones',
  busquedas: 'tutorialMockBusquedas',
  oportunidades: 'tutorialMockOportunidades',
  analisis: 'tutorialMockAnalisis',
  ia: 'tutorialMockIa',
};

/**
 * Contenido de ejemplo por sección — todo con datos inventados, jamás
 * tocan datos reales del usuario. A propósito reutiliza las MISMAS clases
 * CSS que la UI real (.row/.row-info/.row-title/.row-meta, .tag-email,
 * .btn) en vez de un formato genérico — así el mock se ve igual a como se
 * va a ver de verdad, no como una maqueta aparte. Los botones de acción se
 * dejan `disabled`: son decorativos, no deben poder tocarse durante el tour.
 */
function tutorialHtmlMockInterno(nombreSeccion) {
  const encabezado = '<div style="font-size:11px; color:var(--gold); text-transform:uppercase; letter-spacing:0.06em; font-family:var(--font-mono); margin-bottom:10px;">Así se va a ver cuando tengas datos</div>';

  const mocks = {
    // Mismo formato exacto que renderHistorial (título, tipo, código, monto,
    // región, organismo, cierre) + tag de canal.
    notificaciones: `
      <div class="row" style="border-bottom:none;">
        <div class="row-info">
          <div class="row-title">Suministro de notebooks ↗</div>
          <div class="row-meta">
            <span>📋 Licitación</span><br>
            <span>Código: 1234-5-LE24 Compra de equipos</span><br>
            <span>Monto: $18.500.000</span><br>
            <span>Región: Metropolitana</span><br>
            <span>Organismo: Municipalidad de Ñuñoa</span><br>
            <span>Cierra: 12 ago. 2026, 18:00</span>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
          <span class="tag-email"><img src="/assets/icons/email.png" class="icon-desc-canal">&nbsp;</img>Email · hoy</span>
        </div>
      </div>`,

    // Mismo formato que renderBusquedas (título, tipo, modo, criterios) + botón Ejecutar.
    busquedas: `
      <div class="row" style="border-bottom:none;">
        <div class="row-info">
          <div class="row-title">Servicios de mantención eléctrica</div>
          <div class="row-meta"><span>📋 Licitación</span><span>Búsqueda guardada</span><span>4 resultados</span></div>
        </div>
        <button type="button" class="btn btn-ghost" disabled>▶ Ejecutar</button>
      </div>`,

    // Mismo formato que renderRecordatorios (título, tipo, código, organismo, monto, cierre, estado de aviso).
    oportunidades: `
      <div class="row" style="border-bottom:none;">
        <div class="row-info">
          <div class="row-title">Compra de equipos de laboratorio</div>
          <div class="row-meta">
            <span>⚡ Compra Ágil</span><br>
            <span>Código: 987-6-CM24</span><br>
            <span>Organismo: Universidad de Chile</span><br>
            <span>Monto: $4.200.000</span><br>
            <span>Cierra: 15 ago. 2026, 15:00</span><br>
            <span>⏳ Pendiente de avisar</span>
          </div>
        </div>
        <button type="button" class="btn btn-danger" disabled>✖ Eliminar</button>
      </div>`,

    // Mismo formato que construirVistaResumenPrecios (mínimo/promedio/máximo).
    analisis: `
      <p class="section-sub" style="margin-bottom:10px;">Notebook 15" i5 16GB — 12 registros</p>
      <div style="display:flex; gap:24px; flex-wrap:wrap;">
        <div><div class="section-sub">Mínimo</div><div style="font-size:18px; font-family:var(--font-mono);">$540.000</div></div>
        <div><div class="section-sub">Promedio</div><div style="font-size:18px; font-family:var(--font-mono); color:var(--gold);">$620.000</div></div>
        <div><div class="section-sub">Máximo</div><div style="font-size:18px; font-family:var(--font-mono);">$710.000</div></div>
      </div>`,

    // Mismo formato que renderMisAnalisis (título, tipo, código, adjuntos, fecha) + botón Ver.
    ia: `
      <div class="row" style="border-bottom:none;">
        <div class="row-info">
          <div class="row-title">1234-5-LE24 Compra de equipos</div>
          <div class="row-meta"><span>📋 Licitación</span><br><span>📄 Con bases</span><br><span>Analizado: hoy</span></div>
        </div>
        <button type="button" class="btn btn-ghost" disabled>Ver →</button>
      </div>`,
  };

  return encabezado + (mocks[nombreSeccion] || '');
}

/**
 * Pre-inserta TODOS los recuadros mockeados de una vez, ocultos
 * (display:none), antes de arrancar el tour — así cada uno ya existe en el
 * DOM con un id fijo (TUTORIAL_MOCK_ID) cuando Driver.js necesita
 * resaltarlo, sin depender de insertarlo justo a tiempo paso a paso. Un
 * elemento oculto no afecta el layout de su contenedor (display:none no
 * ocupa espacio), así que no altera cómo se ve ninguna sección todavía no
 * visitada del tour.
 */
function tutorialPrepararOverlays() {
  Object.entries(TUTORIAL_MOCK_ID).forEach(([nombreSeccion, mockId]) => {
    if (document.getElementById(mockId)) return; // ya existe (ej. se relanzó el tour desde Ayuda)
    const contenedor = document.getElementById(TUTORIAL_CONTENEDOR_MOCK[nombreSeccion]);
    if (!contenedor) return;

    const wrapper = document.createElement('div');
    wrapper.id = mockId;
    wrapper.className = 'tutorial-mock-overlay';
    wrapper.style.cssText = 'display:none; position:relative; margin-top:14px; border:1px dashed var(--gold); border-radius:8px; padding:14px; background:var(--surface-2);';
    wrapper.innerHTML = tutorialHtmlMockInterno(nombreSeccion);
    contenedor.appendChild(wrapper);
  });
}

/** Se llama una vez al terminar/cerrar el tour — saca del DOM los 6 recuadros mockeados por completo. */
function tutorialLimpiarOverlaysMock() {
  document.querySelectorAll('.tutorial-mock-overlay').forEach((el) => el.remove());
}

/** En mobile, Oportunidades/Análisis de Precios/Análisis de Procesos viven bajo el botón "Más" del bottombar — hay que abrirlo antes de resaltar, si no el contenido está oculto y Driver.js no encuentra dónde anclar el popover. */
function tutorialAbrirMasMenuSiCorresponde(nombreSeccion) {
  const bottombarMasBtn = document.getElementById('bottombarMasBtn');
  const bottombarMasMenu = document.getElementById('bottombarMasMenu');
  if (!bottombarMasBtn || !bottombarMasMenu) return; // no existe en desktop
  const estaVisibleMobile = bottombarMasBtn.offsetParent !== null;
  if (estaVisibleMobile && TUTORIAL_SECCIONES_MOBILE_EN_MAS.includes(nombreSeccion)) {
    bottombarMasMenu.classList.add('open');
  } else {
    bottombarMasMenu.classList.remove('open');
  }
}

async function tutorialMarcarCompletadoEnBackend() {
  try {
    await apiFetch('/api/auth/me/tutorial-completado', { method: 'POST' });
    if (window.usuarioActual) window.usuarioActual.tutorial_completado_at = new Date().toISOString();
  } catch (err) {
    // No bloquear la experiencia del usuario por esto — en el peor caso el
    // tour se vuelve a ofrecer en el próximo login, no es grave.
    console.error('[tutorial] No se pudo marcar el tour como completado:', err.message);
  }
}

function tutorialPasoBase(nombreSeccion, popover) {
  const mockId = TUTORIAL_MOCK_ID[nombreSeccion];
  return {
    element: `#${mockId}`,
    popover: { ...popover, showButtons: ['next', 'previous', 'close'] },
    onHighlightStarted: () => {
      mostrarSeccion(nombreSeccion);
      //tutorialAbrirMasMenuSiCorresponde(nombreSeccion);
      // Mostrar ANTES de que Driver.js mida — display:none → block es
      // sincrónico, así que para cuando Driver.js calcula la posición del
      // recuadro (inmediatamente después de este callback), ya tiene su
      // tamaño real.
      const el = document.getElementById(mockId);
      if (el) el.style.display = 'block';
    },
    onDeselected: () => {
      const el = document.getElementById(mockId);
      if (el) el.style.display = 'none';
    },
  };
}

async function tutorialConstruirPasos() {
  const tieneAnalisisPrecios = await tieneAcceso('accesoAnalisisPrecios');
  const notaUpgradeAnalisis = tieneAnalisisPrecios
    ? ''
    : '<br><br><span style="color:var(--gold);">Esto se desbloquea en el plan Full.</span>';

  return [
    {
      element: '#inicioStats',
      popover: {
        title: 'Tu panel de Inicio',
        description: 'Acá ves de un vistazo cuántas alertas tienes activas, cuántas notificaciones te han llegado, y un resumen de lo último que pasó.',
        side: 'bottom',
        showButtons: ['next', 'close'],
      },
      onHighlightStarted: () => mostrarSeccion('inicio'),
    },
    {
      element: '#abrirNuevaAlertaBtn',
      popover: {
        title: 'Crea tu primera alerta',
        description: 'Todo empieza acá: eliges un rubro o producto y MercadoAlerta revisa Mercado Público por ti, día y noche, avisándote apenas se publique algo que calce con tus preferencias.',
        side: 'bottom',
        showButtons: ['next', 'previous', 'close'],
      },
      onHighlightStarted: () => mostrarSeccion('alertas'),
    },
    tutorialPasoBase('notificaciones', {
      title: 'Notificaciones',
      description: 'Cada vez que una Licitación o Compra Ágil nueva calza con tus alertas — o cambia de estado — queda registrada acá, además de llegarte por correo (y Telegram o WhatsApp si los configuras).',
      side: 'bottom',
    }),
    tutorialPasoBase('busquedas', {
      title: 'Búsquedas',
      description: 'A diferencia de una alerta, una búsqueda es puntual: consulta en el momento contra Mercado Público y te muestra los resultados ahí mismo, sin quedar monitoreando hacia adelante.',
      side: 'bottom',
    }),
    tutorialPasoBase('oportunidades', {
      title: 'Oportunidades',
      description: 'Acá viven tus Recordatorios de cierre, el Seguimiento de estado, y tu Portafolio, para ir moviendo cada oportunidad por las etapas de tu propio proceso de venta.',
      side: 'bottom',
    }),
    tutorialPasoBase('analisis', {
      title: 'Análisis de Precios',
      description: `Busca un producto o rubro y revisa el historial de precios en los que se ha adjudicado antes — útil para calibrar tu oferta económica.${notaUpgradeAnalisis}`,
      side: 'bottom',
    }),
    tutorialPasoBase('ia', {
      title: 'Análisis de Procesos con IA',
      description: 'Ingresa el código de una Licitación o Compra Ágil, y sube las bases (o indica que no las tienes) — la IA te devuelve un resumen simple y un checklist de lo que exige, como apoyo para decidir más rápido.',
      side: 'bottom',
    }),
  ];
}

let tutorialDriverInstance = null;

async function iniciarTourOnboarding() {
  const driverFactory = window.driver && window.driver.js && window.driver.js.driver;
  if (!driverFactory) {
    console.error('[tutorial] Driver.js no cargó — se omite el tour.');
    return;
  }

  tutorialPrepararOverlays();
  const steps = await tutorialConstruirPasos();

  tutorialDriverInstance = driverFactory({
    steps,
    showProgress: true,
    progressText: 'Paso {{current}} de {{total}}',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Atrás',
    doneBtnText: 'Listo',
    overlayOpacity: 0.6,
    smoothScroll: true,
    onDestroyed: () => {
      tutorialLimpiarOverlaysMock();
      tutorialMarcarCompletadoEnBackend();
      cargarMisAnalisis();
      cargarCupoAnalisis();
    },
  });

  tutorialDriverInstance.drive();
}

/** Se llama desde cargarUsuario() en dashboard.js, una vez por carga del dashboard. */
function verificarTutorialOnboarding(usuario) {
  if (usuario.tutorial_completado_at) return;
  document.getElementById('tutorialBienvenidaModal').classList.add('open');
}

document.getElementById('tutorialBienvenidaEmpezarBtn').addEventListener('click', () => {
  document.getElementById('tutorialBienvenidaModal').classList.remove('open');
  iniciarTourOnboarding();
});

document.getElementById('tutorialBienvenidaSaltarBtn').addEventListener('click', () => {
  document.getElementById('tutorialBienvenidaModal').classList.remove('open');
  tutorialMarcarCompletadoEnBackend();
});

// Desde Ayuda: se relanza directo, sin pasar por el modal de bienvenida ni
// por tutorialMarcarCompletadoEnBackend acá — igual se vuelve a llamar solo
// al cerrar ESTE tour (onDestroyed), pero como ya estaba completado antes no
// cambia nada de comportamiento, solo actualiza la fecha.
document.getElementById('verTourDeNuevoBtn').addEventListener('click', () => {
  iniciarTourOnboarding();
});

window.verificarTutorialOnboarding = verificarTutorialOnboarding;
