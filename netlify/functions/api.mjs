import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'karatshod-click-control';
const DEFAULT_ADMIN_USER = process.env.ADMIN_USER || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe-Strong-Password';
const APP_SECRET = process.env.APP_SECRET || 'dev-secret-change-me-before-production';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
  'content-type': 'application/json; charset=utf-8'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), { status, headers: corsHeaders });
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload) {
  const encoded = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', APP_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', APP_SECRET).update(encoded).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

function sanitizePublicConfig(config) {
  return {
    brand: config.brand,
    site: config.site,
    modules: config.modules,
    ports: config.ports,
    legal: config.legal,
    updatedAt: config.updatedAt
  };
}

function defaultConfig() {
  return {
    brand: {
      name: 'KaratShod Click',
      panelDomain: 'my.karatshod.click',
      accent: '#18d6a3'
    },
    site: {
      title: 'پنل مرکزی KaratShod Click',
      subtitle: 'مدیریت پورت‌ها، UID کاربران، قالب استخدام مهر و اتصال‌های سرویس',
      baseUrl: process.env.SITE_BASE_URL || 'https://my.karatshod.click',
      downloadUrl: '#',
      telegramRelayUrl: process.env.TELEGRAM_RELAY_URL || '',
      officialMode: false
    },
    modules: {
      mehrHiring: true,
      uidPort: true,
      deviceConsent: true,
      finance: true,
      telegramRelay: false,
      appDownload: true
    },
    ports: {
      'mehr-hiring': {
        portId: 'PORT-MEHR-HIRING-001',
        uidPrefix: 'MEHR',
        title: 'سامانه ثبت درخواست همکاری مهر',
        enabled: true,
        requireDeviceConsent: true,
        statusText: 'درخواست شما ثبت شد و UID اختصاصی برای پیگیری صادر شد.',
        disclaimer: 'این قالب نمونه مستقل است و تا زمان دریافت مجوز/تایید رسمی نباید به عنوان سامانه رسمی بانک معرفی شود.'
      }
    },
    legal: {
      consentText: 'با ثبت درخواست، با صدور UID اختصاصی و ذخیره حداقلی اطلاعات فنی دستگاه برای امنیت حساب موافقت می‌کنم.',
      dataPolicy: 'اطلاعات فنی فقط به‌صورت هش‌شده برای تشخیص دستگاه در همان پورت ذخیره می‌شود.'
    },
    updatedAt: new Date().toISOString()
  };
}

async function readJson(store, key, fallback) {
  const raw = await store.get(key, { type: 'text', consistency: 'strong' });
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

async function writeJson(store, key, value) {
  await store.set(key, JSON.stringify(value, null, 2), { metadata: { updatedAt: new Date().toISOString() } });
}

async function getConfig(store) {
  const config = await readJson(store, 'config.json', null);
  if (config) return config;
  const initial = defaultConfig();
  await writeJson(store, 'config.json', initial);
  await writeJson(store, 'submissions-index.json', []);
  return initial;
}

function safeText(value, max = 240) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
}

