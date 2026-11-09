export const MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
const reply = (body, status = 200) => Response.json(body, {status, headers: {'Cache-Control': 'no-store'}});
const origins = new Set(['https://sartoriluca65.github.io']);

export default {
 async fetch(request, env) {
  if (request.method !== 'POST' || new URL(request.url).pathname !== '/api/ai/sticker') return reply({error:'Servizio non disponibile.'},404);
  // Worker senza URL pubblico: le richieste arrivano dal proxy autenticato dell’app.
  if (!origins.has(request.headers.get('Origin')) || !request.headers.get('CF-Connecting-IP')) return reply({error:'Richiesta non autorizzata.'},403);
  const length = Number(request.headers.get('Content-Length'));
  if (!Number.isSafeInteger(length) || length <= 0) return reply({error:'Dimensione richiesta non disponibile.'},411);
  if (length > 6_000_000) return reply({error:'Foto troppo grande. Ridimensionala e riprova.'},413);
  if (!env.AI?.run || !env.AI_RATE_LIMITER?.limit) return reply({error:'Servizio AI temporaneamente non disponibile.'},503);
  let input;
  try {
   // Limita anche il corpo effettivo, senza fidarsi soltanto dell’intestazione.
   const reader=request.body.getReader(); const chunks=[]; let size=0;
   while (true) {const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>6_000_000){await reader.cancel();return reply({error:'Foto troppo grande.'},413);}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   input=JSON.parse(new TextDecoder().decode(bytes));
  } catch {return reply({error:'Richiesta incompleta.'},400);}
  const {prompt,image}=input||{};
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>2500||!image||!['image/png','image/jpeg','image/webp'].includes(image.mimeType)||typeof image.data!=='string'||image.data.length>5_500_000||!image.data.length||image.data.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(image.data))return reply({error:'Foto o descrizione non valide.'},400);
  let bytes;try{bytes=Uint8Array.from(atob(image.data),c=>c.charCodeAt(0));}catch{return reply({error:'Codifica della foto non valida.'},400);}
  try {
   const limit=await env.AI_RATE_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')});
   if(!limit.success)return reply({error:'Troppe generazioni ravvicinate. Attendi un minuto e riprova.'},429);
  }catch{return reply({error:'Protezione temporaneamente non disponibile.'},503);}
  const form=new FormData();form.set('prompt',prompt);form.set('width','512');form.set('height','512');
  form.set('input_image_0',new Blob([bytes],{type:image.mimeType}),'reference');
  const multipart=new Response(form);
  let output;
  try{output=await env.AI.run(MODEL,{multipart:{body:multipart.body,contentType:multipart.headers.get('Content-Type')}});}
  catch(error){
   // Non restituire o registrare foto, prompt, IP o dettagli interni del fornitore.
   const quota=/quota|rate.?limit|too many|neurons|capacity|429/i.test(String(error?.message));
   return reply({error:quota?'Quota AI temporaneamente non disponibile. Riprova più tardi; la foto resta sul dispositivo.':'Generazione non riuscita. Prova una foto PNG o JPEG più piccola.'},quota?429:502);
  }
  const data=output?.image;
  if(typeof data!=='string'||data.length>12_000_000||data.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(data))return reply({error:'Il servizio non ha restituito un’immagine valida.'},502);
  // FLUX può restituire JPEG anche se la foto di ingresso è PNG.
  const mimeType=data.startsWith('/9j/')?'image/jpeg':data.startsWith('iVBORw0KGgo')?'image/png':data.startsWith('UklGR')?'image/webp':null;
  if(!mimeType)return reply({error:'Formato immagine non riconosciuto.'},502);
  return reply({image:data,mimeType});
 }
};
