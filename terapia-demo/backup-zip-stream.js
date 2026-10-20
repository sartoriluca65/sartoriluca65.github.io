/* Legacy ZIP restore with bounded reads, temporary disk files and incremental hashes. */
(function(root){
 'use strict';const BLOCK=1024*1024,MAX=8*1024**3,FILE_MAX=1024**3,JSON_MAX=16*1024**2;
 const K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
 const rotate=(n,b)=>(n>>>b)|(n<<(32-b));
 class Hash {
  constructor(){this.h=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);this.buffer=new Uint8Array(64);this.words=new Uint32Array(64);this.used=0;this.length=0;}
  block(bytes,offset){const w=this.words;for(let i=0;i<16;i++){const p=offset+i*4;w[i]=(bytes[p]<<24)|(bytes[p+1]<<16)|(bytes[p+2]<<8)|bytes[p+3];}for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=w[i-16]+(rotate(a,7)^rotate(a,18)^(a>>>3))+w[i-7]+(rotate(b,17)^rotate(b,19)^(b>>>10));}
   let [a,b,c,d,e,f,g,h]=this.h;for(let i=0;i<64;i++){const t1=(h+(rotate(e,6)^rotate(e,11)^rotate(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0,t2=((rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c)))>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}const result=[a,b,c,d,e,f,g,h];for(let i=0;i<8;i++)this.h[i]+=result[i];
  }
  update(bytes){this.length+=bytes.length;let p=0;if(this.used){const n=Math.min(64-this.used,bytes.length);this.buffer.set(bytes.subarray(0,n),this.used);this.used+=n;p=n;if(this.used===64){this.block(this.buffer,0);this.used=0;}}while(p+64<=bytes.length){this.block(bytes,p);p+=64;}if(p<bytes.length){this.buffer.set(bytes.subarray(p),0);this.used=bytes.length-p;}return this;}
  hex(){const bytes=this.length,tail=new Uint8Array(this.used<56?64:128);tail.set(this.buffer.subarray(0,this.used));tail[this.used]=0x80;const v=new DataView(tail.buffer);v.setUint32(tail.length-8,Math.floor(bytes/0x20000000));v.setUint32(tail.length-4,(bytes*8)>>>0);for(let p=0;p<tail.length;p+=64)this.block(tail,p);return [...this.h].map(x=>x.toString(16).padStart(8,'0')).join('');}
 }
 async function unpack(file,progress=()=>{}){
  if(file.size>MAX)throw Error('Backup oltre 8 GB');let queue=Promise.resolve(),failure,total=0,count=0;
  const tail=new Uint8Array(await file.slice(Math.max(0,file.size-65557)).arrayBuffer());let complete=false;
  for(let p=tail.length-22;p>=0;p--)if(tail[p]===80&&tail[p+1]===75&&tail[p+2]===5&&tail[p+3]===6&&p+22+tail[p+20]+tail[p+21]*256===tail.length){complete=true;break;}
  if(!complete)throw Error('Backup ZIP incompleto o troncato');
  const entries=new Map(),sinks=[];
  function enqueue(fn){queue=queue.then(()=>{if(failure)throw failure;return fn();}).catch(e=>{failure=e;});}
  const zip=new fflate.Unzip(entry=>{
   if(++count>5002||entries.has(entry.name)||!(['archive.json','manifest.json'].includes(entry.name)||/^files\/[a-f0-9-]{36}$/.test(entry.name)))throw Error('Contenuto ZIP non valido');
   const binary=entry.name.startsWith('files/'),limit=binary?FILE_MAX:JSON_MAX,state={name:entry.name,size:0,hash:new Hash(),parts:[],buffer:binary?new Uint8Array(BLOCK):null,used:0,sink:null,done:false};entries.set(entry.name,state);
   if(entry.originalSize>limit)throw Error('Elemento ZIP troppo grande: '+entry.name);
   if(binary)enqueue(async()=>{state.sink=await TerapiaBackupStream.createSink('ripristino.tlbackup',{temporary:true});sinks.push(state.sink);});
   function flush(){if(!state.used)return;const bytes=state.buffer.slice(0,state.used);state.used=0;enqueue(()=>state.sink.writer.write(bytes));}
   entry.ondata=(error,bytes,final)=>{
    if(error){failure=error;return;}if(failure)return;state.size+=bytes.length;total+=bytes.length;
    if(state.size>limit||total>MAX){failure=Error('Contenuto decompresso oltre il limite consentito');return;}state.hash.update(bytes);
    if(binary){let offset=0;while(offset<bytes.length){const n=Math.min(BLOCK-state.used,bytes.length-offset);state.buffer.set(bytes.subarray(offset,offset+n),state.used);state.used+=n;offset+=n;if(state.used===BLOCK)flush();}}
    else state.parts.push(bytes.slice());
    if(final){state.done=true;state.sha256=state.hash.hex();state.hash=null;if(binary){flush();state.buffer=null;enqueue(async()=>{await state.sink.writer.close();state.file=await state.sink.file();});}}
   };
   entry.start();
  });zip.register(fflate.UnzipInflate);
  try{
   for(let offset=0;offset<file.size;offset+=8192){if(failure)throw failure;const bytes=new Uint8Array(await file.slice(offset,offset+8192).arrayBuffer());zip.push(bytes,offset+8192>=file.size);await queue;if(failure)throw failure;if(offset%BLOCK===0||offset+8192>=file.size)progress({total:Math.min(offset+8192,file.size),size:file.size,count});}
   await queue;if(failure)throw failure;
   const archive=entries.get('archive.json'),meta=entries.get('manifest.json');if(!archive?.done||!meta?.done||[...entries.values()].some(e=>!e.done))throw Error('Backup ZIP incompleto');
   const manifest=JSON.parse(await new Blob(meta.parts).text()),data=JSON.parse(await new Blob(archive.parts).text());
   if(manifest.format!=='terapia-luki-complete-backup'||manifest.version!==1||!Array.isArray(manifest.files)||!TerapiaBackup.valid(data)||manifest.archiveSha256!==archive.sha256)throw Error('Manifesto o dati del backup non validi');
   const files=new Map();for(const ref of TerapiaBackup.refs(data)){const entry=entries.get('files/'+ref.key),record=manifest.files.find(f=>f.key===ref.key);if(!entry?.file||!record||record.size!==entry.size||record.sha256!==entry.sha256)throw Error('Allegato mancante o danneggiato: '+ref.nome);files.set(ref.key,{bytes:entry.file,nome:record.nome,tipo:record.tipo});}
   return {data,files,createdAt:manifest.createdAt,dispose:async()=>{for(const sink of sinks)await sink.cleanup();}};
  }catch(error){await queue.catch(()=>{});for(const sink of sinks){await sink.writer.abort().catch(()=>{});await sink.cleanup();}throw error;}
 }
 root.TerapiaBackupZip={unpack,Hash};
})(globalThis);
