(() => {
if (window.__lukiStickersInitialized) return;
window.__lukiStickersInitialized = true;
const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

const examplePacks = [
  { id: 'joy', name: 'Piccole gioie', emoji: '🌼', count: 24, author: 'chiara', bg: '#f4d989', featured: '🌼', minis: ['✨', '🌱'] },
  { id: 'monday', name: 'Mood del lunedì', emoji: '☕', count: 18, author: 'tommy', bg: '#c8b6ea', featured: '☕', minis: ['💤', '☁️'] },
  { id: 'dolce', name: 'Dolce far niente', emoji: '🍒', count: 32, author: 'alice', bg: '#f5bfd0', featured: '🍒', minis: ['🍰', '💌'] },
  { id: 'casa', name: 'Casa dolce casa', emoji: '🏡', count: 16, author: 'marta', bg: '#b9d9ce', featured: '🏡', minis: ['🪴', '🐈'] }
];
const exampleStickers = [
  ['Buongiorno!', '☀️', 'Piccole gioie', '#f7e9b5'], ['Sempre tu', '💌', 'Piccole gioie', '#f5dce3'],
  ['Pausa caffè', '☕', 'Mood del lunedì', '#e8ddf6'], ['Che vibe', '🪩', 'Mood del lunedì', '#d7e8f2'],
  ['Dolcezza', '🍰', 'Dolce far niente', '#f5d5d6'], ['Un abbraccio', '🧸', 'Piccole gioie', '#e4ddce'],
  ['Che fortuna', '🍀', 'Piccole gioie', '#d8e9c3'], ['Sogni d’oro', '🌙', 'Mood del lunedì', '#ddd9ee'],
  ['Casa mia', '🏡', 'Casa dolce casa', '#d2e5d9'], ['Ti penso', '💭', 'Piccole gioie', '#e2eaf4'],
  ['Che fame', '🍓', 'Dolce far niente', '#f7dfd1'], ['Piano piano', '🌱', 'Casa dolce casa', '#e1eccf']
].map(([name, emoji, pack, bg], i) => ({ id: `sample-${i}`, name, emoji, pack, bg }));

const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
let packs = readStore('ss-packs', examplePacks);
let stickers = readStore('ss-stickers', exampleStickers);
let currentView = 'home', currentFilter = '', uploadImage = null, originalUploadImage = null, uploadName = '', activeStyle = 'comic', localBackgroundPipeline = null, localBackgroundPipelinePromise = null, uploadHasLocalCutout = false, connectedGeminiKey = '', aiStickerImage = null, aiGenerating = false;
let styleStrength = 46, lineStrength = 24, toastTimer, targetPack = '', targetPlatform = 'whatsapp', uploadMode = 'single', sheetSegments = [], cameraStream = null, modalHistory = [];

const persist = () => { localStorage.setItem('ss-packs', JSON.stringify(packs)); localStorage.setItem('ss-stickers', JSON.stringify(stickers)); };
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const slugify = value => (value || 'sticker').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const toast = message => { const node = qs('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 3000); };
const emptyState = (title, subtitle) => `<div class="empty-state"><strong>${title}</strong>${subtitle}</div>`;

function renderPackCard(pack) {
  const count = stickers.filter(sticker => sticker.pack === pack.name).length;
  return `<article class="pack-card" data-pack="${escapeHtml(pack.name)}" role="button" tabindex="0" aria-label="Apri il pacchetto ${escapeHtml(pack.name)}"><div class="pack-art ${pack.motion ? `motion-${pack.motion}` : ''}" style="background:${pack.bg}"><span class="mini-emoji">${pack.minis?.[0] || '✨'}</span><span class="big-emoji">${pack.featured || pack.emoji}</span><span class="mini-emoji">${pack.minis?.[1] || '💌'}</span></div><div class="pack-meta"><div><div class="pack-title">${escapeHtml(pack.name)} ${pack.motion ? '<span class="animated-tag">ANIMATO</span>' : ''}</div><div class="pack-author">${pack.author === 'tu' ? 'il tuo pacchetto' : `di ${escapeHtml(pack.author || 'creator')}`}</div></div><span class="pack-size">${count}</span></div><div class="pack-open-hint">Apri pacchetto <span>→</span></div></article>`;
}

function renderPacks() {
  qs('#sidebar-packs').innerHTML = packs.slice(0, 5).map(pack => `<button class="side-pack" data-pack="${escapeHtml(pack.name)}"><span class="side-pack-emoji">${pack.emoji}</span>${escapeHtml(pack.name)}<span class="pack-small-count">${stickers.filter(item => item.pack === pack.name).length}</span></button>`).join('');
  qs('#popular-packs').innerHTML = packs.slice(0, 4).map(renderPackCard).join('') || emptyState('Ancora nessun pacchetto', 'Crea la tua prima collezione di sticker.');
}

function renderStickerCard(sticker) {
  const preview = sticker.image ? `<img src="${sticker.image}" alt="Sticker ${escapeHtml(sticker.name)}" />` : `<span>${sticker.emoji || '✨'}</span>`;
  const motion = packs.find(pack => pack.name === sticker.pack)?.motion || '';
  const moveOptions = sticker.image ? `<select class="tile-move" data-move="${escapeHtml(sticker.id)}" aria-label="Sposta ${escapeHtml(sticker.name)} in un altro pacchetto"><option value="" disabled selected>Sposta…</option><option value="">I miei sticker</option>${packs.filter(pack => pack.name !== sticker.pack).map(pack => `<option value="${escapeHtml(pack.name)}">${escapeHtml(pack.name)}</option>`).join('')}</select>` : '';
  return `<article class="sticker-tile ${motion ? `motion-${motion}` : ''}" data-sticker="${escapeHtml(sticker.id)}" ${sticker.image ? 'draggable="true"' : ''}><div class="sticker-preview" style="background-color:${sticker.bg || '#f5f4ef'}">${preview}</div><div class="sticker-name">${escapeHtml(sticker.name)}</div><div class="sticker-sub">${escapeHtml(sticker.pack || 'I miei sticker')}</div>${moveOptions}${sticker.image ? `<button class="tile-delete" data-delete="${escapeHtml(sticker.id)}" aria-label="Elimina ${escapeHtml(sticker.name)}" title="Elimina sticker">×</button><button class="tile-share" data-share="${escapeHtml(sticker.id)}" aria-label="Condividi ${escapeHtml(sticker.name)}" title="Condividi sticker">↗</button>` : ''}</article>`;
}

function moveSticker(id, destination) {
  const sticker = stickers.find(item => item.id === id);
  if (!sticker || (sticker.pack || 'I miei sticker') === (destination || 'I miei sticker')) return;
  const oldPack = sticker.pack || 'I miei sticker', modalTitle = qs('#modal-title')?.textContent;
  const detailOpen = !qs('#modal-backdrop').hidden && modalTitle === sticker.name;
  sticker.pack = destination || 'I miei sticker';
  packs.forEach(pack => { pack.count = stickers.filter(item => item.pack === pack.name).length; });
  persist(); renderPacks();
  if (detailOpen) openStickerDetail(id);
  else if (!qs('#modal-backdrop').hidden && modalTitle === oldPack) openPack(oldPack);
  else if (currentView === 'packs') showView('packs');
  else renderStickers();
  toast(`Sticker spostato in “${sticker.pack}”`);
}

function confirmDeletePack(name) {
  const pack = packs.find(item => item.name === name);
  if (!pack || pack.author !== 'tu') return;
  const count = stickers.filter(item => item.pack === name).length;
  setModal(`<button class="modal-close" id="modal-close" aria-label="Chiudi">×</button><div class="modal-icon delete-modal-icon">×</div><div class="section-overline">ELIMINA PACCHETTO</div><h2 id="modal-title">Eliminare “${escapeHtml(name)}”?</h2><p>Il pacchetto verrà eliminato. I suoi ${count} sticker resteranno nella raccolta “I miei sticker”.</p><div class="delete-actions"><button class="secondary-button" id="cancel-delete">Annulla</button><button class="delete-confirm" id="confirm-delete">Elimina pacchetto</button></div>`);
  qs('#cancel-delete').onclick = closeModal;
  qs('#confirm-delete').onclick = () => {
    stickers.forEach(item => { if (item.pack === name) item.pack = 'I miei sticker'; });
    packs = packs.filter(item => item.name !== name); persist(); renderPacks(); closeModal(); showView('packs');
    toast(`Pacchetto eliminato · ${count} sticker conservati`);
  };
}

function renderStickers(list = stickers) {
  qs('#sticker-count').textContent = stickers.length;
  const query = currentFilter.toLowerCase();
  const filtered = list.filter(sticker => `${sticker.name} ${sticker.pack}`.toLowerCase().includes(query));
  qs('#recent-stickers').innerHTML = filtered.slice(0, currentView === 'home' ? 6 : 100).map(renderStickerCard).join('') || emptyState(query ? 'Nessun risultato' : 'Il tuo spazio è pronto', 'Carica una foto e trasformala in uno sticker unico.');
}

function showView(view) {
  currentView = view;
  const labels = { home: 'Panoramica', discover: 'Esplora', 'my-stickers': 'I miei sticker', packs: 'I miei pacchetti' };
  qs('#crumb-current').textContent = labels[view] || view;
  qsa('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const hero = qs('.hero-card'), welcome = qs('.welcome-row'), sections = qsa('.section-block'), shell = qs('.recent-block');
  if (view === 'home') {
    hero.hidden = false; welcome.hidden = false; qs('#time-dashboard').hidden = false; sections.forEach(section => { section.hidden = false; });
    shell.querySelector('.sticker-grid').className = 'sticker-grid';
    renderPacks(); renderStickers();
    qs('.recent-block .section-heading h2').innerHTML = 'Sticker recenti <span class="heading-arrow">✦</span>';
    qs('.recent-block .section-overline').textContent = 'IL TUO LABORATORIO';
    qs('.recent-block .view-link').textContent = 'Vedi tutti →';
    qs('.recent-block .view-link').onclick = () => showView('my-stickers');
    return;
  }
  hero.hidden = true; welcome.hidden = true; qs('#time-dashboard').hidden = true; sections.forEach(section => { section.hidden = true; }); shell.hidden = false;
  qs('.recent-block .section-heading h2').innerHTML = `${labels[view]} <span class="heading-arrow">✦</span>`;
  qs('.recent-block .section-overline').textContent = view === 'discover' ? 'ISPIRAZIONE PER TE' : 'IL TUO LABORATORIO';
  const grid = shell.querySelector('.sticker-grid');
  if (view === 'packs' || view === 'discover') {
    grid.className = 'pack-grid'; grid.innerHTML = packs.map(renderPackCard).join('') || emptyState('Ancora nessun pacchetto', 'Crea una collezione per organizzare gli sticker.');
  } else { grid.className = 'sticker-grid'; renderStickers(stickers); }
  qs('.recent-block .view-link').textContent = view === 'packs' ? '＋ Crea pacchetto' : '＋ Crea sticker';
  qs('.recent-block .view-link').onclick = () => view === 'packs' ? openPackModal() : openUpload();
}

function setModal(markup, className = 'modal') {
  const modal = qs('.modal'), backdrop = qs('#modal-backdrop');
  if (!backdrop.hidden && modal.childNodes.length) {
    const fragment = document.createDocumentFragment();
    while (modal.firstChild) fragment.appendChild(modal.firstChild);
    modalHistory.push({ className: modal.className, fragment });
  }
  modal.className = className;
  modal.innerHTML = `<button type="button" class="modal-back" id="modal-back" aria-label="Torna alla schermata precedente">‹ Indietro</button>${markup}`;
  backdrop.hidden = false;
  bindModalNavigation();
}
function bindModalNavigation() {
  const back = qs('#modal-back'), close = qs('#modal-close');
  if (back) back.onclick = goBackModal;
  if (close) close.onclick = closeModal;
}
function goBackModal() {
  stopCamera();
  const previous = modalHistory.pop();
  if (!previous) { closeModal(); return; }
  const modal = qs('.modal'); modal.className = previous.className; modal.replaceChildren(previous.fragment);
  qs('#modal-backdrop').hidden = false;
  bindModalNavigation();
}
function stopCamera() { cameraStream?.getTracks().forEach(track => track.stop()); cameraStream = null; }
function closeModal() { stopCamera(); modalHistory = []; qs('#modal-backdrop').hidden = true; }

function openPackModal() {
  setModal(`<button class="modal-close" id="modal-close" aria-label="Chiudi">×</button><div class="modal-icon">✳</div><div class="section-overline">NUOVO PACCHETTO</div><h2 id="modal-title">Crea una collezione</h2><p>Dai un nome alla tua raccolta di sticker.</p><form id="pack-form"><label for="pack-name">Nome del pacchetto</label><input id="pack-name" maxlength="30" placeholder="es. Piccole gioie" required /><label>Scegli un'emoji</label><div class="emoji-options">${['🌼', '✨', '🍒', '🪩', '☁️'].map((emoji, i) => `<label><input type="radio" name="emoji" value="${emoji}" ${i === 0 ? 'checked' : ''}/><span>${emoji}</span></label>`).join('')}</div><button type="submit" class="create-button modal-submit">Crea pacchetto <span>→</span></button></form>`);
  qs('#pack-form').onsubmit = event => {
    event.preventDefault(); const name = qs('#pack-name').value.trim(); if (!name) return;
    if (packs.some(pack => pack.name.toLowerCase() === name.toLowerCase())) { toast('Esiste già un pacchetto con questo nome.'); return; }
    const emoji = qs('input[name="emoji"]:checked').value;
    packs.unshift({ id: crypto.randomUUID(), name, emoji, count: 0, author: 'tu', bg: ['#f4d989', '#c8b6ea', '#f5bfd0', '#b9d9ce'][packs.length % 4], featured: emoji, minis: ['✨', '💌'] });
    persist(); renderPacks(); closeModal(); showView('packs'); toast(`Pacchetto “${name}” creato`);
  };
  qs('#pack-name').focus();
}

function openPack(name) {
  const pack = packs.find(item => item.name === name); if (!pack) return;
  const items = stickers.filter(sticker => sticker.pack === name);
  const cards = items.length ? `<div class="sticker-grid pack-detail-grid">${items.map(renderStickerCard).join('')}</div>` : emptyState('Pacchetto ancora vuoto', 'Aggiungi una foto per creare il primo sticker di questa raccolta.');
  const animationNote = pack.motion ? '<p class="animation-format-note">L’esportazione WebM genera video animati da condividere. WhatsApp li riceve come video, non come pacchetto installato.</p>' : '';
  const destinations = packs.filter(item => item.name !== name).map(item => `<button class="drop-pack-target" data-drop-pack="${escapeHtml(item.name)}">${item.emoji} ${escapeHtml(item.name)}</button>`).join('');
  const moveTargets = `<div class="pack-drop-zone"><strong>Trascina qui uno sticker per spostarlo</strong><div><button class="drop-pack-target" data-drop-pack="">✨ I miei sticker</button>${destinations}</div></div>`;
  setModal(`<button class="modal-close" id="modal-close" aria-label="Chiudi">×</button><div class="pack-modal-heading"><span class="pack-modal-emoji" style="background:${pack.bg}">${pack.emoji}</span><div><div class="section-overline">${pack.motion ? 'PACCHETTO ANIMATO' : 'PACCHETTO STICKER'}</div><h2 id="modal-title">${escapeHtml(pack.name)}</h2><p>${items.length} sticker · creato da ${pack.author === 'tu' ? 'te' : escapeHtml(pack.author || 'creator')}</p></div></div><div class="pack-detail-actions"><button class="create-button" id="add-to-pack">＋ Aggiungi una foto</button><button class="secondary-button" id="share-pack">↗ Condividi sticker</button><button class="secondary-button" id="animate-pack">${pack.motion ? '✦ Modifica animazione' : '▶ Crea animato'}</button>${pack.motion ? '<button class="secondary-button" id="export-animated">↓ Esporta WebM</button>' : ''}${pack.author === 'tu' ? '<button class="delete-confirm" id="delete-pack">Elimina pacchetto</button>' : ''}</div>${moveTargets}${cards}${animationNote}`);
  qs('#add-to-pack').onclick = () => { closeModal(); openUpload(pack.name); };
  qs('#share-pack').onclick = () => shareStickerPack(items.filter(item => item.image), pack.name);
  qs('#animate-pack').onclick = () => openMotionModal(pack.name);
  qs('#export-animated')?.addEventListener('click', () => exportAnimatedPack(items.filter(item => item.image), pack));
  qs('#delete-pack')?.addEventListener('click', () => confirmDeletePack(name));
}

function openStickerDetail(id) {
  const sticker = stickers.find(item => item.id === id);
  if (!sticker) return;
  const packName = sticker.pack || 'I miei sticker';
  const platform = sticker.platform ? platformPresets[sticker.platform]?.label : '';
  const artwork = sticker.image
    ? `<img class="sticker-detail-image" src="${sticker.image}" alt="${escapeHtml(sticker.name)}" />`
    : `<span class="sticker-detail-emoji">${sticker.emoji || '✨'}</span>`;
  const moveControl = sticker.image
    ? `<label class="sticker-detail-move" for="detail-move">Sposta in un altro pacchetto</label><select id="detail-move" class="caption-input" data-move="${escapeHtml(sticker.id)}"><option value="" disabled selected>Scegli un pacchetto…</option><option value="">I miei sticker</option>${packs.filter(pack => pack.name !== packName).map(pack => `<option value="${escapeHtml(pack.name)}">${escapeHtml(pack.name)}</option>`).join('')}</select>`
    : '';
  setModal(`<button class="modal-close" id="modal-close" aria-label="Chiudi">×</button><div class="section-overline">DETTAGLIO STICKER</div><h2 id="modal-title">${escapeHtml(sticker.name)}</h2><div class="sticker-detail-stage">${artwork}</div><p class="sticker-detail-meta">${escapeHtml(packName)}${platform ? ` · Preset ${escapeHtml(platform)}` : ''}</p>${moveControl}<div class="pack-detail-actions sticker-detail-actions"><button class="secondary-button" id="detail-share">↗ Condividi PNG</button>${sticker.image ? `<button class="delete-confirm" id="detail-delete">Elimina sticker</button>` : ''}</div>`);
  qs('#detail-share').onclick = () => shareSticker(sticker);
  qs('#detail-delete')?.addEventListener('click', () => confirmDeleteSticker(sticker.id));
}

function openMotionModal(packName) {
  const pack = packs.find(item => item.name === packName); if (!pack) return;
  const choices = [['bounce','Rimbalzo','⬆'],['wiggle','Dondolo','↝'],['pulse','Respiro','◉']];
  setModal(`<button class="modal-close" id="modal-close" aria-label="Chiudi">×</button><div class="modal-icon">▶</div><div class="section-overline">ANIMAZIONE DEL PACCHETTO</div><h2 id="modal-title">Dai movimento a “${escapeHtml(pack.name)}”</h2><p>Applica lo stesso movimento agli sticker del pacchetto e visualizzali in loop.</p><div class="motion-options">${choices.map(([id,label,icon]) => `<label class="motion-choice"><input type="radio" name="motion" value="${id}" ${pack.motion === id || (!pack.motion && id === 'bounce') ? 'checked' : ''}><span class="motion-icon">${icon}</span><strong>${label}</strong><small>Anteprima in loop</small></label>`).join('')}</div><div class="motion-preview" id="motion-preview"><span class="motion-preview-emoji ${pack.motion ? `motion-${pack.motion}` : 'motion-bounce'}">${pack.emoji}</span><span>${escapeHtml(pack.name)}</span></div><div class="pack-detail-actions motion-actions"><button class="secondary-button" id="cancel-motion">Annulla</button><button class="create-button" id="save-motion">Salva pacchetto animato <span>→</span></button></div>`, 'modal motion-modal');
  qsa('input[name="motion"]').forEach(input => input.onchange = () => { qs('#motion-preview .motion-preview-emoji').className = `motion-preview-emoji motion-${input.value}`; });
  qs('#cancel-motion').onclick = () => openPack(packName);
  qs('#save-motion').onclick = () => { pack.motion = qs('input[name="motion"]:checked').value; persist(); renderPacks(); closeModal(); openPack(packName); toast('Pacchetto animato salvato'); };
}

async function recordAnimatedSticker(sticker, motion) {
  const image = new Image(); image.src = sticker.image;
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!canvas.captureStream || !window.MediaRecorder) throw new Error('Esportazione video non supportata dal browser.');
  const stream = canvas.captureStream(20), mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType }), chunks = [];
  const finished = new Promise(resolve => { recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); }; recorder.onstop = () => { stream.getTracks().forEach(track => track.stop()); resolve(new Blob(chunks, { type: 'video/webm' })); }; });
  const started = performance.now(); recorder.start();
  await new Promise(resolve => {
    const frame = now => {
      const t = ((now - started) % 1200) / 1200, angle = t * Math.PI * 2;
      const scale = motion === 'pulse' ? 0.88 + .08 * Math.sin(angle) : motion === 'bounce' ? .87 + .07 * Math.abs(Math.sin(angle)) : .9;
      const tilt = motion === 'wiggle' ? Math.sin(angle * 2) * .07 : 0, lift = motion === 'bounce' ? Math.abs(Math.sin(angle)) * 28 : motion === 'wiggle' ? 4 * Math.sin(angle * 2) : 0;
      ctx.clearRect(0,0,512,512); ctx.save(); ctx.translate(256,256-lift); ctx.rotate(tilt); ctx.scale(scale,scale); ctx.drawImage(image,-224,-224,448,448); ctx.restore();
      if (now - started < 2400) requestAnimationFrame(frame); else { recorder.stop(); resolve(); }
    }; requestAnimationFrame(frame);
  });
  return finished;
}

