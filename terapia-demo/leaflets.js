/* Bugiardini caricati dall’utente: nessuna associazione automatica. */
(function(root){
  let busy=false;
  function medicine(id){return (data.farmaci||[]).find(f=>f.id===id);}
  function select(id){
    if(busy||backupBusy||uploadsPending){alert('Attendi il termine del caricamento o del backup.');return;}
    const f=medicine(id);if(!f)return;
    const input=document.createElement('input');input.type='file';input.accept='application/pdf,.pdf';
    input.setAttribute('aria-label','Carica bugiardino PDF per '+f.nome);
    input.addEventListener('change',()=>{const file=input.files?.[0];input.remove();if(file)caricaBugiardino(id,file);},{once:true});
    input.addEventListener('cancel',()=>input.remove(),{once:true});input.hidden=true;document.body.append(input);input.click();
  }
  async function upload(id,file){
    if(busy||backupBusy||uploadsPending)return;
    const f=medicine(id);if(!f)return;
    busy=true;uploadsPending++;
    try{
      if(!file.size||file.size>1024*1024*1024)throw Error('Scegli un PDF non vuoto, fino a 1 GB.');
      if(await file.slice(0,5).text()!=='%PDF-')throw Error('Il file non è un PDF valido.');
      if(!confirm('Associa “'+file.name+'” a '+f.nome+'? Verifica che nome, dosaggio e formulazione del medicinale corrispondano.'+(f.bugiardino?.fileKey?' Il collegamento precedente sarà sostituito.':'')))return;
      const a=await uploadFile(file),current=medicine(id);
      if(!current)throw Error('Farmaco non più presente. Ricaricalo nella scheda corretta.');
      current.bugiardino={fileKey:a.fileKey,nome:file.name.slice(0,220),tipo:'application/pdf',size:a.size||file.size};
      salvaDati();renderFarmaci();caricaGiorno();mostraToast('Bugiardino associato al farmaco');
    }catch(e){alert(e.message);}finally{busy=false;uploadsPending--;syncNow();}
  }
  function open(id){
    const f=medicine(id);if(!f)return;
    if(!f.bugiardino?.fileKey){select(id);return;}
    const url=typeof demoFileUrl==='function'?demoFileUrl(f.bugiardino.fileKey):'/api/files/'+encodeURIComponent(f.bugiardino.fileKey);
    if(!url){alert('PDF non disponibile su questo dispositivo. Ripristina un backup completo oppure caricalo nuovamente.');return;}
    openDocumentUrl(url,f.bugiardino.nome||'Bugiardino.pdf');
  }
  function detach(id){
    if(busy||backupBusy||uploadsPending){alert('Attendi il termine del caricamento o del backup.');return;}
    const f=medicine(id);if(!f?.bugiardino)return;
    if(!confirm('Scollegare il bugiardino da '+f.nome+'? Il farmaco resta invariato. Le copie esportate nei backup non vengono modificate.'))return;
    delete f.bugiardino;salvaDati();renderFarmaci();caricaGiorno();mostraToast('Bugiardino scollegato');
  }
  Object.assign(root,{apriBugiardino:open,selezionaBugiardino:select,caricaBugiardino:upload,scollegaBugiardino:detach});
})(globalThis);
