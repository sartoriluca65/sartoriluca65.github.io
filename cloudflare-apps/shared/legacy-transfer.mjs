// Importazione esplicita dei soli archivi locali Sticker/Diviso, mai credenziali del sito.
export function validateTransfer(value,app){
 if(value?.format!=='luki-local-transfer'||value.version!==1||value.app!==app||!['stickers','diviso'].includes(app)||!Array.isArray(value.storage)||!Array.isArray(value.databases))throw Error('Trasferimento locale non compatibile.');
 const allowed=app==='stickers'?new Set(['ss-packs','ss-stickers']):new Set(['diviso-v2']),seen=new Set();
 for(const row of value.storage){if(!Array.isArray(row)||row.length!==2||!allowed.has(row[0])||seen.has(row[0])||typeof row[1]!=='string')throw Error('Impostazioni di trasferimento non valide.');seen.add(row[0]);const parsed=JSON.parse(row[1]);if(app==='stickers'&&!Array.isArray(parsed))throw Error('Archivio Sticker non valido.');if(app==='diviso'&&(!Array.isArray(parsed.people)||!Array.isArray(parsed.expenses)))throw Error('Archivio Diviso non valido.');}
 if(!seen.size)throw Error('Il file non contiene un archivio.');
 if(app==='diviso'&&value.databases.length)throw Error('Database non previsto per Diviso.');
 if(app==='stickers')for(const db of value.databases){if(db.name!=='luki-stickers'||db.version!==1||!Array.isArray(db.rows)||db.rows.some(r=>typeof r.id!=='string'))throw Error('Archivio immagini non valido.');}
 if(value.databases.length>1)throw Error('Database duplicato.');return value;
}
