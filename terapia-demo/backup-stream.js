/* Version 2: bounded-memory, independently hashed chunks; legacy ZIP reader retained. */
(function(root){
 'use strict';
 const CHUNK=1024*1024,MAX=8*1024**3,MAX_FILE=1024**3,HEADER=16*1024**2;
 const enc=new TextEncoder(),dec=new TextDecoder(),MAGIC=enc.encode('TLBACK2\n'),END=enc.encode('TLEND2\n');
 const number=n=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);return b;};
 const digest=async b=>new Uint8Array(await crypto.subtle.digest('SHA-256',b));
 const equal=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
 async function createSink(name){
  if(root.showSaveFilePicker){
   const handle=await root.showSaveFilePicker({suggestedName:name,types:[{description:'Backup Terapia completo',accept:{'application/octet-stream':['.tlbackup']}}]});
   const writer=await handle.createWritable();return {writer,native:true,async file(){return handle.getFile();},async cleanup(){}};
  }
  if(navigator.storage?.getDirectory){
   const directory=await navigator.storage.getDirectory();const temp='terapia-backup-'+crypto.randomUUID()+'.tmp';
   const handle=await directory.getFileHandle(temp,{create:true});
   try{const writer=await handle.createWritable();return {writer,native:false,async file(){return handle.getFile();},async cleanup(){await directory.removeEntry(temp).catch(()=>{});}};}catch(e){await directory.removeEntry(temp).catch(()=>{});throw e;}
  }
  throw Error('Il browser non consente il salvataggio a blocchi. Apri l’app in Safari aggiornato oppure Chrome/Edge e riprova.');
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
