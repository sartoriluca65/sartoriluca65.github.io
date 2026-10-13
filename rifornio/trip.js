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
 async function searchStationsOnTrip({start,end,vehicle,tripKm,roundTrip,container,button}){
  if(vehicle.fuel==='Elettricità'){container.textContent='I prezzi e lo stato delle colonnine non sono ancora collegati a una fonte verificata. Non mostro dati demo come risultati reali.';return}
  button.disabled=true;container.textContent='Cerco il percorso e i distributori con prezzi MIMIT…';
  try{
   const url='https://router.project-osrm.org/route/v1/driving/'+start.lng+','+start.lat+';'+end.lng+','+end.lat+'?overview=full&geometries=geojson&steps=false&alternatives=false';
   const routeResponse=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!routeResponse.ok)throw Error('Percorso per la ricerca non disponibile');
   const route=(await routeResponse.json()).routes?.[0];if(!route?.geometry?.coordinates?.length)throw Error('Percorso non trovato');
   const coords=route.geometry.coordinates,cumulative=[0];
   for(let i=1;i<coords.length;i++)cumulative[i]=cumulative[i-1]+distance({lat:coords[i-1][1],lng:coords[i-1][0]},{lat:coords[i][1],lng:coords[i][0]});
   const length=cumulative.at(-1)||0,count=Math.min(16,Math.max(2,Math.ceil(length/30)+1)),samples=[];
   for(let k=0;k<count;k++){const target=length*k/(count-1);let j=1;while(j<cumulative.length-1&&cumulative[j]<target)j++;const span=cumulative[j]-cumulative[j-1]||1,t=(target-cumulative[j-1])/span;samples.push({lat:coords[j-1][1]+(coords[j][1]-coords[j-1][1])*t,lng:coords[j-1][0]+(coords[j][0]-coords[j-1][0])*t})}
   container.textContent='Prezzi in caricamento su '+count+' punti dell’itinerario; controllo degli orari…';
   const batches=await Promise.allSettled(samples.map(async p=>{const endpoint=new URL(MIMIT_ENDPOINT);endpoint.searchParams.set('lat',p.lat);endpoint.searchParams.set('lng',p.lng);const response=await fetch(endpoint,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Prezzi non disponibili');const data=await response.json();if(!Array.isArray(data.stations))throw Error('Risposta prezzi non valida');return data.stations.filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lng)&&s.prices&&Object.values(s.prices).some(price=>Number.isFinite(price)&&price>0))}));
   const unique=new Map();batches.filter(x=>x.status==='fulfilled').flatMap(x=>x.value).forEach(s=>{const key=s.id||s.stationId||String(s.lat.toFixed(5))+','+String(s.lng.toFixed(5));if(!unique.has(key))unique.set(key,s)});
   const stations=[...unique.values()];if(!stations.length)throw Error('Nessuna stazione con prezzo MIMIT trovata lungo il percorso');
   await window.RifornioStations.verify(stations,samples);
   const v=vehicle,unit=fuelUnit(v.fuel),energy=v.consumption*tripKm/100;
   const candidates=stations.map(s=>{
    let progress=0,bestProgress=0,nearest=null,min=Infinity;
    for(let i=0;i<coords.length;i++){const p={lat:coords[i][1],lng:coords[i][0]},d=distance({lat:s.lat,lng:s.lng},p);if(d<min){min=d;bestProgress=progress;nearest=p}if(i<coords.length-1)progress+=distance(p,{lat:coords[i+1][1],lng:coords[i+1][0]})}
    if(min>18)return null;
    const price=s.prices[v.fuel];if(!Number.isFinite(price))return null;
    const extraKm=min*2*1.25,needed=energy+v.consumption*extraKm/100;
    return {...s,price,offRouteKm:min*1.25,extraKm,needed,cost:needed*price,nearest}
   }).filter(Boolean);
   const open=candidates.filter(s=>s.openStatus?.state==='open').sort((a,b)=>a.cost-b.cost),unknown=candidates.filter(s=>s.openStatus?.state!=='open'&&s.openStatus?.state!=='closed').sort((a,b)=>a.cost-b.cost),closed=candidates.filter(s=>s.openStatus?.state==='closed').length;
   let showUnknown=false,showAll=false;
   const render=()=>{
    const rows=[...open,...(showUnknown?unknown:[])].sort((a,b)=>a.cost-b.cost),visible=showAll?rows:rows.slice(0,5);
    container.replaceChildren();
    if(!rows.length){const message=document.createElement('p');message.textContent='Nessuna stazione con orari mappati che risulti aperta lungo questo percorso.';container.append(message)}
    const list=document.createElement('div');list.style.cssText='display:grid;gap:10px;margin-top:12px';
    visible.forEach((s,idx)=>{
     const card=document.createElement('article');card.style.cssText='padding:14px;border:1px solid #e1e9e2;border-radius:12px;background:#fff';
     const title=document.createElement('strong');title.textContent=(idx===0&&s.openStatus?.state==='open'?'★ Migliore sul viaggio · ':'')+(s.name||s.brand||'Distributore');
     const address=document.createElement('div');address.style.cssText='font-size:13px;margin-top:5px';address.textContent=s.address||'Posizione sulla mappa';
     const priceLine=document.createElement('div');priceLine.style.cssText='font-size:13px;margin-top:7px';priceLine.textContent=euro(s.price)+' / '+unit+' · '+fmt(s.offRouteKm,1)+' km di deviazione stimata';
     const costLine=document.createElement('div');costLine.style.cssText='font-size:13px;margin-top:4px';costLine.textContent='Consumo totale stimato, viaggio e deviazione: '+fmt(s.needed,2)+' '+unit+' · costo: '+euro(s.cost);
     const statusLine=document.createElement('div');statusLine.style.cssText='font-size:12px;margin-top:5px;color:'+(s.openStatus?.state==='open'?'#17664b':'#875a20');
     statusLine.textContent=s.openStatus?.state==='open'?'Aperto secondo gli orari OpenStreetMap · verifica sul posto':'Orario di apertura non verificabile · verifica prima di partire';
     card.append(title,address,priceLine,costLine,statusLine);list.append(card);
    });
    container.append(list);
    if(rows.length>5&&!showAll){const more=document.createElement('button');more.type='button';more.className='outline-button';more.textContent='Mostra tutte le '+rows.length+' opzioni';more.onclick=()=>{showAll=true;render()};container.append(more)}
    if(unknown.length&&!showUnknown){const more=document.createElement('button');more.type='button';more.className='outline-button';more.style.marginLeft='8px';more.textContent='Mostra '+unknown.length+' con stato non verificabile';more.onclick=()=>{showUnknown=true;render()};container.append(more)}
    const note=document.createElement('small');note.style.cssText='display:block;margin-top:10px;color:#6f7c74';note.textContent='Prezzi MIMIT comunicati dai gestori, non in tempo reale. Percorso e deviazione stimati; orari da OpenStreetMap e non confermano l’apertura effettiva. '+closed+' chiuse escluse. Ricerca campionata lungo la tratta; alcune stazioni possono non essere presenti nei dati.';container.append(note)
   };
   render()
  }catch(error){container.textContent='Ricerca stazioni non riuscita: '+error.message+'. Il calcolo del viaggio resta disponibile.'}
  finally{button.disabled=false}
 }
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
   const stationButton=document.createElement('button');stationButton.type='button';stationButton.className='primary-button';stationButton.style.marginTop='12px';stationButton.textContent='⛽ Cerca il distributore migliore lungo il viaggio';
   const stationResults=document.createElement('div');stationResults.setAttribute('role','status');stationResults.setAttribute('aria-live','polite');
   stationButton.addEventListener('click',()=>searchStationsOnTrip({start,end,vehicle:v,tripKm:km,roundTrip,container:stationResults,button:stationButton}));
   output.append(stationButton,stationResults);
  }catch(error){output.textContent='Non riesco a calcolare il viaggio: '+error.message+'. Verifica gli indirizzi e riprova.'}
  finally{button.disabled=false}
 });
 syncVehicles();syncPrice();restoreDraft();
 window.addEventListener('pienosmart:garage-updated',()=>{syncVehicles();syncPrice()});
 window.addEventListener('pageshow',()=>{syncVehicles();syncPrice()});
 document.querySelector('[data-page="trip"]')?.addEventListener('click',()=>{syncVehicles();syncPrice()});
})();