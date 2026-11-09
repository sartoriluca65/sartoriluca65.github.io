import os,json,uuid,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
APPS=sorted(x.stem for x in (Path(__file__).resolve().parent.parent/'configs').glob('*.json'))
SEEDS={
'cochi':"""()=>{edit();document.getElementById('description').value='Movimento sintetico';document.getElementById('amount').value='12.34';document.getElementById('date').value='09/11/2026';document.getElementById('form').requestSubmit();}""",
'autocontrol':"""async()=>{const data=structuredClone(acArchive.get());data.vehicles.push({id:'vehicle-synthetic',make:'Marca sintetica',model:'Modello',plate:'TEST-ONLY',km:100});data.documents.push({id:'doc-synthetic',name:'Documento sintetico',files:[{id:'file-synthetic',name:'synthetic.pdf',type:'application/pdf'}]});await acArchive.putLocalFile({id:'file-synthetic',name:'synthetic.pdf',type:'application/pdf',blob:new Blob(['%PDF-synthetic-only'],{type:'application/pdf'})});localStorage.setItem('autocontrol-v1',JSON.stringify(data));acArchive.replace(data);}""",
'pienosmart':"""()=>{vehicles.push({id:'vehicle-synthetic',name:'Veicolo sintetico',type:'Automobile',fuel:'Benzina',consumption:6,capacity:50});entries.push({id:'entry-synthetic',date:'2026-11-09',vehicleId:'vehicle-synthetic',quantity:10,price:1.7,odometer:100,demo:false});localStorage.setItem('rifornioVehicles',JSON.stringify(vehicles));localStorage.setItem('rifornioEntries',JSON.stringify(entries));}""",
'stickers':"""async()=>{const record={id:'sticker-synthetic',name:'Sticker sintetico',emoji:'TEST',pack:'Prova',bg:'#ffffff',image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5u8AAAAASUVORK5CYII=',note:'SYNTHETIC-LARGE-TEXT-'.repeat(6000)};const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('luki-stickers',1);r.onupgradeneeded=()=>r.result.createObjectStore('stickers',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise((resolve,reject)=>{const tx=db.transaction('stickers','readwrite');tx.objectStore('stickers').put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();localStorage.setItem('ss-stickers',JSON.stringify([{...record,image:undefined}]));localStorage.setItem('ss-packs',JSON.stringify([{id:'pack-synthetic',name:'Prova',emoji:'TEST',author:'tu'}]));}""",
'diviso':"""()=>{const person=document.querySelector('[data-person]');person.value='Persona sintetica';person.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('add-expense').click();const title=document.querySelector('[data-title]');title.value='Spesa sintetica';title.dispatchEvent(new Event('input',{bubbles:true}));const amount=document.querySelector('[data-amount]');amount.value='12.34';amount.dispatchEvent(new Event('input',{bubbles:true}));}"""
}
READS={
'cochi':"state.rows.some(x=>x.description==='Movimento sintetico'&&x.income===1234)",
'autocontrol':"acArchive.get().vehicles.some(x=>x.id==='vehicle-synthetic')",
'pienosmart':"vehicles.some(x=>x.id==='vehicle-synthetic')&&entries.some(x=>x.id==='entry-synthetic')",
'stickers':"JSON.parse(localStorage.getItem('ss-stickers')).some(x=>x.id==='sticker-synthetic')",
'diviso':"JSON.parse(localStorage.getItem('diviso-v2')).people.some(x=>x.name==='Persona sintetica')"
}
def ready(page):
 page.wait_for_function('window.LukiSyncTest&&window.LukiAppAdapter&&LukiAppAdapter.ready()');page.evaluate("()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();document.activeElement?.blur()}")
def open_app(context):
 page=context.new_page();page.route('https://**/*',lambda r:r.abort());page.goto('http://127.0.0.1:8770/');ready(page);return page
