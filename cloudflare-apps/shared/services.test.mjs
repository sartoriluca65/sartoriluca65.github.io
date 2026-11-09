import {test} from 'node:test';
import assert from 'node:assert/strict';
import {serviceRequest} from './services.mjs';
import {boundedBody} from './worker.mjs';
test('proxy solo verso servizi espliciti e senza cookie o token utente',async()=>{
 let seen;const env={APP:'stickers',AI_SERVICE:{async fetch(r){seen=r;assert.equal(await r.text(),'{"synthetic":true}');return Response.json({synthetic:true});}}};
 const req=new Request('https://app.example/_services/stickers',{method:'POST',headers:{Origin:'https://app.example','Content-Type':'application/json',Cookie:'private-session','Cf-Access-Jwt-Assertion':'private-token'},body:'{"synthetic":true}'});
 assert.equal((await serviceRequest(req,env,boundedBody)).status,200);assert.equal(new URL(seen.url).pathname,'/api/ai/sticker');assert.equal(seen.headers.get('Origin'),'https://sartoriluca65.github.io');assert.equal(seen.headers.get('Cookie'),null);assert.equal(seen.headers.get('Cf-Access-Jwt-Assertion'),null);
 assert.equal((await serviceRequest(new Request('https://app.example/_services/arbitrary'),env,boundedBody)).status,404);
});
test('scrittura cross-origin bloccata prima di chiamare il servizio',async()=>{
 let calls=0;const env={APP:'pienosmart',ROUTES_SERVICE:{fetch(){calls++;}}};
 const req=new Request('https://app.example/_services/routes',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'});
 assert.equal((await serviceRequest(req,env,boundedBody)).status,403);assert.equal(calls,0);
});
test('MIMIT usa soltanto la rotta fissa in lettura e conserva la query',async()=>{
 const env={APP:'pienosmart',PRICES_SERVICE:{async fetch(r){assert.equal(new URL(r.url).pathname,'/api/stations');assert.equal(new URL(r.url).searchParams.get('lat'),'45');return Response.json({stations:[]});}}};
 assert.equal((await serviceRequest(new Request('https://app.example/_services/prices?lat=45&lng=9'),env,boundedBody)).status,200);
});
