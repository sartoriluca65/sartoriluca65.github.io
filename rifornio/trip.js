// PienoSmart trip calculator. No API keys are exposed in the browser.
(function(){
 const form=document.getElementById('trip-form');if(!form)return;
 const $=id=>document.getElementById(id);
 document.querySelector('[data-goto-trip]')?.addEventListener('click',e=>{e.preventDefault();navigate('trip')});
 const select=$('trip-vehicle'),price=$('trip-price'),output=$('trip-result'),button=$('trip-submit');
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
 async function geocode(address){
  const coords=address.split(',').map(Number);if(coords.length===2&&coords.every(Number.isFinite)&&Math.abs(coords[0])<=90&&Math.abs(coords[1])<=180)return {lat:coords[0],lng:coords[1],label:'Posizione GPS'};
  const url=new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q',address);url.searchParams.set('format','jsonv2');url.searchParams.set('limit','1');url.searchParams.set('countrycodes','it');
  const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('Servizio indirizzi non disponibile');
  const matches=await response.json();if(!matches.length)throw Error('Indirizzo non trovato: '+address);
  return {lng:Number(matches[0].lon),lat:Number(matches[0].lat),label:matches[0].display_name};
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
   // Public Nominatim usage policy: at most one request per second.
   await new Promise(resolve=>setTimeout(resolve,1100));
   const end=await geocode(to);
   const response=await fetch(ROUTES_ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({from:[start.lng,start.lat],to:[end.lng,end.lat]}),signal:AbortSignal.timeout(22000)});
   const route=await response.json().catch(()=>({}));
   if(!response.ok||!Number.isFinite(route.distanceKm))throw Error(route.error||'Percorso stradale non disponibile');
   const km=route.distanceKm*(roundTrip?2:1),minutes=route.durationMin*(roundTrip?2:1),consumption=v.consumption*km/100,total=consumption*costPerUnit;
   output.replaceChildren();
   const heading=document.createElement('h3');heading.textContent=$('trip-kind').value==='past'?'🚗 Spesa stimata del viaggio effettuato':'🚗 Preventivo del viaggio';heading.style.margin='0 0 12px';
   const details=document.createElement('div');details.style.cssText='padding:16px;background:#f1f8f3;border-radius:12px';
   const rows=[['Partenza',start.label],['Destinazione',end.label],['Distanza',fmt(km,1)+' km'+(roundTrip?' · andata e ritorno':' · sola andata')],['Tempo di guida',Math.floor(minutes/60)+' h '+Math.round(minutes%60)+' min'],['Veicolo',v.name],['Consumo medio',fmt(v.consumption,1)+' '+consumptionUnit(v.fuel)],['Carburante / energia necessari',fmt(consumption,2)+' '+fuelUnit(v.fuel)],['Prezzo inserito',euro(costPerUnit)+' / '+fuelUnit(v.fuel)],['SPESA STIMATA',euro(total)]];
   for(const [label,value] of rows){const row=document.createElement('p');row.style.margin='7px 0';const b=document.createElement('b');b.textContent=label+': ';row.append(b,document.createTextNode(value));details.append(row)}
   const note=document.createElement('p');note.textContent='Stima basata sul consumo medio: non include pedaggi, parcheggi o variazioni dovute a traffico e guida.';note.style.fontSize='13px';
   output.append(heading,details,note);
  }catch(error){output.textContent='Non riesco a calcolare il viaggio: '+error.message+'. Verifica gli indirizzi e riprova.'}
  finally{button.disabled=false}
 });
 syncVehicles();syncPrice();
 window.addEventListener('pienosmart:garage-updated',()=>{syncVehicles();syncPrice()});
 window.addEventListener('pageshow',()=>{syncVehicles();syncPrice()});
 document.querySelector('[data-page="trip"]')?.addEventListener('click',()=>{syncVehicles();syncPrice()});
})();