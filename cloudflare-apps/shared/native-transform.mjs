// Trasformazioni limitate al pacchetto Cloudflare; i sorgenti originali restano invariati.
export function transformNative(app,path,text){
 if(path.endsWith('.html'))text=text.replace(/<script\b[^>]*src=["'][^"']*\/analytics\/[^"']*["'][^>]*>\s*<\/script>/gi,'');
 if(app==='diviso'&&path==='/index.html'){
  const marker="const KEY='diviso-v2'";if(!text.includes(marker))throw Error('Diviso: archivio non riconosciuto');
  text=text.replace(marker,"window.LukiAppAdapter={ready:()=>typeof state!=='undefined'&&!!state,busy:()=>false};\n"+marker);
 }
 if(app==='autocontrol'&&path==='/cloud.js'){
  const marker='async function init(){';if(!text.includes(marker))throw Error('AutoControl: inizializzazione non riconosciuta');
  text=text.replace(marker,marker+`\n  if(window.LUKI_CONFIG){$('accountToggle').hidden=true;$('accountFormBox').hidden=true;status('Archivio Cloudflare: usa la barra di sincronizzazione in alto. Le copie complete restano disponibili qui.');return;}\n`);
  text=text.replace("status('Salvato solo in questo browser. Accedi e trasferisci i dati per proteggerli online.')","status(window.LUKI_CONFIG?'Salvato sul dispositivo. Controlla la sincronizzazione nella barra in alto.':'Salvato solo in questo browser. Accedi e trasferisci i dati per proteggerli online.')");
 }
 if(app==='stickers'&&path==='/app.js'){
  const endpoint="https://luki-stickers-gemini.sartori-luca65.workers.dev/api/ai/sticker";
  if(!text.includes(endpoint))throw Error('Sticker: endpoint non riconosciuto');text=text.replaceAll(endpoint,'/_services/stickers');
  const end=text.lastIndexOf('})();');if(end<0)throw Error('Sticker: modulo non riconosciuto');
  text=text.slice(0,end)+`window.LukiAppAdapter={ready:()=>true,busy:()=>aiGenerating||!!cameraStream||currentView==='editor'};\n`+text.slice(end);
 }
 if(app==='pienosmart'&&path==='/app.js'){
  for(const [from,to] of Object.entries({'https://rifornio-gemini.sartori-luca65.workers.dev/api/ai/advice':'/_services/advice','https://rifornio-routes.sartori-luca65.workers.dev/api/routes':'/_services/routes','https://rifornio-mimit.sartori-luca65.workers.dev/api/stations':'/_services/prices'})){
   if(!text.includes(from))throw Error('PienoSmart: endpoint non riconosciuto');text=text.replaceAll(from,to);
  }
 }
 return text;
}
export const adapter=`(()=>{if(window.LukiAppAdapter)return;const app=window.LUKI_CONFIG.app;window.LukiAppAdapter={ready(){if(app==='cochi')return typeof state!=='undefined'&&!!state;if(app==='autocontrol')return !!window.acArchive;if(app==='pienosmart')return typeof vehicles!=='undefined'&&typeof entries!=='undefined';if(app==='diviso')return typeof state!=='undefined'&&!!state;return false;},busy(){return app==='autocontrol'&&!!window.autoCloud?.locked();}};})();`;
