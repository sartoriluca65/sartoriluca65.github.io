/* Synthetic regression checks: never read or write a user's browser archive. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let passed=0;
function check(label,action){action();passed++;console.log('✓ '+label);}
function functionSource(name){
 const start=html.indexOf('    function '+name+'(');assert(start>=0,name);
 const first=html.indexOf('\n',start),endLine=html.indexOf('\n    }',first);
 if(html.slice(start,first).trimEnd().endsWith('}'))return html.slice(start,first);
 assert(endLine>=0,name);return html.slice(start,endLine+6);
}
const context=vm.createContext({console,Date,URL,crypto:webcrypto,TextEncoder,TextDecoder,Blob,File,Response,Uint8Array,DataView,Map,Set,structuredClone,btoa,atob});
const load=file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const call=(name,...args)=>context[name](...args);
for(const file of ['reliability-core.js','care-experience.js','backup-core.js','backup-stream.js','backup-json.js'])load(file);
for(const name of ['farmacoPrevisto','orariFarmaco','cambiaGiorno','salvaFarmaco','confermaAssunzione','assunzioniFiltrate','preparaStampa','backupCounts'])vm.runInContext(functionSource(name),context);
check('All inline and application scripts parse',()=>{
 for(const [,code]of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(code.trim())new vm.Script(code);
 for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
});
const archive=()=>({paziente:{nome:'Paziente di prova'},farmaci:[],integratori:[],vaccinazioni:[],eventi:[],assunzioni:[],documenti:[],controlli:[],esamiRoutine:[]});
const med={id:'f_prova',nome:'Terapia fittizia',tipo:'cronico',stato:'attivo',inizio:'2026-03-01',fine:'2026-10-31',orari:['08:00','08:00','20:00','99:00']};
check('Schedules exclude before-start, after-end and off-cycle dates',()=>{
 assert.equal(call('farmacoPrevisto',med,'2026-02-28'),false);assert.equal(call('farmacoPrevisto',med,'2026-11-01'),false);assert.equal(call('farmacoPrevisto',med,'2026-10-27'),true);
 assert.equal(call('farmacoPrevisto',{...med,tipo:'ciclo',prossimoCiclo:'2026-10-28'},'2026-10-27'),false);
 assert.equal(call('farmacoPrevisto',{...med,schema:{giorni:[1,3,5],ogni:1,da:'2026-03-01'}},'2026-10-27'),false);
 assert.deepEqual([...call('orariFarmaco',med)],['08:00','20:00']);
});
check('Daily summary counts unique slots and ignores suspended/ended medicines',()=>{
 const a=archive();a.farmaci=[med,{...med,id:'s',stato:'sospeso'},{...med,id:'e',fine:'2026-10-26'}];
 a.assunzioni=[{farmacoId:med.id,data:'2026-10-27',oraPrevista:'08:00'},{farmacoId:med.id,data:'2026-10-27',oraPrevista:'08:00'}];
 const v=context.CareExperienceCore.daily(a,'2026-10-27','07:00');assert.equal(v.planned.length,2);assert.equal(v.done,1);assert.equal(v.next.time,'20:00');
});
check('Date navigation survives midnight and DST in Rome and Los Angeles',()=>{
 const previous=process.env.TZ;
 for(const zone of ['Europe/Rome','America/Los_Angeles']){process.env.TZ=zone;
  context.dataCorrenteEl={value:''};context.caricaGiorno=()=>{};
  for(const [from,delta,expected]of [['2026-03-29',1,'2026-03-30'],['2026-10-25',-1,'2026-10-24'],['2026-12-31',1,'2027-01-01']]){context.dataCorrente=from;call('cambiaGiorno',delta);assert.equal(context.dataCorrente,expected,zone);}
  assert.equal(context.TerapiaReliability.day(new Date(2026,9,27,0,15)),'2026-10-27');
 }
 if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;
});
let alerts=[],saved=0;
Object.assign(context,{alert:v=>alerts.push(v),salvaDati:()=>saved++,chiudiModal:()=>{},renderFarmaci:()=>{},caricaGiorno:()=>{},mostraToast:()=>{},crypto:webcrypto});
const input=value=>({value,focus(){}});
function medicineForm(){
 alerts=[];saved=0;Object.assign(context,{data:archive(),fNome:input('Terapia fittizia'),fInizio:input('2026-10-27'),fFine:input(''),farmacoId:input(''),fDosaggio:input('Dose di prova'),fVia:input('Orale'),fPatologia:input('Area di prova'),fTipo:input('cronico'),fStato:input('attivo'),fNote:input('Dati sintetici'),orariContainer:{querySelectorAll:()=>[input('08:00'),input('20:00')]},document:{getElementById:()=>input('')}});
}
check('Medicine saves reject reversed dates, repeated times and missing names',()=>{
 medicineForm();context.fFine.value='2026-10-26';call('salvaFarmaco');assert.equal(saved,0);assert.match(alerts[0],/data fine/);
 medicineForm();context.orariContainer.querySelectorAll=()=>[input('08:00'),input('08:00')];call('salvaFarmaco');assert.equal(saved,0);assert.match(alerts[0],/diversi/);
 medicineForm();context.fNome.value=' ';call('salvaFarmaco');assert.equal(saved,0);
 medicineForm();call('salvaFarmaco');assert.equal(saved,1);assert.equal(context.data.farmaci.length,1);
});
check('Editing a medicine preserves attachments and its existing schedule',()=>{
 medicineForm();context.data.farmaci=[{...med,bugiardino:{fileKey:'11111111-1111-4111-8111-111111111111'},schema:{giorni:[1,3,5],ogni:1,da:'2026-03-01'}}];context.farmacoId.value=med.id;call('salvaFarmaco');assert.equal(context.data.farmaci[0].bugiardino.fileKey,'11111111-1111-4111-8111-111111111111');assert.deepEqual([...context.data.farmaci[0].schema.giorni],[1,3,5]);
});
check('A double confirmation records one dose on the original selected day',()=>{
 Object.assign(context,{data:archive(),notaFarmacoId:input(med.id),notaOrarioPrevisto:input('08:00'),notaOra:input('08:10'),notaTesto:input('Prova'),giornoAssunzione:'2026-10-27',dataCorrente:'2026-10-28'});context.data.farmaci=[med];saved=0;call('confermaAssunzione');call('confermaAssunzione');assert.equal(context.data.assunzioni.length,1);assert.equal(context.data.assunzioni[0].data,'2026-10-27');assert.equal(saved,1);
 context.notaOra.value='';call('confermaAssunzione');assert.equal(context.data.assunzioni.length,1);
});
check('History export and table share date/medicine filters',()=>{
 context.data.assunzioni=[{id:'1',data:'2026-10-27',farmacoId:med.id},{id:'2',data:'2026-10-28',farmacoId:med.id},{id:'3',data:'2026-10-27',farmacoId:'other'}];Object.assign(context,{filtroDal:input('2026-10-27'),filtroAl:input('2026-10-27'),filtroFarmaco:input(med.id)});assert.deepEqual([...call('assunzioniFiltrate')].map(a=>a.id),['1']);
});
check('Printed day excludes ended, future, suspended and off-schema therapies',()=>{
 Object.assign(context,{data:archive(),tipoStampa:input('giorno'),stampaData:input('2026-10-27'),stampaDataWrap:{style:{}},areaStampa:{innerHTML:''},document:{getElementById:()=>({style:{},checked:false})},esc:v=>String(v??''),formatData:v=>v||'',cicloLabel:()=>'',decorateReport:()=>{}});
 context.data.farmaci=[{...med,orari:['08:00','08:00']},{...med,id:'old',nome:'FINITA',fine:'2026-10-26'},{...med,id:'new',nome:'FUTURA',inizio:'2026-10-28'},{...med,id:'s',nome:'SOSPESA',stato:'sospeso'},{...med,id:'schema',nome:'ALTRO_GIORNO',schema:{giorni:[1],ogni:1,da:'2026-03-01'}}];call('preparaStampa');const out=context.areaStampa.innerHTML;assert(out.includes('Terapia fittizia'));for(const name of ['FINITA','FUTURA','SOSPESA','ALTRO_GIORNO'])assert(!out.includes(name),name);assert.equal(out.match(/08:00/g).length,1);
});
// Memory sink implements the same writer interface as the browser-backed sink.
function memorySink(){let chunks=[];return {writer:{async write(b){chunks.push(new Uint8Array(b));},async close(){},async abort(){chunks=[];}},async file(){return new Blob(chunks);},async cleanup(){}};}
context.TerapiaBackupStream.createSink=async()=>memorySink();
const sourceArchive=archive(),key='11111111-1111-4111-8111-111111111111';
sourceArchive.misurazioni=[{id:'mis_prova',tipo:'pressione',data:'2026-10-27',ora:'08:00',valore:120,secondo:80,unita:'mmHg',fonte:'Dati sintetici',note:'Prova tecnica'}];sourceArchive.documenti=[{id:'doc_prova',nome:'Prova.pdf',tipo:'application/pdf',fileKey:key}];sourceArchive.paziente.password='must-be-excluded';
const bytes=new TextEncoder().encode('%PDF-1.4\nDocumento fittizio per verifica del backup\n%%EOF');
const source=async()=>new Response(bytes);
for(const format of ['json','archive']){
 const sink=memorySink(),api=format==='json'?context.TerapiaBackupJson:context.TerapiaBackupStream;
 const result=await api.pack(sourceArchive,source,sink);const blob=await sink.file();const restored=await api.unpack(blob);
 assert.equal(restored.data.misurazioni[0].valore,120);assert.equal(restored.data.misurazioni[0].secondo,80);assert.equal(restored.data.documenti[0].nome,'Prova.pdf');assert.deepEqual(new Uint8Array(await restored.files.get(key).bytes.arrayBuffer()),bytes);if(format==='json')assert.equal(restored.data.paziente.password,undefined);assert(result.size>bytes.length);await restored.dispose?.();
 const corrupted=new Uint8Array(await blob.arrayBuffer());corrupted[Math.floor(corrupted.length/2)]^=1;await assert.rejects(()=>api.unpack(new Blob([corrupted])));
 passed++;console.log('✓ '+format+' round trip preserves pressure diary and attachments; damaged data rejected');
}
check('Backup summary lists measurements; legacy backups remain accepted',()=>{assert(call('backupCounts',sourceArchive).includes('Misurazioni: 1'));assert(context.TerapiaBackup.valid(archive()));assert(!context.TerapiaBackup.valid({...archive(),misurazioni:{}}));});
console.log(`${passed} regression groups passed.`);