async function exportAnimatedPack(items, pack) {
  if (!items.length) { toast('Aggiungi almeno uno sticker creato da una foto.'); return; }
  toast('Creo le animazioni…');
  try {
    const files = [];
    for (const sticker of items) files.push(new File([await recordAnimatedSticker(sticker, pack.motion)], `${slugify(sticker.name)}.webm`, { type: 'video/webm' }));
    if (navigator.share && navigator.canShare?.({ files })) { await navigator.share({ files, title: pack.name, text: `Sticker animati · ${pack.name}` }); }
    else { for (const file of files) await downloadBlob(file, file.name); toast(`${files.length} animazioni WebM scaricate`); }
  } catch (error) { toast(error.message || 'Non riesco a esportare le animazioni su questo browser.'); }
}

function confirmDeleteSticker(id) {
  const sticker = stickers.find(item => item.id === id);
  if (!sticker) return;
  setModal(`<button class="modal-close" id="modal-close" aria-label="Chiudi">×</button><div class="modal-icon delete-modal-icon">×</div><div class="section-overline">ELIMINA STICKER</div><h2 id="modal-title">Vuoi eliminare “${escapeHtml(sticker.name)}”?</h2><p>Lo sticker verrà rimosso da “${escapeHtml(sticker.pack || 'I miei sticker')}”. Questa azione non si può annullare.</p><div class="delete-actions"><button class="secondary-button" id="cancel-delete">Annulla</button><button class="delete-confirm" id="confirm-delete">Elimina sticker</button></div>`);
  qs('#cancel-delete').onclick = closeModal;
  qs('#confirm-delete').onclick = () => {
    stickers = stickers.filter(item => item.id !== id);
    const pack = packs.find(item => item.name === sticker.pack);
    if (pack) pack.count = stickers.filter(item => item.pack === pack.name).length;
    persist(); renderPacks(); closeModal();
    if (currentView === 'packs') openPack(sticker.pack); else renderStickers();
    toast('Sticker eliminato');
  };
}

