// Detecta automáticamente si estamos en desarrollo local o en producción
const API_BASE = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:3000'
  // Staging: cualquier hostname que contenga "staging" (ej. el nombre que
  // le pongas al Static Site de Render) apunta al backend de staging,
  // nunca al de producción — así no hace falta acordarse de configurar
  // esto a mano en cada deploy nuevo.
  : window.location.hostname.includes('staging')
  ? 'https://mercadoalertabackend-1.onrender.com'
  : 'https://api.mercadoalerta.cl';

// El plan viene de la landing como ?plan=trial|basico|full — si no viene
// (ej. alguien entra directo a register.html), asumimos trial.
const plan = new URLSearchParams(window.location.search).get('plan') || 'trial';
const planLabelEl = document.getElementById('planSeleccionado');
if (planLabelEl) {
  const nombres = { trial: 'Trial (14 días gratis)', basico: 'Basic', full: 'Full' };
  planLabelEl.textContent = nombres[plan] || plan;
}

const form = document.getElementById('registerForm');
const errorMsg = document.getElementById('errorMsg');
const noticeMsg = document.getElementById('noticeMsg');
const submitBtn = document.getElementById('submitBtn');
const rutEmpresaInput = document.getElementById('rutEmpresa');

// Formatea a medida que se escribe: "761234285" -> "76.123.428-5"
function formatearRut(valor) {
  const limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase();
  if (!limpio) return '';

  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const dv = limpio.slice(-1);
  return cuerpo ? `${cuerpo}-${dv}` : dv;
}

