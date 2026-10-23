/* Complete JSON backup: clinical records and independently verified Base64 attachment chunks. */
(function(root){
 'use strict';
 const FORMAT='terapia-json-complete-backup',CHUNK=1024*1024,HEADER=16*1024*1024,MAX=8*1024**3,MAX_FILE=1024**3,enc=new TextEncoder();
 const fields=['paziente','farmaci','integratori','vaccinazioni','eventi','assunzioni','documenti','controlli','esamiRoutine','_pdfCliniciAggiornatiV1'];
 const secrets=new Set(['password','passwd','pwd','pin','token','accesstoken','refreshtoken','idtoken','apikey','secret','clientsecret','credentials','credenziali','auth','authorization','authentication','session','sessionid','cookie','cookies','localstorage','sessionstorage','privatekey','bearertoken','csrf','csrftoken','syncbase','syncversion','authtoken','authsecret','secretkey','apisecret','bearer','accesskey','accesskeyid','secretaccesskey','otp','totp','recoverycode','recoverycodes','encryptionkey','signingkey','ssotoken','jwt','jwtsecret','oauth','oauth2']);
 function clean(value,depth=0){if(depth>80)throw Error('Struttura del backup non valida');if(Array.isArray(value))return value.map(v=>clean(v,depth+1));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!secrets.has(k.replace(/[^a-z0-9]/gi,'').toLowerCase())&&!['__proto__','constructor','prototype'].includes(k)).map(([k,v])=>[k,clean(v,depth+1)]));return value;}
 function clinical(data){const result=clean(Object.fromEntries(fields.filter(k=>Object.hasOwn(data,k)).map(k=>[k,data[k]])));if(!TerapiaBackup.valid(result))throw Error('Archivio clinico non valido');return result;}
 function base64(bytes){let binary='';for(let n=0;n<bytes.length;n+=32768)binary+=String.fromCharCode(...bytes.subarray(n,n+32768));return btoa(binary);}
 function decode(value){if(typeof value!=='string'||value.length>4*Math.ceil(CHUNK/3)||!value.length||value.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw Error('Blocco JSON non valido');const s=atob(value),bytes=Uint8Array.from(s,c=>c.charCodeAt(0));if(!bytes.length||bytes.length>CHUNK||base64(bytes)!==value)throw Error('Codifica allegato JSON non valida');return bytes;}
 async function orderedHash(hashes){return TerapiaBackup.hash(enc.encode(hashes.join('\n')));}
 async function pack(input,source,sink,progress=()=>{}){
  const data=clinical(input),refs=TerapiaBackup.refs(data),json=JSON.stringify(data);if(enc.encode(json).length>HEADER)throw Error('Dati testuali oltre 16 MB');if(refs.length>5000)throw Error('Troppi allegati');let total=0;
  async function write(line){if(sink.cancelled)throw Error('Operazione annullata');const bytes=enc.encode(line+'\n');total+=bytes.length;if(total>MAX)throw Error('Backup JSON oltre 8 GB');await sink.writer.write(bytes);}
  const member=(key,value,comma=true)=>JSON.stringify(key)+':'+JSON.stringify(value)+(comma?',':'');
  try{
   await write('{');await write(member('format',FORMAT));await write(member('version',1));await write(member('createdAt',new Date().toISOString()));await write(member('data',data));await write(member('archiveSha256',await TerapiaBackup.hash(enc.encode(json))));await write('"files":[');
   for(let i=0;i<refs.length;i++){
    const ref=refs[i];await write((i?',':'')+'{');await write(member('key',ref.key));await write(member('nome',ref.nome));await write(member('tipo',ref.tipo));await write('"chunks":[');progress({index:i+1,count:refs.length,total,name:ref.nome});
    const response=await source(ref.key);if(!response.ok||!response.body)throw Error('Allegato non recuperabile: '+ref.nome);const reader=response.body.getReader(),hashes=[];let size=0,used=0;const buffer=new Uint8Array(CHUNK);
    async function flush(){if(!used)return;const bytes=buffer.slice(0,used),hash=await TerapiaBackup.hash(bytes);await write((hashes.length?',':'')+JSON.stringify({base64:base64(bytes),sha256:hash}));hashes.push(hash);size+=used;used=0;progress({index:i+1,count:refs.length,total,name:ref.nome});}
    try{while(true){if(sink.cancelled)throw Error('Operazione annullata');const {done,value}=await reader.read();if(done)break;if(size+used+value.length>MAX_FILE)throw Error('Allegato oltre 1 GB: '+ref.nome);let offset=0;while(offset<value.length){const n=Math.min(CHUNK-used,value.length-offset);buffer.set(value.subarray(offset,offset+n),used);offset+=n;used+=n;if(used===CHUNK)await flush();}}await flush();}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    if(!size)throw Error('Allegato vuoto: '+ref.nome);await write('],');await write(member('size',size));await write(member('chunksSha256',await orderedHash(hashes),false));await write('}');
   }
   await write('],');await write(member('complete',true,false));await write('}');await sink.writer.close();return {size:total,count:refs.length};
  }catch(e){await sink.writer.abort().catch(()=>{});await sink.cleanup();throw e;}
 }
 async function unpack(file,progress=()=>{}){
  if(file.size>MAX)throw Error('Backup JSON oltre 8 GB');let offset=0,pending='',eof=false;const decoder=new TextDecoder('utf-8',{fatal:true});
  async function line(){while(true){const pos=pending.indexOf('\n');if(pos!==-1){const value=pending.slice(0,pos).trim();pending=pending.slice(pos+1);return value;}if(eof){if(!pending)return null;const value=pending.trim();pending='';return value;}if(pending.length>HEADER*2)throw Error('Riga del backup JSON troppo grande');const end=Math.min(offset+256*1024,file.size);pending+=decoder.decode(new Uint8Array(await file.slice(offset,end).arrayBuffer()),{stream:end<file.size});offset=end;eof=end===file.size;}}
  async function expect(text){if(await line()!==text)throw Error('Backup JSON incompleto o struttura non valida');}
  async function member(key,comma=true){const text=await line();if(text===null||comma&&!text.endsWith(','))throw Error('Backup JSON incompleto');const obj=JSON.parse('{'+(comma?text.slice(0,-1):text)+'}');if(Object.keys(obj).length!==1||!Object.hasOwn(obj,key))throw Error('Campo JSON non valido: '+key);return obj[key];}
  await expect('{');if(await member('format')!==FORMAT||await member('version')!==1)throw Error('Formato JSON non riconosciuto');const createdAt=await member('createdAt'),data=await member('data'),hash=await member('archiveSha256');if(!TerapiaBackup.valid(data)||await TerapiaBackup.hash(enc.encode(JSON.stringify(data)))!==hash)throw Error('Dati JSON danneggiati');
  // New JSON imports reject authentication material instead of ever restoring it.
  if(JSON.stringify(clinical(data))!==JSON.stringify(data))throw Error('Il JSON contiene campi estranei ai dati clinici');const refs=TerapiaBackup.refs(data);if(refs.length>5000)throw Error('Troppi allegati');const files=new Map(),sinks=[];try{await expect('"files":[');
  for(let i=0;i<refs.length;i++){
   const ref=refs[i];await expect((i?',':'')+'{');if(await member('key')!==ref.key||await member('nome')!==ref.nome||await member('tipo')!==ref.tipo)throw Error('Indice allegati JSON non valido');await expect('"chunks":[');const sink=await TerapiaBackupStream.createSink('ripristino-json.tmp',{temporary:true});sinks.push(sink);const hashes=[];let size=0;
   while(true){let text=await line();if(text==='],')break;if(text===null)throw Error('Backup JSON troncato');if(hashes.length){if(!text.startsWith(','))throw Error('Separatore blocchi JSON non valido');text=text.slice(1);}const record=JSON.parse(text);if(Object.keys(record).sort().join(',')!=='base64,sha256')throw Error('Blocco JSON non valido');const bytes=decode(record.base64);if(await TerapiaBackup.hash(bytes)!==record.sha256)throw Error('Allegato JSON danneggiato: '+ref.nome);size+=bytes.length;if(size>MAX_FILE)throw Error('Allegato oltre 1 GB');await sink.writer.write(bytes);hashes.push(record.sha256);progress({index:i+1,count:refs.length,total:offset,name:ref.nome});}
   if(!size||await member('size')!==size||await member('chunksSha256',false)!==await orderedHash(hashes))throw Error('Allegato JSON incompleto o blocchi fuori ordine: '+ref.nome);await expect('}');await sink.writer.close();const bytes=await sink.file();if(bytes.size!==size)throw Error('Dimensione del file JSON ripristinato non valida');files.set(ref.key,{bytes,nome:ref.nome,tipo:ref.tipo});
  }
  await expect('],');if(await member('complete',false)!==true)throw Error('Backup JSON non completato');await expect('}');if(await line()!==null)throw Error('Contenuto JSON inatteso');return {data,files,createdAt,dispose:async()=>{for(const sink of sinks)await sink.cleanup();}};
  }catch(error){for(const sink of sinks){await sink.writer.abort().catch(()=>{});await sink.cleanup().catch(()=>{});}throw error;}
 }
 async function read(file,progress){
  const prefix=await file.slice(0,256).text();if(new RegExp('^\\s*\\{\\s*"format"\\s*:\\s*"'+FORMAT+'"').test(prefix))return unpack(file,progress);
  if(file.size>15*1024*1024)throw Error('Backup JSON precedente oltre 15 MB');const data=JSON.parse(await file.text());if(!TerapiaBackup.valid(data))throw Error('Questo JSON non è un backup valido dell’app');return {data,files:new Map(),legacy:true};
 }
 async function verify(sink,result,progress){const file=await sink.file();if(file.size!==result.size)throw Error('Dimensione del backup JSON salvato diversa da quella creata');const checked=await unpack(file,progress);await checked.dispose();return file;}
 root.TerapiaBackupJson={pack,unpack,read,verify,clinical,FORMAT,CHUNK};
})(globalThis);
