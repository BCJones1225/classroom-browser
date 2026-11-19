/* =========================================================
   Classroom Browser — Teacher Dashboard Logic
   ========================================================= */

const DEFAULT_CONFIG = {
  v: 1,
  kdf: { algo: 'PBKDF2-SHA256', iterations: 250000 },
  salt: "2RRtmcmfVM7rBsKvdYaNBA==",
  iv: "dec1p32ttYYyqtzU",
  data: "rMcEi6pQay1bRfUb3B5wQJQEWRjRQsetn2Kr3j0KP/Wed55t44DaRMORkm7gIfUL7zyZM3HdixWIXGQFABskBv0JibpGChR+o4Cii235tGqtXZuWMCFTc+Jo+/EJLAFeEJPmkC+4oMkATunUTaWR5ubjQ4EXxjdp1DKp8uGzPuy084tXiuWvqsqmc3quuWdATi0U09GIeoxRR2TM1+guz8M2ZXtJaRvI2Yxd1dKK4JZOVuk+4d+VTjC9qZ0ayQf1ABPFFD/NvcY8P5jITY2rRUg/EwRGm+DfhypYRgvt7S4Gau6SG4iWqDSqIIwuYDjNg6YXaftJs3AMGg0x8TbDCRoLkgdwgJcZq54AxBMAftddcdYYz8wkS2LY+tvBEhjTBA49XU3g1Np0QicpdIiaWDAq0Qns5JuFTIEMp9TGVHdafU076dHlREfQjgj3in5J/F58xuTlKHUWKkur2UJZIIgxiutB+AJ2RJrUw4XzfSr6PI2aSx6PBlB0guUczB4mW7fptKfJ8p7dDFrHXjt+Aw8ny9QnIXmzrcpVrhJDvPCuXKxFQA5wLV6mpzOYa6pbYn5aR+UhTZrM+ASJw4+YwgdwVubLf+E/oCSpt8kllaS6z2FolJIzqjKRWhacOuTvlsCcbi5jAiS3KlQx+SY03d26+ydPDv08zIvrx5gXTlxzjw07F528r/vNSkw="
};

let decryptedConfig = null;
let lastPin = null;

const pinOverlay = document.getElementById('pinOverlay');
const pinInput = document.getElementById('pinInput');
const pinMsg = document.getElementById('pinMsg');
const main = document.getElementById('main');
const siteListEl = document.getElementById('siteList');

function showPin() {
  pinOverlay.classList.remove('hidden');
  pinInput.value = '';
  pinMsg.textContent = '';
  setTimeout(() => pinInput.focus(), 50);
}

function cancelPin() {
  pinOverlay.classList.add('hidden');
  main.style.display = 'none';
}

async function unlock() {
  const pin = pinInput.value;
  if (!pin) { pinMsg.textContent = 'Enter a PIN.'; return; }
  try {
    const blob = await loadConfigBlob();
    decryptedConfig = await CB_Crypto.decryptConfig(blob, pin);
    if (Array.isArray(decryptedConfig)) {
      decryptedConfig = { version: 3, sites: decryptedConfig };
    }
    lastPin = pin;
    pinOverlay.classList.add('hidden');
    main.style.display = 'block';
    renderSites();
    showToast('Dashboard unlocked', 'success');
  } catch (e) {
    pinMsg.textContent = 'Wrong PIN or corrupted config.';
    pinInput.select();
  }
}

document.getElementById('unlockBtn').onclick = unlock;
pinInput.addEventListener('keydown', e => { if (e.key === 'Enter') unlock(); });

async function loadConfigBlob() {
  const stored = localStorage.getItem('cb_config');
  if (stored) return JSON.parse(stored);
  return { ...DEFAULT_CONFIG };
}

function saveConfigBlob(blob) {
  localStorage.setItem('cb_config', JSON.stringify(blob));
}

function renderSites() {
  siteListEl.innerHTML = '';
  decryptedConfig.sites.forEach((site, idx) => {
    const card = document.createElement('div');
    card.className = 'site-card';
    card.dataset.idx = idx;

    const drag = document.createElement('span');
    drag.className = 'drag-handle';
    drag.textContent = '⋮⋮';
    drag.title = 'Drag to reorder';
    drag.draggable = true;

    const icon = document.createElement('span');
    icon.className = 'site-icon';
    icon.textContent = site.icon || '🌐';

    const info = document.createElement('div');
    info.className = 'site-info';

    const nameInput = document.createElement('input');
    nameInput.className = 'name-input';
    nameInput.type = 'text';
    nameInput.value = site.name;
    nameInput.placeholder = 'Site name';
    nameInput.addEventListener('input', () => { decryptedConfig.sites[idx].name = nameInput.value; });

    const urlInput = document.createElement('input');
    urlInput.className = 'url-input';
    urlInput.type = 'text';
    urlInput.value = site.url;
    urlInput.placeholder = 'URL';
    urlInput.addEventListener('input', () => { decryptedConfig.sites[idx].url = urlInput.value; });

    if (site.embed) {
      const hint = document.createElement('div');
      hint.className = 'embed-hint';
      hint.textContent = 'Embed: ' + site.embed;
      info.appendChild(hint);
    }

    info.appendChild(nameInput);
    info.appendChild(urlInput);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '✕';
    removeBtn.title = 'Remove this site';
    removeBtn.addEventListener('click', () => {
      decryptedConfig.sites.splice(idx, 1);
      renderSites();
    });

    card.appendChild(drag);
    card.appendChild(icon);
    card.appendChild(info);
    card.appendChild(removeBtn);
    siteListEl.appendChild(card);
  });
  setupDragDrop();
}

