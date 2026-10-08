(() => {
  'use strict';
  const appId = document.currentScript?.dataset.app;
  if (!['autocontrol', 'diviso', 'autoquota'].includes(appId) || window.__lsTrackerStarted) return;
  window.__lsTrackerStarted = true;
  const config = window.LS_ANALYTICS_CONFIG;
  if (!config || !/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(config.publicKey || '') ||
      config.url !== 'https://uphtmvqzlfoftcibbacr.supabase.co') return;
  let visitorId;
  try {
    visitorId = localStorage.getItem('ls-apps-visitor-id');
    if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(visitorId || '')) {
      visitorId = crypto.randomUUID();
      localStorage.setItem('ls-apps-visitor-id', visitorId);
    }
  } catch { visitorId = crypto.randomUUID(); }
  let sending = false;
  async function heartbeat() {
    if (document.visibilityState !== 'visible' || sending) return;
    sending = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      await fetch(config.url + '/rest/v1/rpc/ls_heartbeat', {
        method: 'POST', cache: 'no-store', signal: controller.signal,
        headers: { apikey: config.publicKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_app_id: appId, p_visitor_id: visitorId })
      });
    } catch { /* Il garage e le altre app funzionano anche senza statistiche. */ }
    finally { clearTimeout(timeout); sending = false; }
  }
  document.addEventListener('visibilitychange', heartbeat);
  window.addEventListener('pageshow', heartbeat);
  setInterval(heartbeat, 30000);
  heartbeat();
})();