// Mismo algoritmo (módulo 11) que src/utils/rut.js en el backend — se valida
// acá también para dar feedback inmediato sin esperar el roundtrip al servidor.
function calcularDigitoVerificador(cuerpo) {
  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

function validarRut(rutCrudo) {
  const limpio = String(rutCrudo || '').replace(/[.\s]/g, '').toUpperCase();
  const match = limpio.match(/^(\d{7,8})-?([\dK])$/);
  if (!match) return false;

  const [, cuerpo, dv] = match;
  return calcularDigitoVerificador(cuerpo) === dv;
}

// Celular chileno: +56 9 seguido de 8 dígitos (el "56" es opcional para
// aceptar también el número sin código de país, ej. "912345678").
const TELEFONO_REGEX = /^\+?56?9\d{8}$/;

function validarTelefono(telefonoCrudo) {
  const limpio = String(telefonoCrudo || '').replace(/[\s-]/g, '');
  return TELEFONO_REGEX.test(limpio);
}

document.querySelectorAll('.toggle-password').forEach((toggleBtn) => {
  const targetInput = document.getElementById(toggleBtn.dataset.target);
  const iconEye = toggleBtn.querySelector('.icon-eye');
  const iconEyeOff = toggleBtn.querySelector('.icon-eye-off');

  toggleBtn.addEventListener('click', () => {
    const isHidden = targetInput.type === 'password';
    targetInput.type = isHidden ? 'text' : 'password';
    iconEye.style.display = isHidden ? 'none' : '';
    iconEyeOff.style.display = isHidden ? '' : 'none';
    toggleBtn.setAttribute('aria-pressed', String(isHidden));
    toggleBtn.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
});

const rutEmpresaHint = document.getElementById('rutEmpresaHint');

function mostrarErrorRut(mostrar) {
  rutEmpresaInput.classList.toggle('invalid', mostrar);
  rutEmpresaHint.classList.toggle('visible', mostrar);
  rutEmpresaHint.textContent = mostrar
    ? 'El RUT ingresado no es válido. Verifica el formato (ej. 12.345.678-9).'
    : '';
}

rutEmpresaInput.addEventListener('input', (e) => {
  const cursorAlFinal = e.target.selectionStart === e.target.value.length;
  e.target.value = formatearRut(e.target.value);
  if (cursorAlFinal) {
    e.target.setSelectionRange(e.target.value.length, e.target.value.length);
  }
  // Mientras se sigue escribiendo no interrumpimos con el error; se valida al salir del campo.
  mostrarErrorRut(false);
});

rutEmpresaInput.addEventListener('blur', () => {
  const valor = rutEmpresaInput.value.trim();
  mostrarErrorRut(valor.length > 0 && !validarRut(valor));
});

const telefonoInput = document.getElementById('telefono');
const telefonoHint = document.getElementById('telefonoHint');

function mostrarErrorTelefono(mostrar) {
  telefonoInput.classList.toggle('invalid', mostrar);
  telefonoHint.classList.toggle('visible', mostrar);
  telefonoHint.textContent = mostrar
    ? 'El teléfono ingresado no es válido. Verifica el formato (ej. +56 9 1234 5678).'
    : '';
}

telefonoInput.addEventListener('input', () => mostrarErrorTelefono(false));

telefonoInput.addEventListener('blur', () => {
  const valor = telefonoInput.value.trim();
  mostrarErrorTelefono(valor.length > 0 && !validarTelefono(valor));
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.style.display = 'none';
  noticeMsg.style.display = 'none';

  const nombre = document.getElementById('nombre').value;
  const apellido = document.getElementById('apellido').value;
  const email = document.getElementById('email').value;
  const telefono = document.getElementById('telefono').value;
  const rutEmpresa = document.getElementById('rutEmpresa').value;
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('passwordConfirm').value;
  const aceptaTerminos = document.getElementById('aceptaTerminos').checked;

  // Se juntan TODOS los errores de validación de una — antes se mostraba
  // uno a la vez (con "return" apenas fallaba el primero), así que alguien
  // con varios campos mal podía tardar 3-4 reintentos en enterarse de todos.
  const errores = [];
  let primerCampoInvalido = null;

  if (!validarTelefono(telefono)) {
    mostrarErrorTelefono(true);
    errores.push('El teléfono no es válido.');
    primerCampoInvalido = primerCampoInvalido || telefonoInput;
  }

  if (!validarRut(rutEmpresa)) {
    mostrarErrorRut(true);
    errores.push('El RUT de la empresa no es válido.');
    primerCampoInvalido = primerCampoInvalido || rutEmpresaInput;
  }

  if (password !== passwordConfirm) {
    errores.push('Las contraseñas no coinciden.');
    primerCampoInvalido = primerCampoInvalido || document.getElementById('passwordConfirm');
  }

  if (!aceptaTerminos) {
    errores.push('Debes aceptar los Términos y Condiciones.');
  }

  // window.turnstile lo inyecta el script de Cloudflare cargado en el <head>.
  const captchaToken = window.turnstile ? window.turnstile.getResponse() : '';
  if (!captchaToken) {
    errores.push('Completa la verificación "soy humano" para continuar.');
  }

  if (errores.length > 0) {
    errorMsg.innerHTML = errores.map((texto) => `• ${texto}`).join('<br>');
    errorMsg.style.display = 'block';
    if (primerCampoInvalido) primerCampoInvalido.focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creando cuenta...';

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre, apellido, email, telefono, rutEmpresa,
        password, passwordConfirm, aceptaTerminos, plan, captchaToken,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al crear la cuenta');
    }

    // No hay token todavía: la cuenta queda pendiente hasta confirmar el
    // correo (ver confirmar-cuenta.html), así que no redirigimos al dashboard.
    noticeMsg.textContent = data.mensaje;
    noticeMsg.style.display = 'block';
    form.reset();
    if (window.turnstile) window.turnstile.reset();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Cuenta creada — revisa tu correo';

    // El correo puede no llegar (spam, demora, typo) y antes no había
    // ninguna salida — quedaba trabado sin poder ni reintentar el registro
    // (el RUT/email ya existen). Se guarda el email para el reenvío.
    document.getElementById('reenviarConfirmacionBloque').style.display = 'block';
    document.getElementById('reenviarConfirmacionLink').dataset.email = email;
  } catch (err) {
    errorMsg.textContent = err.message;
    errorMsg.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Crear cuenta';
    if (window.turnstile) window.turnstile.reset();
  }
});

document.getElementById('reenviarConfirmacionLink').addEventListener('click', async (e) => {
  e.preventDefault();
  const link = e.target;
  const emailAReenviar = link.dataset.email;
  const msgEl = document.getElementById('reenviarConfirmacionMsg');

  if (!emailAReenviar) return;

  link.style.pointerEvents = 'none';
  const textoOriginal = link.textContent;
  link.textContent = 'Enviando...';

  try {
    const res = await fetch(`${API_BASE}/api/auth/reenviar-confirmacion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAReenviar }),
    });
    const data = await res.json();
    msgEl.textContent = data.mensaje || data.error || 'Listo.';
    msgEl.style.display = 'block';
  } catch (err) {
    msgEl.textContent = 'No pudimos reenviar el correo. Intenta de nuevo en un momento.';
    msgEl.style.display = 'block';
  } finally {
    link.style.pointerEvents = 'auto';
    link.textContent = textoOriginal;
  }
});