function setupDragDrop() {
  let dragIdx = null;
  siteListEl.querySelectorAll('.site-card').forEach(card => {
    const handle = card.querySelector('.drag-handle');
    handle.addEventListener('dragstart', e => {
      dragIdx = parseInt(card.dataset.idx);
      e.dataTransfer.effectAllowed = 'move';
      card.style.opacity = '0.4';
    });
    handle.addEventListener('dragend', () => {
      card.style.opacity = '1';
      dragIdx = null;
    });
    handle.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      card.style.borderTop = '2px solid var(--accent)';
    });
    handle.addEventListener('dragleave', () => {
      card.style.borderTop = '';
    });
    handle.addEventListener('drop', e => {
      e.preventDefault();
      card.style.borderTop = '';
      const dropIdx = parseInt(card.dataset.idx);
      if (dragIdx !== null && dragIdx !== dropIdx) {
        const item = decryptedConfig.sites.splice(dragIdx, 1)[0];
        decryptedConfig.sites.splice(dropIdx, 0, item);
        renderSites();
      }
    });
  });
}

document.getElementById('addBtn').onclick = () => {
  const icon = document.getElementById('addIcon').value.trim() || '🌐';
  const name = document.getElementById('addName').value.trim();
  const url = document.getElementById('addUrl').value.trim();
  const embed = document.getElementById('addEmbed').value.trim();

  if (!name || !url) { showToast('Name and URL are required.', 'error'); return; }
  try { new URL(url); } catch(e) {
    showToast('Please enter a valid URL (start with https://)', 'error'); return;
  }

  decryptedConfig.sites.push({ name, url, icon, embed: embed || undefined });
  document.getElementById('addName').value = '';
  document.getElementById('addUrl').value = '';
  document.getElementById('addIcon').value = '';
  document.getElementById('addEmbed').value = '';
  renderSites();
  showToast('Site added', 'success');
};

document.getElementById('exportBtn').onclick = async () => {
  const fullConfig = { version: decryptedConfig.version || 3, sites: decryptedConfig.sites };
  const blob = await CB_Crypto.encryptConfig(lastPin, fullConfig);
  const exportObj = { v: 1, kdf: { algo: 'PBKDF2-SHA256', iterations: 250000 }, ...blob };

  const configJs = [
    '// Classroom Browser — Encrypted Site Config',
    '// Replace this file to update the approved site list.',
    '// Generated: ' + new Date().toISOString(),
    'const CONFIG_BLOB = ' + JSON.stringify(exportObj, null, 2) + ';'
  ].join('\n');

  const blob2 = new Blob([configJs], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob2);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'config.js';
  a.click();
  URL.revokeObjectURL(url);
  saveConfigBlob(exportObj);
  showToast('Config exported! Replace student/config.js with this file.', 'success');
};

document.getElementById('resetBtn').onclick = async () => {
  if (!confirm('Reset to the default site list? This cannot be undone.')) return;
  decryptedConfig.sites = [
    { name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: '📚', embed: 'https://en.wikipedia.org/w/index.php?useformat=mobile&onlyarticle=true&title={path}' },
    { name: 'Khan Academy', url: 'https://www.khanacademy.org', icon: '🎓' },
    { name: 'GeoGebra', url: 'https://www.geogebra.org', icon: '📐', embed: 'https://www.geogebra.org/material/iframe/id/{id}' },
    { name: 'OpenStax', url: 'https://openstax.org', icon: '📖' },
    { name: 'NASA', url: 'https://www.nasa.gov', icon: '🚀' }
  ];
  renderSites();
  showToast('Sites reset. Export to generate new config.', 'success');
};

document.getElementById('changePinBtn').onclick = async () => {
  const oldPin = prompt('Enter current PIN:');
  if (!oldPin) return;
  try {
    await CB_Crypto.decryptConfig(await loadConfigBlob(), oldPin);
  } catch (e) {
    showToast('Wrong current PIN.', 'error'); return;
  }
  const newPin = prompt('Enter new PIN (4-12 characters):');
  if (!newPin || newPin.length < 4 || newPin.length > 12) {
    showToast('PIN must be 4-12 characters.', 'error'); return;
  }
  const confirmPin = prompt('Confirm new PIN:');
  if (newPin !== confirmPin) { showToast('PINs do not match.', 'error'); return; }

  lastPin = newPin;
  const fullConfig = { version: decryptedConfig.version || 3, sites: decryptedConfig.sites };
  const blob = await CB_Crypto.encryptConfig(newPin, fullConfig);
  const exportObj = { v: 1, kdf: { algo: 'PBKDF2-SHA256', iterations: 250000 }, ...blob };
  saveConfigBlob(exportObj);
  showToast('PIN changed! Export config to update students.', 'success');
};

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast ' + type;
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => toast.classList.remove('show'), 3500);
}

showPin();
