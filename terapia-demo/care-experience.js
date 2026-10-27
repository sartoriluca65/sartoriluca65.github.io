/* Shared presentation layer. Reads clinical data; never resets, migrates or writes the archive. */
(function(root){
 'use strict';
 const today=(date=new Date())=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it');
 const array=value=>Array.isArray(value)?value:[];
 const dateOf=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?value:'';
 function documents(archive){
  if(root.TerapiaCategories)return root.TerapiaCategories.list(archive);
  const result=[],seen=new Map();
  function add(file,meta){
   if(!file||typeof file!=='object')return;
   const key=file.fileKey?'file:'+file.fileKey:file.id?'doc:'+file.id:meta.key;
   if(seen.has(key))return;
   const record={key,file,index:meta.index??-1,name:String(file.nome||'Documento'),area:String(file.ramo||meta.area||'Da classificare'),date:dateOf(file.data||meta.date),note:String(file.nota||meta.note||''),source:meta.source};
   seen.set(key,record);result.push(record);
  }
  array(archive.documenti).forEach((f,i)=>add(f,{key:'doc:'+i,index:i,source:'Cartella'}));
  for(const [field,label]of [['eventi','Evento'],['integratori','Integratore'],['vaccinazioni','Vaccinazione'],['controlli','Visita']])array(archive[field]).forEach((item,i)=>array(item.allegati).forEach((f,j)=>add(f,{key:field+':'+i+':'+j,date:item.data||item.inizio,area:item.ramo||item.patologia||label,note:item.titolo||item.nome||'',source:label})));
  return result;
 }
 function filterDocuments(list,{query='',area='',from='',to=''}={}){
  const words=normalize(query).trim().split(/\s+/).filter(Boolean);
  return list.filter(d=>(!area||d.area===area)&&(!from||(d.date&&d.date>=from))&&(!to||(d.date&&d.date<=to))&&words.every(w=>normalize([d.name,d.area,d.note,d.source].join(' ')).includes(w))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||a.name.localeCompare(b.name,'it'));
 }
 function daily(archive,day,now='00:00'){
  const planned=[];
  for(const f of array(archive.farmaci)){
   if(root.TerapiaReliability&&!root.TerapiaReliability.due(f,day))continue;
   if(f.stato!=='attivo'||f.inizio&&f.inizio>day||f.fine&&f.fine<day||f.tipo==='ciclo'&&f.prossimoCiclo&&f.prossimoCiclo!==day)continue;
   for(const time of new Set(array(f.orari)))if(/^\d{2}:\d{2}$/.test(time)&&Number(time.slice(0,2))<24&&Number(time.slice(3))<60)planned.push({medicine:f,time,taken:array(archive.assunzioni).some(a=>a.farmacoId===f.id&&a.data===day&&a.oraPrevista===time)});
  }
  planned.sort((a,b)=>a.time.localeCompare(b.time));
  const outstanding=planned.filter(p=>!p.taken),next=outstanding.find(p=>p.time>=now)||outstanding[0]||null;
  const visits=array(archive.controlli).filter(v=>v.stato!=='completato'&&dateOf(v.data)&&v.data>=day).sort((a,b)=>a.data.localeCompare(b.data));
  const pending=array(archive.controlli).filter(v=>v.stato!=='completato'&&(v.stato==='da_prenotare'||dateOf(v.data)&&v.data<day||!v.data));
  return {planned,next,visits,pending,done:planned.filter(p=>p.taken).length};
 }
 root.CareExperienceCore={today,documents,filterDocuments,daily};
 if(typeof document==='undefined')return;
 const el=id=>document.getElementById(id),node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const read=()=>typeof data!=='undefined'&&data?data:null;
 const format=value=>dateOf(value)?value.split('-').reverse().join('/'):'';
 const icon=(name)=>{const n=node('span',undefined,'care-icon');n.setAttribute('aria-hidden','true');const paths={today:'M4 5h16v16H4z M8 2v6 M16 2v6 M4 10h16 M8 14h2 M14 14h2',therapy:'M8 16l8-8 M5 19a5 5 0 0 1 0-7l7-7a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7 0',document:'M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7',profile:'M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M4 21v-2a8 8 0 0 1 16 0v2',arrow:'M5 12h14 M13 6l6 6-6 6'};n.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+(paths[name]||paths.document)+'"/></svg>';return n;};
 function button(label,action,cls='btn btn-outline'){const n=node('button',label,cls);n.type='button';n.addEventListener('click',action);return n;}
 function go(tab){if(typeof navigateToSection==='function')navigateToSection(tab);else document.querySelector('.tab[data-tab="'+tab+'"]')?.click();}
 function actionLink(label,tab){return button(label,()=>go(tab),'care-text-button');}
 let queued=false;
 function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;if(!read())return;renderToday();renderDocuments();syncNavigation();renderStatus();});}
 function wrap(name){const original=root[name];if(typeof original!=='function')return;root[name]=function(...args){const result=original.apply(this,args);schedule();return result;};}
 const container=document.querySelector('.container'),tabs=document.querySelector('.tabs');
 if(!container||!tabs||el('carePrimaryNav'))return;
 document.body.classList.add('care-experience');
 const tools=document.querySelector('#syncBar .top-control-groups');if(tools){const holder=node('details',undefined,'care-tools');holder.append(node('summary','Strumenti: documenti, backup e ripristino'));tools.before(holder);holder.append(tools);}
 const nav=node('nav',undefined,'care-primary-nav no-print');nav.id='carePrimaryNav';nav.setAttribute('aria-label','Sezioni principali');
 for(const [label,tab,symbol]of [['Oggi','oggi','today'],['Terapie','farmaci','therapy'],['Documenti','cartella','document'],['Agenda','controlli','today'],['Profilo','profile','profile']]){
  const b=button('',()=>tab==='profile'?openProfile():go(tab),'care-nav-button');b.dataset.careTab=tab;b.append(icon(symbol),node('span',label));nav.append(b);
 }
 const more=node('details',undefined,'care-more no-print'),summary=node('summary','Tutte le funzioni');more.append(summary);tabs.before(nav,more);more.append(tabs);
 const originalProfile=document.querySelector('.profile-shell');if(originalProfile){const profileDetails=node('details',undefined,'care-original-profile');profileDetails.append(node('summary','Anagrafica e riepilogo completo'),originalProfile);more.append(profileDetails);}
 function syncNavigation(){const current=document.querySelector('.tab.active')?.dataset.tab;for(const b of nav.querySelectorAll('button')){const active=b.dataset.careTab===current;b.classList.toggle('is-current',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}more.open=false;}
 document.addEventListener('click',event=>{if(event.target.closest?.('.tab[data-tab]'))schedule();});
 const summaryCard=node('section',undefined,'care-today card');summaryCard.id='careToday';summaryCard.setAttribute('aria-label','La tua giornata');el('panel-oggi')?.prepend(summaryCard);
 function summaryBlock(kicker,title,detail,action){const block=node('article',undefined,'care-summary-item');block.append(node('p',kicker,'care-kicker'),node('h3',title),node('p',detail,'care-muted'));if(action)block.append(action);return block;}
 function renderToday(){
  const archive=read();if(!archive)return;
  const day=typeof dataCorrente!=='undefined'?dataCorrente:today(),now=new Date(),clock=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0'),view=daily(archive,day,day===today()?clock:'00:00');
  summaryCard.replaceChildren();const head=node('div',undefined,'care-section-head'),words=node('div');words.append(node('p',day===today()?'IL TUO PUNTO DI PARTENZA':'GIORNATA SELEZIONATA','care-kicker'),node('h2',day===today()?'La tua giornata, in ordine':'Il '+format(day)),node('p',[archive.paziente?.nome,archive.paziente?.cognome].filter(Boolean).join(' ')||'Il tuo spazio personale','care-muted'));head.append(words);summaryCard.append(head);
  const grid=node('div',undefined,'care-summary-grid');
  if(view.next){const n=view.next;grid.append(summaryBlock(n.time<clock&&day===today()?'ASSUNZIONE NON REGISTRATA':'PROSSIMA ASSUNZIONE',n.medicine.nome+' · '+n.time,n.medicine.dosaggio||'Consulta la terapia registrata.',button('Registra assunzione',()=>{if(typeof apriNotaAssunzione==='function')apriNotaAssunzione(n.medicine.id,n.time);},'btn btn-primary')));}
  else grid.append(summaryBlock('TERAPIE',view.planned.length?'Assunzioni registrate':'Nessuna assunzione programmata',view.planned.length?view.done+' di '+view.planned.length+' registrazioni per questa giornata.':'Aggiungi una terapia o consulta quelle già presenti.',actionLink('Apri terapie','farmaci')));
  const visit=view.visits[0];grid.append(summaryBlock('PROSSIMA VISITA',visit?visit.titolo:'La tua agenda',visit?format(visit.data)+(visit.ramo?' · '+visit.ramo:''):'Visite, controlli e attività da prenotare.',button(visit?'Prepara questa visita':'Prepara una visita',()=>openVisit(visit))));
  grid.append(summaryBlock('DA ORGANIZZARE',view.pending.length?view.pending.length+' attività da rivedere':'Agenda sotto controllo',view.pending.length?'Controlli da prenotare, senza data o con data trascorsa.':'Consulta i controlli e aggiungi i nuovi appuntamenti.',actionLink('Consulta agenda','controlli')));summaryCard.append(grid);
  const actions=node('div',undefined,'care-actions');actions.append(button('Aggiungi documento',()=>{if(typeof apriNuovoPdf==='function')apriNuovoPdf();},'btn btn-primary'),button('Prepara la visita',()=>openVisit()),actionLink('Protezione dei dati','backup'));summaryCard.append(actions);
 }
 const docPanel=el('panel-cartella'),documentSection=node('section',undefined,'card care-documents');documentSection.id='careDocuments';
 const docHead=node('div',undefined,'care-section-head'),docWords=node('div');docWords.append(node('p','IL TUO ARCHIVIO','care-kicker'),node('h2','Trova un documento'));docHead.append(docWords,button('Aggiungi documento',()=>{if(typeof apriNuovoPdf==='function')apriNuovoPdf();},'btn btn-primary'));documentSection.append(docHead);
 const filters=node('div',undefined,'care-filters'),searchLabel=node('label','Cerca per nome, specialità o note'),search=node('input');search.type='search';search.placeholder='Es. cardiologia, ecografia…';search.id='careDocumentSearch';searchLabel.append(search);
 const areaLabel=node('label','Specialità'),areaSelect=node('select');areaSelect.id='careDocumentArea';areaLabel.append(areaSelect);filters.append(searchLabel,areaLabel);documentSection.append(filters);
 const count=node('p','Caricamento documenti…','care-muted');count.setAttribute('role','status');documentSection.append(count);
 const cards=node('div',undefined,'care-document-grid');documentSection.append(cards);
 if(docPanel){const original=node('details',undefined,'care-original-sections');original.append(node('summary','Eventi clinici e gestione completa dei documenti'));for(const child of [...docPanel.children])original.append(child);docPanel.append(documentSection,original);}
 search.addEventListener('input',renderDocuments);areaSelect.addEventListener('change',renderDocuments);
 function areas(list){return [...new Set([...(root.TerapiaCategories?.areas||[]),...list.map(d=>d.area)])].sort((a,b)=>a.localeCompare(b,'it'));}
 function options(select,values,label){const previous=select.value;if(select.dataset.values===JSON.stringify(values))return;select.replaceChildren(new Option(label,''),...values.map(v=>new Option(v,v)));select.value=values.includes(previous)?previous:'';select.dataset.values=JSON.stringify(values);}
 function fileUrl(record){const f=record.file;if(f.fileKey){if(typeof demoFileUrl==='function')return demoFileUrl(f.fileKey);return '/api/files/'+encodeURIComponent(f.fileKey);}if(typeof f.data==='string'&&/^data:(application\/pdf|image\/(png|jpeg));base64,/i.test(f.data))return f.data;return '';}
 function openFile(record){const url=fileUrl(record);if(url&&typeof openDocumentUrl==='function')openDocumentUrl(url,record.name);else if(record.index>=0&&typeof selectOriginal==='function')selectOriginal(record.index);else alert('Il file non è disponibile qui. Apri l’evento originale o ripristina un backup completo.');}
 function renderDocuments(){
  const archive=read();if(!archive)return;const list=documents(archive);options(areaSelect,areas(list),'Tutte le specialità');const visible=filterDocuments(list,{query:search.value,area:areaSelect.value});count.textContent=visible.length+' documenti visualizzati su '+list.length;cards.replaceChildren();
  if(!visible.length){const empty=node('div',undefined,'care-empty');empty.append(node('h3',list.length?'Nessun documento corrisponde':'Il tuo primo documento, qui'),node('p',list.length?'Prova un altro nome o seleziona tutte le specialità.':'Aggiungi un PDF oppure una foto dalle funzioni di allegato. I documenti già presenti restano nelle sezioni originali.'));cards.append(empty);return;}
  const fragment=document.createDocumentFragment();
  for(const d of visible.slice(0,60)){const card=node('article',undefined,'care-document-card');card.append(icon('document'));const body=node('div');body.append(node('p',d.area,'care-kicker'),node('h3',d.name),node('p',(d.date?format(d.date)+' · ':'')+d.source,'care-muted'));if(d.note)body.append(node('p',d.note.slice(0,180),'care-document-note'));const actions=node('div',undefined,'care-actions');actions.append(button(fileUrl(d)?'Apri documento':'Collega originale',()=>openFile(d),'btn btn-outline btn-sm'));body.append(actions);if(root.TerapiaCategoryUI)body.append(root.TerapiaCategoryUI.control(d));card.append(body);fragment.append(card);}cards.append(fragment);
  if(visible.length>60)cards.append(node('p','Mostrati i primi 60 risultati. Restringi la ricerca per trovare gli altri.','care-muted'));
 }
 function dialog(title){
  const box=node('dialog',undefined,'care-dialog'),top=node('div',undefined,'care-section-head'),h=node('h2',title),id='care-dialog-'+Math.random().toString(36).slice(2);h.id=id;box.setAttribute('aria-labelledby',id);const close=button('Chiudi',()=>box.close());top.append(h,close);box.append(top);box.addEventListener('close',()=>box.remove());box.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();box.close();}});document.body.append(box);return box;
 }
 function openProfile(){
  const archive=read();if(!archive){alert('Attendi il caricamento dell’archivio.');return;}
  const box=dialog('Profilo e preferenze'),p=archive.paziente||{};box.append(node('p',[p.nome,p.cognome].filter(Boolean).join(' ')||'Completa il tuo profilo','care-profile-name'),node('p','Le preferenze cambiano soltanto la visualizzazione.','care-muted'));
  box.append(button('Modifica dati personali',()=>{box.close();if(typeof apriModalPaziente==='function')apriModalPaziente();},'btn btn-primary'));
  const large=node('input');large.type='checkbox';large.checked=document.body.classList.contains('care-large');const label=node('label',undefined,'care-preference');label.append(large,node('span','Caratteri grandi e comandi più leggibili'));large.addEventListener('change',()=>{document.body.classList.toggle('care-large',large.checked);try{localStorage.setItem('lukiapp-care-ui-large-v1',large.checked?'1':'0');}catch{}});box.append(label);
  box.append(node('h3','Protezione dei dati'),node('p',el('syncStatus')?.textContent||'Controlla lo stato del salvataggio nella barra dell’app.','care-status-copy'),node('p',typeof demoFileUrl==='function'?'Questa versione conserva dati e allegati nel browser. Un altro dispositivo richiede un backup completo e il relativo ripristino.':'Questa versione usa il tuo archivio privato. Prima di chiudere, controlla che il salvataggio sia completato; un backup completo è una copia separata.','care-muted'));
  box.append(button('Apri backup e ripristino',()=>{box.close();go('backup');}));
  box.append(node('h3','Le altre sezioni'));const links=node('div',undefined,'care-actions');for(const [text,tab]of [['Integratori','integratori'],['Vaccinazioni','vaccinazioni'],['Storico assunzioni','storico'],['Archivio per patologia','archivio'],['Stampe','stampa']])links.append(button(text,()=>{box.close();go(tab);}));box.append(links);box.showModal();
 }
 function renderStatus(){const text=el('syncStatus')?.textContent||'';if(!el('careSaveStatus')){const p=node('p',undefined,'care-save-status');p.id='careSaveStatus';p.setAttribute('role','status');summaryCard.append(p);}if(el('careSaveStatus'))el('careSaveStatus').textContent=text;}
 try{document.body.classList.toggle('care-large',localStorage.getItem('lukiapp-care-ui-large-v1')==='1');}catch{}
 function openVisit(visit){
  const archive=read();if(!archive){alert('Attendi il caricamento dell’archivio.');return;}
  const snapshot=structuredClone(archive),list=documents(snapshot),selected=new Set(),box=dialog('Prepara la visita');
  box.append(node('p','Crea un riepilogo e un indice dei documenti da portare. Non modifica la cartella e non unisce i PDF originali.','care-muted'));
  const fields=node('div',undefined,'care-filters');const titleLabel=node('label','Visita'),title=node('input');title.value=visit?.titolo||'Riepilogo per la visita';titleLabel.append(title);const specialtyLabel=node('label','Specialità dei documenti'),specialty=node('select');options(specialty,areas(list),'Tutte le specialità');specialty.value=areas(list).includes(visit?.ramo)?visit.ramo:'';specialtyLabel.append(specialty);fields.append(titleLabel,specialtyLabel);box.append(fields);
  const docList=node('div',undefined,'care-dossier-documents');box.append(node('h3','Scegli i documenti'),docList);
  const selectionCount=node('p','Nessun documento selezionato','care-muted');selectionCount.setAttribute('role','status');box.append(selectionCount);
  function updateSelection(){selectionCount.textContent=selected.size+' documenti selezionati';}
  function choices(){docList.replaceChildren();const visible=filterDocuments(list,{area:specialty.value});for(const d of visible){const label=node('label',undefined,'care-dossier-choice'),check=node('input');check.type='checkbox';check.checked=selected.has(d.key);check.addEventListener('change',()=>{check.checked?selected.add(d.key):selected.delete(d.key);updateSelection();});const text=node('span',d.name+(d.date?' · '+format(d.date):'')+' · '+d.area);label.append(check,text);docList.append(label);}if(!visible.length)docList.append(node('p','Nessun documento in questa specialità. Puoi comunque preparare il riepilogo delle terapie.'));}
  specialty.addEventListener('change',choices);choices();
  const notesLabel=node('label','Domande da fare al medico'),notes=node('textarea');notes.rows=4;notes.placeholder='Es. quali documenti portare al prossimo controllo?';notesLabel.append(notes);box.append(notesLabel,node('p','Le domande restano solo in questa finestra: includile nel PDF prima di chiuderla.','care-muted'));
  const actions=node('div',undefined,'care-actions');actions.append(button('Anteprima del riepilogo',()=>{
   const date=today(),p=snapshot.paziente||{},chosen=list.filter(d=>selected.has(d.key));
   const meds=array(snapshot.farmaci).filter(f=>f.stato==='attivo'&&(!f.inizio||f.inizio<=date)&&(!f.fine||f.fine>=date));
   const report={title:title.value.trim()||'Riepilogo per la visita',patient:[p.nome,p.cognome].filter(Boolean).join(' ')||'Profilo personale',date:format(date),blocks:[{kind:'text',text:'Informazioni inserite dall’utente. Verificare il piano terapeutico con il professionista. Riepilogo creato dai dati disponibili al momento dell’apertura.'},{kind:'heading',text:'Terapie attive registrate'},{kind:'table',rows:[['Farmaco','Dose','Orari / schema'],...meds.map(f=>[String(f.nome||''),String(f.dosaggio||''),[array(f.orari).join(', '),f.tipo==='ciclo'&&f.prossimoCiclo?'Prossimo ciclo: '+format(f.prossimoCiclo):'',f.note||''].filter(Boolean).join(' · ')])]},{kind:'heading',text:'Indice dei documenti selezionati'},{kind:'table',rows:[['Documento','Specialità','Data'],...chosen.map(d=>[d.name,d.area,format(d.date)||'Non indicata'])]},{kind:'text',text:'Gli originali sono separati da questo riepilogo: aprirli nella cartella per consultarli o condividerli singolarmente.'},{kind:'heading',text:'Domande per il medico'},{kind:'text',text:notes.value.trim()||'Nessuna domanda annotata.'}]};
   const preview=node('div');preview.append(node('h2',report.title),node('p',report.patient+' · '+report.date));for(const b of report.blocks){if(b.kind==='table'){const table=node('table');b.rows.forEach((row,i)=>{const tr=node('tr');row.forEach(text=>tr.append(node(i?'td':'th',text)));table.append(tr);});preview.append(table);}else preview.append(node(b.kind==='heading'?'h2':'p',b.text));}
   if(typeof showReportPreview!=='function'){alert('Anteprima non disponibile. Riprova dopo il caricamento dell’app.');return;}
   // Close the native dialog before opening the existing custom preview. The report owns a snapshot.
   box.close();
   showReportPreview(report,preview.innerHTML,()=>{
    if(typeof loadDemoReport==='function')return loadDemoReport();
    if(typeof root.loadMedicalReportEngine==='function')return root.loadMedicalReportEngine();
    throw Error('Motore PDF non disponibile in questa versione. Puoi stampare l’anteprima.');
   });
  },'btn btn-primary'));box.append(actions);box.showModal();
 }
 root.CareExperience={refresh:schedule,openVisit,openProfile};
 for(const name of ['repaint','caricaGiorno','renderDocumentiClinici','renderControlli','aggiornaBannerPaziente'])wrap(name);
 if(el('syncStatus'))new MutationObserver(()=>{renderStatus();}).observe(el('syncStatus'),{childList:true,subtree:true,characterData:true});
 if(!read())summaryCard.append(node('p','Caricamento della tua giornata…','care-muted'));
 schedule();
})(globalThis);
