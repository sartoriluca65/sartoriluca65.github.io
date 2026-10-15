'use strict';
(()=>{
const el=id=>document.getElementById(id);
let year='all',query='',mode='',selected=null;
const originalRender=render;
const money=n=>(n/100).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
const datestr=x=>/^\d{4}-\d{2}-\d{2}$/.test(x||'')?x:'';
function filtered(){return (rows||[]).filter(x=>(year==='all'||datestr(x.date).startsWith(year))&&(!query||String(x.description).toLocaleLowerCase('it').includes(query)))}
function draw(){
 if(!rows)return;
 const dropdown=el('yr'),years=[...new Set(rows.map(x=>datestr(x.date).slice(0,4)).filter(Boolean))].sort();
 dropdown.replaceChildren();const all=document.createElement('option');all.value='all';all.textContent='Tutti gli anni';dropdown.append(all);
 for(const y of years){const item=document.createElement('option');item.value=y;item.textContent=y;dropdown.append(item)}
 if(year!=='all'&&!years.includes(year))year='all';dropdown.value=year;
 const body=el('rows');body.replaceChildren();
 for(const x of filtered().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)))){
  const tr=document.createElement('tr');for(const v of [x.date||'Senza data',x.description,money(x.income),money(x.expense),x.person||'']){const td=document.createElement('td');td.textContent=v;tr.append(td)}
  const td=document.createElement('td'),button=document.createElement('button');button.textContent='Modifica';button.className='secondary';button.type='button';button.onclick=()=>edit(x.id);td.append(button);tr.append(td);body.append(tr);
 }
 if(mode)showMode(mode);
}
render=function(){originalRender();draw()};
function edit(id){
 const x=id==null?null:rows.find(x=>String(x.id)===String(id));selected=x?String(x.id):null;
 el('editing').classList.remove('hidden');el('eid').value=selected||'';
 el('edate').value=x?datestr(x.date):new Date().toISOString().slice(0,10);
 el('edesc').value=x?x.description:'';el('etype').value=x&&x.expense?'expense':'income';
 el('eamt').value=x?((x.income||x.expense)/100).toFixed(2):'';
 el('ekind').value=x?x.kind:'general';el('eperson').value=x?x.person:'';el('enote').value=x?x.note:'';
 el('del').style.display=x?'':'none';el('editing').scrollIntoView({block:'start',behavior:'smooth'});
}
el('new').onclick=()=>{if(rows)edit(null)};
el('cancel').onclick=()=>el('editing').classList.add('hidden');
el('ef').onsubmit=async event=>{
 event.preventDefault();if(!rows||!activeKey)return alert('Sblocca prima l’archivio.');
 const cents=Math.round(Number(el('eamt').value)*100);
 if(!Number.isSafeInteger(cents)||cents<=0)return alert('Importo non valido');
 const kind=el('ekind').value,person=el('eperson').value.trim(),type=el('etype').value;
 if(kind!=='general'&&!person)return alert('Indica il partecipante');
 if(kind==='distribution'&&type!=='expense')return alert('La quota versata deve essere una uscita.');
 const proposed=rows.map(x=>({...x}));let item=selected?proposed.find(x=>String(x.id)===selected):null;
 if(!item){item={id:Math.max(0,...proposed.map(x=>Number(x.id)||0))+1,row:Math.max(5,...proposed.map(x=>Number(x.row)||0))+1,issues:[],rawDate:'',verified:false};proposed.push(item)}
 Object.assign(item,{date:el('edate').value,description:el('edesc').value.trim(),income:type==='income'?cents:0,expense:type==='expense'?cents:0,kind,person,note:el('enote').value.trim()});
 try{await store(proposed,activeKey);rows=proposed;el('editing').classList.add('hidden');render();msg('Movimento salvato cifrato sul dispositivo. Scarica periodicamente il backup.') }catch(err){msg('Salvataggio fallito, movimenti precedenti conservati: '+err.message)}
};
el('del').onclick=async()=>{
 if(!rows||!activeKey||!selected||!confirm('Eliminare questo movimento? Conserva una copia di backup.'))return;
 const proposed=rows.filter(x=>String(x.id)!==selected);
 try{await store(proposed,activeKey);rows=proposed;el('editing').classList.add('hidden');render();msg('Movimento eliminato, archivio cifrato aggiornato.')}catch(err){msg('Eliminazione non riuscita: '+err.message)}
};
el('yr').onchange=e=>{year=e.target.value;draw()};
el('q').oninput=e=>{query=e.target.value.toLocaleLowerCase('it');draw()};
function showMode(next){
 mode=next;const box=el('analytics');box.replaceChildren();const title=document.createElement('h3');title.textContent=mode==='chart'?'Entrate e uscite per anno':'Quote e conguagli – prospetto provvisorio';box.append(title);
 if(mode==='chart'){
 const years=[...new Set(rows.map(x=>datestr(x.date).slice(0,4)||'Senza data'))].sort();
 for(const y of years){
 const list=rows.filter(x=>(datestr(x.date).slice(0,4)||'Senza data')===y),inc=list.reduce((a,x)=>a+x.income,0),exp=list.reduce((a,x)=>a+x.expense,0),max=Math.max(inc,exp,1);
 const tile=document.createElement('div');tile.className='tile';const lbl=document.createElement('strong');lbl.style.fontSize='16px';lbl.textContent=y+' — Entrate '+money(inc)+' · Uscite '+money(exp);tile.append(lbl);
 for(const [amount,color] of [[inc,'#278358'],[exp,'#b75d43']]){const bar=document.createElement('div');bar.style.cssText='margin-top:7px;height:12px;border-radius:5px;background:'+color+';width:'+Math.max(1,amount/max*100)+'%';tile.append(bar)}
 box.append(tile)}
 } else {
 const warning=document.createElement('p');warning.className='warning';warning.textContent='Il backup iniziale ripristinato conserva i movimenti, ma potrebbe non includere tutte le regole e le correzioni dei conguagli storici. Non utilizzare questo riepilogo per liquidazioni definitive.';box.append(warning);
 const people=[...new Set(rows.map(x=>x.person).filter(Boolean))];const ul=document.createElement('ul');for(const name of people){const paid=rows.filter(x=>x.person===name&&x.kind==='distribution').reduce((a,x)=>a+x.expense,0);const li=document.createElement('li');li.textContent=name+' – quote registrate come versate: '+money(paid);ul.append(li)}box.append(ul);
 }
}
el('chart').onclick=()=>{if(rows)showMode('chart')};
el('shares').onclick=()=>{if(rows)showMode('shares')};
el('print').onclick=()=>window.print();
const previousLoad=el('load').onclick;
el('load').onclick=async()=>{
 if(localStorage.getItem(KEY)){
  if(!confirm('Esiste già un archivio sul dispositivo. Prima di sostituirlo scarica “backup cifrato” per non perdere gli ultimi movimenti. Proseguire con il ripristino?'))return;
 }
 await previousLoad();
};
})();
