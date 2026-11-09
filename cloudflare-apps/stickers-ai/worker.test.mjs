import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{MODEL} from './worker.mjs';
const input={prompt:'Synthetic blue face sticker',image:{mimeType:'image/png',data:'iVBORw0KGgo='}};
function request(body=input,headers={}){const text=typeof body==='string'?body:JSON.stringify(body);return new Request('https://service.internal/api/ai/sticker',{method:'POST',headers:{Origin:'https://sartoriluca65.github.io','CF-Connecting-IP':'192.0.2.1','Content-Length':String(Buffer.byteLength(text)),...headers},body:text});}
function env(run=async()=>({image:'/9j/AAAA'})){return {AI:{run},AI_RATE_LIMITER:{limit:async()=>({success:true})}};}
test('foto multipart, modello e JPEG riconosciuti',async()=>{
 let called=false;const response=await worker.fetch(request(),env(async(model,value)=>{
  assert.equal(model,MODEL);const form=await new Response(value.multipart.body,{headers:{'Content-Type':value.multipart.contentType}}).formData();
  assert.equal(form.get('prompt'),input.prompt);assert.equal(form.get('width'),'512');assert.equal(form.get('height'),'512');
  assert.equal(form.get('input_image_0').type,'image/png');assert.deepEqual(new Uint8Array(await form.get('input_image_0').arrayBuffer()),new Uint8Array(Buffer.from(input.image.data,'base64')));called=true;return {image:'/9j/AAAA'};
 }));assert.equal(response.status,200);assert.equal((await response.json()).mimeType,'image/jpeg');assert.ok(called);assert.equal(response.headers.get('cache-control'),'no-store');
});
test('origine estranea rifiutata',async()=>assert.equal((await worker.fetch(request(input,{Origin:'https://example.org'}),env())).status,403));
test('IP assente rifiutato',async()=>assert.equal((await worker.fetch(request(input,{'CF-Connecting-IP':''}),env())).status,403));
test('corpo dichiarato enorme rifiutato',async()=>assert.equal((await worker.fetch(request(input,{'Content-Length':'6000001'}),env())).status,413));
test('corpo effettivo enorme rifiutato',async()=>assert.equal((await worker.fetch(request('x'.repeat(6000001),{'Content-Length':'1'}),env())).status,413));
test('JSON malformato rifiutato',async()=>assert.equal((await worker.fetch(request('{'),env())).status,400));
test('Base64, MIME e prompt non validi non arrivano al modello',async()=>{
 for(const value of [{...input,image:{...input.image,data:'%%%%'}},{...input,image:{...input.image,data:'abc'}},{...input,image:{...input.image,mimeType:'text/html'}},{...input,prompt:''}]){let called=false;const r=await worker.fetch(request(value),env(async()=>{called=true;}));assert.equal(r.status,400);assert.equal(called,false);}
});
test('limitatore blocca senza inferenza',async()=>{let called=false;const e=env(async()=>{called=true;});e.AI_RATE_LIMITER.limit=async()=>({success:false});assert.equal((await worker.fetch(request(),e)).status,429);assert.equal(called,false);});
test('binding mancante blocca',async()=>assert.equal((await worker.fetch(request(),{})).status,503));
test('quota restituita senza dettaglio sensibile',async()=>{const r=await worker.fetch(request(),env(async()=>{throw Error('429 quota private-photo');}));assert.equal(r.status,429);assert.ok(!(await r.text()).includes('private-photo'));});
test('errore fornitore gestito',async()=>assert.equal((await worker.fetch(request(),env(async()=>{throw Error('failed');}))).status,502));
test('risposta assente o corrotta rifiutata',async()=>{for(const image of [undefined,'bad!','YWJjZA=='])assert.equal((await worker.fetch(request(),env(async()=>({image})))).status,502);});
test('nessun endpoint diagnostico pubblico',async()=>assert.equal((await worker.fetch(new Request('https://service.internal/'),env())).status,404));
