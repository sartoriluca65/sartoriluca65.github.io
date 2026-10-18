/* Collegamento ai contatori esistenti. Disattivato in attesa dell’autorizzazione alla destinazione. */
(() => {
  const COUNTERS_ENABLED = false;
  if (!COUNTERS_ENABLED || location.origin !== 'https://sartoriluca65.github.io') return;
  const config=document.createElement('script');config.src='../analytics/config.js';
  config.onload=()=>{const tracker=document.createElement('script');tracker.src='../analytics/tracker.js?v=20261018-terapia';tracker.dataset.app='terapia-demo';document.head.append(tracker);};
  document.head.append(config);
})();