function makeUid(prefix = 'KS') {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${date}-${rand}`;
}

async function parseBody(request) {
  const text = await request.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

function routePath(request) {
  const url = new URL(request.url);
  let pathname = url.pathname;
  pathname = pathname.replace(/^\/\.netlify\/functions\/api/, '');
  pathname = pathname.replace(/^\/api/, '');
  return pathname || '/';
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') return new Response('', { status: 204, headers: corsHeaders });

  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  const path = routePath(request);

  try {
    if (request.method === 'GET' && path === '/status') {
      return json({ ok: true, service: 'KaratShod Click Netlify API', time: new Date().toISOString() });
    }

    if (request.method === 'GET' && path === '/config') {
      const config = await getConfig(store);
      return json({ ok: true, config: sanitizePublicConfig(config) });
    }

    if (request.method === 'POST' && path === '/admin/login') {
      const body = await parseBody(request);
      const username = safeText(body.username, 80);
      const password = String(body.password || '');
      if (username !== DEFAULT_ADMIN_USER || password !== DEFAULT_ADMIN_PASSWORD) {
        return json({ ok: false, error: 'نام کاربری یا رمز عبور نادرست است.' }, 401);
      }
      const token = sign({ sub: username, role: 'admin', iat: Date.now(), exp: Date.now() + 1000 * 60 * 60 * 8 });
      return json({ ok: true, token, expiresInHours: 8 });
    }

    if (request.method === 'GET' && path === '/admin/overview') {
      const auth = verifyToken(request);
      if (!auth) return json({ ok: false, error: 'دسترسی مدیر معتبر نیست.' }, 401);
      const config = await getConfig(store);
      const index = await readJson(store, 'submissions-index.json', []);
      const submissions = [];
      for (const uid of index.slice(-200).reverse()) {
        const item = await readJson(store, `submission/${uid}.json`, null);
        if (item) submissions.push(item);
      }
      return json({ ok: true, config, submissions, counts: { submissions: index.length, latestShown: submissions.length } });
    }

    if (request.method === 'POST' && path === '/admin/config') {
      const auth = verifyToken(request);
      if (!auth) return json({ ok: false, error: 'دسترسی مدیر معتبر نیست.' }, 401);
      const current = await getConfig(store);
      const body = await parseBody(request);

      const next = structuredClone(current);
      if (body.site) {
        next.site.title = safeText(body.site.title, 140) || next.site.title;
        next.site.subtitle = safeText(body.site.subtitle, 220) || next.site.subtitle;
        next.site.downloadUrl = safeText(body.site.downloadUrl, 500) || '#';
        next.site.telegramRelayUrl = safeText(body.site.telegramRelayUrl, 500);
        next.site.officialMode = Boolean(body.site.officialMode);
      }
      if (body.modules) {
        for (const key of Object.keys(next.modules)) {
          if (key in body.modules) next.modules[key] = Boolean(body.modules[key]);
        }
      }
      if (body.ports?.['mehr-hiring']) {
        const port = body.ports['mehr-hiring'];
        next.ports['mehr-hiring'].title = safeText(port.title, 160) || next.ports['mehr-hiring'].title;
        next.ports['mehr-hiring'].enabled = Boolean(port.enabled);
        next.ports['mehr-hiring'].requireDeviceConsent = Boolean(port.requireDeviceConsent);
        next.ports['mehr-hiring'].statusText = safeText(port.statusText, 260) || next.ports['mehr-hiring'].statusText;
        next.ports['mehr-hiring'].disclaimer = safeText(port.disclaimer, 300) || next.ports['mehr-hiring'].disclaimer;
      }
      next.updatedAt = new Date().toISOString();
      await writeJson(store, 'config.json', next);
      return json({ ok: true, config: next });
    }

    if (request.method === 'POST' && path === '/uid/issue') {
      const config = await getConfig(store);
      const body = await parseBody(request);
      const portKey = safeText(body.portKey, 80) || 'mehr-hiring';
      const port = config.ports[portKey];
      if (!port || !port.enabled || !config.modules.uidPort) return json({ ok: false, error: 'این پورت فعلاً فعال نیست.' }, 403);
      if (port.requireDeviceConsent && !body.consentDevice) return json({ ok: false, error: 'برای صدور UID باید رضایت شفاف ثبت شود.' }, 400);

      const uid = makeUid(port.uidPrefix || 'KS');
      const item = {
        uid,
        portKey,
        portId: port.portId,
        fullName: safeText(body.fullName, 120),
        mobile: safeText(body.mobile, 40),
        nationalCode: safeText(body.nationalCode, 30),
        jobTitle: safeText(body.jobTitle, 120),
        notes: safeText(body.notes, 500),
        consentDevice: Boolean(body.consentDevice),
        deviceHash: safeText(body.deviceHash, 128),
        deviceLabel: safeText(body.deviceLabel, 160),
        status: 'received',
        statusText: port.statusText,
        createdAt: new Date().toISOString()
      };

      await writeJson(store, `submission/${uid}.json`, item);
      const index = await readJson(store, 'submissions-index.json', []);
      index.push(uid);
      await writeJson(store, 'submissions-index.json', Array.from(new Set(index)).slice(-1000));

      return json({ ok: true, uid, status: item.status, statusText: item.statusText, item });
    }

    if (request.method === 'POST' && path === '/uid/status') {
      const body = await parseBody(request);
      const uid = safeText(body.uid, 64).toUpperCase();
      const item = await readJson(store, `submission/${uid}.json`, null);
      if (!item) return json({ ok: false, error: 'UID پیدا نشد.' }, 404);
      return json({ ok: true, uid: item.uid, portKey: item.portKey, status: item.status, statusText: item.statusText, createdAt: item.createdAt });
    }

    return json({ ok: false, error: 'مسیر API پیدا نشد.', path }, 404);
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: 'خطای داخلی سرویس.', detail: process.env.NODE_ENV === 'development' ? String(error?.message || error) : undefined }, 500);
  }
}
