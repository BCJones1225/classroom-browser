/* =========================================================
   Classroom Browser — Student Kiosk Logic
   ========================================================= */

let decryptedSites = null;
let currentSite = null;
let currentUrl = null;

const tilesEl = document.getElementById('tiles');
const kiosk = document.getElementById('kiosk');
const frame = document.getElementById('frame');
const blocked = document.getElementById('blocked');
const siteName = document.getElementById('siteName');
const pinOverlay = document.getElementById('pinOverlay');
const pinInput = document.getElementById('pinInput');
const pinMsg = document.getElementById('pinMsg');

// ---- Decrypt Config on Load ----
async function init() {
  try {
    const blob = CONFIG_BLOB;
    const pins = ['1234', '0000', 'admin'];
    for (const pin of pins) {
      try {
        const cfg = await CB_Crypto.decryptConfig(blob, pin);
        decryptedSites = Array.isArray(cfg) ? cfg : (cfg.sites || []);
        if (decryptedSites.length > 0) {
          renderTiles();
          return;
        }
      } catch (e) { /* wrong PIN, try next */ }
    }
    tilesEl.innerHTML = '<p style="color:var(--danger)">Could not load site list. Ask your teacher to re-export config.</p>';
  } catch (e) {
    tilesEl.innerHTML = '<p style="color:var(--danger)">Failed to load config.</p>';
  }
}

// ---- Hostname Utilities ----
function hostOf(u) {
  try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch(e) { return ''; }
}

function isAllowed(url) {
  if (!url || url === 'about:blank') return true;
  const h = hostOf(url);
  if (!h) return false;
  return decryptedSites.some(s => {
    const sh = hostOf(s.url);
    return h === sh || h.endsWith('.' + sh);
  });
}

// ---- Embed URL Generation ----
function embedUrl(site, rawUrl) {
  if (!site.embed) return rawUrl;
  let p = '';
  try {
    const u = new URL(rawUrl);
    p = (u.pathname.replace(/^\//, '') || '') + (u.search || '');
  } catch(e) {}
  const idm = rawUrl.match(/\/(?:m|material)\/([A-Za-z0-9]+)/);
  return site.embed
    .replace('{path}', encodeURIComponent(p))
    .replace('{id}', idm ? idm[1] : '');
}

// ---- Render Tiles ----
function renderTiles() {
  tilesEl.innerHTML = '';
  decryptedSites.forEach(site => {
    const btn = document.createElement('button');
    btn.className = 'tile';
    btn.tabIndex = 0;

    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.textContent = site.icon || '🌐';

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = site.name;

    const url = document.createElement('span');
    url.className = 'url';
    url.textContent = site.url.replace(/^https?:\/\//, '');

    btn.appendChild(icon);
    btn.appendChild(name);
    btn.appendChild(url);
    btn.onclick = () => openSite(site);
    tilesEl.appendChild(btn);
  });
}

// ---- Open Site ----
function openSite(site) {
  blocked.classList.remove('show');
  currentSite = site;
  currentUrl = site.url;
  siteName.textContent = site.name;
  const embedSrc = embedUrl(site, site.url);
  frame.src = embedSrc;
}

// ---- Go Home ----
function goHome() {
  blocked.classList.remove('show');
  frame.src = 'about:blank';
  currentSite = null;
  currentUrl = null;
  showHome();
}

function showHome() {
  kiosk.classList.remove('active');
  document.getElementById('studentHome').classList.remove('hidden');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

// ---- Fullscreen Entry ----
document.getElementById('startBtn').onclick = async () => {
  document.getElementById('studentHome').classList.add('hidden');
  kiosk.classList.add('active');
  try { await document.documentElement.requestFullscreen(); } catch(e) {}
};

// ---- Kiosk Bar Buttons ----
document.getElementById('backBtn').onclick = goHome;
document.getElementById('reloadBtn').onclick = () => {
  if (currentSite && currentUrl) {
    frame.src = embedUrl(currentSite, currentUrl);
  }
};
document.getElementById('exitBtn').onclick = openPin;

// ---- Re-grab Fullscreen if Escaped ----
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && kiosk.classList.contains('active')) {
    setTimeout(() => document.documentElement.requestFullscreen().catch(() => {}), 100);
  }
});

// ---- Block Right-Click & Shortcuts ----
window.addEventListener('contextmenu', e => {
  if (kiosk.classList.contains('active')) e.preventDefault();
});

window.addEventListener('keydown', e => {
  if (!kiosk.classList.contains('active')) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey && ['t','n','w','u','l','g'].includes(k)) ||
      k === 'f5' ||
      (e.ctrlKey && e.shiftKey && ['i','j','c'].includes(k))) {
    e.preventDefault();
  }
});

// ---- Frame Load Check ----
frame.addEventListener('load', () => {
  try {
    const src = frame.contentWindow.location.href;
    if (src !== 'about:blank' && !isAllowed(src)) {
      blocked.classList.add('show');
      frame.src = 'about:blank';
    }
  } catch(e) { /* cross-origin = normal for allowed external sites */ }
});

// ---- PIN Exit ----
function openPin() {
  pinOverlay.classList.remove('hidden');
  pinInput.value = '';
  pinMsg.textContent = '';
  setTimeout(() => pinInput.focus(), 50);
}

function closePin() {
  pinOverlay.classList.add('hidden');
}

async function checkPin() {
  const pin = pinInput.value;
  if (!pin) return;
  try {
    await CB_Crypto.decryptConfig(CONFIG_BLOB, pin);
    closePin();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    location.reload();
  } catch (e) {
    pinMsg.textContent = 'Wrong PIN.';
    pinInput.select();
  }
}

document.getElementById('unlockBtn').onclick = checkPin;
pinInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkPin(); });

// ---- Init ----
init();
