import {test} from 'node:test';import assert from 'node:assert/strict';import {validateTransfer} from './legacy-transfer.mjs';
const fixture={format:'luki-local-transfer',version:1,app:'diviso',storage:[['diviso-v2',JSON.stringify({people:[],expenses:[]})]],databases:[]};
test('trasferimento limitato all’app scelta senza token/sessioni del sito',()=>{
 assert.equal(validateTransfer(fixture,'diviso'),fixture);assert.throws(()=>validateTransfer(fixture,'stickers'));assert.throws(()=>validateTransfer({...fixture,storage:[['supabase-auth-token','{}']]},'diviso'));assert.throws(()=>validateTransfer({...fixture,storage:[...fixture.storage,...fixture.storage]},'diviso'));assert.throws(()=>validateTransfer({...fixture,databases:[{name:'other'}]},'diviso'));
});
test('immagini Sticker conservate e database estranei rifiutati',()=>{
 const value={format:'luki-local-transfer',version:1,app:'stickers',storage:[['ss-packs','[]'],['ss-stickers','[]']],databases:[{name:'luki-stickers',version:1,rows:[{id:'synthetic',image:'data:image/png;base64,AA=='}]}]};assert.equal(validateTransfer(value,'stickers').databases[0].rows[0].image,'data:image/png;base64,AA==');assert.throws(()=>validateTransfer({...value,databases:[{name:'private-session',version:1,rows:[]}]},'stickers'));
});
