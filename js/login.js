const API_BASE = 'https://mercadoalertabackend-1.onrender.com';

const form = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const noticeMsg = document.getElementById('noticeMsg');
const submitBtn = document.getElementById('submitBtn');

// Si venimos recién confirmando el correo (ver confirmar-cuenta.js), mostramos
// un aviso de bienvenida.
if (new URLSearchParams(window.location.search).get('verificado') === '1') {
  noticeMsg.textContent = 'Tu cuenta fue confirmada correctamente. Ya puedes iniciar sesión.';
  noticeMsg.style.display = 'block';
}

// Si la sesión se cerró sola por inactividad (ver js/inactivity-logout.js),
// avisamos por qué en vez de dejar al usuario preguntándose qué pasó.
if (new URLSearchParams(window.location.search).get('sesion_expirada') === '1') {
  noticeMsg.textContent = 'Tu sesión se cerró automáticamente por inactividad. Vuelve a iniciar sesión.';
  noticeMsg.style.display = 'block';
}

const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const iconEye = togglePassword.querySelector('.icon-eye');
const iconEyeOff = togglePassword.querySelector('.icon-eye-off');

// El botón arranca deshabilitado (ver atributo en login.html) y solo se
// habilita cuando Cloudflare Turnstile confirma "soy humano" — si el desafío
// expira o falla, se vuelve a deshabilitar.
window.onTurnstileSuccess = () => { submitBtn.disabled = false; };
window.onTurnstileExpired = () => { submitBtn.disabled = true; };

togglePassword.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  iconEye.style.display = isHidden ? 'none' : '';
  iconEyeOff.style.display = isHidden ? '' : 'none';
  togglePassword.setAttribute('aria-pressed', String(isHidden));
  togglePassword.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.style.display = 'none';
  noticeMsg.style.display = 'none';

  // window.turnstile lo inyecta el script de Cloudflare cargado en el <head>.
  const captchaToken = window.turnstile ? window.turnstile.getResponse() : '';
  if (!captchaToken) {
    errorMsg.textContent = 'Completa la verificación "soy humano" para continuar';
    errorMsg.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Ingresando...';

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, captchaToken }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    // Guardamos el token en localStorage (antes sessionStorage) para que la
    // sesión sobreviva a cerrar la pestaña, mientras el navegador siga
    // abierto — decisión de producto tomada a sabiendas del trade-off de
    // seguridad frente a XSS (un token robado dura más si el sitio tuviera
    // esa vulnerabilidad). El cierre de sesión por inactividad (ver
    // inactivity-logout.js) sigue aplicando igual, ahora compartido entre
    // pestañas vía la marca de tiempo en localStorage.
    localStorage.setItem('token', data.token);
    localStorage.setItem('lastActivityAt', String(Date.now()));

    // Chequeo de trial vencido: se hace UNA vez, acá, justo después del
    // login — no en cada llamada a la API mientras la sesión ya está abierta
    // (si vence a mitad de una sesión, el usuario sigue navegando hasta que
    // vuelva a loguearse; el resto de las llamadas del dashboard igual van a
    // fallar con 402 vía requireEmpresaActiva, pero eso es un caso aparte).
    try {
      const meRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const meData = await meRes.json();
      const trialVencido = meRes.ok
        && meData.usuario?.plan === 'trial'
        && meData.usuario?.fecha_expiracion_trial
        && new Date(meData.usuario.fecha_expiracion_trial) < new Date();

      // Mismo mecanismo, otro motivo: canceló su suscripción y ya pasó el
      // período que había pagado (ver migración 039 y POST /api/pagos/cancelar).
      // trial-vencido.html decide qué texto mostrar mirando estos mismos
      // campos — no hace falta una página aparte para esto.
      const accesoCanceladoTerminado = meRes.ok
        && meData.usuario?.suscripcion_cancelada_en
        && meData.usuario?.acceso_hasta
        && new Date(meData.usuario.acceso_hasta) < new Date();

      window.location.href = (trialVencido || accesoCanceladoTerminado) ? 'trial-vencido.html' : 'dashboard.html';
    } catch {
      // Si el chequeo mismo falla (ej. sin conexión un instante), no vale
      // la pena bloquear el login por eso — el dashboard igual va a mostrar
      // su propio banner de trial vencido si corresponde.
      window.location.href = 'dashboard.html';
    }
  } catch (err) {
    errorMsg.textContent = err.message;
    errorMsg.style.display = 'block';
    submitBtn.textContent = 'Iniciar sesión';
    // El reset invalida el token ya usado, así que el botón vuelve a quedar
    // deshabilitado hasta que se complete el desafío de nuevo (onTurnstileSuccess).
    submitBtn.disabled = true;
    if (window.turnstile) window.turnstile.reset();
  }
});