function openUpload(packName = '') {
  uploadMode = 'single'; targetPack = packName;
  setModal(`<button class="modal-close" id="modal-close" aria-label="Chiudi">×</button><div class="modal-icon">✧</div><div class="section-overline">CREA NUOVI STICKER</div><h2 id="modal-title">Da una foto a uno sticker</h2><p>Scegli una foto singola oppure importa una tavola con più sticker da ritagliare automaticamente.</p><div class="import-modes"><button class="import-mode selected" id="upload-single"><span>◉</span><strong>Una foto</strong><small>Crea uno sticker in stile fumetto</small></button><button class="import-mode" id="upload-sheet"><span>▦</span><strong>Tavola sticker</strong><small>Separa più immagini in un pacchetto</small></button></div><div class="photo-actions"><button class="secondary-button" id="camera-capture">◎ Scatta una foto</button><label class="upload-zone" for="file-input"><div class="upload-icon">↑</div><strong id="upload-label">Scegli una foto dal dispositivo</strong><small id="upload-hint">JPG, PNG o WEBP · l'immagine resta sul dispositivo</small></label></div><div class="upload-tip" id="upload-tip">Meglio se il soggetto è a fuoco e ben illuminato.</div>`);
  const chooseMode = mode => {
    uploadMode = mode; qs('#upload-single').classList.toggle('selected', mode === 'single'); qs('#upload-sheet').classList.toggle('selected', mode === 'sheet');
    qs('#modal-title').textContent = mode === 'sheet' ? 'Separa una tavola sticker' : 'Da una foto a uno sticker';
    qs('#upload-label').textContent = mode === 'sheet' ? 'Scegli la tavola con più sticker' : 'Scegli una foto dal dispositivo';
    qs('#upload-hint').textContent = mode === 'sheet' ? 'Ritaglia le immagini e rimuove il fondo chiaro' : 'JPG, PNG o WEBP · resta sul dispositivo';
    qs('#upload-tip').textContent = mode === 'sheet' ? 'Funziona meglio con sticker in griglia e sfondo chiaro.' : 'Meglio se il soggetto è a fuoco e ben illuminato.';
  };
  qs('#upload-single').onclick = () => chooseMode('single'); qs('#upload-sheet').onclick = () => chooseMode('sheet');
  qs('#camera-capture').onclick = openCameraCapture;
  qs('#file-input').value = '';
  qs('#camera-input').value = '';
}

async function processImageFile(file, selectedMode = uploadMode) {
  if (!file) return;
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const supportedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp', 'heic', 'heif'];
  if (!file.type.startsWith('image/') && !supportedExtensions.includes(extension)) { toast('Scegli un’immagine JPG, PNG o WEBP.'); return; }
  if (file.size > 30 * 1024 * 1024) { toast('Questa foto supera 30 MB. Riduci la dimensione e riprova.'); return; }
  uploadName = file.name.replace(/\.[^.]+$/, '');
  const isHeic = ['heic', 'heif', 'hif'].includes(extension) || /image\/(heic|heif)/i.test(file.type);
  if (isHeic) {
    try {
      if (typeof window.heic2any !== 'function') await loadHeicConverter();
      if (typeof window.heic2any !== 'function') throw new Error('Il convertitore HEIC non è disponibile.');
      toast('Conversione HEIC in corso…');
      const converted = await window.heic2any({ blob: file, toType: 'image/png' });
      const png = Array.isArray(converted) ? converted[0] : converted;
      if (!(png instanceof Blob)) throw new Error('Conversione HEIC non riuscita.');
      file = new File([png], `${uploadName}.png`, { type: 'image/png' });
    } catch (error) { toast(error.message || 'Non riesco a convertire questo file HEIC.'); return; }
  }
  const reader = new FileReader();
  reader.onerror = () => toast('Lettura della foto non riuscita. Riprova oppure scegli un altro file.');
  reader.onabort = () => toast('Caricamento annullato.');
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) { toast('La foto non contiene un’immagine leggibile.'); return; }
      uploadImage = image; originalUploadImage = image; uploadHasLocalCutout = false; selectedMode === 'sheet' ? openSheetPreview() : openEditor();
    };
    image.onerror = () => toast('Formato foto non supportato dal browser. Prova a salvarla come JPG o PNG.');
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}
function loadHeicConverter() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = './vendor/heic2any.min.js'; script.async = true;
    script.onload = resolve; script.onerror = () => reject(new Error('Non riesco a caricare il convertitore HEIC. Controlla la connessione e riprova.'));
    document.head.appendChild(script);
  });
}
function handleImageSelection(event) {
  const input = event.currentTarget, file = input.files?.[0];
  if (!file) return;
  input.value = '';
  processImageFile(file, uploadMode);
}
qs('#file-input').addEventListener('change', handleImageSelection);
qs('#camera-input').addEventListener('change', handleImageSelection);

async function openCameraCapture() {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast('Fotocamera live non disponibile qui. Prova da Safari/Chrome o scegli una foto.');
    qs('#camera-input').click();
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } } });
    setModal(`<button class="modal-close" id="modal-close" aria-label="Chiudi">×</button><div class="section-overline">FOTOCAMERA</div><h2 id="modal-title">Scatta il tuo sticker</h2><p>Inquadra il soggetto e premi il pulsante per acquisire la foto.</p><video id="live-camera" class="live-camera" autoplay playsinline muted></video><div class="camera-actions"><button class="secondary-button" id="cancel-camera">Annulla</button><button class="create-button" id="take-photo">◎ Scatta foto</button></div>`, 'modal camera-modal');
    const video = qs('#live-camera'); video.srcObject = cameraStream;
    await video.play();
    qs('#cancel-camera').onclick = closeModal;
    qs('#take-photo').onclick = async () => {
      if (!video.videoWidth || !video.videoHeight) { toast('Attendi che la fotocamera si attivi.'); return; }
      const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.94));
      const mode = uploadMode; stopCamera(); closeModal();
      if (blob) processImageFile(new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }), mode);
      else toast('Non riesco a salvare lo scatto. Riprova.');
    };
  } catch (error) {
    stopCamera();
    const message = error.name === 'NotAllowedError' ? 'Consenti l’accesso alla fotocamera nelle impostazioni del browser e riprova.' : error.name === 'NotFoundError' ? 'Non è stata trovata una fotocamera su questo dispositivo.' : 'La fotocamera non si è avviata. Verifica i permessi del browser.';
    setModal(`<button class="modal-close" id="modal-close" aria-label="Chiudi">×</button><div class="section-overline">FOTOCAMERA NON DISPONIBILE</div><h2 id="modal-title">Non riesco ad aprire l’obiettivo</h2><p>${message}</p><div class="camera-actions"><button class="secondary-button" id="camera-back">Torna alle foto</button><button class="secondary-button" id="camera-device">Apri fotocamera dispositivo</button><button class="create-button" id="camera-retry">Riprova fotocamera</button></div>`);
    qs('#camera-back').onclick = () => openUpload(targetPack);
    qs('#camera-device').onclick = () => qs('#camera-input').click();
    qs('#camera-retry').onclick = openCameraCapture;
  }
}

function projectionRuns(projection, threshold, bridge) {
  const active = projection.map(value => value >= threshold);
  let last = -1;
  for (let i = 0; i < active.length; i++) if (active[i]) {
    if (last >= 0 && i - last <= bridge) for (let j = last + 1; j < i; j++) active[j] = true;
    last = i;
  }
  const runs = []; let start = -1;
  for (let i = 0; i <= active.length; i++) {
    if (active[i] && start < 0) start = i;
    if ((!active[i] || i === active.length) && start >= 0) { if (i - start > active.length * 0.055) runs.push([start, i]); start = -1; }
  }
  return runs;
}

function removeLightBackground(ctx, width, height) {
  const frame = ctx.getImageData(0, 0, width, height), pixels = frame.data, visited = new Uint8Array(width * height), queue = new Int32Array(width * height); let head = 0, tail = 0;
  const isBackground = index => { const i = index * 4; return pixels[i] > 218 && pixels[i + 1] > 218 && pixels[i + 2] > 210 && Math.max(pixels[i], pixels[i+1], pixels[i+2]) - Math.min(pixels[i], pixels[i+1], pixels[i+2]) < 48; };
  const add = index => { if (index < 0 || index >= width * height || visited[index] || !isBackground(index)) return; visited[index] = 1; queue[tail++] = index; };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y++) { add(y * width); add(y * width + width - 1); }
  while (head < tail) {
    const p = queue[head++], x = p % width, y = (p / width) | 0; pixels[p * 4 + 3] = 0;
    if (x) add(p - 1); if (x + 1 < width) add(p + 1); if (y) add(p - width); if (y + 1 < height) add(p + width);
  }
  ctx.putImageData(frame, 0, 0);
}

