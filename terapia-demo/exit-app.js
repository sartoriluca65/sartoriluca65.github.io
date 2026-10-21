/* Leave the running app only after local persistence has completed. */
(function(root){
 'use strict';let exiting=false;
 function controlDraft(){
  const field=id=>document.getElementById(id)?.value||'';
  return !!(field('cId')||['cData','cOra','cTitolo','cNote','cMedico','cStruttura','cReminder','cTipoVisita'].some(id=>field(id))||(root.MedicalDocs?.draft('c')||[]).length);
 }
 async function bounded(promise,ms=15000){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Il salvataggio sta impiegando più tempo del previsto. Attendi la conferma e riprova.')),ms);})]);}finally{clearTimeout(timer);}}
 async function exitMedicalApp(){
  if(exiting)return;
  if((typeof uploadsPending!=='undefined'&&uploadsPending)||(typeof backupBusy!=='undefined'&&backupBusy)){alert('Attendi il termine del caricamento o del backup, oppure annulla l’operazione prima di uscire.');return;}
  if(controlDraft()&&!confirm('La visita in compilazione non è stata salvata. Uscire scartando la bozza?'))return;
  const button=document.getElementById('appExitButton'),locks=[document.querySelector?.('.container'),document.getElementById('syncBar')].filter(Boolean).map(el=>[el,el.inert]);exiting=true;for(const [el] of locks)el.inert=true;if(button){button.disabled=true;button.textContent='Salvataggio…';}
  try{
   if(typeof syncReady==='undefined'||!syncReady)throw Error('L’archivio non è ancora pronto. Attendi il caricamento e riprova.');
   if(typeof cacheMode!=='undefined'&&cacheMode==='session')throw Error('Il browser conserva i dati solo per questa sessione. Salva un backup completo prima di uscire.');
   await bounded(cacheWrite());
   await bounded((async()=>{const start=Date.now();while(typeof syncBusy!=='undefined'&&syncBusy){if(Date.now()-start>12000)throw Error('Sincronizzazione in corso: attendi e riprova.');await new Promise(resolve=>setTimeout(resolve,200));}await syncNow();})());
   await bounded(cacheWrite());
   if(typeof syncDirty!=='undefined'&&syncDirty&&!confirm('Le modifiche sono salvate su questo dispositivo, ma la sincronizzazione non è ancora completata. Uscire comunque?'))return;
   root.terapiaExiting=true;
   // Navigation destroys app timers, document state and event handlers. iPhone
   // users receive the Home gesture without an ineffective close-window button.
   location.replace(new URL('uscita.html?v=20261021-exit',location.href).href);
  }catch(error){alert('Uscita non completata: '+error.message);}
  finally{if(!root.terapiaExiting){exiting=false;for(const [el,inert] of locks)el.inert=inert;if(button){button.disabled=false;button.textContent='Esci dall’app';}}}
 }
 root.exitMedicalApp=exitMedicalApp;
})(globalThis);
