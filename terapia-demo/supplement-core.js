(function(root){
 function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
 function status(s,date=today()){if(s.stato==='sospeso')return 'Sospeso';if(s.inizio&&s.inizio>date)return 'Programmato';if(s.fine&&s.fine<date)return 'Concluso';return 'In corso';}
 function dateISO(s){const m=s.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})\b/);if(!m)return '';const d=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;const check=new Date(d+'T12:00:00Z');return !isNaN(check)&&check.toISOString().slice(0,10)===d?d:'';}
 function parse(text){const clean=text.replace(/\r/g,'');const rows=clean.split('\n').map(s=>s.trim()).filter(Boolean);const named=rows.find(s=>/^(nome(?:\s+(?:prodotto|integratore))?|prodotto|integratore)\s*[:\-]/i.test(s));const name=named?named.replace(/^[^:\-]+[:\-]\s*/,''):'';
 const doseRow=rows.find(s=>/^(dos(?:e|aggio)|posologia|assunzione)\s*[:\-]/i.test(s));const dose=doseRow?doseRow.replace(/^[^:\-]+[:\-]\s*/,''):'';
 const start=rows.find(s=>/(?:data\s+(?:di\s+)?)?inizio\b|\bdal\s+\d{1,2}[/.\-]/i.test(s))||'';
 const end=rows.find(s=>/(?:data\s+(?:di\s+)?)?fine\b|\bfino\s+al\b/i.test(s))||'';
 return {nome:name.slice(0,160),dosaggio:dose.slice(0,300),inizio:dateISO(start),fine:dateISO(end),testo:clean};}
 root.TerapiaSupplements={today,status,parse,dateISO};
})(globalThis);
