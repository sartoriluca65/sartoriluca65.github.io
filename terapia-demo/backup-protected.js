/* Encrypted streaming envelope, v1. PBKDF2-SHA256 + per-frame AES-256-GCM.
   Authentication binds header, frame position and final marker. Passwords stay in memory. */
(function(root){'use strict';const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true}),MAGIC=enc.encode('TLENC1\n'),CHUNK=1024*1024,ITERATIONS=600000,MAX=8*1024**3;
 const number=n=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);return b;};
 const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
 const hex=b=>[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
 function unhex(s,n){if(typeof s!=='string'||s.length!==n*2||!/^[a-f0-9]+$/.test(s))throw Error('Intestazione cifrata non valida');return Uint8Array.from(s.match(/../g),x=>parseInt(x,16));}
 async function derive(password,salt){if(typeof password!=='string'||password.length<12||password.length>1024)throw Error('Usa una password di almeno 12 caratteri (massimo 1024).');const material=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
 function params(prefix,hash,index,final){if(index>=0xffffffff)throw Error('Troppi blocchi cifrati');const iv=new Uint8Array(12);iv.set(prefix);iv.set(number(index),8);const aad=new Uint8Array(37);aad.set(hash);aad.set(number(index),32);aad[36]=final;return {name:'AES-GCM',iv,additionalData:aad,tagLength:128};}
 async function encryptWriter(password,target){const salt=crypto.getRandomValues(new Uint8Array(16)),prefix=crypto.getRandomValues(new Uint8Array(8));const header=enc.encode(JSON.stringify({format:'terapia-encrypted-backup',version:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,salt:hex(salt),nonce:hex(prefix),chunk:CHUNK})),hash=new Uint8Array(await crypto.subtle.digest('SHA-256',header)),key=await derive(password,salt);let index=0,size=0,closed=false;
 async function raw(bytes){if(target.cancelled)throw Error('Operazione annullata');size+=bytes.length;if(size>MAX)throw Error('Backup protetto oltre 8 GB');await target.writer.write(bytes);}
 await raw(MAGIC);await raw(number(header.length));await raw(header);
 async function frame(bytes,final){const cipher=new Uint8Array(await crypto.subtle.encrypt(params(prefix,hash,index++,final),key,bytes));const frame=new Uint8Array(5+cipher.length);frame[0]=final;frame.set(number(cipher.length),1);frame.set(cipher,5);await raw(frame);}
 return {get size(){return size;},writer:{async write(bytes){if(closed)throw Error('Backup già chiuso');for(let offset=0;offset<bytes.length;offset+=CHUNK)await frame(bytes.subarray(offset,offset+CHUNK),0);},async close(){if(closed)throw Error('Backup già chiuso');await frame(new Uint8Array(),1);await target.writer.close();closed=true;},async abort(){closed=true;await target.writer.abort();}}};
 }
 async function unpack(file,password,progress=()=>{}){
  if(file.size>MAX)throw Error('Backup protetto oltre 8 GB');let offset=0,index=0,sink;
  async function read(n){if(!Number.isSafeInteger(n)||n<0||offset+n>file.size)throw Error('Backup protetto incompleto');const bytes=new Uint8Array(await file.slice(offset,offset+n).arrayBuffer());offset+=n;if(bytes.length!==n)throw Error('Lettura interrotta');return bytes;}
  const readNumber=async()=>{const b=await read(4);return new DataView(b.buffer,b.byteOffset,4).getUint32(0,true);};
  if(!equal(await read(MAGIC.length),MAGIC))throw Error('Questo file non è un backup protetto');const n=await readNumber();if(n<50||n>4096)throw Error('Intestazione cifrata non valida');const bytes=await read(n),h=JSON.parse(dec.decode(bytes));if(h.format!=='terapia-encrypted-backup'||h.version!==1||h.kdf!=='PBKDF2-SHA256'||h.iterations!==ITERATIONS||h.chunk!==CHUNK)throw Error('Versione cifrata non supportata');const prefix=unhex(h.nonce,8),salt=unhex(h.salt,16),hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),key=await derive(password,salt);
  try{
   sink=await TerapiaBackupStream.createSink('ripristino-protetto.tmp',{temporary:true,storage:'indexeddb'});
   while(true){const final=(await read(1))[0],length=await readNumber();if(final>1||length<16||length>CHUNK+16||(final&&length!==16))throw Error('Blocco cifrato non valido');const cipher=await read(length);let plain;try{plain=new Uint8Array(await crypto.subtle.decrypt(params(prefix,hash,index++,final),key,cipher));}catch{throw Error('Password errata oppure backup danneggiato. Nessun dato ripristinato.');}
    if(final){if(offset!==file.size)throw Error('Contenuto inatteso dopo la fine del backup');break;}await sink.writer.write(plain);progress({phase:'decrypt',total:offset,size:file.size,index,count:0,name:'Decifratura verificata'});
   }
   await sink.writer.close();const plaintext=await sink.file(),result=await TerapiaBackupStream.unpack(plaintext,progress);const dispose=result.dispose;return {...result,dispose:async()=>{await dispose?.();await sink.cleanup();}};
  }catch(e){await sink?.writer.abort().catch(()=>{});await sink?.cleanup().catch(()=>{});throw e;}
 }
 function engine(password){return {async pack(data,source,sink,progress){let writer;try{writer=await encryptWriter(password,sink);const proxy={get cancelled(){return sink.cancelled;},writer:writer.writer,cleanup:()=>sink.cleanup()};const result=await TerapiaBackupStream.pack(data,source,proxy,progress);return {...result,size:writer.size};}catch(e){await sink.writer.abort().catch(()=>{});await sink.cleanup();throw e;}},async verify(sink,result,progress){const file=await sink.file();if(file.size!==result.size)throw Error('Dimensione del backup protetto non valida');const checked=await unpack(file,password,progress);await checked.dispose();return file;}};}
 root.TerapiaBackupProtected=Object.freeze({engine,unpack,ITERATIONS,CHUNK});
})(globalThis);
