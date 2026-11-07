import json,uuid,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('CHUNK_TEST_URL','http://127.0.0.1:8766/')
PENDING='''async()=>{const S=LukiStorage,db=await new Promise((ok,no)=>{const r=S.native.open('luki-transport:'+S.cfg.app+':'+S.cfg.user);r.onsuccess=()=>ok(r.result);r.onerror=no});return new Promise((ok,no)=>{const r=S.native.transaction.call(db,'items','readonly').objectStore('items').get('pending');r.onsuccess=()=>{db.close();ok(r.result)};r.onerror=no})}'''
READALL='''async()=>{const S=LukiStorage,db=await new Promise((ok,no)=>{const r=S.native.open('luki-transport:'+S.cfg.app+':'+S.cfg.user);r.onsuccess=()=>ok(r.result);r.onerror=no});return new Promise((ok,no)=>{const r=S.native.transaction.call(db,'items','readonly').objectStore('items').getAll();r.onsuccess=()=>{db.close();ok(r.result)};r.onerror=no})}'''
SEED='''async()=>{window.testCode=LukiSyncTest.createRecovery();await LukiSyncTest.unlock(testCode);await fixturePut({one:new Blob(['%PDF-synthetic-duplicate']),two:new Blob(['%PDF-synthetic-duplicate']),label:'synthetic original'});}'''
DAMAGE='''async()=>{const S=LukiStorage,db=await new Promise((ok,no)=>{const r=S.native.open('luki-transport:'+S.cfg.app+':'+S.cfg.user);r.onsuccess=()=>ok(r.result);r.onerror=no});await new Promise((ok,no)=>{const tx=S.native.transaction.call(db,'items','readwrite'),store=tx.objectStore('items'),r=store.get('pending');r.onsuccess=()=>{window.previousPending=structuredClone(r.result);const missing=r.result.envelope.files[0],cursor=store.openCursor();cursor.onsuccess=()=>{const c=cursor.result;if(c){if(c.value?.hash===missing)c.delete();c.continue()}}};tx.oncomplete=ok;tx.onerror=no;});db.close();}'''
with sync_playwright() as p:
 executable=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium')
 browser=p.chromium.launch(args=['--no-sandbox'],**({'executable_path':executable} if executable else {}));results=[]
 for profile,opts in [('desktop',{}),('mobile',dict(p.devices['iPhone 13']))]:
  for scenario in ['duplicate','repair','missing-original','cancel','wrong-key']:
   context=browser.new_context(extra_http_headers={'x-test-app':'cartella-clinica','x-test-user':uuid.uuid4().hex*2},**opts);page=context.new_page();page.goto(BASE);page.wait_for_function('window.LukiSyncTest&&window.fixtureDB');page.evaluate(SEED)
   if scenario=='duplicate':
    page.evaluate('LukiSyncTest.tick()');expect(page.locator('#luki-status')).to_contain_text('Sincronizzato')
    assert page.evaluate("fetch('/_sync/head',{headers:{'X-Luki-User':LUKI_CONFIG.user}}).then(r=>r.json()).then(r=>r.revision)")==1
   else:
    def interrupt(route):
     if route.request.method=='HEAD':route.fulfill(status=404,body='')
     else:route.fulfill(status=503,body='synthetic interruption')
    page.route('**/_sync/blob/**',interrupt);page.evaluate('LukiSyncTest.tick()');page.unroute('**/_sync/blob/**')
    assert page.evaluate(PENDING)
    page.evaluate(DAMAGE);page.evaluate('LukiSyncTest.tick()');expect(page.locator('#luki-status')).to_contain_text('Frammento locale non disponibile')
    expect(page.locator('#luki-repair-chunks')).to_be_visible()
    if scenario=='missing-original':page.evaluate("fixturePut({label:'synthetic original removed'})")
    if scenario=='wrong-key':page.evaluate('LukiSyncTest.unlock(LukiSyncTest.createRecovery())')
    page.on('dialog',lambda d:d.dismiss() if scenario=='cancel' else d.accept())
    page.locator('#luki-repair-chunks').click()
    if scenario=='repair':
     expect(page.locator('#luki-status')).to_contain_text('Sincronizzato')
     preserved=page.evaluate(READALL);assert any(x.get('operationId')==page.evaluate('previousPending.operationId') for x in preserved)
     assert page.evaluate(PENDING) is None
     # A second independent browser can decrypt and reopen both identical attachments.
     code=page.evaluate('testCode');second_context=browser.new_context(extra_http_headers={'x-test-app':'cartella-clinica','x-test-user':page.evaluate('LUKI_CONFIG.user')},**opts);second=second_context.new_page();second.goto(BASE);second.wait_for_function('window.LukiSyncTest&&window.fixtureDB');second.evaluate('(code)=>LukiSyncTest.unlock(code)',code)
     second.evaluate('''async()=>{const box=await fetch('/_sync/snapshot',{headers:{'X-Luki-User':LUKI_CONFIG.user}}).then(r=>r.json());const bytes=await LukiSyncTest.open(await LukiSyncTest.importRecovery('''+json.dumps(code)+'''),box,'luki-v1|cartella-clinica|'+LUKI_CONFIG.user+'|snapshot');window.copy=JSON.parse(new TextDecoder().decode(bytes));window.copyHash=await LukiSyncTest.hash(bytes);}''')
     with second.expect_navigation(wait_until='load'):second.evaluate('LukiSyncTest.restore(copy,1,copyHash)')
     second.wait_for_function('window.LukiSyncTest&&window.fixtureDB');value=second.evaluate("async()=>{const row=await fixtureRead();return {one:await row.one.text(),two:await row.two.text()}}")
     assert value=={'one':'%PDF-synthetic-duplicate','two':'%PDF-synthetic-duplicate'};second_context.close()
    else:
     if scenario!='cancel':expect(page.locator('#luki-status')).to_contain_text('Ricostruzione non completata')
     assert page.evaluate(PENDING)['operationId']==page.evaluate('previousPending.operationId')
     assert page.evaluate("fetch('/_sync/head',{headers:{'X-Luki-User':LUKI_CONFIG.user}}).then(r=>r.json()).then(r=>r.revision)")==0
   results.append({'profile':profile,'scenario':scenario,'passed':True});print('PASS',profile,scenario,flush=True);context.close()
 browser.close();open(Path(__file__).with_name('chunk-browser-results.json'),'w').write(json.dumps(results,indent=2))
