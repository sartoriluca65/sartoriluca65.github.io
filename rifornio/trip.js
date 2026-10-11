// PienoSmart trip calculator. No API keys are exposed in the browser.
(function(){
 const form=document.getElementById('trip-form');if(!form)return;
 const $=id=>document.getElementById(id);
 document.querySelector('[data-goto-trip]')?.addEventListener('click',e=>{e.preventDefault();navigate('trip')});
 const select=$('trip-vehicle'),price=$('trip-price'),output=$('trip-result'),button=$('trip-submit');
 // Keep the trip draft on this device even when the app receives an update.
 const draftKey='pienosmartTripDraftV1';
 const draftIds=['trip-from','trip-to','trip-price','trip-kind','trip-return','trip-vehicle'];
 function storeDraft(){try{const draft={};for(const id of draftIds){const el=$(id);if(el)draft[id]=el.type==='checkbox'?el.checked:el.value}localStorage.setItem(draftKey,JSON.stringify(draft))}catch{}}
 function restoreDraft(){try{const draft=JSON.parse(localStorage.getItem(draftKey)||'null');if(!draft)return;for(const id of draftIds){const el=$(id);if(!el||!(id in draft))continue;if(el.type==='checkbox')el.checked=Boolean(draft[id]);else if(id!=='trip-vehicle'||[...el.options].some(o=>o.value===draft[id]))el.value=draft[id]}}catch{}}
 for(const id of draftIds){const el=$(id);if(el){el.addEventListener('input',storeDraft);el.addEventListener('change',storeDraft)}}
 window.addEventListener('pagehide',storeDraft);
 function syncVehicles(){
  const previous=select.value,main=$('vehicle-select')?.value;
  select.replaceChildren();
  vehicles.forEach(v=>{const option=document.createElement('option');option.value=v.id;option.textContent=v.name+' · '+v.fuel;select.append(option)});
  if(vehicles.some(v=>v.id===previous))select.value=previous;else if(vehicles.some(v=>v.id===main))select.value=main;
 }
 function syncPrice(){
  const v=vehicleById(select.value);if(!v)return;
  const prices=STATIONS.map(s=>s.prices?.[v.fuel]).filter(p=>Number.isFinite(p)&&p>0);
  if(officialPricesActive&&prices.length)price.value=(prices.reduce((a,b)=>a+b,0)/prices.length).toFixed(3);
  else price.value=v.fuel==='Elettricità'?'0.60':'1.75';
 }
 let lastSearch=0;
 async function searchAddress(query){
  const delay=Math.max(0,1100-(Date.now()-lastSearch));
  if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
  lastSearch=Date.now();
  const url=new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q',query);url.searchParams.set('format','jsonv2');
  url.searchParams.set('limit','3');url.searchParams.set('countrycodes','it');
  url.searchParams.set('accept-language','it');
  const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Servizio indirizzi momentaneamente non disponibile');
  return response.json();
 }
 async function geocode(address){
  const coords=address.split(',').map(s=>Number(s.trim()));
  if(coords.length===2&&coords.every(Number.isFinite)&&Math.abs(coords[0])<=90&&Math.abs(coords[1])<=180)return {lat:coords[0],lng:coords[1],label:'Posizione GPS'};
  const clean=address.replace(/\s+/g,' ').trim();
  const variants=[clean];
  // The city is often written without a comma: "Viale della Cooperazione Rovigo".
  const words=clean.split(' ');
  if(!clean.includes(',')&&words.length>=3){
   variants.push(words.slice(0,-1).join(' ')+', '+words.at(-1)+', Italia');
   if(words.length>=5)variants.push(words.slice(0,-2).join(' ')+', '+words.slice(-2).join(' ')+', Italia');
  }else if(clean.includes(','))variants.push(clean+', Italia');
  const street=clean.replace(/^(viale|via|piazza|corso|strada)\s+/i,'');
  if(street!==clean)variants.push(street);
  let matches=[];
  for(const query of [...new Set(variants)]){
   matches=await searchAddress(query);
   if(matches.length)break;
  }
  if(!matches.length)throw Error('Indirizzo non trovato: '+address+'. Prova «Viale della Cooperazione, Rovigo» oppure una via vicina');
  const best=matches[0];
  return {lng:Number(best.lon),lat:Number(best.lat),label:best.display_name};
 }
 $('trip-gps').addEventListener('click',()=>{
  output.textContent='Acquisizione posizione in corso…';
  navigator.geolocation.getCurrentPosition(
   position=>{ $('trip-from').value=position.coords.latitude.toFixed(6)+', '+position.coords.longitude.toFixed(6);output.textContent='Posizione acquisita: ora inserisci la destinazione.'; },
   ()=>{output.textContent='Posizione non disponibile. Inserisci l’indirizzo manualmente.';},
   {timeout:12000}
  );
 });
 select.addEventListener('change',syncPrice);
 form.addEventListener('submit',async e=>{
  e.preventDefault();syncVehicles();
  const v=vehicleById(select.value),costPerUnit=Number(price.value),from=$('trip-from').value.trim(),to=$('trip-to').value.trim(),roundTrip=$('trip-return').checked;
  if(!v||!from||!to||!Number.isFinite(costPerUnit)||costPerUnit<=0){output.textContent='Compila tutti i campi e scegli un veicolo.';return}
  button.disabled=true;output.textContent='Cerco gli indirizzi e calcolo il percorso stradale…';
  try{
   const start=await geocode(from);
   const end=await geocode(to);
   const response=await fetch(ROUTES_ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({from:[start.lng,start.lat],to:[end.lng,end.lat]}),signal:AbortSignal.timeout(22000)});
   let route=await response.json().catch(()=>({}));
   let approximate=false;
   if(!response.ok||!Number.isFinite(route.distanceKm)){
    // Provider outages must not prevent a clearly labeled approximate estimate.
    const rad=Math.PI/180,dlat=(end.lat-start.lat)*rad,dlng=(end.lng-start.lng)*rad;
    const a=Math.sin(dlat/2)**2+Math.cos(start.lat*rad)*Math.cos(end.lat*rad)*Math.sin(dlng/2)**2;
    const straight=6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    route={distanceKm:straight*1.30,durationMin:straight*1.30/65*60};approximate=true;
   }
   const km=route.distanceKm*(roundTrip?2:1),minutes=route.durationMin*(roundTrip?2:1),consumption=v.consumption*km/100,total=consumption*costPerUnit;
   output.replaceChildren();
   const heading=document.createElement('h3');heading.textContent=$('trip-kind')?.value==='past'?'🚗 Spesa stimata del viaggio effettuato':'🚗 Preventivo del viaggio';heading.style.margin='0 0 12px';
   const details=document.createElement('div');details.style.cssText='padding:16px;background:#f1f8f3;border-radius:12px';
   const rows=[['Partenza',start.label],['Destinazione',end.label],['Distanza',fmt(km,1)+' km'+(approximate?' · stima approssimativa':'')+(roundTrip?' · andata e ritorno':' · sola andata')],['Tempo di guida',Math.floor(minutes/60)+' h '+Math.round(minutes%60)+' min'],['Veicolo',v.name],['Consumo medio',fmt(v.consumption,1)+' '+consumptionUnit(v.fuel)],['Carburante / energia necessari',fmt(consumption,2)+' '+fuelUnit(v.fuel)],['Prezzo inserito',euro(costPerUnit)+' / '+fuelUnit(v.fuel)],['SPESA STIMATA',euro(total)]];
   for(const [label,value] of rows){const row=document.createElement('p');row.style.margin='7px 0';const b=document.createElement('b');b.textContent=label+': ';row.append(b,document.createTextNode(value));details.append(row)}
   const note=document.createElement('p');note.textContent=(approximate?'Servizio percorsi non disponibile: distanza stimata in linea d’aria con maggiorazione del 30%, NON è un percorso stradale verificato. ':'')+'Stima basata sul consumo medio: non include pedaggi, parcheggi o variazioni dovute a traffico e guida.';note.style.fontSize='13px';
   output.append(heading,details,note);
  }catch(error){output.textContent='Non riesco a calcolare il viaggio: '+error.message+'. Verifica gli indirizzi e riprova.'}
  finally{button.disabled=false}
 });
 syncVehicles();syncPrice();restoreDraft();
 window.addEventListener('pienosmart:garage-updated',()=>{syncVehicles();syncPrice()});
 window.addEventListener('pageshow',()=>{syncVehicles();syncPrice()});
 document.querySelector('[data-page="trip"]')?.addEventListener('click',()=>{syncVehicles();syncPrice()});
})();