function splitStickerSheet(image, fixedGrid = null) {
  const scale = Math.min(1, 1100 / Math.max(image.naturalWidth, image.naturalHeight));
  const sheet = document.createElement('canvas'); sheet.width = Math.round(image.naturalWidth * scale); sheet.height = Math.round(image.naturalHeight * scale);
  const ctx = sheet.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0, sheet.width, sheet.height);
  const { data } = ctx.getImageData(0, 0, sheet.width, sheet.height), cropX = Math.round(sheet.width * .035), cropY = Math.round(sheet.height * .035);
  const left = Math.round((fixedGrid?.bounds?.left ?? cropX / sheet.width) * sheet.width), top = Math.round((fixedGrid?.bounds?.top ?? cropY / sheet.height) * sheet.height);
  const right = Math.round((fixedGrid?.bounds?.right ?? 1 - cropX / sheet.width) * sheet.width), bottom = Math.round((fixedGrid?.bounds?.bottom ?? 1 - cropY / sheet.height) * sheet.height);
  const innerWidth = right - left, innerHeight = bottom - top;
  const isInk = (x, y) => { const p = (y * sheet.width + x) * 4; return data[p] < 226 || data[p+1] < 226 || data[p+2] < 220 || Math.max(data[p], data[p+1], data[p+2]) - Math.min(data[p], data[p+1], data[p+2]) > 48; };
  const xs = new Uint32Array(innerWidth), ys = new Uint32Array(innerHeight);
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) if (isInk(x, y)) { xs[x-left]++; ys[y-top]++; }
  let cols = fixedGrid
    ? Array.from({ length: fixedGrid.columns }, (_, i) => [Math.round(fixedGrid.x[i] * innerWidth), Math.round(fixedGrid.x[i + 1] * innerWidth)])
    : projectionRuns(xs, innerHeight * .009, Math.round(innerWidth * .004));
  let rows = fixedGrid
    ? Array.from({ length: fixedGrid.rows }, (_, i) => [Math.round(fixedGrid.y[i] * innerHeight), Math.round(fixedGrid.y[i + 1] * innerHeight)])
    : projectionRuns(ys, innerWidth * .009, Math.round(innerHeight * .004));
  if (cols.length < 2) cols = [[0, innerWidth]];
  if (rows.length < 2) rows = [[0, innerHeight]];
  const tiles = [];
  for (const row of rows) for (const col of cols) {
    const padX = Math.round((col[1] - col[0]) * .035), padY = Math.round((row[1] - row[0]) * .035);
    const sx = left + col[0] + padX, sy = top + row[0] + padY, sw = col[1] - col[0] - padX * 2, sh = row[1] - row[0] - padY * 2;
    if (sw < sheet.width * .08 || sh < sheet.height * .08) continue;
    const crop = document.createElement('canvas'); crop.width = 512; crop.height = 512; const cctx = crop.getContext('2d', { willReadFrequently: true });
    const fit = Math.min(452 / sw, 452 / sh), dw = sw * fit, dh = sh * fit, dx = (512 - dw) / 2, dy = (512 - dh) / 2;
    cctx.drawImage(sheet, sx, sy, sw, sh, dx, dy, dw, dh); removeLightBackground(cctx, 512, 512);
    const mask = cctx.getImageData(0, 0, 512, 512).data; let visible = 0; for (let p = 3; p < mask.length; p += 4) if (mask[p] > 40) visible++;
    if (visible > 300) tiles.push({ image: crop.toDataURL('image/png') });
  }
  const edgesFromRuns = (runs, total) => [0, ...runs.slice(0, -1).map((run, index) => ((run[1] + runs[index + 1][0]) / 2) / total), 1];
  const grid = fixedGrid ? { x: fixedGrid.x.slice(), y: fixedGrid.y.slice(), bounds: { ...fixedGrid.bounds } } : { x: edgesFromRuns(cols, innerWidth), y: edgesFromRuns(rows, innerHeight), bounds: { left: cropX / sheet.width, right: 1 - cropX / sheet.width, top: cropY / sheet.height, bottom: 1 - cropY / sheet.height } };
  return { tiles, rows: rows.length, columns: cols.length, grid };
}

function openSheetPreview(splitOverride = null) {
  const split = splitOverride || splitStickerSheet(uploadImage); sheetSegments = split.tiles;
  if (sheetSegments.length < 2) { openSheetGridFallback(); return; }
  const suggested = uploadName.replace(/[_-]+/g, ' ').trim() || 'Nuovo pacchetto';
  const cards = sheetSegments.map((tile, index) => `<label class="sheet-tile"><input type="checkbox" checked data-sheet-index="${index}"/><span class="sheet-check">✓</span><span class="sheet-preview"><img src="${tile.image}" alt="Sticker ${index + 1}" /></span><small>Sticker ${String(index + 1).padStart(2, '0')}</small></label>`).join('');
  setModal(`<button class="modal-close" id="modal-close" aria-label="Chiudi">×</button><div class="section-overline">PACCHETTO AUTOMATICO</div><h2 id="modal-title">Ho trovato ${sheetSegments.length} sticker</h2><p>Controlla i ritagli, deseleziona quelli da escludere o correggi le linee della griglia.</p><div class="sheet-toolbar"><label for="sheet-pack-name">Nome del pacchetto</label><input id="sheet-pack-name" value="${escapeHtml(suggested)}" maxlength="30"/><button class="text-link" id="sheet-select-all">Deseleziona tutti</button></div><div class="sheet-results">${cards}</div><div class="sheet-footer"><span id="sheet-selected-count">${sheetSegments.length} selezionati · ${split.rows} righe × ${split.columns} colonne</span><div class="sheet-footer-actions"><button class="secondary-button" id="edit-sheet-grid">✥ Correggi griglia</button><button class="create-button" id="save-sheet-pack">Crea pacchetto <span>→</span></button></div></div>`, 'modal sheet-modal');
  qs('#edit-sheet-grid').onclick = () => openSheetGridEditor(split.columns || 4, split.rows || 3, split.grid);
  const updateCount = () => { const checked = qsa('[data-sheet-index]:checked').length; qs('#sheet-selected-count').textContent = `${checked} selezionati`; qs('#save-sheet-pack').disabled = !checked; };
  qsa('[data-sheet-index]').forEach(box => box.onchange = updateCount);
  qs('#sheet-select-all').onclick = () => { const boxes = qsa('[data-sheet-index]'), select = boxes.some(box => !box.checked); boxes.forEach(box => { box.checked = select; }); qs('#sheet-select-all').textContent = select ? 'Deseleziona tutti' : 'Seleziona tutti'; updateCount(); };
  qs('#save-sheet-pack').onclick = () => {
    const name = qs('#sheet-pack-name').value.trim(); if (!name) { qs('#sheet-pack-name').focus(); return; }
    if (packs.some(pack => pack.name.toLowerCase() === name.toLowerCase())) { toast('Esiste già un pacchetto con questo nome. Scegline un altro.'); return; }
    const chosen = qsa('[data-sheet-index]:checked').map(box => Number(box.dataset.sheetIndex));
    packs.unshift({ id: crypto.randomUUID(), name, emoji: '✨', count: chosen.length, author: 'tu', bg: '#e9e8df', featured: '✨', minis: ['💫', '💌'] });
    chosen.forEach((index, order) => stickers.unshift({ id: crypto.randomUUID(), name: `${name} ${String(order + 1).padStart(2, '0')}`, pack: name, image: sheetSegments[index].image, style: 'sheet', bg: '#f5f4ef' }));
    persist(); renderPacks(); closeModal(); showView('packs'); openPack(name); toast(`${chosen.length} sticker aggiunti a “${name}”`);
  };
}

function openSheetGridFallback() {
  setModal(`<button class="modal-close" id="modal-close" aria-label="Chiudi">×</button><div class="modal-icon">▦</div><div class="section-overline">RITAGLIO MANUALE</div><h2 id="modal-title">Imposta la griglia della tavola</h2><p>Il rilevamento automatico non ha distinto le celle. Scegli quante colonne e righe ha la tua tavola per continuare.</p><div class="grid-presets"><button class="secondary-button" id="grid-preset-24">6 colonne × 4 righe <small>24 sticker</small></button><button class="secondary-button" id="grid-preset-12">4 colonne × 3 righe <small>12 sticker</small></button></div><div class="grid-custom"><label for="grid-columns">Colonne</label><select id="grid-columns" class="caption-input">${Array.from({length: 9}, (_, i) => i + 2).map(value => `<option value="${value}" ${value === 6 ? 'selected' : ''}>${value}</option>`).join('')}</select><label for="grid-rows">Righe</label><select id="grid-rows" class="caption-input">${Array.from({length: 9}, (_, i) => i + 2).map(value => `<option value="${value}" ${value === 4 ? 'selected' : ''}>${value}</option>`).join('')}</select></div><button class="create-button modal-submit" id="apply-grid">Mostra anteprima <span>→</span></button><p class="upload-tip">Le celle vengono ritagliate in ordine da sinistra a destra e dall’alto in basso.</p>`, 'modal grid-fallback-modal');
  const apply = (columns, rows) => openSheetGridEditor(columns, rows);
  qs('#grid-preset-24').onclick = () => apply(6, 4);
  qs('#grid-preset-12').onclick = () => apply(4, 3);
  qs('#apply-grid').onclick = () => apply(Number(qs('#grid-columns').value), Number(qs('#grid-rows').value));
}

