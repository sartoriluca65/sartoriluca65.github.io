/* Return paths and previews stay inside the app, including on iPhone. */
(() => {
  'use strict';
  let currentTab=document.querySelector('.tab.active')?.dataset.tab||'oggi';
  const routes=[];let restoring=false,preview=null,previewSequence=0,pdfViewerPromise;
  const container=document.querySelector('.container');
  const navigation=document.createElement('nav');navigation.className='app-navigation no-print';navigation.setAttribute('aria-label','Navigazione dell’app');
  navigation.innerHTML='<button type="button" class="btn btn-outline" id="appBackButton">← Indietro</button><span id="appCurrentSection"></span><button type="button" class="btn btn-outline" id="appHomeButton">⌂ Oggi</button>';
  container.prepend(navigation);
  function updateSection(){document.getElementById('appCurrentSection').textContent=document.querySelector('.tab.active')?.textContent||'Oggi';}
  document.getElementById('appBackButton').onclick=goBackInApp;
  document.getElementById('appHomeButton').onclick=()=>navigateToSection('oggi');
  document.addEventListener('click',event=>{
    const tab=event.target.closest?.('.tab[data-tab]');
    if(tab){if(!restoring&&tab.dataset.tab!==currentTab)routes.push({tab:currentTab,scroll:window.scrollY});currentTab=tab.dataset.tab;queueMicrotask(updateSection);}
    const link=event.target.closest?.('a[href]');
    if(link&&link.href.startsWith('blob:')&&!link.hasAttribute('download')){event.preventDefault();event.stopPropagation();openDocumentUrl(link.href,link.textContent.trim()||'Documento');}
  },true);
  function navigateToSection(tab,remember=true){
    const button=[...document.querySelectorAll('.tab[data-tab]')].find(b=>b.dataset.tab===tab);if(!button)return;
    restoring=!remember;button.click();restoring=false;currentTab=tab;updateSection();
    navigation.scrollIntoView({block:'start',behavior:'auto'});
  }
  function goBackInApp(){
    if(preview){closePreview();return;}
    const modal=[...document.querySelectorAll('.modal-overlay.open')].at(-1);
    if(modal){chiudiModal(modal.id);return;}
    const lightbox=document.getElementById('lightbox');if(lightbox&&lightbox.style.display==='flex'){chiudiLightbox();return;}
    const archive=document.getElementById('archivioDettaglio');if(currentTab==='archivio'&&archive&&archive.style.display!=='none'&&archive.style.display!==''){chiudiArchivioDettaglio();return;}
    const previous=routes.pop();if(previous){navigateToSection(previous.tab,false);window.scrollTo({top:previous.scroll,behavior:'auto'});return;}
    navigateToSection('oggi',false);
  }
  document.querySelectorAll('.modal-overlay').forEach(modal=>{const box=modal.querySelector('.modal'),button=document.createElement('button');button.type='button';button.className='btn btn-outline no-print modal-back';button.textContent='← Indietro';button.onclick=()=>chiudiModal(modal.id);box.prepend(button);});
  const closeImage=document.querySelector('#lightbox .close');if(closeImage)closeImage.textContent='← Indietro';
  function setStatus(state,message,error=false){if(preview!==state)return;state.status.textContent=message;state.status.classList.toggle('is-error',error);}
  function makePreview(title){
    if(preview)closePreview();
    const state={id:++previewSequence,focus:document.activeElement,scroll:window.scrollY,overflow:document.body.style.overflow,blob:null,file:null,page:1,renderTask:null,pdf:null,loadingTask:null};
    const root=document.createElement('section');root.id='appPreview';root.className='app-preview';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','previewTitle');
    root.innerHTML='<div class="preview-toolbar no-print"><div class="preview-toolbar-top"><button type="button" class="btn btn-outline" id="previewBack">← Indietro</button><h2 id="previewTitle" class="preview-title"></h2></div><div class="preview-actions"><button type="button" class="btn btn-primary" id="previewPrint" disabled>🖨️ Stampa</button><button type="button" class="btn btn-outline" id="previewSave" disabled>↗ Salva / Condividi PDF</button><button type="button" class="btn btn-outline" id="previewRetry" hidden>Riprova PDF</button></div><p id="previewStatus" class="preview-status" role="status" aria-live="polite"></p></div><div id="previewContent" class="preview-content"></div>';
    state.root=root;state.content=root.querySelector('#previewContent');state.status=root.querySelector('#previewStatus');state.save=root.querySelector('#previewSave');state.print=root.querySelector('#previewPrint');state.retry=root.querySelector('#previewRetry');
    preview=state;document.body.append(root);document.body.style.overflow='hidden';
    state.inert=[...document.body.children].filter(el=>el!==root&&!['SCRIPT','STYLE','LINK'].includes(el.tagName)).map(el=>[el,el.inert]);for(const [el] of state.inert)el.inert=true;
    root.querySelector('#previewTitle').textContent=title||'Anteprima';root.querySelector('#previewBack').onclick=closePreview;
    state.save.onclick=()=>shareOrSave(state);state.print.onclick=()=>printPreview(state);
    root.querySelector('#previewBack').focus();return state;
  }
  function closePreview(){
    const state=preview;if(!state)return;preview=null;previewSequence++;
    state.renderTask?.cancel();const disposal=state.loadingTask?state.loadingTask.destroy():state.pdf?.destroy();Promise.resolve(disposal).catch(()=>{});if(state.imageUrl)URL.revokeObjectURL(state.imageUrl);
    state.root.remove();for(const [el,wasInert] of state.inert)el.inert=wasInert;
    document.body.style.overflow=state.overflow;state.focus?.focus?.({preventScroll:true});window.scrollTo({top:state.scroll,behavior:'auto'});
  }
  function readyFile(state,blob,name){
    if(preview!==state)return;state.blob=blob;state.file=new File([blob],name,{type:blob.type||'application/pdf'});state.save.disabled=false;state.print.disabled=false;
    state.save.textContent=blob.type==='application/pdf'?'↗ Salva / Condividi PDF':'↗ Salva / Condividi';
    setStatus(state,'Pronto. Su iPhone usa Condividi per “Salva su File” o “Stampa”. Indietro torna sempre all’app.');
  }
  function download(state){const url=URL.createObjectURL(state.blob),a=document.createElement('a');a.href=url;a.download=state.file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),120000);setStatus(state,'Download richiesto. L’anteprima resta aperta: premi Indietro per tornare.');}
  function shareOrSave(state){
    if(preview!==state||!state.file)return;
    try{if(navigator.share&&navigator.canShare?.({files:[state.file]})){
      // Invoke from this click, before awaiting anything, to retain iPhone user activation.
      navigator.share({files:[state.file],title:state.file.name}).then(()=>setStatus(state,'Operazione completata. Puoi tornare con Indietro.')).catch(error=>{if(error.name!=='AbortError'){setStatus(state,'Condivisione non disponibile. Puoi scaricare il PDF con un altro tocco.',true);state.save.textContent='↓ Scarica PDF';state.save.onclick=()=>download(state);}});return;
    }}catch{}
    download(state);
  }
  function printPreview(state){
    if(preview!==state)return;
    if(/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)){if(state.file&&navigator.share&&navigator.canShare?.({files:[state.file]})){shareOrSave(state);return;}}
    if(state.kind==='document'&&state.blob?.type==='application/pdf'){shareOrSave(state);setStatus(state,'Usa il PDF completo dal menu di condivisione o dal file salvato per stampare tutte le pagine.');return;}
    try{window.print();setStatus(state,'Se il menu di stampa non compare, usa “Salva / Condividi PDF”. Puoi sempre tornare con Indietro.');}catch{setStatus(state,'Stampa non disponibile in questa vista: usa “Salva / Condividi PDF”.',true);}
  }
  function showReportPreview(report,html,loadEngine){
    const state=makePreview(report.title||'Anteprima di stampa');state.kind='report';
    const body=document.createElement('div');body.className='preview-report';body.innerHTML=html;
    body.querySelectorAll('.no-print,button,input,select,script').forEach(el=>el.remove());body.querySelectorAll('a').forEach(a=>{a.removeAttribute('href');a.removeAttribute('onclick');a.removeAttribute('target');});state.content.append(body);
    async function generate(){state.retry.hidden=true;setStatus(state,'Anteprima pronta. Preparazione del PDF per stampa e condivisione…');
      try{const lib=await loadEngine();const bytes=await lib.renderReport(report);if(preview!==state)return;readyFile(state,new Blob([bytes],{type:'application/pdf'}),'terapia-report-'+new Date().toISOString().slice(0,10)+'.pdf');}
      catch(error){if(preview!==state)return;state.retry.hidden=false;state.print.disabled=false;setStatus(state,'PDF non pronto: '+error.message+'. Puoi riprovare o tornare con Indietro.',true);}
    }
    state.retry.onclick=generate;generate();return state;
  }
  function pdfViewer(){return pdfViewerPromise??=import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs').then(lib=>{lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';return lib;}).catch(e=>{pdfViewerPromise=null;throw e;});}
  async function renderPdf(state){
    try{const lib=await pdfViewer();if(preview!==state)return;state.loadingTask=lib.getDocument({data:new Uint8Array(await state.blob.arrayBuffer()),isEvalSupported:false,useSystemFonts:true});state.pdf=await state.loadingTask.promise;if(preview!==state){state.pdf.destroy();return;}
      const pages=document.createElement('div');pages.className='preview-document-pages no-print';const previous=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');previous.className=next.className='btn btn-outline';previous.textContent='◀';next.textContent='▶';previous.setAttribute('aria-label','Pagina precedente');next.setAttribute('aria-label','Pagina successiva');pages.append(previous,label,next);const canvas=document.createElement('canvas');canvas.className='preview-canvas';state.content.replaceChildren(pages,canvas);
      let rendering=false;
      async function draw(){if(rendering||preview!==state)return;rendering=true;previous.disabled=next.disabled=true;try{const page=await state.pdf.getPage(state.page);if(preview!==state)return;const original=page.getViewport({scale:1});const width=Math.min(1000,Math.max(280,state.content.clientWidth-28));const scale=Math.min(2,1400/original.width,1800/original.height,width/original.width*(window.devicePixelRatio||1));const viewport=page.getViewport({scale});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.style.width=Math.min(width,original.width)+'px';state.renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport});await state.renderTask.promise;label.textContent='Pagina '+state.page+' di '+state.pdf.numPages;page.cleanup();}catch(error){if(preview===state&&error.name!=='RenderingCancelledException')setStatus(state,'Anteprima non disponibile: usa Salva / Condividi o Indietro.',true);}finally{rendering=false;if(preview===state){previous.disabled=state.page<=1;next.disabled=state.page>=state.pdf.numPages;}}}
      previous.onclick=()=>{if(state.page>1){state.page--;draw();}};next.onclick=()=>{if(state.page<state.pdf.numPages){state.page++;draw();}};await draw();
    }catch(error){if(preview===state){state.content.innerHTML='<p class="preview-help">L’anteprima del documento non è disponibile in questo browser. Puoi salvarlo o condividerlo con il pulsante in alto, oppure tornare all’app con Indietro.</p>';setStatus(state,'Documento pronto per il salvataggio. Anteprima non disponibile.',true);}}
  }
  function showDocumentPreview(blob,name='Documento.pdf',existingState=null){
    const state=existingState||makePreview(name);if(preview!==state)return;readyFile(state,blob,name);state.kind='document';
    if(blob.type.startsWith('image/')){const image=document.createElement('img');image.className='preview-image';image.alt=name;state.imageUrl=URL.createObjectURL(blob);image.src=state.imageUrl;state.content.replaceChildren(image);}else if(blob.type==='application/pdf'||/\.pdf$/i.test(name)){renderPdf(state);}else state.content.textContent='Usa Salva / Condividi per scaricare questo documento.';
    return state;
  }
  function openDocumentUrl(url,name){
    const state=makePreview(name);setStatus(state,'Apertura del documento…');fetch(url).then(r=>{if(!r.ok)throw Error('Documento non disponibile');return r.blob();}).then(blob=>{if(preview===state)showDocumentPreview(blob,name,state);}).catch(error=>setStatus(state,error.message+'. Premi Indietro per tornare.',true));
  }
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();goBackInApp();return;}if(preview&&event.key==='Tab'){const controls=[...preview.root.querySelectorAll('button,a[href],input,select,textarea')].filter(el=>!el.disabled&&!el.hidden);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}});
  Object.assign(window,{goBackInApp,navigateToSection,showReportPreview,showDocumentPreview,openDocumentUrl});updateSection();
})();
