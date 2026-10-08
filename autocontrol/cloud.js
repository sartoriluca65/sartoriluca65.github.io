/* Account e archivio personale AutoControl. Nessuna chiave segreta nel browser. */
(()=>{
 const sections=['vehicles','maintenance','fuel','parts','documents','insurance','tax','revision','bodywork','deadlines','accessories','workshops'];
 const clone=value=>JSON.parse(JSON.stringify(value));
 const canonical=value=>value===undefined?undefined:Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':JSON.stringify(value);
 const empty=()=>Object.fromEntries(sections.map(key=>[key,[]]));
 function validate(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Archivio non valido.');
  const result=clone(value);
  for(const key of sections){if(result[key]===undefined)result[key]=[];if(!Array.isArray(result[key]))throw Error('Sezione non valida: '+key);const ids=new Set();for(const row of result[key]){if(!row||typeof row.id!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(row.id)||ids.has(row.id))throw Error('Identificativi mancanti o duplicati: '+key);ids.add(row.id)}}
  return result;
 }
 // Unisce registrazioni distinte; due modifiche alla stessa registrazione richiedono una scelta dell’utente.
 function merge(base,local,remote){
  const result={...remote};
  for(const key of sections){const b=new Map(base[key].map(x=>[x.id,x])),l=new Map(local[key].map(x=>[x.id,x])),r=new Map(remote[key].map(x=>[x.id,x]));result[key]=[];
   for(const id of new Set([...b.keys(),...r.keys(),...l.keys()])){const before=canonical(b.get(id)),left=canonical(l.get(id)),right=canonical(r.get(id));let row;
    if(left===before)row=r.get(id);else if(right===before||left===right)row=l.get(id);else throw Error('Conflitto nella stessa registrazione ('+key+'). Scarica una copia di sicurezza prima di ricaricare. Nessun dato online è stato sovrascritto.');
    if(row)result[key].push(row);
   }
  }return result;
 }
 function addRecords(imported,current){
  const result=clone(current),comparable=(key,row)=>{const value=clone(row);if(key==='documents'){delete value.ocrText;delete value.attachmentUnavailable;for(const file of value.files||[]){delete file.remotePath;delete file.type}}return canonical(value)};
  for(const key of sections)for(const row of imported[key]){const old=result[key].find(x=>x.id===row.id);if(!old)result[key].push(row);else if(comparable(key,old)!==comparable(key,row))throw Error('La copia contiene una versione diversa della stessa registrazione ('+key+'). I dati attuali sono stati mantenuti.');}
  return result;
 }
 let client=null,user=null,base=empty(),revision=0,dirty=false,busy=false,loading=false,connected=false,sequence=0,epoch=0,timer=null,guestKey='autocontrol-v1';
 const panel=document.createElement('section');panel.className='card';panel.style.marginBottom='22px';panel.id='cloudPanel';
 panel.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><strong>Il tuo archivio personale</strong><button class="btn" type="button" id="accountToggle">Accedi / registrati</button></div><p id="cloudStatus" role="status" aria-live="polite">Archivio locale: i dati non sono ancora protetti online.</p><div id="accountFormBox" hidden><form id="accountForm"><div class="form"><div class="field"><label for="accountEmail">Email</label><input id="accountEmail" type="email" autocomplete="username" required></div><div class="field"><label for="accountPassword">Password</label><input id="accountPassword" type="password" autocomplete="current-password" minlength="8" required></div></div><div class="toolbar" style="flex-wrap:wrap;margin:12px 0"><button type="submit" class="btn primary">Accedi</button><button type="button" class="btn" id="accountSignup">Crea account</button><button type="button" class="btn" id="accountForgot">Password dimenticata</button></div></form><form id="accountReset" hidden><div class="field"><label for="accountNewPassword">Nuova password</label><input id="accountNewPassword" type="password" autocomplete="new-password" minlength="8" required></div><button class="btn primary" style="margin-top:10px">Salva nuova password</button></form></div><div class="toolbar" style="gap:8px;flex-wrap:wrap"><button class="btn" id="cloudRetry" type="button" hidden>Sincronizza</button><button class="btn" id="cloudImportLocal" type="button" hidden>Trasferisci i dati di questo browser</button><button class="btn" id="cloudLogout" type="button" hidden>Esci</button><button class="btn" id="archiveExport" type="button">Scarica copia completa</button><button class="btn" id="archiveImport" type="button">Importa copia</button><input id="archiveBackupFile" type="file" accept=".zip,application/zip" hidden></div><p class="sub" style="font-size:11px;margin-bottom:0">Accedi con lo stesso account da altri browser. Prima di cancellare i dati del sito, attendi «Tutto salvato online». La copia scaricata contiene anche i documenti.</p>`;
 document.querySelector('.main .top').after(panel);
 const $=id=>panel.querySelector('#'+id),status=message=>{$('cloudStatus').textContent=message};
 const message=error=>{
  const codes={invalid_credentials:'Email o password non corrette.',email_not_confirmed:'Conferma prima l’email tramite il link ricevuto.',email_address_not_authorized:'Il servizio email del progetto non può inviare a questo indirizzo. Occorre configurare SMTP per gli utenti esterni.',over_email_send_rate_limit:'Limite invio email raggiunto. Attendi e riprova.',weak_password:'Scegli una password più robusta.'};
  if(error?.code==='PGRST205'||error?.code==='PGRST202'||error?.code==='42P01')return 'Archivio online non ancora attivato nel progetto. Occorre eseguire archivio-online.sql in Supabase.';
  return codes[error?.code]||error?.message||'Operazione non riuscita. Riprova.';
 };
 const key=()=>user?'autocontrol-account-'+user.id:guestKey;
 function localPending(){try{const raw=localStorage.getItem('autocontrol-v1');if(!raw)return false;const local=validate(JSON.parse(raw));if(!sections.some(k=>local[k].length))return false;if(user&&localStorage.getItem('autocontrol-migrated-'+user.id)===canonical(local))return false;return canonical(addRecords(local,window.acArchive.get()))!==canonical(window.acArchive.get())}catch(e){return true}}
 function savedStatus(){const missing=window.acArchive.get().documents.filter(d=>d.attachmentUnavailable).length;if(missing)return 'Dati salvati online; '+missing+' documenti precedenti non hanno il file originale. Ricollegali dalla sezione Documenti.';if(localPending())return 'Archivio online caricato. I dati precedenti di questo browser devono ancora essere trasferiti: premi «Trasferisci i dati di questo browser» prima di cancellare i dati del sito.';return 'Tutto salvato online · '+user.email+' · '+new Date().toLocaleTimeString('it-IT')}

 function cache(){try{localStorage.setItem(key(),JSON.stringify(window.acArchive.get()))}catch(error){status('Spazio locale insufficiente: attendi la conferma del salvataggio online prima di chiudere.')}}
 function controls(){for(const id of ['cloudRetry','cloudLogout'])$(id).hidden=!user;$('cloudImportLocal').hidden=!user||!connected;$('accountToggle').textContent=user?user.email:'Accedi / registrati';}
 async function remote(){const {data,error}=await client.from('ac_archives').select('payload,revision,updated_at').eq('user_id',user.id).maybeSingle();if(error)throw error;return data?{payload:validate(data.payload),revision:Number(data.revision)}:{payload:empty(),revision:0}}
 async function connect(session){
  if(loading)return;if(user?.id===session?.user?.id&&connected)return;
  if(dirty&&user?.id!==session?.user?.id)throw Error('Ci sono dati da sincronizzare. Salvali prima di cambiare account.');
  if(dirty)preserveDraft();
  loading=true;const turn=++epoch;const previousUser=user,previous=clone(window.acArchive.get());
  try{
   status('Caricamento dell’archivio personale…');user=session.user;controls();
   const data=await remote();if(turn!==epoch)return;
   base=clone(data.payload);revision=data.revision;window.acArchive.replace(data.payload);connected=true;dirty=false;
   // Recupera modifiche offline di questo stesso account senza toccare l’archivio locale precedente.
   const draft=localStorage.getItem('autocontrol-draft-'+user.id);
   if(draft){const saved=JSON.parse(draft);const combined=merge(validate(saved.base),validate(saved.payload),base);window.acArchive.replace(combined);dirty=true;sequence++}
   cache();controls();$('accountFormBox').hidden=true;status(dirty?'Modifiche locali recuperate. Invio online in corso…':savedStatus());if(dirty)setTimeout(flush,0);
  }catch(error){user=previousUser;connected=false;window.acArchive.replace(previous);controls();status(message(error));throw error}
  finally{loading=false}
 }
 function preserveDraft(){if(!user)return;try{localStorage.setItem('autocontrol-draft-'+user.id,JSON.stringify({base,payload:window.acArchive.get()}))}catch(error){status('Modifiche non ancora protette: spazio locale esaurito. Mantieni aperta la pagina e scarica una copia.')}}
 function changed(){
  if(!user){status('Salvato solo in questo browser. Accedi e trasferisci i dati per proteggerli online.');return}
  dirty=true;sequence++;preserveDraft();status('Modifiche da salvare online…');clearTimeout(timer);timer=setTimeout(flush,300);
 }
 async function localFile(id){return window.acArchive.localFile(id)}
 async function uploadFiles(payload,currentUser){
  for(const doc of payload.documents){
   if(!doc.files?.length){doc.attachmentUnavailable=true;continue}
   for(const file of doc.files||[]){
    if(file.remotePath){if(!file.remotePath.startsWith(currentUser.id+'/'))throw Error('Allegato appartenente a un altro account. Importa una copia completa per trasferirlo.');continue}
    const row=await localFile(file.id);if(!row?.blob)throw Error('Manca il file originale «'+(file.name||doc.name)+'». Non posso dichiarare completo il salvataggio online.');
    if(row.blob.size>52428800)throw Error('Documento oltre 50 MB: '+file.name);
    const path=currentUser.id+'/documents/'+crypto.randomUUID();
    const {error}=await client.storage.from('autocontrol-private').upload(path,row.blob,{contentType:row.type||row.blob.type||'application/octet-stream',upsert:false});if(error)throw error;
    file.remotePath=path;if(row.ocrText&&!doc.ocrText)doc.ocrText=row.ocrText;
   }
  }
 }
 async function flush(){
  if(!user||!connected||!dirty||busy||loading)return;busy=true;const current=user,turn=epoch;
  try{
   while(dirty&&turn===epoch){
    const version=sequence,snapshot=validate(window.acArchive.get());status('Salvataggio online di dati e documenti…');await uploadFiles(snapshot,current);
    let candidate=snapshot,expected=revision;
    for(let attempt=0;attempt<3;attempt++){
     const {data,error}=await client.rpc('ac_save_archive',{p_payload:candidate,p_revision:expected,p_user_id:current.id});
     if(!error){revision=Number(data.revision);base=clone(candidate);break}
     if(error.code!=='40001'&&!error.message?.includes('AC_CONFLICT'))throw error;
     if(attempt===2)throw Error('Archivio aggiornato da un altro dispositivo. Ripeti la sincronizzazione.');
     const latest=await remote();candidate=merge(base,candidate,latest.payload);expected=latest.revision;
    }
    if(turn!==epoch)return;
    // Riporta i riferimenti dei file caricati senza perdere modifiche avvenute durante l’invio.
    if(version===sequence){window.acArchive.replace(candidate);dirty=false;localStorage.removeItem('autocontrol-draft-'+current.id)}
    else{const live=clone(window.acArchive.get());for(const doc of live.documents){const uploaded=candidate.documents.find(d=>d.id===doc.id);if(uploaded){if(uploaded.ocrText)doc.ocrText=uploaded.ocrText;for(const f of doc.files||[]){const remoteFile=uploaded.files?.find(x=>x.id===f.id);if(remoteFile?.remotePath)f.remotePath=remoteFile.remotePath}}}window.acArchive.replace(merge(snapshot,live,candidate));preserveDraft()}
    cache();
   }
   status(savedStatus());
  }catch(error){dirty=true;preserveDraft();status('NON ancora salvato online: '+message(error)+' Mantieni aperta la pagina o scarica una copia completa.')}
  finally{busy=false;controls()}
 }
 async function cloudFile(id){
  const doc=window.acArchive.get().documents.find(d=>d.files?.some(f=>f.id===id)),file=doc?.files?.find(f=>f.id===id);
  if(!user||!file?.remotePath)return null;if(!file.remotePath.startsWith(user.id+'/'))throw Error('Documento non autorizzato.');
  const {data,error}=await client.storage.from('autocontrol-private').download(file.remotePath);if(error)throw error;
  return {id,name:file.name,type:data.type,blob:data,ocrText:doc.ocrText||''};
 }
 $('accountToggle').onclick=()=>{$('accountFormBox').hidden=!$('accountFormBox').hidden};
 async function authenticate(signup){
  if(user&&connected)throw Error('Esci dall’account attuale prima di accedere con un altro account.');if(user&&(signup||$('accountEmail').value.trim().toLowerCase()!==user.email.toLowerCase()))throw Error('Accedi di nuovo con lo stesso account per recuperare le modifiche non inviate.');if(loading)throw Error('Accesso già in corso.');if(!client)throw Error('Servizio di accesso in caricamento o non disponibile.');const form=$('accountForm');if(!form.reportValidity())return;
  const email=$('accountEmail').value.trim(),password=$('accountPassword').value;status(signup?'Creazione account…':'Accesso…');
  const result=signup?await client.auth.signUp({email,password,options:{emailRedirectTo:'https://sartoriluca65.github.io/autocontrol/'}}):await client.auth.signInWithPassword({email,password});
  if(result.error)throw result.error;$('accountPassword').value='';if(result.data.session)await connect(result.data.session);else status('Account richiesto: verifica l’email e conferma il link. Se non arriva, il servizio email del progetto va configurato.');
 }
 $('accountForm').onsubmit=e=>{e.preventDefault();authenticate(false).catch(e=>status(message(e)))};
 $('accountSignup').onclick=()=>authenticate(true).catch(e=>status(message(e)));
 $('accountForgot').onclick=async()=>{try{if(!client)throw Error('Servizio non disponibile.');const email=$('accountEmail').value.trim();if(!$('accountEmail').reportValidity()||!email)return;const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:'https://sartoriluca65.github.io/autocontrol/'});if(error)throw error;status('Richiesta inviata. Se l’account esiste, riceverai un link. Controlla anche lo spam.')}catch(e){status(message(e))}};
 $('accountReset').onsubmit=async e=>{e.preventDefault();try{const {error}=await client.auth.updateUser({password:$('accountNewPassword').value});if(error)throw error;$('accountNewPassword').value='';$('accountReset').hidden=true;$('accountForm').hidden=false;status('Password aggiornata.');const {data}=await client.auth.getSession();if(data.session)await connect(data.session)}catch(e){status(message(e))}};
 $('cloudRetry').onclick=async()=>{if(busy||loading)return;try{if(!connected){const {data}=await client.auth.getSession();if(data.session)await connect(data.session)}else if(dirty)await flush();else{loading=true;try{const data=await remote();base=clone(data.payload);revision=data.revision;window.acArchive.replace(data.payload);cache();status(savedStatus())}finally{loading=false}}}catch(e){status(message(e))}};
 $('cloudLogout').onclick=async()=>{
  if(busy||loading||dirty){status('Attendi il salvataggio online o scarica una copia delle modifiche prima di uscire.');return}
  try{const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;++epoch;user=null;connected=false;guestKey='autocontrol-guest-v2';base=empty();revision=0;window.acArchive.replace(empty());controls();status('Disconnesso. Il tuo archivio rimane online e sarà disponibile al prossimo accesso.')}catch(e){status(message(e))}
 };
 $('cloudImportLocal').onclick=async()=>{
  if(busy||loading)return;try{const raw=localStorage.getItem('autocontrol-v1');if(!raw)throw Error('Nessun archivio locale precedente da trasferire.');const local=validate(JSON.parse(raw));
   if(!confirm('Trasferire i dati di questo browser nell’account '+user.email+'? Verifica che appartengano a te. I dati già online saranno mantenuti.'))return;
   const combined=addRecords(local,window.acArchive.get());window.acArchive.replace(combined);cache();changed();await flush();if(!dirty){localStorage.setItem('autocontrol-migrated-'+user.id,canonical(local));status(savedStatus())}
  }catch(e){status(message(e))}
 };
 let zipPromise;
 async function zipLibrary(){if(window.JSZip)return window.JSZip;if(!zipPromise)zipPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';script.onload=()=>resolve(window.JSZip);script.onerror=()=>{zipPromise=null;reject(Error('Impossibile caricare il generatore della copia. Controlla la connessione.'))};document.head.append(script)});return zipPromise}
 $('archiveExport').onclick=async()=>{
  if(busy||loading){status('Attendi il completamento dell’operazione in corso.');return}const button=$('archiveExport');button.disabled=true;
  try{const Zip=await zipLibrary(),zip=new Zip(),payload=clone(window.acArchive.get());status('Preparazione copia completa con documenti…');
   for(const doc of payload.documents){if(doc.attachmentUnavailable||!doc.files?.length)throw Error('Il file originale di «'+doc.name+'» non è presente. Ricollegalo dalla sezione Documenti prima di creare una copia completa.');for(const file of doc.files||[]){const row=await localFile(file.id)||await cloudFile(file.id);if(!row?.blob)throw Error('Copia incompleta: file non disponibile «'+file.name+'».');zip.file('files/'+file.id,new Uint8Array(await row.blob.arrayBuffer()));file.type=row.type||row.blob.type;if(row.ocrText&&!doc.ocrText)doc.ocrText=row.ocrText;delete file.remotePath}}
   zip.file('archive.json',JSON.stringify({format:'autocontrol-backup',version:1,createdAt:new Date().toISOString(),payload},null,2));const blob=await zip.generateAsync({type:'blob'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AutoControl-copia-'+new Date().toISOString().slice(0,10)+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status('Copia completa scaricata. Conservala fuori dal browser.');
  }catch(e){status(message(e))}finally{button.disabled=false}
 };
 $('archiveImport').onclick=()=>{if(busy||loading)return;$('archiveBackupFile').click()};
 $('archiveBackupFile').onchange=async e=>{
  const file=e.target.files[0];e.target.value='';if(!file||loading||busy)return;loading=true;
  try{const Zip=await zipLibrary(),zip=await Zip.loadAsync(await file.arrayBuffer());const manifest=JSON.parse(await zip.file('archive.json')?.async('string'));if(manifest.format!=='autocontrol-backup'||manifest.version!==1)throw Error('Copia non riconosciuta.');const imported=validate(manifest.payload),combined=addRecords(imported,window.acArchive.get());
   if(!confirm('Importare questa copia aggiungendo le registrazioni mancanti? I dati esistenti saranno mantenuti.'))return;
   for(const doc of imported.documents)for(const entry of doc.files||[]){if(!/^[A-Za-z0-9_-]{1,160}$/.test(entry.id))throw Error('Identificativo allegato non valido.');const data=zip.file('files/'+entry.id);if(!data)throw Error('Manca un documento nella copia.');if(await localFile(entry.id))continue;const blob=new Blob([await data.async('uint8array')],{type:entry.type||'application/octet-stream'});await window.acArchive.putLocalFile({id:entry.id,name:entry.name,type:blob.type,blob,ocrText:doc.ocrText||''})}
   const previous=clone(window.acArchive.get());window.acArchive.replace(combined);if(!window.acArchive.persist()){window.acArchive.replace(previous);throw Error('Copia non importata: salvataggio locale non riuscito.')}status(user?'Copia importata: sincronizzazione in corso.':'Copia importata nel browser. Accedi per salvarla online.');
  }catch(e){status(message(e))}finally{loading=false;if(dirty)setTimeout(flush,0)}
 };
 window.autoCloud={changed,key,cloudFile,locked:()=>loading,flush,get dirty(){return dirty},get online(){return connected}};
 window.addEventListener('online',()=>{if(dirty)flush()});
 window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue=''}});
 async function init(){
  try{
   const config=window.LS_ANALYTICS_CONFIG;if(!config?.publicKey?.startsWith('sb_publishable_'))throw Error('Configurazione di accesso non disponibile.');
   if(!window.supabase)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.102.0/dist/umd/supabase.js';script.onload=resolve;script.onerror=()=>reject(Error('Impossibile caricare il servizio account.'));document.head.append(script)});
   client=window.supabase.createClient(config.url,config.publicKey,{auth:{storageKey:'autocontrol-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   client.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'){$('accountFormBox').hidden=false;$('accountForm').hidden=true;$('accountReset').hidden=false;status('Scegli una nuova password per il tuo account.');return}
    if(event==='SIGNED_OUT'){connected=false;if(!dirty&&!busy){user=null;guestKey='autocontrol-guest-v2';window.acArchive.replace(empty());controls()}status('Sessione terminata. Accedi nuovamente; le modifiche non inviate restano nella copia locale.')}
    if(event==='SIGNED_IN'&&user&&session?.user?.id!==user.id){connected=false;status('Account cambiato in un’altra scheda. Scarica una copia delle modifiche e ricarica la pagina prima di proseguire.')}
   });
   const {data,error}=await client.auth.getSession();if(error)throw error;if(data.session&&!$('accountReset').hidden)return;if(data.session)await connect(data.session);
  }catch(e){status(message(e))}
 }
 init();
})();
