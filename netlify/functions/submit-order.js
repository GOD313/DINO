exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false });
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {}
  const code = 'DINO-' + Date.now().toString(36).toUpperCase();
  const name = clean(body.name);
  const phone = maskPhone(clean(body.phone));
  const type = clean(body.type || 'request');
  const message = clean(body.message || '').slice(0, 700);
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (token && chatId) {
    const text = 'DINO Request\nCode: ' + code + '\nType: ' + type + '\nName: ' + name + '\nPhone: ' + phone + '\nMessage: ' + message;
    try {
      await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text })
      });
    } catch (_) {}
  }
  return json(200, { ok: true, code });
};
function clean(v){ return String(v || '').replace(/[<>]/g,'').trim(); }
function maskPhone(v){ return v.length > 4 ? v.slice(0,3) + '***' + v.slice(-2) : v; }
function json(statusCode, data){ return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(data) }; }
