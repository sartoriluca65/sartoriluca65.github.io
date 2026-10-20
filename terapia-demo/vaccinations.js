(() => {
  'use strict';
  const groups=['','A+','A-','B+','B-','AB+','AB-','0+','0-'];
  const field=id=>document.getElementById(id);
  const list=()=>data.vaccinazioni||[];
  function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
  function validate(record){if(!record.nome?.trim())throw Error('Inserisci il nome del vaccino.');if(!validDate(record.data))throw Error('Inserisci una data di vaccinazione valida.');if(record.richiamo&&(!validDate(record.richiamo)||record.richiamo<record.data))throw Error('Il richiamo deve avere una data valida, uguale o successiva alla vaccinazione.');return record;}
  function renderVaccinazioni(){
    const records=list().slice().sort((a,b)=>b.data.localeCompare(a.data));
    field('vaccinationCount').textContent=records.length+' registrazioni';
    field('listaVaccinazioni').innerHTML=records.map(v=>'<article class="card"><h3>'+esc(v.nome)+'</h3><p><strong>Data:</strong> '+formatData(v.data)+(v.dose?' · <strong>Dose:</strong> '+esc(v.dose):'')+'</p>'+(v.richiamo?'<p>📅 <strong>Richiamo registrato:</strong> '+formatData(v.richiamo)+'</p>':'')+(v.lotto?'<p><strong>Lotto:</strong> '+esc(v.lotto)+'</p>':'')+(v.struttura?'<p><strong>Struttura / medico:</strong> '+esc(v.struttura)+'</p>':'')+(v.note?'<p style="white-space:pre-wrap">'+esc(v.note)+'</p>':'')+(window.MedicalDocs?MedicalDocs.links(v.allegati):'')+'<div class="actions no-print"><button class="btn btn-outline" onclick="apriVaccinazione(\''+v.id+'\')">✏️ Modifica</button><button class="btn btn-danger" onclick="eliminaVaccinazione(\''+v.id+'\')">Elimina</button></div></article>').join('')||'<div class="card empty-state">Nessuna vaccinazione registrata. Premi “Aggiungi vaccinazione”.</div>';
  }
  function apriVaccinazione(id=''){
    const v=list().find(x=>x.id===id)||{};
    for(const [name,key] of Object.entries({vId:'id',vNome:'nome',vData:'data',vDose:'dose',vLotto:'lotto',vStruttura:'struttura',vRichiamo:'richiamo',vNote:'note'}))field(name).value=v[key]||'';
    if(window.MedicalDocs){MedicalDocs.reset('v',id);field('vMedicalStatus').textContent='';}
    field('vaccinationModalTitle').textContent=id?'Modifica vaccinazione':'Aggiungi vaccinazione';field('modalVaccinazione').classList.add('open');field('vNome').focus();
  }
  function salvaVaccinazione(){
    if(typeof uploadsPending!=='undefined'&&uploadsPending){alert('Attendi il completamento del caricamento del PDF.');return;}
    try{const record=validate({id:field('vId').value||'vacc_'+crypto.randomUUID(),nome:field('vNome').value.trim(),data:field('vData').value,dose:field('vDose').value.trim(),lotto:field('vLotto').value.trim(),struttura:field('vStruttura').value.trim(),richiamo:field('vRichiamo').value,note:field('vNote').value.trim()});
      if(window.MedicalDocs)record.allegati=MedicalDocs.draft('v');
      const duplicate=list().find(v=>v.id!==record.id&&v.nome.toLowerCase()===record.nome.toLowerCase()&&v.data===record.data&&v.dose===record.dose);if(duplicate&&!confirm('Questa vaccinazione risulta già registrata nella stessa data e dose. Salvarla comunque?'))return;
      data.vaccinazioni ||= [];const index=data.vaccinazioni.findIndex(v=>v.id===record.id);if(index<0)data.vaccinazioni.push(record);else data.vaccinazioni[index]={...data.vaccinazioni[index],...record};
      salvaDati();renderVaccinazioni();if(window.MedicalDocs)MedicalDocs.renderMedicalViews();chiudiModal('modalVaccinazione');mostraToast('Vaccinazione salvata');
    }catch(error){alert(error.message);}
  }
  function eliminaVaccinazione(id){const record=list().find(v=>v.id===id);if(!record||!confirm('Eliminare la registrazione di '+record.nome+'?'))return;data.vaccinazioni=list().filter(v=>v.id!==id);salvaDati();renderVaccinazioni();if(window.MedicalDocs)MedicalDocs.renderMedicalViews();mostraToast('Registrazione eliminata');}
  function vaccinazioniReportHtml(){
    let html='<div class="card"><h2>Vaccinazioni</h2>';
    if(!list().length)return html+'<p>Nessuna vaccinazione registrata.</p></div>';
    html+='<table><thead><tr><th>Vaccino</th><th>Data</th><th>Dose</th><th>Richiamo</th><th>Lotto</th><th>Struttura / medico</th><th>Note</th></tr></thead><tbody>';
    for(const v of list().slice().sort((a,b)=>b.data.localeCompare(a.data)))html+='<tr><td>'+esc(v.nome)+'</td><td>'+formatData(v.data)+'</td><td>'+esc(v.dose||'')+'</td><td>'+formatData(v.richiamo)+'</td><td>'+esc(v.lotto||'')+'</td><td>'+esc(v.struttura||'')+'</td><td>'+esc(v.note||'')+'</td></tr>';
    return html+'</tbody></table></div>';
  }
  function stampaVaccinazioni(){navigateToSection('stampa');field('tipoStampa').value='vaccinazioni';stampaReport();}
  Object.assign(window,{renderVaccinazioni,apriVaccinazione,salvaVaccinazione,eliminaVaccinazione,vaccinazioniReportHtml,stampaVaccinazioni,TerapiaVaccinazioni:{validate,validDate,groups}});
})();
