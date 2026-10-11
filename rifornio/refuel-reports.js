// Fuel reports use existing PienoSmart records without changing storage keys.
(function(){
 const period=document.getElementById('refuel-report-period'),out=document.getElementById('refuel-report-content');
 if(!period||!out)return;
 const fmt=(n,d=2)=>Number(n).toLocaleString('it-IT',{minimumFractionDigits:d,maximumFractionDigits:d});
 const euro=n=>'€ '+fmt(n);
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function update(){
  if(typeof entries==='undefined'||typeof vehicles==='undefined')return;
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),start=new Date(today);
  if(period.value==='week'){const day=(today.getDay()+6)%7;start.setDate(today.getDate()-day)}
  if(period.value==='month')start.setDate(1);
  if(period.value==='year'){start.setMonth(0);start.setDate(1)}
  const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const rows=entries.filter(e=>!e.demo&&(period.value==='all'||(e.date>=iso(start)&&e.date<=iso(today))));
  if(!rows.length){out.textContent='Nessun rifornimento registrato in questo periodo.';return}
  const paid=e=>Number.isFinite(e.paid)?e.paid:Number(e.quantity||0)*Number(e.price||0);
  const total=rows.reduce((s,e)=>s+paid(e),0),litres=rows.reduce((s,e)=>s+Number(e.quantity||0),0);
  const groups=new Map();
  for(const e of rows){const name=e.station?.trim()||'Stazione non indicata';const a=groups.get(name)||{count:0,qty:0,cost:0};a.count++;a.qty+=Number(e.quantity)||0;a.cost+=paid(e);groups.set(name,a)}
  const brands=new Map();for(const e of rows){const name=e.brand?.trim()||'Marchio non indicato';const a=brands.get(name)||{count:0,qty:0,cost:0};a.count++;a.qty+=Number(e.quantity)||0;a.cost+=paid(e);brands.set(name,a)}
  const brandRows=[...brands.entries()].sort((a,b)=>b[1].cost-a[1].cost).map(([name,a])=>'<tr><td>'+escape(name)+'</td><td>'+a.count+'</td><td>'+fmt(a.qty,2)+'</td><td>'+(a.qty?euro(a.cost/a.qty):'—')+'</td><td>'+euro(a.cost)+'</td></tr>').join('');
  let distance=0,used=0;const perVehicle=new Map();
  for(const e of entries.filter(e=>!e.demo&&e.odometer&&Number(e.quantity)>0)){const a=perVehicle.get(e.vehicleId)||[];a.push(e);perVehicle.set(e.vehicleId,a)}
  for(const [id,list] of perVehicle){list.sort((a,b)=>Number(a.odometer)-Number(b.odometer));for(let i=1;i<list.length;i++){const e=list[i],previous=list[i-1],delta=Number(e.odometer)-Number(previous.odometer);if(delta>0&&rows.includes(e)){distance+=delta;used+=Number(e.quantity)}}}
  const avg=distance?fmt(used/distance*100,2)+' L/100 km':'Non calcolabile (servono due letture km dello stesso veicolo)';
  const stationRows=[...groups.entries()].sort((a,b)=>b[1].cost-a[1].cost).map(([name,a])=>'<tr><td>'+escape(name)+'</td><td>'+a.count+'</td><td>'+fmt(a.qty,2)+'</td><td>'+euro(a.cost)+'</td></tr>').join('');
  out.innerHTML='<div class="history-stats"><div class="history-stat"><span>Spesa totale</span><b>'+euro(total)+'</b></div><div class="history-stat"><span>Litri / unità</span><b>'+fmt(litres,2)+'</b></div><div class="history-stat"><span>Rifornimenti</span><b>'+rows.length+'</b></div><div class="history-stat"><span>Km percorsi (tra rifornimenti)</span><b>'+fmt(distance,0)+'</b></div><div class="history-stat"><span>Consumo medio stimato</span><b>'+avg+'</b></div><div class="history-stat"><span>Costo medio / km</span><b>'+(distance?euro(total/distance):'—')+'</b></div></div><h3>Spesa per distributore</h3><div class="history-table-wrap"><table><thead><tr><th>STAZIONE</th><th>VISITE</th><th>LITRI / UNITÀ</th><th>SPESA</th></tr></thead><tbody>'+stationRows+'</tbody></table></div><h3>Spesa per marchio</h3><div class="history-table-wrap"><table><thead><tr><th>MARCHIO</th><th>VISITE</th><th>LITRI / UNITÀ</th><th>PREZZO MEDIO</th><th>SPESA</th></tr></thead><tbody>'+brandRows+'</tbody></table></div><p style="font-size:12px">Le medie dei consumi richiedono chilometraggi progressivi dello stesso veicolo. I periodi includono solo le registrazioni con data nel periodo scelto.</p>';
 }
 period.addEventListener('change',update);
 window.addEventListener('pienosmart:reports-update',update);
 window.addEventListener('pageshow',update);
 update();
})();