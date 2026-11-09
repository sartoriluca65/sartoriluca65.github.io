import {test} from 'node:test';import assert from 'node:assert/strict';import {injectHTML} from './html.mjs';
const cfg={app:'cochi',user:'a'.repeat(64),stage:true};
test('Cochi: head/body omessi e header non scambiato per head',()=>{
 const native='<!doctype html><html lang="it"><meta charset="utf-8"><title>Cochi</title><style>body{display:grid}</style><aside>Menu</aside><main><header>Cochi</header></main><script src="app.js"></script></html>';
 const out=injectHTML(native,cfg);assert.ok(out.indexOf('/_luki/bootstrap.js')<out.indexOf('<meta'));assert.ok(out.indexOf('/_luki/bootstrap.js')<out.indexOf('src="app.js"'));assert.ok(out.indexOf('src="app.js"')<out.indexOf('/_luki/controller.js'));assert.ok(out.indexOf('/_luki/controller.js')<out.lastIndexOf('</html>'));assert.ok(out.includes('<header>Cochi</header>'));
});
test('ignora chiusure simulate in script, stile e commenti',()=>{
 const native='<!doctype html><html><head><!-- <head> --><script>const template="</body></html>";</script><style>p::before{content:"</body>"}</style></head><body><main>Archivio</main></body></html>';
 const out=injectHTML(native,cfg);assert.ok(out.indexOf('/_luki/bootstrap.js')<out.indexOf('const template'));assert.ok(out.indexOf('/_luki/controller.js')>out.indexOf('<main>Archivio</main>'));assert.ok(out.includes('const template="</body></html>";'));
});
test('chiusure opzionali fino a EOF e frammenti HTML restano utilizzabili',()=>{
 for(const native of ['<!doctype html><html><title>App</title><main>App</main>','<main>App</main>']){const out=injectHTML(native,cfg);assert.ok(out.indexOf('/_luki/bootstrap.js')<out.indexOf('<main>'));assert.ok(out.endsWith('<script src="/_luki/controller.js"></script>'));}
});
test('configurazione non può terminare il tag script',()=>{const out=injectHTML('<html><main>App</main></html>',{app:'</script><script>bad</script>'});assert.ok(out.includes('\\u003c/script>'));assert.ok(!out.includes('window.LUKI_CONFIG={"app":"</script>'));});
