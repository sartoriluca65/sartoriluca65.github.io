// Inserimento compatibile con i tag opzionali HTML5. Non modifica i sorgenti nativi.
export function injectHTML(html,config){
 const tokens=/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<!doctype\b[^>]*>|<head\b[^>]*>|<html\b[^>]*>|<\/(?:body|html)\s*>/gi;
 let head=-1,root=-1,doctype=-1,bodyEnd=-1,htmlEnd=-1;
 for(const token of html.matchAll(tokens)){
  const text=token[0];
  if(/^<head\b/i.test(text)&&head<0)head=token.index+text.length;
  else if(/^<html\b/i.test(text)&&root<0)root=token.index+text.length;
  else if(/^<!doctype\b/i.test(text)&&doctype<0)doctype=token.index+text.length;
  else if(/^<\/body\s*>$/i.test(text))bodyEnd=token.index;
  else if(/^<\/html\s*>$/i.test(text))htmlEnd=token.index;
 }
 const start=head>=0?head:root>=0?root:doctype>=0?doctype:0,end=bodyEnd>=0?bodyEnd:htmlEnd>=0?htmlEnd:html.length;
 if(end<start)throw Error('Struttura del documento non valida');
 const cfg=JSON.stringify(config).replace(/</g,'\\u003c');
 const prefix='<script>window.LUKI_CONFIG='+cfg+';</script><script src="/_luki/bootstrap.js"></script>',suffix='<script src="/_luki/adapter.js"></script><script src="/_luki/controller.js"></script>';
 return html.slice(0,start)+prefix+html.slice(start,end)+suffix+html.slice(end);
}
