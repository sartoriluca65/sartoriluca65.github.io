/* Immutable page scope. Primary storage names are intentionally unchanged. */
(function(g){'use strict';
 const ids=new URL(g.location.href).searchParams.getAll('profile'),pattern=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
 const valid=!ids.length||(ids.length===1&&pattern.test(ids[0])),id=ids[0]||'';
 function assert(){if(!valid)throw Error('Indirizzo del profilo non valido. Riapri la cartella principale.');}
 function storageKey(key){assert();return id?key+'::family:'+id:key;}
 function url(value){assert();const u=new URL(value,g.location.href);if(u.origin!==g.location.origin||!/^\/api\/(archive|files|uploads)(\/|$)/.test(u.pathname))return value;if(id)u.searchParams.set('profile',id);else u.searchParams.delete('profile');return u.pathname+u.search+u.hash;}
 g.TerapiaProfile=Object.freeze({id,valid,storageKey,url,pattern});
})(globalThis);
