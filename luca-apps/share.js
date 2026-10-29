(() => {
  const whatsappIcon = '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 .8A15 15 0 0 0 3 23.3L.9 31l7.9-2.1A15.2 15.2 0 1 0 16 .8Zm0 27.6a12.5 12.5 0 0 1-6.3-1.7l-.5-.3-4.7 1.2 1.3-4.6-.3-.5A12.5 12.5 0 1 1 16 28.4Zm6.9-9.3c-.4-.2-2.2-1.1-2.6-1.2-.3-.1-.6-.2-.8.2l-1.2 1.4c-.2.2-.4.3-.8.1-1.9-.9-3.3-2.1-4.4-3.9-.3-.4.3-.7.8-1.7.1-.2 0-.5-.1-.7l-1.1-2.7c-.3-.7-.6-.6-.8-.6h-.7c-.3 0-.7.1-1 .5-.9.9-1.3 1.9-1.3 3.1 0 1.9 1.4 3.8 1.6 4.1.2.3 2.8 4.3 6.8 6 2.5 1.1 3.5 1.1 4.7.9 1-.1 2.2-.9 2.5-1.8.3-.9.3-1.7.2-1.8-.2-.2-.4-.3-.8-.5Z"/></svg>';
  const shareIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>';
  const bar = document.createElement('div');
  bar.className = 'luca-actions';
  bar.setAttribute('aria-label', 'Contatto e condivisione');
  bar.innerHTML = '<a class="luca-whatsapp" href="https://wa.me/393332694020?text=Ciao%20Luca%2C%20vorrei%20informazioni%20sulle%20tue%20app." target="_blank" rel="noopener noreferrer" aria-label="Contatta Luca su WhatsApp al 3332694020">' + whatsappIcon + '<span>WhatsApp</span></a><button type="button" id="luca-share">' + shareIcon + '<span>Condividi</span></button>';
  // Place the actions in the contact section after React mounts it.
  const placeActions = () => {
    const contactInfo = document.querySelector('#contatti > div > div');
    if (!contactInfo) return false;
    contactInfo.append(bar);
    return true;
  };
  if (!placeActions()) {
    document.body.append(bar);
    const observer = new MutationObserver(() => {
      if (placeActions()) observer.disconnect();
    });
    observer.observe(document.getElementById('root') || document.body, {childList: true, subtree: true});
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'luca-share-dialog';
  dialog.setAttribute('aria-labelledby','luca-share-title');
  dialog.innerHTML = '<div class="luca-share-heading"><h2 id="luca-share-title">Condividi Sito app di Luki</h2><button type="button" class="luca-close" aria-label="Chiudi condivisione">×</button></div><p>Fai conoscere le app a chi vuoi.</p><div class="luca-share-grid"></div><p class="luca-share-status" role="status" aria-live="polite"></p>';
  document.body.append(dialog);
  const shareButton = document.getElementById('luca-share');
  const url = new URL(location.href); url.hash = ''; url.search = '';
  const siteUrl = url.href;
  const title = 'Sito app di Luki';
  const message = 'Scopri Sito app di Luki: app per la famiglia, la casa e la vita di tutti i giorni.';
  const u = encodeURIComponent(siteUrl), t = encodeURIComponent(message);
  const options = [
    ['WhatsApp', 'https://wa.me/?text=' + encodeURIComponent(message + ' ' + siteUrl), whatsappIcon],
    ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + u, '<b aria-hidden="true">f</b>'],
    ['Telegram', 'https://t.me/share/url?url=' + u + '&text=' + t, '<span aria-hidden="true">➤</span>'],
    ['X', 'https://twitter.com/intent/tweet?url=' + u + '&text=' + t, '<b aria-hidden="true">𝕏</b>'],
    ['LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + u, '<b aria-hidden="true">in</b>'],
    ['Email', 'mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(message + '\n\n' + siteUrl), '<span aria-hidden="true">✉</span>']
  ];
  const grid = dialog.querySelector('.luca-share-grid');
  options.forEach(([label, href, icon]) => {
    const a = document.createElement('a'); a.href = href;
    if (!href.startsWith('mailto:')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    a.innerHTML = icon + '<span>' + label + '</span>'; grid.append(a);
  });
  const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copia link'; grid.append(copy);
  copy.addEventListener('click', async () => {
    const status = dialog.querySelector('.luca-share-status');
    try { await navigator.clipboard.writeText(siteUrl); status.textContent = 'Link copiato!'; }
    catch (_) {
      status.textContent = 'Seleziona e copia il link:';
      let input = dialog.querySelector('input');
      if (!input) { input = document.createElement('input'); input.readOnly = true; input.setAttribute('aria-label','Link del sito'); dialog.append(input); }
      input.value = siteUrl; input.focus(); input.select();
    }
  });
  shareButton.addEventListener('click', async () => {
    if (navigator.share) {
      try { await navigator.share({title, text:message, url:siteUrl}); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    dialog.showModal();
  });
  dialog.querySelector('.luca-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => shareButton.focus());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
})();