results=[]
with sync_playwright() as p:
 for engine in os.environ.get('TEST_ENGINES','chromium').split(','):
  browser=getattr(p,engine).launch(headless=True,**({**({'executable_path':'/usr/bin/chromium'} if os.path.exists('/usr/bin/chromium') else {}),'args':['--no-sandbox']} if engine=='chromium' else {}))
  def context(app,user):
   options={'extra_http_headers':{'x-test-app':app,'x-test-user':user},'accept_downloads':True}
   if engine=='webkit':return p.webkit.launch_persistent_context(tempfile.mkdtemp(prefix='luki-five-webkit-'),headless=True,**options)
   return browser.new_context(**options)
  for app in os.environ.get('TEST_APPS',','.join(APPS)).split(','):
   user=uuid.uuid4().hex*2;contexts=[context(app,user) for _ in range(2)];a,b=[open_app(c) for c in contexts]
   a.evaluate(SEEDS[app]);a.reload();ready(a);assert a.evaluate(READS[app]),app
   a.evaluate("()=>{const d=document.getElementById('luki-sync-settings');if(d)d.open=true}");a.locator('#luki-unlock').click();a.get_by_role('button',name='Crea chiave per il primo dispositivo',exact=True).click();expect(a.locator('#luki-dialog input')).to_have_value(__import__('re').compile(r'^[A-Za-z0-9_-]{43}$'));code=a.locator('#luki-dialog input').input_value();a.get_by_role('button',name='Sblocca con questa chiave',exact=True).click();expect(a.locator('#luki-status')).to_contain_text('Sincronizzato',timeout=15000)
   # Un vecchio abbinamento locale non deve respingere una chiave verificata sul cloud.
   previous=b.evaluate("()=>{localStorage.setItem('before-pairing','synthetic-preserved');LukiStorage.update({keyFingerprint:'f'.repeat(64)});return LukiStorage.generation}")
   b.on('dialog',lambda d:d.accept());b.evaluate("()=>{const d=document.getElementById('luki-sync-settings');if(d)d.open=true}");b.locator('#luki-unlock').click();b.locator('#luki-dialog input').fill(code)
   with b.expect_navigation(wait_until='load'):b.get_by_role('button',name='Sblocca con questa chiave',exact=True).click()
   ready(b);expect(b.locator('#luki-status')).to_contain_text('sbloccata in questa scheda',timeout=10000);assert b.evaluate(READS[app]),app
   assert b.evaluate("old=>LukiStorage.native.get.call(LukiStorage.nativeLocal,'luki:'+LUKI_CONFIG.app+':'+LUKI_CONFIG.user+':'+old+':before-pairing')",previous)=='synthetic-preserved'
   if app=='autocontrol':assert b.evaluate("async()=>await(await acArchive.localFile('file-synthetic')).blob.text()")=='%PDF-synthetic-only'
   if os.environ.get('DEBUG_SNAPSHOT'):
    delta=b.evaluate("""async code=>{const box=await fetch('/_sync/snapshot?revision=1',{headers:{'X-Luki-User':LUKI_CONFIG.user}}).then(r=>r.json());const bytes=await LukiSyncTest.open(await LukiSyncTest.importRecovery(code),box,'luki-v1|'+LUKI_CONFIG.app+'|'+LUKI_CONFIG.user+'|snapshot'),remote=JSON.parse(new TextDecoder().decode(bytes)),local=await LukiSyncTest.capture(),out=[];function diff(a,b,path){if(LukiSyncTest.stable(a)===LukiSyncTest.stable(b))return;if(!a||!b||typeof a!=='object'||typeof b!=='object'){out.push({path,a,b});return;}for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],path+'/'+k);}diff(remote,local,'');return out.slice(0,20)}""",code)
    print(json.dumps({'app':app,'delta':delta}),flush=True)
   # Un aggiornamento locale ordinario arriva senza reinserire la chiave sul secondo browser.
   a.evaluate("localStorage.setItem('automatic-synthetic','second-revision')");a.evaluate('LukiSyncTest.tick()');b.wait_for_timeout(3400)
   try:
    with b.expect_navigation(wait_until='load'):b.evaluate('LukiSyncTest.tick()')
   except Exception:
    print(json.dumps({'debugApp':app,'a':a.locator('#luki-status').inner_text(),'b':b.locator('#luki-status').inner_text(),'ready':b.evaluate('LukiAppAdapter.ready()'),'busy':b.evaluate('LukiAppAdapter.busy()'),'control':b.evaluate('LukiStorage.readControl()')}),flush=True)
    raise
   ready(b);expect(b.locator('#luki-status')).to_contain_text('sbloccata in questa scheda',timeout=10000);assert b.evaluate("localStorage.getItem('automatic-synthetic')")=='second-revision'
   # Export cifrato e anteprima: nessun dato/chiave in chiaro nel file.
   with b.expect_download() as d:b.evaluate('LukiSyncTest.exportArchive()')
   backup=Path(d.value.path()).read_text();assert code not in backup and 'Movimento sintetico' not in backup and '%PDF-synthetic-only' not in backup
   before=b.evaluate('LukiStorage.readControl().generation')
   bad=json.loads(backup);bad['envelope']['ciphertext']='A'+bad['envelope']['ciphertext'][1:] if bad['envelope']['ciphertext'][0]!='A' else 'B'+bad['envelope']['ciphertext'][1:]
   assert b.evaluate("async text=>{try{await LukiSyncTest.previewArchive(new File([text],'corrupt.json'));return false}catch{return true}}",json.dumps(bad))
   assert b.evaluate('LukiStorage.readControl().generation')==before
   b.evaluate("localStorage.setItem('before-backup-restore','synthetic-retained')")
   b.evaluate("text=>LukiSyncTest.previewArchive(new File([text],'synthetic-backup.json'))",backup)
   with b.expect_navigation(wait_until='load'):b.get_by_role('button',name='Conferma ripristino sul dispositivo',exact=True).click()
   ready(b);assert b.evaluate(READS[app]);assert b.evaluate('LukiStorage.readControl().conflict')=='restored-copy'
   assert b.evaluate("old=>LukiStorage.native.get.call(LukiStorage.nativeLocal,'luki:'+LUKI_CONFIG.app+':'+LUKI_CONFIG.user+':'+old+':before-backup-restore')",before)=='synthetic-retained'
   # Un altro utente non vede revisioni, neppure con identificativi conosciuti.
   other=context(app,uuid.uuid4().hex*2);c=open_app(other)
   assert c.evaluate("fetch('/_sync/head',{headers:{'X-Luki-User':LUKI_CONFIG.user}}).then(r=>r.json()).then(r=>r.revision)")==0
   assert c.evaluate("fetch('/_sync/snapshot?revision=1',{headers:{'X-Luki-User':LUKI_CONFIG.user}}).then(r=>r.status)")==404
   # Riapertura iPhone dalla cache: il motore deve ripartire con la chiave già verificata.
   with a.expect_navigation(wait_until='load'):a.evaluate("window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))")
   ready(a);expect(a.locator('#luki-status')).to_contain_text('sbloccata in questa scheda',timeout=10000)
   other.close();[c.close() for c in contexts];row={'engine':engine,'app':app,'flows':'create,verified-pairing,automatic-sync,encrypted-backup,corrupt-rejection,restore,isolation,bfcache passed'};results.append(row);print(json.dumps(row),flush=True)
  browser.close()
Path(__file__).with_name('integration-results.json').write_text(json.dumps(results,indent=2))
