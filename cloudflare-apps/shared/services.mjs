// Proxie interne autenticate: nessun segreto viene copiato o inviato al browser.
const routes={stickers:{stickers:['AI_SERVICE','/api/ai/sticker','POST']},pienosmart:{advice:['AI_SERVICE','/api/ai/advice','POST'],routes:['ROUTES_SERVICE','/api/routes','POST'],prices:['PRICES_SERVICE','/api/stations','GET']}};
export async function serviceRequest(request,env,readBody){
 const url=new URL(request.url),name=url.pathname.slice('/_services/'.length),route=routes[env.APP]?.[name];
 if(!route||request.method!==route[2])return Response.json({error:'Servizio non disponibile'},{status:404});
 const binding=env[route[0]];if(!binding?.fetch)return Response.json({error:'Servizio non collegato'},{status:503});
 const headers=new Headers({'Origin':'https://sartoriluca65.github.io'});let body;
 if(request.method==='POST'){
  if(request.headers.get('Origin')!==url.origin||request.headers.get('Content-Type')?.split(';')[0]!=='application/json')return Response.json({error:'Origine o formato non autorizzati'},{status:403});
  body=await readBody(request,6_000_000);headers.set('Content-Type','application/json');headers.set('Content-Length',String(body.length));
 }
 const ip=request.headers.get('CF-Connecting-IP');if(ip)headers.set('CF-Connecting-IP',ip);
 const target='https://service.internal'+route[1]+(request.method==='GET'?url.search:'');
 const response=await binding.fetch(new Request(target,{method:request.method,headers,body}));
 return new Response(response.body,{status:response.status,headers:{'Content-Type':response.headers.get('Content-Type')||'application/json','Cache-Control':'private, no-store'}});
}
