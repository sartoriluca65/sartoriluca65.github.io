import { PDFDocument, rgb, PDFFont, PDFPage, RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {regularFont,boldFont} from './fonts';
type Block={kind:'heading'|'subheading'|'text'|'table',text?:string,rows?:string[][]};
export type Report={title:string,patient:string,date:string,orientation?:'landscape'|'portrait',blocks:Block[]};
type Theme={main:RGB,light:RGB,icon:string};
const colors={navy:rgb(.08,.22,.32),teal:rgb(.06,.43,.48),ink:rgb(.14,.25,.32),muted:rgb(.36,.45,.5),line:rgb(.83,.89,.91)};
function theme(label:string):Theme{
 const s=label.toLocaleLowerCase('it');
 if(/integrator/.test(s))return {main:rgb(.21,.46,.31),light:rgb(.94,.97,.94),icon:'leaf'};
 if(/farmac|terapi/.test(s))return {main:rgb(.12,.4,.61),light:rgb(.93,.96,.99),icon:'pill'};
 if(/cardio|cuore/.test(s))return {main:rgb(.66,.24,.34),light:rgb(.99,.94,.95),icon:'heart'};
 if(/esam|laboratorio|sangue/.test(s))return {main:rgb(.4,.33,.61),light:rgb(.96,.94,.99),icon:'lab'};
 if(/giornal|settimana|scheda|lun |mar |mer |gio |ven |sab |dom /.test(s))return {main:rgb(.55,.39,.12),light:rgb(.99,.97,.91),icon:'calendar'};
 return {main:colors.teal,light:rgb(.93,.97,.97),icon:'file'};
}
function icon(page:PDFPage,kind:string,x:number,y:number,c:RGB,size=18){
 const k=size/20,l=(a:number,b:number,d:number,e:number,w=1.5)=>page.drawLine({start:{x:x+a*k,y:y+b*k},end:{x:x+d*k,y:y+e*k},thickness:w*k,color:c});
 if(kind==='pill'){page.drawSvgPath('M 5 2 C 1 -2 -3 2 1 6 L 9 14 C 13 18 17 14 13 10 Z',{x:x+3*k,y:y+16*k,scale:k,color:undefined,borderColor:c,borderWidth:1.5});l(7,12,12,7);}
 else if(kind==='heart'){page.drawSvgPath('M 10 17 L 2 9 C -3 2 5 -3 10 3 C 15 -3 23 2 18 9 Z',{x,y:y+19*k,scale:k,borderColor:c,borderWidth:1.5});l(3,10,7,10);l(7,10,9,14);l(9,14,12,6);l(12,6,14,10);l(14,10,18,10);}
 else if(kind==='leaf'){page.drawSvgPath('M 2 17 C 0 8 5 1 17 2 C 18 14 11 20 2 17 Z',{x,y:y+20*k,scale:k,borderColor:c,borderWidth:1.5});l(2,2,14,15);l(7,7,7,12);}
 else if(kind==='lab'){l(7,18,13,18);l(8,18,8,11);l(12,18,12,11);l(8,11,3,3);l(12,11,17,3);l(3,3,17,3);l(5,7,15,7);}
 else if(kind==='calendar'){page.drawRectangle({x:x+2*k,y:y+2*k,width:16*k,height:14*k,borderColor:c,borderWidth:1.4*k});l(2,12,18,12);l(6,14,6,19);l(14,14,14,19);page.drawCircle({x:x+7*k,y:y+7*k,size:1.2*k,color:c});page.drawCircle({x:x+13*k,y:y+7*k,size:1.2*k,color:c});}
 else{page.drawRectangle({x:x+4*k,y:y+1*k,width:12*k,height:17*k,borderColor:c,borderWidth:1.4*k});l(7,13,13,13);l(7,9,13,9);l(7,5,11,5);}
}
export async function renderReport(report:Report){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);const decode=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));const normal=await pdf.embedFont(decode(regularFont),{subset:true}),bold=await pdf.embedFont(decode(boldFont),{subset:true});
 const landscape=report.orientation==='landscape'||report.title==='Cartella clinica paziente',width=landscape?841.89:595.28,height=landscape?595.28:841.89,margin=40,usable=width-margin*2,bottom=56;let page!:PDFPage,y=0;const pages:PDFPage[]=[];
 const convert=(s:string)=>String(s||'').normalize('NFC').replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu,'').replace(/✓/g,'[x]').replace(/☐/g,'[ ]').replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/→/g,'->').replace(/α/g,'alfa').replace(/β/g,'beta').replace(/γ/g,'gamma').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
 function safe(s:string){return [...convert(s)].map(c=>{if(/[\n\r\t]/.test(c))return c;try{normal.encodeText(c);return c;}catch{return '?';}}).join('');}
 function lines(s:string,font:PDFFont,size:number,w:number){const out:string[]=[];for(const paragraph of safe(s).split(/\r?\n/)){let line='';for(const word of paragraph.trim().split(/\s+/)){if(!word)continue;const candidate=(line?line+' ':'')+word;if(font.widthOfTextAtSize(candidate,size)<=w){line=candidate;continue;}if(line){out.push(line);line='';}if(font.widthOfTextAtSize(word,size)<=w){line=word;continue;}for(const char of word){if(font.widthOfTextAtSize(line+char,size)>w){out.push(line);line='';}line+=char;}}out.push(line);}return out;}
 function addPage(){if(pages.length>=500)throw Error('Report troppo lungo');page=pdf.addPage([width,height]);pages.push(page);page.drawRectangle({x:0,y:height-76,width,height:76,color:colors.navy});icon(page,'file',margin,height-53,rgb(.64,.86,.86),25);page.drawText('TERAPIA & CARTELLA CLINICA',{x:margin+38,y:height-31,font:bold,size:10,color:rgb(1,1,1)});page.drawText(safe(report.patient).slice(0,85),{x:margin+38,y:height-51,font:normal,size:10,color:rgb(.83,.92,.95)});page.drawRectangle({x:0,y:height-80,width,height:4,color:rgb(.29,.65,.67)});y=height-100;}
 function room(h:number){if(y-h<bottom)addPage();}
 function text(s:string,font=normal,size=10.2,c=colors.ink,gap=6){for(const line of lines(s,font,size,usable)){room(size*1.45);if(line)page.drawText(line,{x:margin,y:y-size,size,font,color:c});y-=size*1.45;}y-=gap;}
 function heading(label:string,t:Theme){if(!label.trim())return;room(70);y-=7;const ls=lines(label,bold,12.3,usable-45),h=Math.max(33,ls.length*16+14);room(h+20);page.drawRectangle({x:margin,y:y-h,width:usable,height:h,color:t.light});page.drawRectangle({x:margin,y:y-h,width:3,height:h,color:t.main});icon(page,t.icon,margin+11,y-h/2-9,t.main,18);ls.forEach((line,i)=>page.drawText(line,{x:margin+39,y:y-20-i*16,font:bold,size:12.3,color:t.main}));y-=h+10;}
 addPage();text(report.title,bold,20,colors.navy,6);text('Preparato il '+report.date,normal,9,colors.muted,12);
 // A compact guide identifies report sections by both icon and color.
 const guide=[...new Map(report.blocks.filter(b=>b.kind==='heading').map(b=>{const t=theme(b.text||'');return [t.icon,t] as const;})).values()].slice(0,5);
 if(guide.length){room(35);page.drawLine({start:{x:margin,y:y-1},end:{x:width-margin,y:y-1},thickness:.6,color:colors.line});let x=margin;y-=20;for(const t of guide){icon(page,t.icon,x,y-1,t.main,12);const labels:Record<string,string>={pill:'Terapie',leaf:'Integratori',heart:'Cardiologia',lab:'Esami',calendar:'Calendario',file:'Cartella'};page.drawText(labels[t.icon],{x:x+18,y:y+1,size:8,font:bold,color:t.main});x+=usable/guide.length;}y-=16;}
 let section=theme(report.title);
 for(const block of report.blocks){
  if(block.kind==='heading'){if(/^Terapia\s*&\s*Cartella\s*[–-]/i.test(block.text||''))continue;section=theme(block.text||'');heading(block.text||'',section);}
  else if(block.kind==='subheading'){room(40);text(block.text||'',bold,11,section.main,7);}
  else if(block.kind==='text'){if(/^Stampato\s/.test(block.text||''))continue;text(block.text||'');}
  else if(block.kind==='table'&&block.rows?.length){
   const rows=block.rows,cols=Math.min(8,Math.max(...rows.map(r=>r.length)));if(!cols)continue;
   const weights=Array.from({length:cols},(_,i)=>{const label=(rows[0][i]||'').toLowerCase();if(/farmaco|integratore/.test(label))return 2.2;if(/dosaggio|dose|schema|modalit|patologia|note/.test(label))return 2.3;if(/ora|orari/.test(label))return 1.45;if(/stato|assunto/.test(label))return 1.3;return 1.45;});const sum=weights.reduce((a,b)=>a+b,0),widths=weights.map(v=>usable*v/sum),size=8.7,lineHeight=12;
   function row(cells:string[],isHeader:boolean,index=0){
    const wrapped=Array.from({length:cols},(_,i)=>lines(cells[i]||'',isHeader||/farmaco|integratore|orari|^ora$/.test((rows[0][i]||'').toLowerCase())?bold:normal,size,widths[i]-14));const max=Math.max(1,...wrapped.map(a=>a.length));const fullHeight=max*lineHeight+14;
    if(!isHeader&&fullHeight<height-190&&y-fullHeight<bottom){addPage();row(rows[0],true);}
    for(let offset=0;offset<max;){
     if(y-28<bottom){addPage();if(!isHeader)row(rows[0],true);}
     const count=Math.max(1,Math.min(max-offset,Math.floor((y-bottom-14)/lineHeight))),h=count*lineHeight+14;
     const background=isHeader?section.main:index%2?section.light:rgb(1,1,1);page.drawRectangle({x:margin,y:y-h,width:usable,height:h,color:background});
     let x=margin;for(let col=0;col<cols;col++){
      const label=(rows[0][col]||'').toLowerCase(),emphasize=!isHeader&&/farmaco|integratore|orari|^ora$/.test(label);let c=isHeader?rgb(1,1,1):colors.ink;
      if(!isHeader&&/stato|assunto/.test(label)){const v=cells[col]||'';if(/attivo|in corso|\[x\]|✓/i.test(v))c=rgb(.16,.45,.31);else if(/sospeso|concluso/i.test(v))c=rgb(.55,.26,.31);}
      for(let i=0;i<count;i++){const line=wrapped[col][offset+i];if(line!==undefined)page.drawText(line,{x:x+7,y:y-16-i*lineHeight,size,font:isHeader||emphasize?bold:normal,color:c});}x+=widths[col];
     }
     page.drawLine({start:{x:margin,y:y-h},end:{x:width-margin,y:y-h},thickness:.45,color:colors.line});y-=h;offset+=count;
    }
   }
   room(58);row(rows[0],true);rows.slice(1).forEach((r,i)=>row(r,false,i));if(rows.length===1){room(27);text('Nessun dato registrato per questa sezione.',normal,9,colors.muted,6);}y-=12;
  }
 }
 pages.forEach((p,i)=>{p.drawLine({start:{x:margin,y:40},end:{x:width-margin,y:40},thickness:.6,color:colors.line});p.drawText('Documento personale · '+safe(report.date),{x:margin,y:25,font:normal,size:8,color:colors.muted});p.drawText(`Pagina ${i+1} di ${pages.length}`,{x:width-margin-78,y:25,font:normal,size:8,color:colors.muted});});pdf.setTitle(safe(report.title));pdf.setAuthor(safe(report.patient));return pdf.save();
}
