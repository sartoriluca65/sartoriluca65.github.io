/* GitHub Pages: file privati nel browser, senza chiamate a un server. */
const demoUrls = new Map();
const demoFilesDb = new Promise((resolve,reject)=>{
  const r=indexedDB.open('terapia-demo-files-v1',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('files');
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
});
demoFilesDb.catch(()=>{});
function fileDeadline(p){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Memoria allegati non disponibile. Apri la demo in Safari e riprova.')),4000);p.then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});}
async function demoFileStore(action,key,value){
  const db=await fileDeadline(demoFilesDb);
  return fileDeadline(new Promise((resolve,reject)=>{const tx=db.transaction('files',action==='get'||action==='getAll'?'readonly':'readwrite');const store=tx.objectStore('files');
    const req=action==='getAll'?store.getAll():action==='put'?store.put(value,key):store[action](key);
    tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Memoria del browser non disponibile'));
  }));
}
async function demoFilesReady(){for(const f of await demoFileStore('getAll'))demoUrls.set(f.key,URL.createObjectURL(f.blob));}
function demoFileUrl(key){return demoUrls.get(key)||'';}
async function demoFileDelete(key){await demoFileStore('delete',key);const old=demoUrls.get(key);if(old)URL.revokeObjectURL(old);demoUrls.delete(key);}
async function localFileResponse(key){const f=await demoFileStore('get',key);return f?new Response(f.blob):new Response('File non trovato',{status:404});}
function openDemoFile(key,download=false){
  const f={name:'documento.pdf'};if(!demoFileUrl(key)){alert('File non disponibile in questo browser. Ripristina un backup completo.');return;}
  const metadata=[...data.documenti,...data.eventi.flatMap(e=>e.allegati||[]),...(data.integratori||[]).flatMap(s=>s.allegati||[])].find(d=>d.fileKey===key);
  const name=metadata?.nome||f.name,url=demoFileUrl(key);
  const a=document.createElement('a');a.href=url;if(download)a.download=name;else {a.target='_blank';a.rel='noopener';}document.body.append(a);a.click();a.remove();
}
globalThis.TerapiaFileUpload={isPaused:()=>false,pause(){},async upload(file){
  if(!file||!file.size)throw Error('File vuoto. Scaricalo prima da File.');
  if(file.size>100*1024*1024)throw Error('File oltre 100 MB');
  const tipo=/\.pdf$/i.test(file.name)?'application/pdf':file.type;
  if(!['application/pdf','image/jpeg','image/png'].includes(tipo))throw Error('Scegli PDF, JPG o PNG');
  if(tipo==='application/pdf'&&await file.slice(0,5).text()!=='%PDF-')throw Error('Il documento non è un PDF valido');
  const panel=document.getElementById('uploadPanel');panel.hidden=false;
  document.getElementById('uploadFileName').textContent=file.name;
  document.getElementById('uploadProgress').value=10;
  document.getElementById('uploadMessage').textContent='Salvataggio sul dispositivo…';
  const key=crypto.randomUUID(),blob=file.slice(0,file.size,tipo);
  try{await demoFileStore('put',key,{key,blob,name:file.name});demoUrls.set(key,URL.createObjectURL(blob));
    document.getElementById('uploadProgress').value=100;document.getElementById('uploadMessage').textContent='File salvato su questo dispositivo';
    return {fileKey:key,nome:file.name,tipo,size:file.size};
  }catch(e){document.getElementById('uploadMessage').textContent='File non salvato: spazio insufficiente o memoria non disponibile.';throw e;}
}};
