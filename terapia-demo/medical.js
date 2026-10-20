(function(root){
 'use strict';
 const $=id=>document.getElementById(id),drafts={c:[],v:[]};let generation={c:0,v:0,e:0};
 const fields={c:{date:'cData',ora:'cOra',medico:'cMedico',struttura:'cStruttura',tipo:'cTipoVisita',title:'cTitolo'},e:{date:'eData',ora:'eOra',medico:'eMedico',struttura:'eStruttura',tipo:'eTipoVisita',title:'eTitolo'},v:{date:'vData',struttura:'vStruttura',title:'vNome'}};
 const all=()=>[...(data.eventi||[]),...(data.controlli||[]),...(data.vaccinazioni||[]),...(data.integratori||[])];
 function links(items){return (items||[]).filter(a=>a.fileKey).map(a=>'<div class="medical-attachment"><button type="button" class="btn btn-outline btn-sm" onclick="MedicalDocs.open(\''+encodeURIComponent(a.fileKey)+'\',\''+encodeURIComponent(a.nome||'Documento.pdf').replaceAll("'",'%27')+'\')">📄 '+esc(a.nome||'Documento.pdf')+'</button></div>').join('');}
 function open(key,name){key=decodeURIComponent(key);const url=typeof demoFileUrl==='function'?demoFileUrl(key):'/api/files/'+encodeURIComponent(key);if(!url){alert('Documento non disponibile: ripristina un backup completo oppure ricaricalo.');return;}openDocumentUrl(url,decodeURIComponent(name));}
 function reset(scope,id){generation[scope]++;drafts[scope]=structuredClone((data[scope==='v'?'vaccinazioni':'controlli']||[]).find(x=>x.id===id)?.allegati||[]);renderDraft(scope);}
 function renderDraft(scope){const target=$(scope+'MedicalAttachments');if(target)target.innerHTML=drafts[scope].map((a,i)=>'<div class="medical-attachment">'+esc(a.nome)+' <button type="button" class="btn btn-outline btn-sm" onclick="MedicalDocs.remove(\''+scope+'\','+i+')">Scollega</button></div>').join('');}
 function remove(scope,index){drafts[scope].splice(index,1);renderDraft(scope);}
 function validDate(s){try{return /^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}catch{return false;}}
 function parse(text){
  const lines=String(text).split(/\r?\n/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean),result={};
  const labeled=(pattern)=>{for(const line of lines){const m=line.match(pattern);if(m&&m[1]?.trim())return m[1].trim().slice(0,250);}return '';};
  const dateLines=lines.filter(s=>!/nascit|nato |nata |codice fiscale/i.test(s));
  const preferred=dateLines.filter(s=>/data.*(?:visita|referto|prestazione|vaccin)|eseguit[oa] il|appuntamento/i.test(s));
  for(const line of [...preferred,...dateLines]){const m=line.match(/\b([0-3]?\d)[/.-]([01]?\d)[/.-]((?:19|20)\d{2})\b/);if(m){const date=m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');if(validDate(date)){result.date=date;break;}}}
  const time=String(text).match(/(?:ore|orario|ora)\s*:?\s*([0-2]?\d)[:.]([0-5]\d)/i);if(time&&+time[1]<24)result.ora=time[1].padStart(2,'0')+':'+time[2];
  result.medico=labeled(/^(?:medico(?: refertante)?|specialista|dott(?:ore|oressa)?\.?|dr\.?)\s*:?\s+(.+)$/i);
  result.struttura=labeled(/^(?:struttura|sede|ambulatorio|ospedale|clinica|centro medico)\s*:\s*(.+)$/i);
  if(!result.struttura)result.struttura=lines.find(l=>/^(?:azienda (?:sanitaria|ulss|ospedaliera)|ospedale |policlinico |clinica |centro medico )/i.test(l))?.slice(0,250)||'';
  result.title=labeled(/^(?:tipo (?:di )?(?:visita|prestazione)|prestazione|esame|vaccino)\s*:\s*(.+)$/i)||lines.find(l=>/^(?:visita |controllo |prima visita |vaccinazione )/i.test(l))?.slice(0,180)||'';
  if(/controllo/i.test(result.title))result.tipo='Visita di controllo';else if(/prima visita/i.test(result.title))result.tipo='Prima visita';else if(/esame|referto/i.test(result.title))result.tipo='Esame / Referto';
  return result;
 }
 async function fingerprint(file){const chunks=[];for(let offset=0;offset<file.size;offset+=1024*1024)chunks.push(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.slice(offset,offset+1024*1024).arrayBuffer())));const packed=new Uint8Array(chunks.length*32+8);new DataView(packed.buffer).setFloat64(0,file.size,true);chunks.forEach((b,i)=>packed.set(b,8+i*32));return [...new Uint8Array(await crypto.subtle.digest('SHA-256',packed))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 async function scan(file,scope,progress=()=>{},stillValid=()=>true){
  if(typeof readSupplementDocument!=='function'){progress('PDF allegato. Lettura automatica non disponibile.');return;}
  const before=Object.fromEntries(Object.values(fields[scope]).map(id=>[id,$(id)?.value]));
  const result=await readSupplementDocument(file,progress),parsed=parse(result.text);if(!stillValid())return;
  for(const [key,id] of Object.entries(fields[scope]))if(parsed[key]&&$(id)&&$(id).value===before[id]){if(!before[id]||(key==='date'&&scope==='e'))$(id).value=parsed[key];}
  if(scope==='e'&&/visita/i.test(parsed.title||'')&&$('eTipo')?.value==='esame')$('eTipo').value='visita';
  progress('Lettura completata ('+result.pages+'/'+result.totalPages+' pagine). Controlla i campi proposti prima di salvare.');
 }
 async function upload(ev,scope){
  const files=[...(ev.target.files||[])];if(!files.length)return;if(uploadsPending||backupBusy){alert('Attendi il termine delle operazioni in corso.');ev.target.value='';return;}
  const token=generation[scope],status=$(scope+'MedicalStatus');uploadsPending++;
  try{for(const file of files){
   if(await file.slice(0,5).text()!=='%PDF-')throw Error('Scegli un PDF valido.');if(file.size>1024**3)throw Error('PDF oltre 1 GB');
   status.textContent='Verifica documento…';const signature=await fingerprint(file);if(token!==generation[scope])return;
   if(drafts[scope].some(a=>a.fingerprint===signature)){status.textContent='Questo PDF è già allegato alla scheda.';continue;}
   const existing=all().flatMap(x=>x.allegati||[]).find(a=>a.fingerprint===signature);
   if(existing&&!confirm('Questo PDF è già presente nell’archivio. Collegarlo anche a questa scheda senza duplicare il file?'))continue;
   const a=existing?{...existing}:{...await uploadFile(file),fingerprint:signature};if(token!==generation[scope])return;
   drafts[scope].push(a);renderDraft(scope);status.textContent='PDF allegato. Lettura automatica…';
   try{await scan(file,scope,t=>{if(token===generation[scope])status.textContent=t;},()=>token===generation[scope]);}catch(e){if(token===generation[scope])status.textContent='PDF allegato. Lettura automatica non riuscita: '+e.message+' Puoi compilare manualmente.';}
  }}catch(e){status.textContent=e.message;alert(e.message);}finally{uploadsPending--;ev.target.value='';syncNow();}
 }
 function controlFields(){
  const grid=$('cData')?.closest('.form-grid');if(!grid)return;
  const old=$('cRamo');old.outerHTML='<select id="cRamo"><option value="Medico">Medico</option><option value="Cardiologia">Cardiologia</option><option value="Dermatologia">Dermatologia</option><option value="Pneumologia">Pneumologia</option><option value="Sangue e laboratorio">Sangue e laboratorio</option><option value="Altro">Altro</option></select>';
  grid.insertAdjacentHTML('beforeend','<div class="form-group"><label for="cOra">Ora visita</label><input type="time" id="cOra"></div><div class="form-group"><label for="cTipoVisita">Tipologia visita</label><select id="cTipoVisita"><option value="">Da selezionare</option><option>Visita di controllo</option><option>Prima visita</option><option>Esame / Referto</option><option>Altro</option></select></div><div class="form-group"><label for="cMedico">Medico</label><input id="cMedico"></div><div class="form-group"><label for="cStruttura">Struttura</label><input id="cStruttura"></div><div class="form-group"><label for="cReminder">Promemoria</label><select id="cReminder"><option value="">Nessuno</option><option value="0">All’ora stabilita</option><option value="15">15 minuti prima</option><option value="60">1 ora prima</option><option value="1440">1 giorno prima</option></select></div><div class="form-group" style="grid-column:1/-1"><label for="cMedicalPdf">Referto / visita PDF (facoltativo)</label><input id="cMedicalPdf" type="file" accept="application/pdf,.pdf" multiple onchange="MedicalDocs.upload(event,\'c\')"><p id="cMedicalStatus" role="status"></p><div id="cMedicalAttachments"></div><small>Il PDF viene letto per proporre data, orario, medico, struttura e tipo. Verifica i campi prima del salvataggio.</small></div>');
  // Keep date and time adjacent even when extra fields are appended.
  $('cData').parentElement.after($('cOra').parentElement);
  grid.insertAdjacentHTML('afterend','<p class="medical-hint">Per il promemoria anche ad app chiusa usa “Aggiungi al calendario”. Gli avvisi del browser funzionano mentre l’app è aperta e con il permesso notifiche.</p><button class="btn btn-outline" type="button" onclick="MedicalDocs.cancelControl()">Annulla modifica</button>');
 }
 function renderControls(){
  const states={da_prenotare:'Da prenotare',fissata:'Fissata',da_eseguire:'Da eseguire',completato:'Completato'};
  const records=(data.controlli||[]).slice().sort((a,b)=>((a.data||'9999')+(a.ora||'')).localeCompare((b.data||'9999')+(b.ora||'')));
  $('listaControlli').innerHTML=records.map(c=>'<article class="card"><div class="timeline-title">'+esc(c.titolo)+' <span class="badge badge-terapia">'+esc(states[c.stato]||c.stato||'')+'</span></div><p>'+esc(c.data?formatData(c.data):'Data da definire')+(c.ora?' · '+esc(c.ora):'')+' · '+esc(c.tipoVisita||'Visita')+' · '+esc(c.ramo||'Medico')+'</p><p>'+esc([c.medico,c.struttura].filter(Boolean).join(' · '))+'</p><p style="white-space:pre-wrap">'+esc(c.note||'')+'</p>'+links(c.allegati)+(c.fontePath?originalLink(c.fontePath):'')+'<div class="actions no-print"><button class="btn btn-outline" onclick="modificaControllo(\''+c.id+'\')">Modifica</button>'+(c.data&&c.ora?'<button class="btn btn-outline" onclick="MedicalDocs.calendar(\''+c.id+'\')">Aggiungi al calendario</button>':'')+'<button class="btn btn-danger" onclick="eliminaControllo(\''+c.id+'\')">Elimina</button></div></article>').join('')||'<div class="empty-state">Nessuna visita o controllo registrato.</div>';
 }
 function saveControl(){
  if(uploadsPending){alert('Attendi il completamento del PDF e della lettura automatica.');return;}
  const id=$('cId').value||'ctrl_'+crypto.randomUUID(),old=(data.controlli||[]).find(x=>x.id===id)||{};
  if(!$('cTitolo').value.trim()){alert('Inserisci il nome della visita.');return;}
  const record={...old,id,data:$('cData').value,ora:$('cOra').value,ramo:$('cRamo').value||'Medico',tipoVisita:$('cTipoVisita').value,medico:$('cMedico').value.trim(),struttura:$('cStruttura').value.trim(),promemoria:$('cReminder').value,stato:$('cStato').value,titolo:$('cTitolo').value.trim(),note:$('cNote').value.trim(),allegati:structuredClone(drafts.c)};
  if(record.promemoria!==''&&(!record.data||!record.ora)){alert('Per il promemoria inserisci data e orario.');return;}
  if(record.data&&!validDate(record.data)){alert('Data visita non valida');return;}
  const duplicate=(data.controlli||[]).find(x=>x.id!==id&&x.data===record.data&&(x.ora||'')===record.ora&&x.titolo.toLowerCase()===record.titolo.toLowerCase());
  if(duplicate&&!confirm('Una visita con lo stesso titolo, data e orario è già presente. Registrarla comunque?'))return;
  data.controlli ||= [];const index=data.controlli.findIndex(x=>x.id===id);if(index<0)data.controlli.push(record);else data.controlli[index]=record;
  salvaDati();resetControl();renderControls();renderMedicalViews();mostraToast('Visita salvata con gli allegati');
  if(record.promemoria!==''&&root.Notification&&Notification.permission==='default')Notification.requestPermission().catch(()=>{});
 }
 function resetControl(){for(const id of ['cId','cData','cOra','cTitolo','cMedico','cStruttura','cNote'])$(id).value='';$('cRamo').value='Medico';$('cTipoVisita').value='';$('cStato').value='da_prenotare';$('cReminder').value='';$('cMedicalStatus').textContent='';reset('c','');}
 function editControl(id){const c=(data.controlli||[]).find(x=>x.id===id);if(!c)return;reset('c',id);const select=$('cRamo');if(c.ramo&&![...select.options].some(o=>o.value===c.ramo))select.add(new Option(c.ramo,c.ramo));for(const [field,key] of Object.entries({cId:'id',cData:'data',cOra:'ora',cRamo:'ramo',cTipoVisita:'tipoVisita',cMedico:'medico',cStruttura:'struttura',cReminder:'promemoria',cStato:'stato',cTitolo:'titolo',cNote:'note'}))$(field).value=c[key]??(field==='cRamo'?'Medico':field==='cTipoVisita'?'Visita di controllo':'');$('cMedicalStatus').textContent='';$('cTitolo').focus();}
 function icsEscape(s){return String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
 function calendarText(c){
  if(!c.data||!c.ora)throw Error('Inserisci data e ora');const start=c.data.replaceAll('-','')+'T'+c.ora.replace(':','')+'00';
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//LucaApps//Terapia//IT','BEGIN:VEVENT','UID:'+c.id+'@terapia.local','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'DTSTART:'+start,'DURATION:PT1H','SUMMARY:'+icsEscape(c.titolo),'LOCATION:'+icsEscape(c.struttura),'DESCRIPTION:'+icsEscape([c.medico,c.note].filter(Boolean).join('\n'))];
  if(c.promemoria!==undefined&&c.promemoria!=='')lines.push('BEGIN:VALARM','TRIGGER:-PT'+Number(c.promemoria)+'M','ACTION:DISPLAY','DESCRIPTION:Promemoria visita','END:VALARM');lines.push('END:VEVENT','END:VCALENDAR');return lines.join('\r\n')+'\r\n';
 }
 function calendar(id,group='controlli'){const c=(data[group]||[]).find(x=>x.id===id);if(c)saveDownload(new Blob([calendarText(c)],{type:'text/calendar;charset=utf-8'}),'visita-'+c.data+'.ics');}
 const notified=new Set();function reminders(){
  const now=Date.now();for(const c of [...(data.controlli||[]),...(data.eventi||[])]){if(!c.data||!c.ora||c.promemoria==null||c.promemoria===''||c.stato==='completato')continue;const due=new Date(c.data+'T'+c.ora).getTime()-Number(c.promemoria)*60000,key=c.id+':'+due;
   if(now>=due&&now-due<60000&&!notified.has(key)){notified.add(key);mostraToast('Promemoria: '+c.titolo+' alle '+c.ora);if(root.Notification&&Notification.permission==='granted')try{new Notification('Promemoria visita',{body:c.titolo+' · '+c.ora});}catch{}}
  }
 }
 function medicalSummary(){return '<section class="medical-subsection"><h3>Medico</h3><div class="actions no-print"><button class="btn btn-outline btn-sm" onclick="MedicalDocs.attach(\'controlli\')">Aggiungi visita / Carica PDF</button></div>'+((data.controlli||[]).map(c=>'<article><strong>'+esc(c.titolo)+'</strong> · '+esc(c.data?formatData(c.data):'Data da definire')+(c.ora?' · '+esc(c.ora):'')+'<p>'+esc([c.tipoVisita,c.medico,c.struttura].filter(Boolean).join(' · '))+'</p>'+links(c.allegati)+'<div class="actions no-print"><button class="btn btn-outline btn-sm" onclick="navigateToSection(\'controlli\');modificaControllo(\''+c.id+'\')">Apri visita</button><button class="btn btn-outline btn-sm" onclick="MedicalDocs.attach(\'controlli\',\''+c.id+'\')">Carica PDF</button></div></article>').join('')||'<p>Nessuna visita registrata.</p>')+'</section>';}
 function vaccinationArchiveHtml(){return '<section class="medical-subsection"><h3>Vaccinazioni</h3><div class="actions no-print"><button class="btn btn-outline btn-sm" onclick="MedicalDocs.attach(\'vaccinazioni\')">Aggiungi vaccinazione / Carica PDF</button></div>'+((data.vaccinazioni||[]).map(v=>'<article><strong>'+esc(v.nome)+'</strong> · '+esc(formatData(v.data))+' · '+esc(v.dose||'')+(v.richiamo?'<p>Richiamo: '+esc(formatData(v.richiamo))+'</p>':'')+links(v.allegati)+'<div class="actions no-print"><button class="btn btn-outline btn-sm" onclick="apriVaccinazione(\''+v.id+'\')">Apri vaccinazione</button><button class="btn btn-outline btn-sm" onclick="MedicalDocs.attach(\'vaccinazioni\',\''+v.id+'\')">Carica PDF</button></div></article>').join('')||'<p>Nessuna vaccinazione registrata.</p>')+'</section>';}

 function renderMedicalViews(){
  const selected=$('filtroPatEvento')?.value||'',card=$('medicalCartella');if(card)card.innerHTML=(!selected||selected==='Medico'?medicalSummary():'')+(!selected||selected==='Vaccinazioni'?vaccinationArchiveHtml():'');
  if($('archivioDettaglio')?.style.display==='block'){
   if($('archTitolo')?.textContent==='Medico'){const target=$('medicalArchive');if(target)target.innerHTML=medicalSummary();}
   if($('archTitolo')?.textContent==='Vaccinazioni'){const target=$('vaccinationArchive');if(target)target.innerHTML=vaccinationArchiveHtml();}
  }
 }
 function installViews(){
  const cartella=$('listaEventi');if(cartella)cartella.insertAdjacentHTML('afterend','<div id="medicalCartella"></div>');
  const oldCartella=root.renderCartella;root.renderCartella=function(){oldCartella();renderMedicalViews();};
  const oldFilters=root.popolaFiltriPat;if(oldFilters)root.popolaFiltriPat=function(){const select=$('filtroPatEvento'),selected=select.value;oldFilters();for(const label of ['Medico','Vaccinazioni'])if(![...select.options].some(o=>o.value===label))select.add(new Option(label,label));if(['Medico','Vaccinazioni'].includes(selected))select.value=selected;};
  const oldArchive=root.renderArchivio;root.renderArchivio=function(){
   oldArchive();const grid=$('archivioGrid'),headings=[...grid.querySelectorAll('h3')].map(h=>h.textContent);
   if(!headings.includes('Medico'))grid.insertAdjacentHTML('beforeend','<button type="button" class="arch-card" onclick="apriArchivioDettaglio(\'Medico\')"><h3>Medico</h3><div class="cnt">'+(data.controlli||[]).length+' visite</div></button>');
   if(!headings.includes('Vaccinazioni'))grid.insertAdjacentHTML('beforeend','<button type="button" class="arch-card" onclick="apriArchivioDettaglio(\'Vaccinazioni\')"><h3>Vaccinazioni</h3><div class="cnt">'+(data.vaccinazioni||[]).length+' registrazioni · '+(data.vaccinazioni||[]).reduce((n,v)=>n+(v.allegati||[]).length,0)+' certificati</div></button>');
  };
  const oldDetail=root.apriArchivioDettaglio;root.apriArchivioDettaglio=function(pat){oldDetail(pat);if(pat==='Medico')$('archContenuto').insertAdjacentHTML('beforeend','<div id="medicalArchive">'+medicalSummary()+'</div>');if(pat==='Vaccinazioni')$('archContenuto').insertAdjacentHTML('beforeend','<div id="vaccinationArchive">'+vaccinationArchiveHtml()+'</div>');};
 }
 function beginBackupTransfer(sink){
  const panel=document.createElement('section');panel.className='backup-ready no-print';panel.setAttribute('role','status');panel.innerHTML='<strong>Backup in corso</strong><p>I file vengono elaborati a blocchi. Attendi la verifica finale.</p><button type="button" class="btn btn-outline">Annulla backup</button>';panel.querySelector('button').onclick=()=>{sink.cancelled=true;sink.controller?.abort();panel.querySelector('p').textContent='Annullamento in corso…';};document.body.append(panel);return ()=>panel.remove();
 }
 function offerBackupDownload(file,name,cleanup){
  const old=$('backupReady');if(old)old.remove();const panel=document.createElement('section');panel.id='backupReady';panel.className='backup-ready no-print';panel.setAttribute('role','status');panel.innerHTML='<strong>Backup completo verificato</strong><p>Salva il file sul dispositivo o sul NAS.</p><div class="actions"><button type="button" class="btn btn-primary">Salva backup in File</button><button type="button" class="btn btn-outline">Chiudi</button></div>';
  const buttons=panel.querySelectorAll('button');let sharing=false;buttons[0].onclick=async()=>{
   if(sharing)return;const output=new File([file],name,{type:'application/octet-stream'});sharing=true;buttons[0].disabled=buttons[1].disabled=true;
   try{if(navigator.share&&navigator.canShare?.({files:[output]})){await navigator.share({files:[output],title:'Backup completo Terapia'});backupStatus('Condivisione completata. Verifica il backup nella destinazione scelta in File.');}
    else{saveDownload(output,name);backupStatus('Download del backup avviato. Verifica il file nella destinazione scelta.');}}
   catch(e){if(e.name==='AbortError')backupStatus('Salvataggio annullato. Il backup verificato resta pronto: premi nuovamente Salva backup in File.');else{backupStatus('Condivisione non disponibile. Avvio del download: controlla File / Download.');saveDownload(output,name);}}
   finally{sharing=false;buttons[0].disabled=buttons[1].disabled=false;}
  };buttons[1].onclick=()=>{if(sharing)return;panel.remove();setTimeout(()=>cleanup().catch(()=>{}),120000);};document.body.append(panel);
 }
 async function eventUpload(ev){
  const token=generation.e,files=[...(ev.target.files||[])];if(uploadsPending||backupBusy){alert('Attendi il termine delle operazioni in corso.');return;}uploadsPending++;
  try{for(const file of files){if(file.size>1024**3)throw Error('Documento oltre 1 GB');const signature=await fingerprint(file);if(token!==generation.e)return;if(allegatiTemp.some(a=>a.fingerprint===signature))continue;
   const old=all().flatMap(x=>x.allegati||[]).find(a=>a.fingerprint===signature);if(old&&!confirm('PDF già presente. Collegarlo a questo evento?'))continue;
   const a=old?{...old}:{...await uploadFile(file),fingerprint:signature};if(token!==generation.e)return;allegatiTemp.push(a);renderAttachPreview();
   try{await scan(file,'e',t=>{if(token===generation.e)$('eMedicalStatus').textContent=t;},()=>token===generation.e);}catch(e){if(token===generation.e)$('eMedicalStatus').textContent='Documento allegato. Lettura automatica non riuscita: '+e.message;}
  }}catch(e){alert(e.message);}finally{uploadsPending--;ev.target.value='';syncNow();}
 }
 function attach(group,id=''){
  if(uploadsPending||backupBusy){alert('Attendi il termine delle operazioni in corso.');return;}
  if(group==='vaccinazioni'){apriVaccinazione(id);$('vMedicalPdf').value='';$('vMedicalPdf').click();}
  else{navigateToSection('controlli');if(id)editControl(id);else resetControl();$('cMedicalPdf').value='';$('cMedicalPdf').click();}
 }
 Object.assign(root,{offerBackupDownload,beginBackupTransfer,MedicalDocs:{links,open,reset,remove,upload,parse,fingerprint,scan,attach,draft:scope=>structuredClone(drafts[scope]),calendar,calendarText,renderMedicalViews,cancelControl(){resetControl();goBackInApp();}}});
 controlFields();Object.assign(root,{renderControlli:renderControls,salvaControllo:saveControl,modificaControllo:editControl});installViews();
 const oldDelete=root.eliminaControllo;root.eliminaControllo=function(id){oldDelete(id);renderMedicalViews();};
 const oldEvent=root.apriModalEvento;root.apriModalEvento=function(id=null,tipo=null){generation.e++;oldEvent(id,tipo);const e=(data.eventi||[]).find(x=>x.id===id)||{};for(const [field,key] of Object.entries({eOra:'ora',eMedico:'medico',eTipoVisita:'tipoVisita',eRamo:'ramo',eReminder:'promemoria'}))if($(field))$(field).value=e[key]??(field==='eRamo'?'Medico':'');if($('eMedicalStatus'))$('eMedicalStatus').textContent='';};root.gestisciFile=eventUpload;
 const close=root.chiudiModal;root.chiudiModal=function(id){if(id==='modalVaccinazione')generation.v++;if(id==='modalEvento')generation.e++;close(id);};
 if(typeof syncReady!=='undefined'&&syncReady)repaint();setInterval(reminders,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)reminders();});
})(globalThis);
