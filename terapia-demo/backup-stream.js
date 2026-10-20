/* Version 2: bounded-memory, independently hashed chunks; legacy ZIP reader retained. */
(function(root){
 'use strict';
 const CHUNK=1024*1024,MAX=8*1024**3,MAX_FILE=1024**3,HEADER=16*1024**2;
 const enc=new TextEncoder(),dec=new TextDecoder(),MAGIC=enc.encode('TLBACK2\n'),END=enc.encode('TLEND2\n');
 const workerUrl=new URL('backup-opfs-worker.js?v=20261020-iphone',typeof document!=='undefined'&&document.currentScript?.src||typeof location!=='undefined'&&location.href||'https://localhost/').href;
 const number=n=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);return b;};
 const digest=async b=>new Uint8Array(await crypto.subtle.digest('SHA-256',b));
 const equal=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
 async function workerSink(directory,temp){
  const worker=new Worker(workerUrl),pending=new Map();let seq=0,closed=false,file;
  function rejectAll(error){for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear();}
  worker.onmessage=({data:r})=>{const p=pending.get(r.id);if(!p)return;pending.delete(r.id);clearTimeout(p.timer);if(r.ok)p.resolve(r);else{const error=Error(r.error||'Salvataggio non riuscito');error.name=r.name||'Error';p.reject(error);}};
  worker.onerror=()=>rejectAll(Error('Il motore di salvataggio non è disponibile. Ricarica l’app e riprova.'));
  function send(type,extra={},transfer=[]){return new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('Salvataggio interrotto: riprova mantenendo l’app aperta.'));},30000);pending.set(id,{resolve,reject,timer});try{worker.postMessage({id,type,...extra},transfer);}catch(e){pending.delete(id);clearTimeout(timer);reject(e);}});}
  try{await send('init',{name:temp});}catch(e){worker.terminate();await directory.removeEntry(temp).catch(()=>{});throw e;}
  return {native:false,mode:'opfs-worker',writer:{async write(bytes){if(closed)throw Error('Backup già chiuso');const buffer=bytes.slice().buffer;await send('write',{buffer},[buffer]);},async close(){const result=await send('close');file=result.file;closed=true;worker.terminate();},async abort(){if(!closed)try{await send('abort');}finally{closed=true;worker.terminate();}}},async file(){if(!closed||!file)throw Error('Backup non completato');return file;},async cleanup(){if(!closed){closed=true;worker.terminate();rejectAll(Error('Backup annullato'));}await directory.removeEntry(temp).catch(()=>{});}};
 }
 async function databaseSink(){
  if(!root.indexedDB)throw Error('Memoria locale non disponibile: apri l’app in Safari e riprova.');
  const name='terapia-backup-temp-'+crypto.randomUUID(),db=await new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('chunks');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});let count=0,parts=[],length=0,closed=false,file;
  async function store(){if(!parts.length)return;const blob=new Blob(parts);parts=[];length=0;const key=count++;await new Promise((resolve,reject)=>{const t=db.transaction('chunks','readwrite');t.objectStore('chunks').put(blob,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Scrittura interrotta'));});}
  async function cleanup(){db.close();await new Promise(resolve=>{const r=indexedDB.deleteDatabase(name);r.onsuccess=r.onerror=r.onblocked=resolve;});}
  return {native:false,mode:'indexeddb',writer:{async write(bytes){if(closed)throw Error('Backup già chiuso');parts.push(new Blob([bytes]));length+=bytes.length;if(length>=4*1024*1024)await store();},async close(){await store();closed=true;const blobs=await new Promise((resolve,reject)=>{const chunks=[],t=db.transaction('chunks','readonly'),r=t.objectStore('chunks').openCursor();r.onsuccess=()=>{const cursor=r.result;if(cursor){chunks.push(cursor.value);cursor.continue();}};t.oncomplete=()=>resolve(chunks);t.onerror=()=>reject(t.error);});file=new Blob(blobs,{type:'application/octet-stream'});},async abort(){closed=true;parts=[];await cleanup();}},async file(){if(!closed||!file)throw Error('Backup non completato');return file;},cleanup};
 }
 async function createSink(name,{temporary=false}={}){
  if(root.showSaveFilePicker&&!temporary){
   try{const handle=await root.showSaveFilePicker({suggestedName:name,types:[{description:'Backup Terapia completo',accept:{'application/octet-stream':['.tlbackup']}}]});
    const writer=await handle.createWritable();return {writer,native:true,mode:'file-picker',async file(){return handle.getFile();},async cleanup(){}};
   }catch(e){if(e.name==='AbortError')throw e;if(!['SecurityError','NotSupportedError','TypeError'].includes(e.name))throw e;}
  }
  if(navigator.storage?.getDirectory){
   try{const directory=await navigator.storage.getDirectory(),temp='terapia-backup-'+crypto.randomUUID()+'.tmp',handle=await directory.getFileHandle(temp,{create:true});
    try{if(typeof handle.createWritable==='function'){const writer=await handle.createWritable();return {writer,native:false,mode:'opfs',async file(){return handle.getFile();},async cleanup(){await directory.removeEntry(temp).catch(()=>{});}};}}catch(e){if(e.name==='QuotaExceededError')throw e;}
    if(typeof Worker!=='undefined')return await workerSink(directory,temp);
    await directory.removeEntry(temp).catch(()=>{});
   }catch(e){if(e.name==='QuotaExceededError')throw Error('Spazio sul dispositivo insufficiente per creare il backup completo.');}
  }
  return databaseSink();
 }
 async function packStream(data,source,sink,progress=()=>{}){
  if(!TerapiaBackup.valid(data))throw Error('Archivio non valido');
  const refs=TerapiaBackup.refs(data);if(refs.length>5000)throw Error('Troppi allegati in un solo backup');
  const header=enc.encode(JSON.stringify({format:'terapia-stream-backup',version:2,createdAt:new Date().toISOString(),data,refs}));
  if(header.length>HEADER)throw Error('Dati testuali del backup troppo grandi');
  let total=0;
  async function write(b){if(sink.cancelled)throw Error('Operazione annullata');total+=b.length;if(total>MAX)throw Error('Backup oltre 8 GB: suddividi l’archivio');await sink.writer.write(b);}
  try{
   await write(MAGIC);await write(number(header.length));await write(await digest(header));await write(header);
   for(let i=0;i<refs.length;i++){
    const ref=refs[i],response=await source(ref.key);if(!response.ok||!response.body)throw Error('Allegato non recuperabile: '+ref.nome);
    const reader=response.body.getReader();let size=0,buffer=new Uint8Array(CHUNK),used=0;const hashes=[];
    async function flush(){if(!used)return;const part=buffer.subarray(0,used),hash=await digest(part);hashes.push(hash);await write(number(used));await write(hash);await write(part);used=0;progress({index:i+1,count:refs.length,total,name:ref.nome});}
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_FILE)throw Error('Allegato oltre 1 GB: '+ref.nome);let offset=0;while(offset<value.length){const n=Math.min(CHUNK-used,value.length-offset);buffer.set(value.subarray(offset,offset+n),used);used+=n;offset+=n;if(used===CHUNK)await flush();}}await flush();if(!size)throw Error('Allegato vuoto: '+ref.nome);const ordered=new Uint8Array(hashes.length*32);hashes.forEach((h,i)=>ordered.set(h,i*32));await write(number(0));await write(number(size));await write(await digest(ordered));}
    finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   }
   await write(END);await sink.writer.close();return {size:total,count:refs.length};
  }catch(error){await sink.writer.abort().catch(()=>{});await sink.cleanup();throw error;}
 }
 async function unpackStream(file,progress=()=>{}){
  if(file.size>MAX)throw Error('Backup oltre 8 GB');let offset=0;
  async function read(n){if(offset+n>file.size)throw Error('Backup incompleto o troncato');const b=new Uint8Array(await file.slice(offset,offset+n).arrayBuffer());offset+=n;return b;}
  const readNumber=async()=>{const b=await read(4);return new DataView(b.buffer,b.byteOffset,4).getUint32(0,true);};
  if(!equal(await read(MAGIC.length),MAGIC))throw Error('Formato backup non riconosciuto');
  const n=await readNumber();if(!n||n>HEADER)throw Error('Intestazione backup non valida');
  const expected=await read(32),header=await read(n);if(!equal(await digest(header),expected))throw Error('Dati del backup danneggiati');
  const manifest=JSON.parse(dec.decode(header));if(manifest.format!=='terapia-stream-backup'||manifest.version!==2||!TerapiaBackup.valid(manifest.data))throw Error('Archivio non valido');
  const refs=TerapiaBackup.refs(manifest.data);if(refs.length>5000||JSON.stringify(refs)!==JSON.stringify(manifest.refs))throw Error('Indice allegati non valido');
  const files=new Map();
  for(let i=0;i<refs.length;i++){
   const ref=refs[i],parts=[],hashes=[];let size=0;
   while(true){const len=await readNumber();if(!len)break;if(len>CHUNK)throw Error('Blocco backup non valido');size+=len;if(size>MAX_FILE)throw Error('Allegato oltre 1 GB');const expected=await read(32),start=offset,bytes=await read(len);if(!equal(await digest(bytes),expected))throw Error('Allegato danneggiato: '+ref.nome);hashes.push(expected);parts.push(file.slice(start,start+len));progress({index:i+1,count:refs.length,total:offset,name:ref.nome});}
   if(!size)throw Error('Allegato vuoto: '+ref.nome);const expectedSize=await readNumber(),expectedHash=await read(32),ordered=new Uint8Array(hashes.length*32);hashes.forEach((h,i)=>ordered.set(h,i*32));if(size!==expectedSize||!equal(await digest(ordered),expectedHash))throw Error('Allegato incompleto o blocchi fuori ordine: '+ref.nome);
   files.set(ref.key,{bytes:new Blob(parts,{type:ref.tipo}),nome:ref.nome,tipo:ref.tipo});
  }
  if(!equal(await read(END.length),END)||offset!==file.size)throw Error('Backup incompleto o contenuto inatteso');
  return {data:manifest.data,files,createdAt:manifest.createdAt};
 }
 root.TerapiaBackupStream={createSink,pack:packStream,unpack:unpackStream,CHUNK,MAX,MAX_FILE};
})(globalThis);
