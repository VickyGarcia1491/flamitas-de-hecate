// Correo transaccional con la API HTTP de Resend, sin dependencias.
// Nunca registrar destinatarios, enlaces, tokens ni la clave: solo nombres de variables y códigos.

// Dirección pública del sitio para armar enlaces; nunca se usa el header Host.
export function publicUrl(value, production = false) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' && (production || url.protocol !== 'http:')) return null;
  if (url.username || url.password || url.search || url.hash) return null;
  return url.origin + url.pathname.replace(/\/+$/, '');
}

export function createMailer(config = {}, request = fetch, timeoutMs = 10000) {
  return async function send({to, subject, text, html}) {
    const missing = ['RESEND_API_KEY', 'MAIL_FROM'].filter(key => !config[key]);
    if (missing.length) {
      console.warn('Correo desactivado: falta configurar ' + missing.join(' y ') + '. No se envió el correo.');
      return false;
    }
    const response = await request('https://api.resend.com/emails', {
      method: 'POST',
      headers: {Authorization: 'Bearer ' + config.RESEND_API_KEY, 'Content-Type': 'application/json'},
      body: JSON.stringify({from: config.MAIL_FROM, to: [to], subject, text, html}),
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!response.ok) throw Object.assign(new Error('Resend rechazó el envío.'), {status: response.status});
    return true;
  };
}

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// Texto simple, sin imágenes ni píxeles de seguimiento.
export function passwordResetEmail(link, siteUrl) {
  const contacto = siteUrl + '/contacto.html';
  const text = [
    'Hola:',
    '',
    'Recibimos un pedido para restablecer la contraseña de tu cuenta en Flamitas de Hécate.',
    'Para elegir una contraseña nueva, abrí este enlace:',
    '',
    link,
    '',
    'El enlace vence en 1 hora y sirve una sola vez.',
    'Si no lo pediste, podés ignorar este correo: tu contraseña no cambia.',
    '',
    'Si necesitás ayuda, escribinos desde ' + contacto
  ].join('\n');
  const html = '<p>Hola:</p>' +
    '<p>Recibimos un pedido para restablecer la contraseña de tu cuenta en Flamitas de Hécate.</p>' +
    '<p><a href="' + escape(link) + '">Elegir una contraseña nueva</a></p>' +
    '<p>Si el enlace no se abre, copiá este enlace en tu navegador:<br>' + escape(link) + '</p>' +
    '<p>El enlace vence en 1 hora y sirve una sola vez.<br>Si no lo pediste, podés ignorar este correo: tu contraseña no cambia.</p>' +
    '<p>Si necesitás ayuda, escribinos desde <a href="' + escape(contacto) + '">' + escape(contacto) + '</a></p>';
  return {subject: 'Restablecer tu contraseña de Flamitas', text, html};
}
