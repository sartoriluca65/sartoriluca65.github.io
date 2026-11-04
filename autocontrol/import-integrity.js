/* ZIP preflight. Every file is checked before any write; no network or storage access here. */
(function(root){'use strict';
 const valid=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(id);
 function checkZipSize(zip){let total=0,count=0;if(!zip||!zip.files)throw Error('Copia ZIP non valida.');for(const file of Object.values(zip.files)){if(file.dir)continue;const size=file._data?.uncompressedSize;if(!Number.isSafeInteger(size)||size<0||size>64*1024*1024||++count>10000)throw Error('Copia ZIP troppo grande o non valida.');total+=size;if(total>128*1024*1024||file.name==='archive.json'&&size>16*1024*1024)throw Error('Copia ZIP troppo grande.');}return true;}
 async function equal(a,b){if(!(a instanceof Blob)||!(b instanceof Blob)||a.size!==b.size)return false;for(let offset=0;offset<a.size;offset+=1024*1024){const end=Math.min(offset+1024*1024,a.size),x=new Uint8Array(await a.slice(offset,end).arrayBuffer()),y=new Uint8Array(await b.slice(offset,end).arrayBuffer());if(x.length!==y.length||x.some((v,i)=>v!==y[i]))return false;}return true;}
 async function prepare(payload,readFile,localFile){
  if(!payload||!Array.isArray(payload.documents))throw Error('Indice documenti non valido.');
  const byId=new Map(),rows=[];
  for(const doc of payload.documents){
   if(!Array.isArray(doc.files)||!doc.files.length||doc.attachmentUnavailable)throw Error('La copia non contiene tutti i documenti originali.');
   for(const entry of doc.files){
    if(!entry||!valid(entry.id)||typeof entry.name!=='string'||!entry.name||entry.type!==undefined&&typeof entry.type!=='string')throw Error('Indice allegati non valido.');
    const blob=await readFile(entry);if(!(blob instanceof Blob)||!blob.size)throw Error('Manca un documento originale nella copia.');
    if(byId.has(entry.id)){if(!await equal(byId.get(entry.id),blob))throw Error('Due originali diversi hanno lo stesso identificativo.');continue;}
    byId.set(entry.id,blob);const old=await localFile(entry.id);
    if(old){if(!await equal(old.blob,blob))throw Error('Un documento con lo stesso identificativo ha un contenuto diverso. Nessun dato è stato sostituito.');continue;}
    rows.push({id:entry.id,name:entry.name,type:blob.type,blob,ocrText:doc.ocrText||''});
   }
  }
  return rows;
 }
 root.ACImportIntegrity={prepare,equal,checkZipSize};if(typeof module!=='undefined')module.exports=root.ACImportIntegrity;
})(globalThis);
