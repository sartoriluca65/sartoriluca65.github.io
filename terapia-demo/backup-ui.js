/* Backup transfer UI: visible stages, bounded-memory saving and explicit destination choice. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id),mb=n=>(Math.max(0,n||0)/1024/1024).toFixed(1)+' MB';
 let active=null;
 function show(panel){document.body.append(panel);if(typeof panel.showModal==='function')panel.showModal();else panel.setAttribute('open','');}
 function remove(panel){if(typeof panel.close==='function')panel.close();panel.remove();}
 function panel(title){const p=document.createElement('dialog');p.className='backup-work no-print';p.setAttribute('aria-label',title);return p;}
 function beginBackupTransfer(target){
  const p=panel('Avanzamento del backup');p.id='backupTransfer';p.innerHTML='<div class="backup-work-heading"><span class="backup-spinner" aria-hidden="true"></span><strong>Backup in corso</strong></div><p class="backup-work-stage" role="status" aria-live="polite">Preparazione del salvataggio…</p><progress aria-label="Avanzamento del backup"></progress><p class="backup-work-detail">Preparazione dei dati e degli allegati</p><div class="backup-work-metrics"><span class="backup-work-bytes">0.0 MB elaborati</span><span class="backup-work-time">00:00</span></div><p class="backup-work-hint">Mantieni l’app aperta fino al termine della verifica.</p><button type="button" class="btn btn-outline">Annulla backup</button>';
  const stage=p.querySelector('.backup-work-stage'),detail=p.querySelector('.backup-work-detail'),bar=p.querySelector('progress'),bytes=p.querySelector('.backup-work-bytes'),elapsed=p.querySelector('.backup-work-time'),button=p.querySelector('button');let stopped=false,cancelled=false;
  const status=text=>{stage.textContent=text;};
  function cancel(){if(cancelled)return;cancelled=true;const sink=typeof target==='function'?target():target;if(sink){sink.cancelled=true;sink.controller?.abort();}button.disabled=true;status('Annullamento in corso…');}
  button.onclick=cancel;p.addEventListener('cancel',e=>{e.preventDefault();cancel();});show(p);
  const started=Date.now(),timer=setInterval(()=>{const seconds=Math.floor((Date.now()-started)/1000);elapsed.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');},1000);
  const stop=()=>{if(stopped)return;stopped=true;clearInterval(timer);if(active?.panel===p)active=null;remove(p);};
  stop.update=info=>{if(stopped||cancelled)return;const verify=info.phase==='verify';bar.removeAttribute('value');if(verify&&info.size>0){const percent=Math.min(99,Math.floor(info.total/info.size*100));bar.max=100;bar.value=percent;bar.setAttribute('aria-valuetext',percent+'% verificato');}else bar.setAttribute('aria-valuetext','Elaborazione degli allegati in corso');status(verify?'Verifica dell’integrità del backup':'Creazione del backup');detail.textContent=info.count?'Allegato '+info.index+' di '+info.count+' · '+info.name:'Salvataggio dei dati della cartella';bytes.textContent=mb(info.total)+(verify?' verificati':' elaborati')+(verify&&info.size>0?' · '+Math.min(99,Math.floor(info.total/info.size*100))+'%':'');};
  active={panel:p,status};return stop;
 }
 function offerBackupDownload(file,name,cleanup){
  const old=$('backupReady');if(old)old.remove();const p=panel('Scegli dove salvare il backup');p.id='backupReady';p.innerHTML='<div class="backup-work-heading"><span class="backup-complete" aria-hidden="true">✓</span><strong>Backup pronto e verificato</strong></div><p class="backup-work-filename"></p><p class="backup-save-hint"></p><p class="backup-save-status" role="status" aria-live="polite">Il file deve ancora essere salvato nella destinazione scelta.</p><div class="backup-save-actions"><button type="button" class="btn btn-primary">Scegli dove salvare</button><button type="button" class="btn btn-outline">Scarica file</button><button type="button" class="btn btn-outline">Chiudi</button></div>';
  const buttons=p.querySelectorAll('button'),hint=p.querySelector('.backup-save-hint'),status=p.querySelector('.backup-save-status');let busy=false,handedOff=false;
  p.querySelector('.backup-work-filename').textContent=name+' · '+mb(file.size);
  const output=new File([file],name,{type:'application/octet-stream'});
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),mac=!ios&&/Mac/.test(navigator.platform||navigator.userAgent||''),safari=mac&&/Safari/.test(navigator.userAgent||'')&&!/Chrome|Chromium|Edg/.test(navigator.userAgent||'');
  let shareable=false;try{shareable=!!((ios||/Android/.test(navigator.userAgent||''))&&navigator.share&&navigator.canShare?.({files:[output]}));}catch{}
  if(typeof root.showSaveFilePicker==='function')hint.textContent='Scegli Documenti o un’altra cartella nella finestra di salvataggio.';
  else if(shareable)hint.textContent='Premi “Scegli dove salvare”, poi “Salva su File”. Seleziona Documenti, iCloud Drive, Sul mio iPhone o un’altra posizione disponibile e conferma Salva.';
  else if(safari){hint.textContent='Per scegliere una cartella creata da te: Safari → Impostazioni → Generali → Posizione download file → Chiedi per ogni download. Poi premi “Salva backup sul Mac” e scegli Documenti o la tua cartella. Puoi anche impostare la tua cartella come destinazione predefinita in Safari. Se non cambi l’impostazione, il backup va nella cartella download già configurata.';buttons[0].hidden=true;buttons[1].textContent='Salva backup sul Mac';buttons[1].className='btn btn-primary';}
  else{hint.textContent='Questo browser usa il download. Se chiede una destinazione, scegli Documenti o un’altra cartella; altrimenti cerca il file in Download. Per scegliere una cartella puoi aprire l’app nel browser del dispositivo.';buttons[0].hidden=true;buttons[1].className='btn btn-primary';}
  const update=text=>{status.textContent=text;backupStatus(text);};
  function lock(on){busy=on;for(const b of buttons)b.disabled=on;}
  buttons[0].onclick=async()=>{
   if(busy)return;lock(true);let writer;
   try{
    if(typeof root.showSaveFilePicker==='function'){
     // Must be the first asynchronous operation in this click: retain user activation.
     const handle=await root.showSaveFilePicker({id:'terapia-backup',startIn:'documents',suggestedName:name,types:[{description:'Backup Terapia completo',accept:{'application/octet-stream':['.tlbackup']}}]});
     writer=await handle.createWritable();let written=0;for(let offset=0;offset<file.size;offset+=1024*1024){const value=new Uint8Array(await file.slice(offset,offset+1024*1024).arrayBuffer());await writer.write(value);written+=value.length;update('Salvataggio nella cartella scelta · '+Math.floor(written/file.size*100)+'% · '+mb(written));}
     await writer.close();writer=null;handedOff=true;update('Backup salvato nella cartella scelta: '+name+'.');
    }else if(shareable){await navigator.share({files:[output],title:'Backup completo Terapia'});handedOff=true;update('File consegnato al sistema. Controlla che sia presente nella cartella scelta in File.');}
   }catch(e){if(writer)await writer.abort().catch(()=>{});update(e.name==='AbortError'?'Salvataggio annullato. Il backup resta pronto: scegli nuovamente dove salvarlo.':'Salvataggio non riuscito: '+e.message+'. Il backup resta pronto; riprova oppure usa “Scarica file”.');}
   finally{lock(false);}
  };
  buttons[1].onclick=()=>{if(busy)return;saveDownload(output,name);handedOff=true;update('Download avviato. Controlla la destinazione indicata dal browser, oppure la cartella Download.');};
  function dismiss(){if(busy)return;if(!handedOff&&!confirm('Il backup non è ancora stato salvato. Chiudere e scartare questa copia temporanea?'))return;remove(p);setTimeout(()=>Promise.resolve(cleanup?.()).catch(()=>{}),120000);}
  buttons[2].onclick=dismiss;p.addEventListener('cancel',e=>{e.preventDefault();dismiss();});show(p);
 }
 root.TerapiaBackupUI={status:text=>active?.status(text)};Object.assign(root,{beginBackupTransfer,offerBackupDownload});
})(globalThis);
