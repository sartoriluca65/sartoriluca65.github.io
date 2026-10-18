(function(root){
 'use strict';
 const LIMIT=200*1024*1024;
 function refs(data){const map=new Map();const walk=(value,depth=0)=>{if(depth>80)throw Error('Struttura del backup non valida');if(!value||typeof value!=='object')return;if(typeof value.fileKey==='string'){if(!/^[a-f0-9-]{36}$/.test(value.fileKey))throw Error('Riferimento allegato non valido');map.set(value.fileKey,{key:value.fileKey,nome:value.nome||'allegato',tipo:value.tipo||'application/octet-stream'});}for(const item of Object.values(value))walk(item,depth+1);};walk(data);return [...map.values()];}
 async function hash(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
 function valid(data){
  if(!data||typeof data.paziente!=='object'||data.paziente===null)return false;
  const arrays=['farmaci','eventi','assunzioni','documenti','controlli','esamiRoutine'];
  if(!arrays.every(k=>Array.isArray(data[k]))||['integratori','vaccinazioni'].some(k=>data[k]!==undefined&&!Array.isArray(data[k])))return false;
  if(data.paziente.gruppoSanguigno!==undefined&&!['','A+','A-','B+','B-','AB+','AB-','0+','0-'].includes(data.paziente.gruppoSanguigno))return false;
  for(const key of [...arrays,'integratori','vaccinazioni']){const ids=new Set();for(const row of data[key]||[]){if(!row||typeof row!=='object'||typeof row.id!=='string'||!/^[a-zA-Z0-9_-]{1,160}$/.test(row.id)||ids.has(row.id))return false;ids.add(row.id);if(row.orari!==undefined&&(!Array.isArray(row.orari)||row.orari.some(x=>typeof x!=='string')))return false;if(row.allegati!==undefined&&!Array.isArray(row.allegati))return false;}}
  if((data.vaccinazioni||[]).some(v=>typeof v.nome!=='string'||!v.nome.trim()||typeof v.data!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v.data)||(v.richiamo!==undefined&&(typeof v.richiamo!=='string'||(v.richiamo&&(!/^\d{4}-\d{2}-\d{2}$/.test(v.richiamo)||v.richiamo<v.data))))))return false;
  if(data.eventi.some(e=>typeof e.data!=='string'))return false;
  return true;
 }
 async function pack(data,files){
  if(!valid(data))throw Error('Archivio non valido');
  const json=fflate.strToU8(JSON.stringify(data));let total=json.length;const contents={'archive.json':[json,{level:6}]},manifest={format:'terapia-luki-complete-backup',version:1,createdAt:new Date().toISOString(),archiveSha256:await hash(json),files:[]};
  for(const ref of refs(data)){const file=files.get(ref.key);if(!(file instanceof Uint8Array))throw Error('Allegato mancante: '+ref.nome);total+=file.length;if(total>LIMIT)throw Error('Il backup supera 200 MB. Usa il Mac e suddividi gli allegati prima di riprovare.');contents['files/'+ref.key]=[file,{level:0}];manifest.files.push({...ref,size:file.length,sha256:await hash(file)});}
  contents['manifest.json']=[fflate.strToU8(JSON.stringify(manifest)),{level:6}];return fflate.zipSync(contents,{level:0});
 }
 async function unpack(bytes){
  if(bytes.length>LIMIT)throw Error('Backup oltre 200 MB');let total=0,count=0;const zip=fflate.unzipSync(bytes,{filter:file=>{total+=file.originalSize;count++;if(total>LIMIT||count>5000||(!['archive.json','manifest.json'].includes(file.name)&&!/^files\/[a-f0-9-]{36}$/.test(file.name)))throw Error('Contenuto ZIP non valido o troppo grande');return true;}});
  if(!zip['manifest.json']||!zip['archive.json'])throw Error('Questo ZIP non è un backup dell’app');
  const manifest=JSON.parse(fflate.strFromU8(zip['manifest.json']));if(manifest.format!=='terapia-luki-complete-backup'||manifest.version!==1||!Array.isArray(manifest.files))throw Error('Formato backup non riconosciuto');
  if(await hash(zip['archive.json'])!==manifest.archiveSha256)throw Error('Dati del backup danneggiati');
  const data=JSON.parse(fflate.strFromU8(zip['archive.json']));if(!valid(data))throw Error('Archivio non valido');
  const files=new Map();for(const ref of refs(data)){const record=manifest.files.find(f=>f.key===ref.key),file=zip['files/'+ref.key];if(!record||!file||file.length!==record.size||await hash(file)!==record.sha256)throw Error('Allegato mancante o danneggiato: '+ref.nome);if(file.length>100*1024*1024)throw Error('Allegato oltre 100 MB: '+ref.nome);files.set(ref.key,{bytes:file,nome:record.nome,tipo:record.tipo});}
  return {data,files,createdAt:manifest.createdAt};
 }
 function replaceRefs(data,mapping){const copy=structuredClone(data);const walk=value=>{if(!value||typeof value!=='object')return;if(value.fileKey){if(!mapping.has(value.fileKey))throw Error('Allegato ripristinato mancante');value.fileKey=mapping.get(value.fileKey);}Object.values(value).forEach(walk);};walk(copy);return copy;}
 root.TerapiaBackup={refs,hash,valid,pack,unpack,replaceRefs};
})(globalThis);
