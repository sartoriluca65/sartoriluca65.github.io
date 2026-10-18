/* PDF engine is compressed in local parts to keep repository uploads small. */
(()=>{const base=new URL('.',document.currentScript.src);globalThis.DemoReportReady=(async()=>{
 const names=["assets/report-00.gzpart", "assets/report-01.gzpart", "assets/report-02.gzpart", "assets/report-03.gzpart", "assets/report-04.gzpart", "assets/report-05.gzpart"];
 const chunks=await Promise.all(names.map(async name=>{const r=await fetch(new URL(name,base));if(!r.ok)throw Error('Modulo PDF non disponibile');return new Uint8Array(await r.arrayBuffer());}));
 const packed=new Uint8Array(chunks.reduce((n,b)=>n+b.length,0));let offset=0;for(const part of chunks){packed.set(part,offset);offset+=part.length;}
 const bytes=fflate.gunzipSync(packed),url=URL.createObjectURL(new Blob([bytes],{type:'text/javascript'}));
 try{await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=url;script.onload=resolve;script.onerror=()=>reject(Error('Modulo PDF non avviato'));document.head.append(script);});}finally{URL.revokeObjectURL(url);}
 return globalThis.DemoReport;
})();globalThis.DemoReportReady.catch(()=>{});})();
