const https = require('https');

/**
 * Envía mensaje WhatsApp via CallMeBot
 * @param {string} phone   - número con código de país, ej: +584121234567
 * @param {string} apiKey  - API key del técnico en CallMeBot
 * @param {string} message - texto del mensaje
 */
async function sendWhatsApp(phone, apiKey, message) {
  return new Promise((resolve, reject) => {
    if (!phone || !apiKey || !message) {
      return reject(new Error('phone, apiKey y message son requeridos'));
    }

    // Limpiar número — solo dígitos y +
    const cleanPhone = phone.replace(/[^\d+]/g, '');

    // Codificar mensaje para URL
    const encoded = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encoded}&apikey=${apiKey}`;

    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ WhatsApp enviado a ${cleanPhone}`);
          resolve({ ok: true, response: data });
        } else {
          console.warn(`⚠️ CallMeBot status ${res.statusCode}: ${data}`);
          resolve({ ok: false, response: data }); // resolve para no romper el flujo principal
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Error CallMeBot:', err.message);
      resolve({ ok: false, error: err.message }); // resolve — no bloquear la app
    });

    req.setTimeout(8000, () => {
      req.destroy();
      console.warn('⚠️ CallMeBot timeout');
      resolve({ ok: false, error: 'timeout' });
    });
  });
}

/**
 * Formatea y envía notificación de nueva solicitud al técnico
 */
async function notifyTechNewService({ tech, clientName, category, description, isEmergency, address }) {
  if (!tech.whatsappEnabled || !tech.whatsappNumber || !tech.callmebotApiKey) return;

  const emojiCat = {
    plomeria: '🔧', electricidad: '⚡', mecanica: '🚗',
    cerrajeria: '🔒', carpinteria: '🪵', ac_refrigeracion: '❄️',
    pintura: '🎨', gas: '🔥', electronica: '🖥️', otro: '🛠️',
  };

  const emoji = isEmergency ? '🚨' : (emojiCat[category] || '🛠️');
  const tipo  = isEmergency ? 'EMERGENCIA SOS' : 'Nueva solicitud';

  const msg = [
    `${emoji} *Tu HandyMan* — ${tipo}`,
    ``,
    `👤 Cliente: ${clientName}`,
    `🔧 Servicio: ${category.replace('_', ' ')}`,
    `📝 Descripción: ${description.slice(0, 100)}`,
    address ? `📍 Dirección: ${address}` : '',
    ``,
    `✅ Entra a Tu HandyMan para aceptar y cotizar el servicio.`,
    `🔗 https://tu-handyman.vercel.app/dashboard`,
  ].filter(Boolean).join('\n');

  return sendWhatsApp(tech.whatsappNumber, tech.callmebotApiKey, msg);
}

module.exports = { sendWhatsApp, notifyTechNewService };
