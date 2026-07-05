const $ = (sel) => document.querySelector(sel);
const api = (path, options = {}) => fetch(`/api${path}`, {
  ...options,
  headers: { 'content-type': 'application/json', ...(options.headers || {}) }
}).then(async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || 'خطا در ارتباط با API');
  return data;
});
const tokenKey = 'ks_admin_token';
let currentConfig = null;

function moduleLabel(key){
  return ({ mehrHiring:'قالب استخدام مهر', uidPort:'UID Port', deviceConsent:'تشخیص دستگاه رضایتی', finance:'پنل مالی KaratShod', telegramRelay:'Telegram Relay', appDownload:'دانلود اپلیکیشن' })[key] || key;
}

function showStatus(el, text, type = 'ok'){
  el.classList.remove('hidden');
  el.textContent = text;
  el.style.borderColor = type === 'error' ? 'rgba(255,100,124,.42)' : 'rgba(24,214,163,.42)';
  el.style.color = type === 'error' ? '#ffdce3' : '#caffee';
}

async function loadPublicConfig(){
  try{
    const status = await api('/status');
    $('#apiState').textContent = status.ok ? 'API فعال است' : 'API نامشخص';
    const { config } = await api('/config');
    currentConfig = config;
    $('#siteTitle').textContent = config.site.title;
    $('#siteSubtitle').textContent = config.site.subtitle;
    $('#downloadBtn').href = config.site.downloadUrl || '#';
    $('#officialNote').textContent = config.site.officialMode ? 'Official Mode روشن است. متن‌ها و مسیرها طبق تنظیمات مدیر نمایش داده می‌شوند.' : 'حالت رسمی خاموش است. این نسخه برای نمونه/دمو و آماده‌سازی فنی است.';
  }catch(err){
    $('#apiState').textContent = 'API خطا دارد';
    $('#apiState').style.color = '#ffdce3';
  }
}

async function login(e){
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  try{
    const data = await api('/admin/login', { method:'POST', body: JSON.stringify(Object.fromEntries(form.entries())) });
    localStorage.setItem(tokenKey, data.token);
    showStatus($('#loginStatus'), 'ورود موفق بود. داشبورد باز شد.');
    await loadAdmin();
  }catch(err){
    showStatus($('#loginStatus'), err.message, 'error');
  }
}

async function authed(path, options = {}){
  const token = localStorage.getItem(tokenKey);
  return api(path, { ...options, headers: { authorization: `Bearer ${token}`, ...(options.headers || {}) } });
}

function bindConfig(config){
  const form = $('#configForm');
  form.siteTitle.value = config.site.title || '';
  form.siteSubtitle.value = config.site.subtitle || '';
  form.downloadUrl.value = config.site.downloadUrl || '';
  form.telegramRelayUrl.value = config.site.telegramRelayUrl || '';
  form.mehrTitle.value = config.ports['mehr-hiring'].title || '';
  form.statusText.value = config.ports['mehr-hiring'].statusText || '';
  form.disclaimer.value = config.ports['mehr-hiring'].disclaimer || '';
  const switches = $('#switches');
  switches.innerHTML = '';
  Object.entries(config.modules).forEach(([key, value]) => {
    const label = document.createElement('label');
    label.className = 'switch';
    label.innerHTML = `<span>${moduleLabel(key)}</span><input type="checkbox" name="module_${key}" ${value ? 'checked' : ''}>`;
    switches.appendChild(label);
  });
  const official = document.createElement('label');
  official.className = 'switch';
  official.innerHTML = `<span>Official Mode</span><input type="checkbox" name="officialMode" ${config.site.officialMode ? 'checked' : ''}>`;
  switches.appendChild(official);
  const portEnabled = document.createElement('label');
  portEnabled.className = 'switch';
  portEnabled.innerHTML = `<span>فعال بودن پورت مهر</span><input type="checkbox" name="mehrEnabled" ${config.ports['mehr-hiring'].enabled ? 'checked' : ''}>`;
  switches.appendChild(portEnabled);
  const consent = document.createElement('label');
  consent.className = 'switch';
  consent.innerHTML = `<span>اجبار رضایت تشخیص دستگاه</span><input type="checkbox" name="mehrConsent" ${config.ports['mehr-hiring'].requireDeviceConsent ? 'checked' : ''}>`;
  switches.appendChild(consent);
}

function renderSubmissions(items){
  const box = $('#submissions');
  if(!items.length){
    box.innerHTML = '<div class="status">هنوز UID یا درخواست جدیدی ثبت نشده است.</div>';
    return;
  }
  box.innerHTML = items.map(item => `
    <article class="submission">
      <b>${item.fullName || 'بدون نام'} <span class="badge">${item.status || 'received'}</span></b>
      <p class="small muted">پورت: ${item.portId || item.portKey} · شغل: ${item.jobTitle || '-'}</p>
      <span class="code">${item.uid}</span>
      <p class="small muted">موبایل: ${item.mobile || '-'} · دستگاه: ${item.deviceLabel || 'ثبت نشده'}</p>
      <p class="small muted">${new Date(item.createdAt).toLocaleString('fa-IR')}</p>
    </article>
  `).join('');
}

async function loadAdmin(){
  try{
    const data = await authed('/admin/overview');
    $('#publicIntro').classList.add('hidden');
    $('#adminPanel').classList.remove('hidden');
    currentConfig = data.config;
    bindConfig(data.config);
    $('#countSubmissions').textContent = data.counts.submissions;
    $('#countPorts').textContent = Object.keys(data.config.ports).length;
    $('#countModules').textContent = Object.values(data.config.modules).filter(Boolean).length;
    $('#officialMode').textContent = data.config.site.officialMode ? 'روشن' : 'خاموش';
    renderSubmissions(data.submissions || []);
  }catch(err){
    localStorage.removeItem(tokenKey);
    $('#publicIntro').classList.remove('hidden');
    $('#adminPanel').classList.add('hidden');
  }
}

async function saveConfig(e){
  e.preventDefault();
  const form = e.currentTarget;
  const modules = {};
  Object.keys(currentConfig.modules).forEach(key => modules[key] = Boolean(form[`module_${key}`]?.checked));
  const payload = {
    site: {
      title: form.siteTitle.value,
      subtitle: form.siteSubtitle.value,
      downloadUrl: form.downloadUrl.value,
      telegramRelayUrl: form.telegramRelayUrl.value,
      officialMode: Boolean(form.officialMode.checked)
    },
    modules,
    ports: {
      'mehr-hiring': {
        title: form.mehrTitle.value,
        enabled: Boolean(form.mehrEnabled.checked),
        requireDeviceConsent: Boolean(form.mehrConsent.checked),
        statusText: form.statusText.value,
        disclaimer: form.disclaimer.value
      }
    }
  };
  try{
    await authed('/admin/config', { method:'POST', body: JSON.stringify(payload) });
    showStatus($('#saveStatus'), 'تنظیمات ذخیره شد.');
    await loadAdmin();
    await loadPublicConfig();
  }catch(err){
    showStatus($('#saveStatus'), err.message, 'error');
  }
}

$('#loginForm').addEventListener('submit', login);
$('#configForm').addEventListener('submit', saveConfig);
$('#logoutBtn').addEventListener('click', () => { localStorage.removeItem(tokenKey); location.reload(); });
loadPublicConfig().then(() => { if(localStorage.getItem(tokenKey)) loadAdmin(); });