function openSheetGridEditor(columns = 4, rows = 3, savedGrid = null) {
  const storageKey = `ss-grid-${slugify(uploadName)}-${uploadImage.naturalWidth}x${uploadImage.naturalHeight}`;
  savedGrid = savedGrid || readStore(storageKey, null);
  const state = { columns, rows, x: [], y: [], bounds: { left: .035, right: .965, top: .035, bottom: .965 } };
  const evenlySpaced = count => Array.from({ length: count + 1 }, (_, i) => i / count);
  state.x = savedGrid?.x?.length === columns + 1 ? savedGrid.x.slice() : evenlySpaced(columns);
  state.y = savedGrid?.y?.length === rows + 1 ? savedGrid.y.slice() : evenlySpaced(rows);
  state.bounds = { ...state.bounds, ...(savedGrid?.bounds || {}) };
  const rangeRows = (axis, count) => Array.from({ length: count - 1 }, (_, i) => `<label class="grid-line-control">${axis === 'x' ? 'Linea verticale' : 'Linea orizzontale'} ${i + 1}<input type="range" min="2" max="98" step="0.1" value="${(state[axis][i + 1] * 100).toFixed(1)}" data-grid-axis="${axis}" data-grid-line="${i + 1}" aria-label="Sposta ${axis === 'x' ? 'linea verticale' : 'linea orizzontale'} ${i + 1}"></label>`).join('');
  const controlsMarkup = () => `<div class="grid-line-groups"><section><h3>Colonne · linee verticali</h3>${rangeRows('x', state.columns)}</section><section><h3>Righe · linee orizzontali</h3>${rangeRows('y', state.rows)}</section></div>`;
  const boundsMarkup = () => `<section class="grid-bound-controls"><h3>Bordi esterni della griglia</h3>${[['left','Sinistro',0,45],['right','Destro',55,100],['top','Superiore',0,45],['bottom','Inferiore',55,100]].map(([key,label,min,max]) => `<label class="grid-line-control">Bordo ${label}<input type="range" min="${min}" max="${max}" step="0.1" value="${(state.bounds[key]*100).toFixed(1)}" data-grid-bound="${key}" aria-label="Sposta bordo ${label.toLowerCase()}"></label>`).join('')}</section>`;
  const ratio = uploadImage.naturalWidth / uploadImage.naturalHeight;
  const imageWidth = Math.round(Math.min(760, 320 * ratio));
  const markup = () => `<button class="modal-close" id="modal-close" aria-label="Chiudi">×</button><div class="section-overline">ALLINEA I RITAGLI</div><h2 id="modal-title">Correggi la griglia</h2><p>Allinea le divisioni agli spazi tra gli sticker. Regola anche i bordi esterni; salva la posizione per riutilizzarla con questa tavola.</p><div class="grid-editor-counts"><label>Colonne<select id="grid-columns" class="caption-input">${Array.from({ length: 9 }, (_, i) => i + 2).map(value => `<option value="${value}" ${value === state.columns ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label>Righe<select id="grid-rows" class="caption-input">${Array.from({ length: 9 }, (_, i) => i + 2).map(value => `<option value="${value}" ${value === state.rows ? 'selected' : ''}>${value}</option>`).join('')}</select></label></div><div class="grid-editor-image" id="grid-editor-image" style="--grid-image-ratio:${ratio};--grid-image-width:${imageWidth}px"><img src="${uploadImage.src}" alt="Tavola sticker"/><svg id="grid-editor-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"></svg></div><div id="grid-line-controls">${controlsMarkup()}${boundsMarkup()}</div><div class="grid-editor-actions"><button class="secondary-button" id="grid-even">Centra divisioni</button><button class="secondary-button" id="save-grid-position">Salva posizione</button><button class="create-button" id="grid-preview">Aggiorna anteprima <span>→</span></button></div>`;
  setModal(markup(), 'modal grid-editor-modal');
  const drawLines = () => {
    const svg = qs('#grid-editor-overlay');
    const left = state.bounds.left * 1000, right = state.bounds.right * 1000, top = state.bounds.top * 1000, bottom = state.bounds.bottom * 1000;
    const xLines = state.x.slice(1, -1).map(value => { const x = left + value * (right - left); return `<line class="grid-line-halo" x1="${x}" y1="${top}" x2="${x}" y2="${bottom}"/><line class="grid-line" x1="${x}" y1="${top}" x2="${x}" y2="${bottom}"/><circle class="grid-line-grip" cx="${x}" cy="${(top+bottom)/2}" r="12"/>`; }).join('');
    const yLines = state.y.slice(1, -1).map(value => { const y = top + value * (bottom - top); return `<line class="grid-line-halo" x1="${left}" y1="${y}" x2="${right}" y2="${y}"/><line class="grid-line" x1="${left}" y1="${y}" x2="${right}" y2="${y}"/><circle class="grid-line-grip" cx="${(left+right)/2}" cy="${y}" r="12"/>`; }).join('');
    svg.innerHTML = `<rect class="grid-line-halo" x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"/><rect class="grid-line" x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"/>${xLines}${yLines}`;
  };
  const bindLineControls = () => {
    qsa('[data-grid-axis]').forEach(input => input.oninput = () => {
      const axis = input.dataset.gridAxis, index = Number(input.dataset.gridLine), values = state[axis];
      const min = values[index - 1] + .015, max = values[index + 1] - .015;
      values[index] = Math.max(min, Math.min(max, Number(input.value) / 100));
      input.value = (values[index] * 100).toFixed(1); drawLines();
    });
    qsa('[data-grid-bound]').forEach(input => input.oninput = () => {
      const key = input.dataset.gridBound, value = Number(input.value) / 100;
      if (key === 'left') state.bounds.left = Math.min(value, state.bounds.right - .08);
      if (key === 'right') state.bounds.right = Math.max(value, state.bounds.left + .08);
      if (key === 'top') state.bounds.top = Math.min(value, state.bounds.bottom - .08);
      if (key === 'bottom') state.bounds.bottom = Math.max(value, state.bounds.top + .08);
      input.value = (state.bounds[key] * 100).toFixed(1); drawLines();
    });
  };
  bindLineControls(); drawLines();
  const resetGrid = () => {
    state.columns = Number(qs('#grid-columns').value); state.rows = Number(qs('#grid-rows').value);
    state.x = evenlySpaced(state.columns); state.y = evenlySpaced(state.rows);
    qs('#grid-line-controls').innerHTML = `${controlsMarkup()}${boundsMarkup()}`; bindLineControls(); drawLines();
  };
  qs('#grid-columns').onchange = resetGrid; qs('#grid-rows').onchange = resetGrid;
  qs('#grid-even').onclick = () => { state.x = evenlySpaced(state.columns); state.y = evenlySpaced(state.rows); qs('#grid-line-controls').innerHTML = `${controlsMarkup()}${boundsMarkup()}`; bindLineControls(); drawLines(); };
  qs('#save-grid-position').onclick = () => { localStorage.setItem(storageKey, JSON.stringify({ x: state.x, y: state.y, bounds: state.bounds })); toast('Posizione della griglia salvata per questa tavola'); };
  qs('#grid-preview').onclick = () => {
    const split = splitStickerSheet(uploadImage, { columns: state.columns, rows: state.rows, x: state.x, y: state.y, bounds: state.bounds });
    if (split.tiles.length < 2) { toast('Con queste linee ho trovato pochi sticker. Spostale e riprova.'); return; }
    openSheetPreview(split);
  };
}

const styleOptions = [
  { id: 'comic', emoji: '💥', label: 'Fumetto' }, { id: 'retro', emoji: '✦', label: 'Vintage' },
  { id: 'minimal', emoji: '◯', label: 'Minimal' }, { id: 'nature', emoji: '🌿', label: 'Natura' },
  { id: 'kawaii', emoji: '✿', label: 'Kawaii' }, { id: 'abstract', emoji: '◈', label: 'Astratto' },
  { id: 'manga', emoji: '✒️', label: 'Manga' }, { id: 'pop', emoji: '🟡', label: 'Pop art' },
  { id: 'watercolor', emoji: '🎨', label: 'Cartoon morbido' }, { id: '3d', emoji: '✨', label: 'Ritratto soft' },
  { id: 'neon', emoji: '💜', label: 'Neon' }
];
const platformPresets = {
  whatsapp: { label: 'WhatsApp', icon: '🟢', format: 'PNG quadrato · 512 × 512 px', tip: 'Immagine PNG pronta da condividere; per i pacchetti installabili serve un’app dedicata.' },
  tiktok: { label: 'TikTok', icon: '♪', format: 'PNG quadrato · sticker overlay', tip: 'Esporta il PNG e aggiungilo come immagine/sticker nei tuoi contenuti TikTok.' },
  instagram: { label: 'Instagram', icon: '◎', format: 'PNG quadrato · sticker Stories e Reel', tip: 'Esporta il PNG e usalo come elemento grafico in Stories o Reel.' }
};

function openEditor() {
  const styleButtons = styleOptions.map(style => `<button class="style-option ${activeStyle === style.id ? 'selected' : ''}" data-style="${style.id}"><span>${style.emoji}</span>${style.label}</button>`).join('');
  const packOptions = `<option value="">I miei sticker</option>${packs.map(pack => `<option value="${escapeHtml(pack.name)}" ${targetPack === pack.name ? 'selected' : ''}>${escapeHtml(pack.name)}</option>`).join('')}`;
  const destinationOptions = Object.entries(platformPresets).map(([id, item]) => `<option value="${id}" ${targetPlatform === id ? 'selected' : ''}>${item.icon} ${item.label}</option>`).join('');
  const platform = platformPresets[targetPlatform];
  aiStickerImage = null;
  setModal(`<button class="modal-close" id="modal-close" aria-label="Chiudi">×</button><div class="section-overline">EDITOR STICKER · ${uploadImage.naturalWidth} × ${uploadImage.naturalHeight}</div><h2 id="modal-title">Trasformazione fumetto</h2><p>Scegli un look: con Gemini collegato l’IA crea una nuova illustrazione partendo dalla foto.</p><div class="editor-layout"><div class="editor-stage"><canvas id="preview-canvas" width="512" height="512"></canvas></div><div class="editor-controls"><div class="ai-connection-box"><button class="secondary-button" id="editor-connect-ai">${connectedGeminiKey ? '✓ Gemini collegato · Gestisci' : '✦ Collega la tua AI'}</button><small id="editor-ai-status">${connectedGeminiKey ? 'La prossima direzione artistica verrà generata con Gemini.' : 'Collega la tua chiave Gemini per generare il look con l’IA.'}</small></div><div class="local-ai-control"><button class="secondary-button" id="local-cutout">✦ Scontorna con IA sul dispositivo</button><small id="local-cutout-status">Modello gratuito. La foto resta sul dispositivo; al primo uso scarica i pesi in cache.</small></div><div class="control-group"><label>Direzione artistica <small>scegli il look</small></label><div class="style-options">${styleButtons}</div></div><div class="control-group"><label for="intensity">Intensità <small id="intensity-value">${styleStrength}%</small></label><input id="intensity" class="range" type="range" min="20" max="100" value="${styleStrength}" /></div><div class="control-group"><label for="outline">Contorni fumetto <small id="outline-value">${lineStrength}%</small></label><input id="outline" class="range" type="range" min="0" max="100" value="${lineStrength}" /></div><div class="control-group"><label for="caption">Emoji o scritta <small>facoltativa</small></label><input class="caption-input" id="caption" maxlength="26" placeholder="es. Ciao bella! ✨" /></div><div class="control-group"><label for="platform-select">Crea per la piattaforma</label><select id="platform-select" class="caption-input">${destinationOptions}</select><small id="platform-format" class="platform-format">${platform.format}</small><div id="platform-tip" class="platform-tip">${platform.tip}</div></div><div class="control-group"><label for="pack-select">Salva nel pacchetto</label><select id="pack-select" class="caption-input">${packOptions}</select></div><div class="editor-actions"><button class="secondary-button" id="share-sticker">↗ Esporta ${platform.label}</button><button class="create-button" id="save-sticker">Salva sticker <span>→</span></button></div><div class="share-note">Gemini usa la foto caricata per generare il look. Lo scontorno locale rimane disponibile; il modello locale non crea nuove pose.</div></div></div>`, 'modal editor-modal');
  qsa('.style-option').forEach(button => button.onclick = () => {
    if (aiGenerating) return;
    activeStyle = button.dataset.style; qsa('.style-option').forEach(item => item.classList.toggle('selected', item === button));
    qs('#modal-title').textContent = activeStyle === 'comic' ? 'Trasformazione fumetto' : `Stile ${styleOptions.find(style => style.id === activeStyle).label.toLowerCase()}`;
    if (connectedGeminiKey) generateStickerWithGemini(activeStyle);
    else { drawPreview(); openGeminiConnectionModal(activeStyle); }
  });
  qs('#intensity').oninput = event => { styleStrength = Number(event.target.value); qs('#intensity-value').textContent = `${styleStrength}%`; drawPreview(); };
  qs('#outline').oninput = event => { lineStrength = Number(event.target.value); qs('#outline-value').textContent = `${lineStrength}%`; drawPreview(); };
  qs('#caption').oninput = drawPreview;
  qs('#pack-select').onchange = event => { targetPack = event.target.value; };
  qs('#platform-select').onchange = event => { targetPlatform = event.target.value; const preset = platformPresets[targetPlatform]; qs('#platform-format').textContent = preset.format; qs('#platform-tip').textContent = preset.tip; qs('#share-sticker').textContent = `↗ Esporta ${preset.label}`; };
  qs('#share-sticker').onclick = shareCurrentArtwork;
  qs('#save-sticker').onclick = saveSticker;
  qs('#local-cutout').onclick = removeLocalBackground;
  qs('#editor-connect-ai').onclick = () => openGeminiConnectionModal();
  drawPreview();
}

function syncGeminiConnectionUI() {
  const connected = Boolean(connectedGeminiKey);
  const cardButton = qs('#connect-gemini'), cardStatus = qs('#gemini-card-status');
  if (cardButton) cardButton.textContent = connected ? 'Gemini collegato · Gestisci' : 'Collega Gemini';
  if (cardStatus) cardStatus.textContent = connected ? 'Pronto per questa sessione. La chiave non viene salvata.' : 'Collega la tua chiave Gemini per creare look illustrati dalla foto.';
  const editorButton = qs('#editor-connect-ai'), editorStatus = qs('#editor-ai-status');
  if (editorButton) editorButton.textContent = connected ? '✓ Gemini collegato · Gestisci' : '✦ Collega la tua AI';
  if (editorStatus) editorStatus.textContent = connected ? 'Scegli una direzione artistica: Gemini genererà lo sticker.' : 'Collega la tua chiave Gemini per generare il look con l’IA.';
}

function openGeminiConnectionModal(styleAfterConnect = null) {
  const styleName = styleAfterConnect ? styleOptions.find(item => item.id === styleAfterConnect)?.label : '';
  setModal(`<button class="modal-close" id="modal-close" aria-label="Chiudi">×</button><div class="modal-icon">✦</div><div class="section-overline">COLLEGA LA TUA AI</div><h2 id="modal-title">Gemini, con il tuo account</h2><p>Inserisci una chiave API personale di Google AI Studio. Quando scegli un look, Gemini userà la foto per creare uno sticker illustrato${styleName ? ` in stile ${escapeHtml(styleName)}` : ''}.</p><div class="ai-privacy-note"><strong>Prima di collegare</strong><ul><li>La foto viene inviata a Google Gemini per la generazione.</li><li>La chiave viene inoltrata dall’app a Google per la richiesta, solo in memoria e senza essere registrata o salvata.</li><li>La generazione di immagini può essere a pagamento sul tuo account Google: il modello attuale costa circa $0,034 per immagine 1K, oltre ai token d’ingresso. Verifica tariffa e limiti prima di usarlo.</li></ul></div><a class="ai-key-link" href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer">Apri Google AI Studio e crea una chiave →</a><form id="gemini-connect-form"><label for="gemini-api-key">Chiave API Gemini</label><input id="gemini-api-key" type="password" autocomplete="off" spellcheck="false" placeholder="Incolla qui la tua chiave" required/><label class="ai-consent"><input id="gemini-consent" type="checkbox" required/><span>Accetto di inviare la foto a Gemini e di usare la quota o l’eventuale credito del mio account.</span></label><button type="submit" class="create-button modal-submit">${styleAfterConnect ? 'Collega e genera sticker' : 'Collega Gemini'} <span>→</span></button></form>${connectedGeminiKey ? '<button type="button" class="secondary-button ai-disconnect" id="gemini-disconnect">Scollega Gemini</button><small class="ai-session-note">Gemini è collegato solo per questa sessione del browser.</small>' : '<small class="ai-session-note">Collegamento temporaneo: la chiave resta solo in memoria finché la pagina è aperta.</small>'}`, 'modal ai-connect-modal');
  qs('#gemini-connect-form').onsubmit = event => {
    event.preventDefault();
    connectedGeminiKey = qs('#gemini-api-key').value.trim();
    if (!connectedGeminiKey || !qs('#gemini-consent').checked) return;
    goBackModal(); syncGeminiConnectionUI();
    if (styleAfterConnect) generateStickerWithGemini(styleAfterConnect);
    else toast('Gemini collegato per questa sessione');
  };
  qs('#gemini-disconnect')?.addEventListener('click', () => {
    connectedGeminiKey = ''; aiStickerImage = null; goBackModal(); syncGeminiConnectionUI(); drawPreview(); toast('Gemini scollegato');
  });
}

const geminiArtDirections = {
  comic: 'professional European comic-book sticker, confident inked contour, elegant cel shading, expressive but natural face, polished editorial finish',
  retro: 'premium 1970s retro print illustration, warm terracotta and mustard palette, subtle screen-print texture, tasteful vintage poster finish',
  minimal: 'minimalist editorial vector portrait, clean deliberate lines, reduced geometric shapes, restrained 4-color palette, premium brand sticker',
  nature: 'refined nature-inspired illustrated portrait, botanical details framing the subject, natural green palette, sophisticated editorial sticker',
  kawaii: 'high-quality kawaii character sticker, warm friendly expression, smooth clean outlines, balanced pastel colors, charming but recognizably the same person',
  abstract: 'art-directed abstract portrait sticker, bold balanced geometric color planes, expressive contemporary composition, polished gallery print',
  manga: 'beautifully inked manga portrait sticker, controlled linework, expressive eyes, delicate screentone shading, professional manga illustration',
  pop: 'bold pop-art portrait sticker, crisp comic ink, confident saturated color blocks, refined halftone accents, premium screenprint finish',
  watercolor: 'soft hand-painted watercolor portrait sticker, layered translucent pigments, natural facial likeness, refined paper texture and edges',
  '3d': 'polished stylized 3D character portrait sticker, appealing soft studio lighting, refined materials, preserve the real person’s likeness',
  neon: 'premium neon-noir portrait sticker, luminous violet and cyan rim light, crisp readable contours, sophisticated dark-to-bright contrast'
};

async function generateStickerWithGemini(styleId) {
  if (!connectedGeminiKey) { openGeminiConnectionModal(styleId); return; }
  const canvas = resizedImageCanvas(uploadHasLocalCutout ? uploadImage : (originalUploadImage || uploadImage));
  const imageUrl = canvas.toDataURL('image/jpeg', .88), [prefix, base64] = imageUrl.split(',');
  const mimeType = prefix.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
  const style = styleOptions.find(item => item.id === styleId)?.label || 'fumetto';
  const prompt = `Edit the supplied photo into exactly one professional die-cut messaging sticker in this art direction: ${geminiArtDirections[styleId] || geminiArtDirections.comic}. Keep the identity, face, glasses, hairstyle, skin tone, clothing, and pose of the same real person recognizable and faithful to the reference. Show one centered bust portrait with a clean white sticker outline, isolated on a pure white background for easy local background removal. Premium illustration quality, crisp details, balanced composition. No extra people, no collage, no frame, no lettering, no watermark, no logos, no added words. Output one square image.`;
  aiGenerating = true;
  aiStickerImage = null; drawPreview();
  qs('#intensity')?.closest('.control-group')?.removeAttribute('hidden'); qs('#outline')?.closest('.control-group')?.removeAttribute('hidden');
  const status = qs('#editor-ai-status'), save = qs('#save-sticker'), share = qs('#share-sticker');
  if (status) status.textContent = `Gemini sta creando il look ${style}… la foto viene inviata a Google.`;
  if (save) save.disabled = true; if (share) share.disabled = true;
  qsa('.style-option').forEach(button => { button.disabled = true; });
  try {
    const apiEndpoint = location.hostname === 'sartoriluca65.github.io'
      ? 'https://sticker-studio.sartori-luca65.chatgpt.site/api/ai/sticker'
      : '/api/ai/sticker';
    const response = await fetch(apiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: connectedGeminiKey, prompt, image: { mimeType, data: base64 } }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Gemini non disponibile (${response.status}).`);
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Gemini ha restituito un’immagine che non riesco ad aprire.')); image.src = `data:${result.mimeType || 'image/png'};base64,${result.image}`; });
    aiStickerImage = image;
    if (status) status.textContent = 'Rimuovo lo sfondo localmente per preparare lo sticker…';
    try { aiStickerImage = await cutoutImageWithLocalAI(image); }
    catch (error) { console.info('Scontorno locale non riuscito; mantengo il risultato Gemini.', error); }
    qs('#intensity')?.closest('.control-group')?.setAttribute('hidden', ''); qs('#outline')?.closest('.control-group')?.setAttribute('hidden', '');
    drawPreview();
    if (status) status.textContent = `Sticker ${style} generato. Puoi aggiungere una scritta e salvarlo.`;
  } catch (error) {
    aiStickerImage = null; drawPreview();
    if (status) status.textContent = error.message || 'Non riesco a collegarmi a Gemini. Controlla la chiave e riprova.';
    toast('Generazione IA non riuscita. Controlla chiave e quota Gemini.');
  } finally {
    aiGenerating = false;
    if (save) save.disabled = false; if (share) share.disabled = false;
    qsa('.style-option').forEach(button => { button.disabled = false; });
  }
}

function resizedImageCanvas(image) {
  const scale = Math.min(1, 460 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext('2d', { willReadFrequently: true }).drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function cutoutImageWithLocalAI(sourceImage) {
  const model = await getLocalBackgroundPipeline(), inputCanvas = resizedImageCanvas(sourceImage);
  const inputBlob = await new Promise(resolve => inputCanvas.toBlob(resolve, 'image/png'));
  if (!inputBlob) throw new Error('Non riesco a preparare l’immagine per lo scontorno.');
  const inputUrl = URL.createObjectURL(inputBlob); let result;
  try { result = await model(inputUrl); } finally { URL.revokeObjectURL(inputUrl); }
  const cutout = Array.isArray(result) ? result[0] : result;
  if (!cutout?.data || !cutout.width || !cutout.height || cutout.channels !== 4) throw new Error('Il modello non ha restituito un ritaglio trasparente.');
  const canvas = document.createElement('canvas'); canvas.width = cutout.width; canvas.height = cutout.height;
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(cutout.data), cutout.width, cutout.height), 0, 0);
  const image = new Image();
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Non riesco ad aprire il ritaglio generato.')); image.src = canvas.toDataURL('image/png'); });
  return image;
}

async function getLocalBackgroundPipeline() {
  if (localBackgroundPipeline) return localBackgroundPipeline;
  if (!localBackgroundPipelinePromise) {
    localBackgroundPipelinePromise = (async () => {
      const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
      if (navigator.gpu) {
        try { return await pipeline('background-removal', 'Xenova/modnet', { device: 'webgpu' }); }
        catch (error) { console.info('WebGPU non disponibile per lo scontorno; uso WASM.', error); }
      }
      return pipeline('background-removal', 'Xenova/modnet', { device: 'wasm' });
    })().then(model => (localBackgroundPipeline = model)).catch(error => {
      localBackgroundPipelinePromise = null;
      throw error;
    });
  }
  return localBackgroundPipelinePromise;
}

async function removeLocalBackground() {
  if (uploadHasLocalCutout) {
    uploadImage = originalUploadImage; uploadHasLocalCutout = false;
    qs('#local-cutout').textContent = '✦ Scontorna con IA sul dispositivo';
    qs('#local-cutout-status').textContent = 'Foto originale ripristinata. La foto resta sul dispositivo.';
    drawPreview(); return;
  }
  const button = qs('#local-cutout'), status = qs('#local-cutout-status');
  button.disabled = true; status.textContent = 'Carico il modello locale e preparo il ritaglio…';
  try {
    if (!qs('#local-cutout-status')) return;
    status.textContent = 'L’IA sta separando la persona dallo sfondo…';
    const image = await cutoutImageWithLocalAI(originalUploadImage);
    uploadImage = image; uploadHasLocalCutout = true;
    button.textContent = '↺ Ripristina la foto originale';
    status.textContent = 'Sfondo rimosso. Puoi aggiungere lo sticker a un pacchetto o esportarlo.';
    drawPreview();
  } catch (error) {
    console.error('Scontorno locale non riuscito:', error);
    if (qs('#local-cutout-status')) status.textContent = 'Modello non disponibile in questo browser o senza connessione. Riprova con Chrome o Edge aggiornato.';
    toast('Scontorno IA non riuscito. Verifica la connessione e riprova.');
  } finally {
    if (qs('#local-cutout')) button.disabled = false;
  }
}

function bilateralSmooth(data, width, height, amount) {
  if (amount <= 0) return data;
  const source = new Uint8ClampedArray(data), radius = 2, spatial = [0.24, 0.62, 1, 0.62, 0.24];
  for (let y = radius; y < height - radius; y++) for (let x = radius; x < width - radius; x++) {
    const p = (y * width + x) * 4, centerR = source[p], centerG = source[p + 1], centerB = source[p + 2]; let sumR = 0, sumG = 0, sumB = 0, sum = 0;
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const q = ((y + dy) * width + x + dx) * 4, dr = source[q] - centerR, dg = source[q + 1] - centerG, db = source[q + 2] - centerB;
      const color = Math.exp(-(dr * dr + dg * dg + db * db) / (2 * 37 * 37)), weight = spatial[dx + 2] * spatial[dy + 2] * color;
      sumR += source[q] * weight; sumG += source[q + 1] * weight; sumB += source[q + 2] * weight; sum += weight;
    }
    const blend = amount * 0.8; data[p] = centerR * (1 - blend) + sumR / sum * blend; data[p + 1] = centerG * (1 - blend) + sumG / sum * blend; data[p + 2] = centerB * (1 - blend) + sumB / sum * blend;
  }
  return data;
}

function colorFilter(r, g, b, style) {
  if (style === 'retro') return [0.393*r + 0.769*g + 0.189*b, 0.349*r + 0.686*g + 0.168*b, 0.272*r + 0.534*g + 0.131*b];
  if (style === 'manga') { const gray = 0.24*r + 0.66*g + 0.10*b; return [gray * .92 + 8, gray * .94 + 7, gray + 4]; }
  if (style === 'pop') return [r > 128 ? r * 1.08 + 28 : r * .82, g > 128 ? g * .94 + 15 : g * .75, b > 128 ? b * 1.02 + 22 : b * .72];
  if (style === 'watercolor') return [r * .94 + 14, g * .94 + 12, b * .9 + 18];
  if (style === '3d') return [r * 1.06 + 7, g * 1.02 + 5, b * .98 + 5];
  if (style === 'neon') return [r * 1.12 + 20, g * .88 + 6, b * 1.18 + 22];
  if (style === 'minimal') { const gray = 0.22*r + 0.68*g + 0.10*b; return [gray * 0.87 + 22, gray * 0.82 + 25, gray * 0.72 + 32]; }
  if (style === 'nature') return [r * 0.9 + 7, g * 1.08 + 10, b * 0.83 + 2];
  if (style === 'kawaii') return [r * 1.02 + 14, g * 0.95 + 9, b * 0.98 + 16];
  if (style === 'abstract') return [g * 0.92 + 18, b * 0.95 + 14, r * 0.94 + 16];
  return [r, g, b];
}

function processArtwork(ctx, width, height) {
  const image = ctx.getImageData(0, 0, width, height), pixels = image.data, source = new Uint8ClampedArray(pixels), gray = new Float32Array(width * height);
  const strength = styleStrength / 100, style = activeStyle;
  const smoothAmount = style === 'comic' ? 0.24 : style === '3d' ? 0.22 : style === 'kawaii' || style === 'watercolor' ? 0.28 : style === 'retro' ? 0.2 : style === 'minimal' ? 0.3 : style === 'manga' ? 0.1 : 0.14;
  bilateralSmooth(pixels, width, height, smoothAmount * strength);
  const levels = style === 'minimal' ? 8 : style === 'comic' ? 20 : style === 'pop' ? 12 : style === 'retro' ? 16 : style === 'kawaii' ? 18 : style === '3d' ? 36 : style === 'nature' || style === 'watercolor' ? 32 : style === 'manga' ? 8 : 20;
  const step = 255 / (levels - 1), contrast = style === 'comic' ? 1.025 : style === '3d' ? 1.01 : style === 'retro' ? 1.035 : 1.02;
  // These are light color treatments, not AI illustration. Keep the source photo's
  // skin texture and detail instead of posterizing every pixel into flat blocks.
  const quantizationStrength = strength * (style === 'minimal' ? .22 : style === 'pop' ? .4 : style === 'manga' ? .42 : style === 'comic' ? .2 : style === 'watercolor' ? .16 : style === '3d' ? .12 : style === 'kawaii' ? .2 : style === 'retro' ? .24 : .18);
  for (let i = 0; i < pixels.length; i += 4) {
    let [r, g, b] = colorFilter(pixels[i], pixels[i + 1], pixels[i + 2], style);
    const avg = (r + g + b) / 3, saturation = style === 'minimal' ? 0.9 : style === 'nature' || style === 'pop' || style === 'neon' ? 1.18 : style === 'kawaii' || style === '3d' ? 1.08 : style === 'manga' ? 0 : style === 'watercolor' ? .94 : 1.05;
    r = avg + (r - avg) * saturation; g = avg + (g - avg) * saturation; b = avg + (b - avg) * saturation;
    const quantize = (channel, base) => { const high = (channel - 128) * contrast + 128, mapped = Math.round(Math.max(0, Math.min(255, high)) / step) * step; return base * (1 - quantizationStrength) + mapped * quantizationStrength; };
    pixels[i] = quantize(r, pixels[i]); pixels[i + 1] = quantize(g, pixels[i + 1]); pixels[i + 2] = quantize(b, pixels[i + 2]);
  }
  for (let i = 0; i < pixels.length; i += 4) gray[i / 4] = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
  if (['comic', 'minimal', 'kawaii', 'abstract', 'manga', 'pop'].includes(style)) {
    const threshold = (style === 'manga' ? 38 : style === 'comic' ? 112 : style === 'pop' ? 94 : 68) + (1 - strength) * 26, ink = style === 'kawaii' ? [76, 49, 70] : style === 'abstract' ? [28, 45, 60] : style === 'manga' ? [18, 18, 22] : style === 'pop' ? [55, 31, 83] : [25, 31, 40];
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      const gx = -gray[p-width-1] + gray[p-width+1] - 2*gray[p-1] + 2*gray[p+1] - gray[p+width-1] + gray[p+width+1];
      const gy = -gray[p-width-1] - 2*gray[p-width] - gray[p-width+1] + gray[p+width-1] + 2*gray[p+width] + gray[p+width+1];
      if (Math.hypot(gx, gy) > threshold) { const i = p * 4, blend = lineStrength / 100 * (style === 'manga' ? .58 : style === 'comic' ? .2 : style === 'pop' ? .3 : .28); pixels[i] = pixels[i] * (1-blend) + ink[0] * blend; pixels[i+1] = pixels[i+1] * (1-blend) + ink[1] * blend; pixels[i+2] = pixels[i+2] * (1-blend) + ink[2] * blend; }
    }
  }
  if (style === 'retro') {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const i = (y*width+x)*4; const grain = (((x*17 + y*31) % 13) - 6) * 0.8; pixels[i] += grain; pixels[i+1] += grain; pixels[i+2] += grain; }
  }
  ctx.putImageData(image, 0, 0);
}

function drawPreview() {
  if (!uploadImage) return;
  const canvas = qs('#preview-canvas'); if (!canvas) return;
  const size = 512, ctx = canvas.getContext('2d', { willReadFrequently: true }); canvas.width = size; canvas.height = size; ctx.clearRect(0, 0, size, size);
  const source = resizedImageCanvas(aiStickerImage || uploadImage), scale = Math.min((size - 42) / source.width, (size - 74) / source.height);
  const w = source.width * scale, h = source.height * scale, x = (size - w) / 2, y = (size - h) / 2 - 12;
  const processed = document.createElement('canvas'); processed.width = source.width; processed.height = source.height;
  const pctx = processed.getContext('2d', { willReadFrequently: true }); pctx.drawImage(source, 0, 0);
  if (!aiStickerImage && activeStyle !== 'original') processArtwork(pctx, processed.width, processed.height);
  ctx.save(); ctx.shadowColor = 'rgba(24,28,36,.22)'; ctx.shadowBlur = 13; ctx.shadowOffsetY = 5; ctx.drawImage(processed, x, y, w, h); ctx.restore();
  const caption = qs('#caption')?.value.trim();
  if (caption) { ctx.save(); ctx.font = '800 26px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round'; ctx.strokeText(caption, 256, 478, 440); ctx.fillStyle = '#242522'; ctx.fillText(caption, 256, 478, 440); ctx.restore(); }
}

function canvasBlob(canvas) { return new Promise(resolve => canvas.toBlob(resolve, 'image/png')); }
async function downloadBlob(blob, name) { const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
async function shareBlob(blob, name, title = 'Il mio sticker') {
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title, text: 'Creato con Sticker Studio' }); }
    catch (error) { if (error.name !== 'AbortError') toast('Condivisione non disponibile. Ho scaricato il PNG.'); else return; }
    return;
  }
  await downloadBlob(blob, name); toast('PNG scaricato. Apri WhatsApp e scegli il file dalla galleria.');
}
async function shareCurrentArtwork() { const canvas = qs('#preview-canvas'); if (!canvas) return; const preset = platformPresets[targetPlatform]; await shareBlob(await canvasBlob(canvas), `${slugify(uploadName || 'sticker')}-${targetPlatform}.png`, `Sticker per ${preset.label}`); }
async function shareSticker(sticker) {
  if (!sticker?.image) { toast('Questo sticker di esempio non contiene un file immagine.'); return; }
  const blob = await (await fetch(sticker.image)).blob(); await shareBlob(blob, `${slugify(sticker.name)}.png`, sticker.name);
}
async function shareStickerPack(items, packName) {
  if (!items.length) { toast('Aggiungi prima uno sticker creato da una foto.'); return; }
  const files = await Promise.all(items.map(async sticker => new File([await (await fetch(sticker.image)).blob()], `${slugify(sticker.name)}.png`, { type: 'image/png' })));
  if (navigator.share && navigator.canShare?.({ files })) {
    try { await navigator.share({ files, title: packName, text: `Sticker dal pacchetto ${packName}` }); }
    catch (error) { if (error.name !== 'AbortError') toast('Condivisione non disponibile.'); }
    return;
  }
  for (const file of files) await downloadBlob(file, file.name);
  toast('PNG scaricati. Ora puoi condividerli da WhatsApp.');
}

function saveSticker() {
  const canvas = qs('#preview-canvas'); if (!canvas) return;
  const caption = qs('#caption').value.trim(), pack = qs('#pack-select').value, name = caption || uploadName || 'Il mio sticker';
  stickers.unshift({ id: crypto.randomUUID(), name, pack: pack || 'I miei sticker', image: canvas.toDataURL('image/png'), style: activeStyle, platform: targetPlatform, bg: '#f5f4ef' });
  const target = packs.find(item => item.name === pack); if (target) target.count = stickers.filter(item => item.pack === pack).length;
  persist(); closeModal(); renderPacks(); showView(pack ? 'packs' : 'my-stickers'); if (pack) openPack(pack); toast('Sticker salvato nella tua raccolta');
}

function filterSearch() { currentFilter = qs('#search-input').value.trim(); renderStickers(); }
qs('#create-button').onclick = openUpload; qs('#hero-create').onclick = openUpload; qs('#pro-create').onclick = openUpload;
qs('#connect-gemini').onclick = () => openGeminiConnectionModal();
qs('#add-pack-small').onclick = openPackModal; qs('#view-all-packs').onclick = () => showView('packs');
qs('#search-input').addEventListener('input', filterSearch);
qsa('.nav-item').forEach(button => button.onclick = () => showView(button.dataset.view));
qsa('[data-view="discover"], [data-view="my-stickers"], [data-view="packs"]').forEach(button => button.onclick = () => showView(button.dataset.view));
qs('#modal-backdrop').addEventListener('click', event => { if (event.target.id === 'modal-backdrop') closeModal(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeModal();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); qs('#search-input').focus(); }
  if (event.key.toLowerCase() === 'n' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) openUpload();
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.pack-card')) { event.preventDefault(); openPack(event.target.dataset.pack); }
});
document.addEventListener('click', event => {
  const deleteButton = event.target.closest('[data-delete]');
  if (deleteButton) { event.stopPropagation(); confirmDeleteSticker(deleteButton.dataset.delete); return; }
  const shareButton = event.target.closest('[data-share]');
  if (shareButton) { event.stopPropagation(); shareSticker(stickers.find(item => item.id === shareButton.dataset.share)); return; }
  if (event.target.closest('[data-move]')) { event.stopPropagation(); return; }
  const packCard = event.target.closest('[data-pack]'); if (packCard) { openPack(packCard.dataset.pack); return; }
  const tile = event.target.closest('.sticker-tile');
  if (tile) { openStickerDetail(tile.dataset.sticker); }
});

document.addEventListener('change', event => {
  const move = event.target.closest('[data-move]');
  if (move && move.value !== null) moveSticker(move.dataset.move, move.value);
});
document.addEventListener('dragstart', event => {
  const tile = event.target.closest('.sticker-tile[draggable="true"]');
  if (!tile || event.target.closest('button,select')) return;
  event.dataTransfer.setData('text/plain', tile.dataset.sticker); event.dataTransfer.effectAllowed = 'move'; tile.classList.add('dragging');
});
document.addEventListener('dragend', event => { event.target.closest('.sticker-tile')?.classList.remove('dragging'); qsa('.drop-active').forEach(node => node.classList.remove('drop-active')); });
document.addEventListener('dragover', event => {
  const target = event.target.closest('[data-drop-pack], .side-pack[data-pack], .pack-card[data-pack]');
  if (target) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; target.classList.add('drop-active'); }
});
document.addEventListener('dragleave', event => { const target = event.target.closest('.drop-active'); if (target && !target.contains(event.relatedTarget)) target.classList.remove('drop-active'); });
document.addEventListener('drop', event => {
  const target = event.target.closest('[data-drop-pack], .side-pack[data-pack], .pack-card[data-pack]');
  if (!target) return;
  event.preventDefault(); event.stopPropagation();
  const id = event.dataTransfer.getData('text/plain');
  const destination = target.hasAttribute('data-drop-pack') ? target.dataset.dropPack : target.dataset.pack;
  target.classList.remove('drop-active'); moveSticker(id, destination);
});

renderPacks(); renderStickers();

const romeDateParts = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
};
let calendarView = (() => { const p = romeDateParts(); return new Date(Date.UTC(p.year, p.month - 1, 1)); })();
let selectedCalendarDate = (() => { const p = romeDateParts(); return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`; })();
function renderCalendar() {
  const year = calendarView.getUTCFullYear(), month = calendarView.getUTCMonth();
  qs('#calendar-label').textContent = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(calendarView);
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const today = romeDateParts();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1, date = new Date(Date.UTC(year, month, day));
    const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    const classes = [date.getUTCMonth() === month ? '' : 'outside-month', dateKey === selectedCalendarDate ? 'selected-day' : '', date.getUTCDate() === today.day && date.getUTCMonth() === today.month - 1 && date.getUTCFullYear() === today.year ? 'today' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="calendar-day ${classes}" data-calendar-date="${dateKey}" aria-label="${dateKey}">${date.getUTCDate()}</button>`;
  }).join('');
  qs('#calendar-days').innerHTML = cells;
}
const dailyMaxims = [
  'Le piccole idee, curate ogni giorno, diventano grandi cose.',
  'Un gesto gentile trova sempre il modo di farsi ricordare.',
  'La creatività comincia quando provi una strada nuova.',
  'Anche un messaggio semplice può scaldare una giornata.',
  'Fai spazio alle cose che ti fanno sorridere.',
  'La costanza trasforma un’intuizione in qualcosa di speciale.',
  'Ogni giornata merita almeno un momento leggero.',
  'Le idee migliori spesso arrivano giocando.',
  'Un dettaglio scelto con cura cambia tutto.',
  'Condividere un sorriso è un ottimo modo per iniziare.',
  'La fantasia dà colore anche alle abitudini.',
  'Le parole giuste non devono essere tante.',
  'Una pausa creativa può rimettere in moto la giornata.',
  'Porta con te ciò che ti fa stare bene.',
  'La tua voce merita un tocco tutto suo.',
  'Un piccolo passo fatto oggi vale più di un’idea rimandata.',
  'La semplicità sa farsi notare.',
  'C’è sempre un nuovo modo per dire “ci sono”.',
  'La gioia cresce quando la metti in circolo.',
  'Segui la curiosità: spesso sa già dove portarti.',
  'Un pensiero allegro può cambiare il tono della conversazione.',
  'Crea qualcosa che ti somigli, anche solo per oggi.',
  'La gentilezza sta bene in ogni chat.',
  'Non serve un’occasione speciale per far sorridere qualcuno.',
  'Le cose fatte con cuore si riconoscono subito.',
  'Ogni colore racconta una sfumatura diversa di te.',
  'Tieni vicine le idee che ti accendono.',
  'Un po’ di leggerezza è una cosa seria.',
  'A volte basta un’immagine per dire tutto.',
  'La tua prossima idea può essere quella giusta.',
  'Chiudi la giornata con qualcosa che ti fa sorridere.'
];
function updateDailyMaxim() {
  const today = romeDateParts(), key = `${today.year}-${String(today.month).padStart(2, '0')}-${String(today.day).padStart(2, '0')}`;
  const quote = qs('#daily-quote-text');
  if (quote.dataset.dayKey === key) return;
  const dayNumber = Math.floor(Date.UTC(today.year, today.month - 1, today.day) / 86400000);
  quote.textContent = dailyMaxims[dayNumber % dailyMaxims.length];
  quote.dataset.dayKey = key;
  qs('#daily-quote-date').textContent = new Intl.DateTimeFormat('it-IT', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(new Date(Date.UTC(today.year, today.month - 1, today.day)));
}
function updateClock() {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', hourCycle: 'h23' }).format(now));
  const greeting = hour < 5 ? 'Buonanotte' : hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
  qs('#greeting-text').textContent = greeting;
  qs('#live-clock').textContent = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now);
  qs('#live-date').textContent = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  updateDailyMaxim();
}
qs('#calendar-prev').onclick = () => { calendarView = new Date(Date.UTC(calendarView.getUTCFullYear(), calendarView.getUTCMonth() - 1, 1)); renderCalendar(); };
qs('#calendar-next').onclick = () => { calendarView = new Date(Date.UTC(calendarView.getUTCFullYear(), calendarView.getUTCMonth() + 1, 1)); renderCalendar(); };
qs('#calendar-days').addEventListener('click', event => {
  const day = event.target.closest('[data-calendar-date]');
  if (day) { selectedCalendarDate = day.dataset.calendarDate; renderCalendar(); }
});
renderCalendar(); updateClock(); setInterval(updateClock, 1000);
})();
