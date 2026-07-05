const $ = (sel) => document.querySelector(sel);
const api = (path, options = {}) => fetch(`/api${path}`, {
  ...options,
  headers: { 'content-type': 'application/json', ...(options.headers || {}) }
}).then(async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || 'خطا در ارتباط با API');
  return data;
});

function setBox(el, html, type = 'ok'){
  el.classList.remove('hidden');
  el.innerHTML = html;
  el.style.borderColor = type === 'error' ? 'rgba(255,100,124,.42)' : 'rgba(24,214,163,.42)';
  el.style.color = type === 'error' ? '#ffdce3' : '#caffee';
}

async function loadConfig(){
  try{
    const { config } = await api('/config');
    const portConfig = config.ports['mehr-hiring'];
    $('#portTitleTop').textContent = portConfig.title;
    $('#portTitle').textContent = portConfig.title;
    $('#portId').textContent = portConfig.portId;
    $('#disclaimer').textContent = portConfig.disclaimer;
    $('#policyText').textContent = config.legal.dataPolicy;
    $('#consentText').textContent = config.legal.consentText;
    if(!portConfig.enabled){
      $('#applyForm').innerHTML = '<div class="status warning">این پورت فعلاً از پنل مادر غیرفعال شده است.</div>';
    }
  }catch(err){
    setBox($('#result'), err.message, 'error');
  }
}

async function submitApplication(e){
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const payload = {
    portKey: 'mehr-hiring',
    fullName: form.get('fullName'),
    mobile: form.get('mobile'),
    nationalCode: form.get('nationalCode'),
    jobTitle: form.get('jobTitle'),
    notes: form.get('notes'),
    consentDevice: Boolean(form.get('consentDevice')),
    deviceHash: 'not-collected',
    deviceLabel: 'consent-only'
  };
  try{
    const data = await api('/uid/issue', { method:'POST', body: JSON.stringify(payload) });
    setBox($('#result'), `
      <b>درخواست ثبت شد.</b>
      <span class="code">${data.uid}</span>
      <p>${data.statusText}</p>
      <p>این UID را برای پیگیری نگه دارید.</p>
    `);
    e.currentTarget.reset();
  }catch(err){
    setBox($('#result'), err.message, 'error');
  }
}

async function trackUid(e){
  e.preventDefault();
  const uid = new FormData(e.currentTarget).get('uid');
  try{
    const data = await api('/uid/status', { method:'POST', body: JSON.stringify({ uid }) });
    setBox($('#trackResult'), `<b>وضعیت UID</b><span class="code">${data.uid}</span><p>${data.statusText}</p><p>ثبت: ${new Date(data.createdAt).toLocaleString('fa-IR')}</p>`);
  }catch(err){
    setBox($('#trackResult'), err.message, 'error');
  }
}

$('#applyForm').addEventListener('submit', submitApplication);
$('#trackForm').addEventListener('submit', trackUid);
loadConfig();
