// GPS tracking stays on this device; no coordinates are uploaded.
(function(){
 const $=id=>document.getElementById(id),start=$('record-start'),stop=$('record-stop'),status=$('record-status'),result=$('record-result'),vehicle=$('record-vehicle'),price=$('record-price');
 if(!start||!navigator.geolocation)return;
 let watch=null,first=null,last=null,km=0,accepted=0,started=0,lastTimestamp=0,active=false;
 const key='pienosmartRecordedTrips';
 const fmtKm=n=>n.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
 function populate(){const prev=vehicle.value;vehicle.replaceChildren();vehicles.forEach(v=>{const o=document.createElement('option');o.value=v.id;o.textContent=v.name+' · '+v.fuel;vehicle.append(o)});if(vehicles.some(v=>v.id===prev))vehicle.value=prev;else if($('vehicle-select'))vehicle.value=$('vehicle-select').value;const v=vehicleById(vehicle.value);if(v)price.value=v.fuel==='Elettricità'?'0.60':'1.75'}
 function distanceKm(a,b){const R=6371,toRad=n=>n*Math.PI/180,dLat=toRad(b.latitude-a.latitude),dLon=toRad(b.longitude-a.longitude),x=Math.sin(dLat/2)**2+Math.cos(toRad(a.latitude))*Math.cos(toRad(b.latitude))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
 function update(){const v=vehicleById(vehicle.value),cost=v?km*v.consumption/100*Number(price.value):0;status.textContent='📍 '+fmtKm(km)+' km registrati · '+accepted+' punti GPS validi · spesa stimata '+euro(cost)}
 function finish(){if(watch!==null)navigator.geolocation.clearWatch(watch);watch=null;active=false;start.disabled=false;stop.disabled=true;vehicle.disabled=false;price.disabled=false;const v=vehicleById(vehicle.value),qty=v?km*v.consumption/100:0,cost=qty*Number(price.value);if(accepted<2){status.textContent='Viaggio terminato: punti GPS insufficienti per calcolare una distanza attendibile.';return}const record={date:new Date().toISOString(),vehicle:v?.name||'Veicolo',km:Number(km.toFixed(3)),quantity:Number(qty.toFixed(3)),cost:Number(cost.toFixed(2))};try{const saved=JSON.parse(localStorage.getItem(key)||'[]');saved.unshift(record);localStorage.setItem(key,JSON.stringify(saved.slice(0,30)))}catch{}result.textContent='Viaggio terminato · '+fmtKm(km)+' km · '+fmtKm(qty)+' '+fuelUnit(v.fuel)+' · costo stimato '+euro(cost);status.textContent='Registrazione terminata. Risultato salvato su questo dispositivo.'}
 start.addEventListener('click',()=>{
  if(!navigator.geolocation){status.textContent='GPS non disponibile.';return}
  populate();const v=vehicleById(vehicle.value);if(!v||!(Number(price.value)>0)){status.textContent='Seleziona un veicolo e un prezzo valido.';return}
  first=null;last=null;km=0;accepted=0;lastTimestamp=0;started=Date.now();active=true;result.textContent='';start.disabled=true;stop.disabled=false;vehicle.disabled=true;price.disabled=true;status.textContent='Attendo il segnale GPS… Tieni Safari aperto e lo schermo acceso.';
  watch=navigator.geolocation.watchPosition(p=>{
   if(!active)return;const c=p.coords;if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||c.accuracy>70)return;
   if(p.timestamp<=lastTimestamp)return;
   const current={latitude:c.latitude,longitude:c.longitude},prior=last;
   if(prior){const step=distanceKm(prior,current),seconds=(p.timestamp-lastTimestamp)/1000;if(seconds<=0||step>0.5||step/(seconds/3600)>170)return;if(step>0.012)km+=step}
   if(!first)first=current;last=current;lastTimestamp=p.timestamp;accepted++;update();
  },err=>{status.textContent='GPS: '+err.message+'. Controlla i permessi e mantieni Safari aperto.'},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
 });
 stop.addEventListener('click',finish);
 window.addEventListener('pagehide',()=>{if(active){navigator.geolocation.clearWatch(watch);watch=null;active=false}});
 window.addEventListener('pienosmart:garage-updated',()=>{if(!active)populate()});
 populate();vehicle.addEventListener('change',()=>{const v=vehicleById(vehicle.value);price.value=v?.fuel==='Elettricità'?'0.60':'1.75'});
})();
