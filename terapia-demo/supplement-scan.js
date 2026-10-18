(function(root){
 let loading;
 function loadTesseract(){if(root.Tesseract)return Promise.resolve();return loading??=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';s.onload=resolve;s.onerror=()=>{loading=null;reject(Error('Lettura foto non disponibile. Controlla la connessione e riprova.'));};document.head.append(s);});}
 root.readSupplementDocument=async function(file,progress=()=>{}){
  let worker,documentPdf;
  async function recognize(image){if(!worker){await loadTesseract();const base=new URL('.',location.href).href.replace(/\/$/,'');worker=await root.Tesseract.createWorker('ita',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',langPath:'https://cdn.jsdelivr.net/npm/@tesseract.js-data/ita@1.0.0/4.0.0',workerBlobURL:true,logger:m=>{if(m.status==='recognizing text')progress('Lettura testo '+Math.round((m.progress||0)*100)+'%');}});}const r=await worker.recognize(image);return r.data.text;}
  try{
   if(file.size>20*1024*1024)throw Error('File oltre 20 MB');
   if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){
    progress('Apertura PDF…');const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
    documentPdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true}).promise;
    let text='';const count=Math.min(documentPdf.numPages,5);
    for(let n=1;n<=count;n++){
     progress(`Lettura pagina ${n} di ${count}…`);const page=await documentPdf.getPage(n),content=await page.getTextContent();let pageText='';for(const item of content.items){pageText+=item.str+(item.hasEOL?'\n':' ');}
     if(pageText.trim().length<25){const viewport=page.getViewport({scale:1.7}),canvas=document.createElement('canvas');canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;pageText=await recognize(canvas);canvas.width=canvas.height=0;}
     text+=pageText+'\n\n';page.cleanup();
    }
    return {text,pages:count,totalPages:documentPdf.numPages};
   }
   if(!file.type.startsWith('image/'))throw Error('Seleziona una foto JPG/PNG o un PDF');
   const url=URL.createObjectURL(file);try{
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Foto non leggibile: usa JPG o PNG'));i.src=url;});
    const scale=Math.min(1,2200/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    const text=await recognize(canvas);canvas.width=canvas.height=0;return {text,pages:1,totalPages:1};
   }finally{URL.revokeObjectURL(url);}
  }finally{if(worker)await worker.terminate();if(documentPdf)await documentPdf.destroy();}
 };
})(globalThis);
// iPhone photos may arrive as HEIC: keep a JPEG copy readable on all devices.
globalThis.prepareSupplementFile=async function(file){
 if(file.type==='application/pdf'||/\.pdf$/i.test(file.name))return file;
 if(/\.jpe?g$/i.test(file.name)||file.type==='image/jpeg')return file.type==='image/jpeg'?file:new File([file],file.name,{type:'image/jpeg'});
 if(/\.png$/i.test(file.name)||file.type==='image/png')return file.type==='image/png'?file:new File([file],file.name,{type:'image/png'});
 if(!file.type.startsWith('image/'))throw Error('Usa una foto o un PDF');
 const url=URL.createObjectURL(file);try{const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Questa foto non è leggibile dal browser: esportala come JPG o PNG'));img.src=url;});const scale=Math.min(1,3000/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));canvas.width=canvas.height=0;if(!blob)throw Error('Conversione foto non riuscita');return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'});}finally{URL.revokeObjectURL(url);}
};
