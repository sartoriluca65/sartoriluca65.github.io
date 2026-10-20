/* Safari supports synchronous OPFS writes in a dedicated worker. */
'use strict';
let directory,handle,fileHandle,position=0,filename='';
self.onmessage=async({data:message})=>{
 const {id,type}=message;
 try{
  if(type==='init'){
   if(!/^terapia-backup-[a-zA-Z0-9-]+\.tmp$/.test(message.name))throw Error('Nome temporaneo non valido');
   filename=message.name;directory=await navigator.storage.getDirectory();fileHandle=await directory.getFileHandle(filename,{create:true});
   handle=await fileHandle.createSyncAccessHandle();await handle.truncate(0);position=0;
  }else if(type==='write'){
   if(!handle)throw Error('Scrittura non disponibile');const bytes=new Uint8Array(message.buffer);let offset=0;
   while(offset<bytes.length){const written=await handle.write(bytes.subarray(offset),{at:position});if(!Number.isSafeInteger(written)||written<=0||written>bytes.length-offset)throw Error('Scrittura del backup incompleta');offset+=written;position+=written;}
  }else if(type==='close'){
   if(!handle)throw Error('Scrittura non disponibile');await handle.truncate(position);await handle.flush();await handle.close();handle=null;
   const file=await fileHandle.getFile();if(file.size!==position)throw Error('Il file di backup è incompleto');self.postMessage({id,ok:true,file});return;
  }else if(type==='abort'){
   if(handle){await handle.close();handle=null;}if(directory&&filename)await directory.removeEntry(filename).catch(()=>{});
  }else throw Error('Operazione non valida');
  self.postMessage({id,ok:true});
 }catch(error){self.postMessage({id,ok:false,error:error.message||'Salvataggio non riuscito',name:error.name});}
};
