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

const form = document.getElementById('resetForm');
const errorMsg = document.getElementById('errorMsg');
const noticeMsg = document.getElementById('noticeMsg');
const submitBtn = document.getElementById('submitBtn');

const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
  form.style.display = 'none';
  errorMsg.textContent = 'Este link de recuperación no es válido. Solicita uno nuevo.';
  errorMsg.style.display = 'block';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.style.display = 'none';
  noticeMsg.style.display = 'none';

  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('passwordConfirm').value;

  if (password !== passwordConfirm) {
    errorMsg.textContent = 'Las contraseñas no coinciden';
    errorMsg.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Guardando...';

  try {
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al restablecer la contraseña');
    }

    noticeMsg.textContent = 'Contraseña actualizada. Redirigiendo a inicio de sesión...';
    noticeMsg.style.display = 'block';
    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
  } catch (err) {
    errorMsg.textContent = err.message;
    errorMsg.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar nueva contraseña';
  }
});
