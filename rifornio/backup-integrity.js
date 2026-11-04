/* Explicit native imports: preflight validation and a retained recovery journal. */
(function(root){'use strict';
 const KEYS=['rifornioVehicles','rifornioEntries'],JOURNAL='rifornio-before-import-v1';
 function fail(){throw Error('Archivio Rifornio non valido o incompleto. I dati precedenti sono conservati.');}
 const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(x);
 const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 function rows(values){if(!Array.isArray(values)||values.length>100000)fail();const ids=new Set();for(const row of values){if(!object(row)||!id(row.id)||ids.has(row.id))fail();ids.add(row.id);}}
 function validate(raw){
  if(!object(raw)||raw.app!==undefined&&raw.app!=='Rifornio'||raw.schemaVersion!==undefined&&raw.schemaVersion!==1)fail();
  rows(raw.vehicles);rows(raw.entries);
  for(const v of raw.vehicles){
   if(typeof v.name!=='string'||!v.name.trim()||v.name.length>200||typeof v.type!=='string'||!v.type.trim()||typeof v.fuel!=='string'||!v.fuel.trim()||!Number.isFinite(v.consumption)||v.consumption<=0)fail();
   for(const field of ['type','fuel','trim'])if(v[field]!==undefined&&(typeof v[field]!=='string'||v[field].length>200))fail();
   if(v.capacity!==undefined&&v.capacity!==null&&(!Number.isFinite(v.capacity)||v.capacity<0))fail();
  }
  for(const e of raw.entries){if(!id(e.vehicleId)||!date(e.date)||!Number.isFinite(e.quantity)||e.quantity<=0||!Number.isFinite(e.price)||e.price<0)fail();for(const field of ['odometer','paid'])if(e[field]!==undefined&&e[field]!==null&&(!Number.isFinite(e[field])||e[field]<0))fail();if(e.demo!==undefined&&typeof e.demo!=='boolean')fail();}
  return {vehicles:structuredClone(raw.vehicles),entries:raw.entries.map(row=>({...structuredClone(row),demo:row.demo??/^e[1-4]$/.test(row.id)}))};
 }
 function journal(storage){const raw=storage.getItem(JOURNAL);if(raw===null)return null;let j;try{j=JSON.parse(raw);}catch{fail();}if(!object(j)||j.version!==1||!['pending','committed','rolled-back'].includes(j.phase)||!object(j.previous)||!KEYS.every(k=>j.previous[k]===null||typeof j.previous[k]==='string'))fail();return j;}
 function read(storage,key){const j=journal(storage);if(j?.phase==='pending'&&KEYS.includes(key))return {pending:true,value:j.previous[key]};return {pending:false,value:storage.getItem(key)};}
 function rollback(storage,previous,written){
  for(const key of KEYS){if(storage.getItem(key)!==written[key])continue;const value=previous[key];if(value===null)storage.removeItem(key);else storage.setItem(key,value);}
 }
 function commit(storage,candidate){
  const current=journal(storage);if(current?.phase==='pending')throw Error('Un’importazione precedente è interrotta. Recupera prima la copia precedente.');
  const checked=validate({app:'Rifornio',schemaVersion:1,...candidate}),previous=Object.fromEntries(KEYS.map(k=>[k,storage.getItem(k)]));
  const written={rifornioVehicles:JSON.stringify(checked.vehicles),rifornioEntries:JSON.stringify(checked.entries)};
  const j={version:1,phase:'pending',previous,createdAt:new Date().toISOString()};
  storage.setItem(JOURNAL,JSON.stringify(j)); // Must succeed before either original key is touched.
  try{for(const key of KEYS)storage.setItem(key,written[key]);for(const key of KEYS)if(storage.getItem(key)!==written[key])throw Error('Verifica salvataggio non riuscita.');storage.setItem(JOURNAL,JSON.stringify({...j,phase:'committed'}));}
  catch(error){try{rollback(storage,previous,written);}catch{}throw Error('Importazione non completata. La copia precedente è conservata; nessun successo è stato dichiarato.');}
  return checked;
 }
 function recover(storage){
  const j=journal(storage);if(!j||j.phase!=='pending')throw Error('Nessuna importazione interrotta da recuperare.');
  // Called only after explicit confirmation. Never invoked at startup.
  for(const key of KEYS){const old=j.previous[key];if(old===null)storage.removeItem(key);else storage.setItem(key,old);}
  for(const key of KEYS)if(storage.getItem(key)!==j.previous[key])throw Error('Recupero non completato. Mantieni la copia precedente.');
  storage.setItem(JOURNAL,JSON.stringify({...j,phase:'rolled-back'}));return true;
 }
 root.RifornioBackup={validate,commit,read,recover,journal};if(typeof module!=='undefined')module.exports=root.RifornioBackup;
})(globalThis);
