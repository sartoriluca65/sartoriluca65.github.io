import uuid,json
from playwright.sync_api import sync_playwright,expect
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mode in ['indexeddb','localStorage']:
  user=uuid.uuid4().hex*2;contexts=[b.new_context(extra_http_headers={'x-native':'1','x-test-stage':'live','x-test-app':'cartella-clinica','x-test-user':user},**({} if i==0 else dict(p.devices['iPhone 13']))) for i in range(2)];pages=[]
  for c in contexts:
   page=c.new_page();page.route('https://**/*',lambda r:r.abort());page.goto('http://127.0.0.1:8766/');page.wait_for_function("window.LukiSyncTest&&typeof syncReady!=='undefined'&&syncReady");pages.append(page)
  a,second=pages;code=a.evaluate('LukiSyncTest.createRecovery()');a.evaluate('(code)=>LukiSyncTest.unlock(code)',code)
  a.evaluate("async(mode)=>{cacheMode=mode;data.paziente.nome='Paziente esclusivamente sintetico';data.farmaci.push({id:'synthetic',nome:'Medicinale sintetico'});await syncNow();}",mode)
  a.evaluate('LukiSyncTest.tick()')
  second.evaluate('(code)=>LukiSyncTest.unlock(code)',code);second.locator('#luki-sync-summary').click();second.locator('#luki-history').click();second.on('dialog',lambda d:d.accept())
  with second.expect_navigation(wait_until='load'):second.get_by_role('button',name='Verifica e usa sul dispositivo',exact=True).first.click()
  second.wait_for_function("window.LukiSyncTest&&typeof syncReady!=='undefined'&&syncReady")
  actual=second.evaluate("({name:data.paziente.nome,medicines:data.farmaci.length,mode:cacheMode})")
  second.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
  requests=[];second.on('request',lambda r:requests.append(r.method))
  before=second.evaluate('JSON.stringify(LukiStorage.readControl())')
  if not second.locator('#luki-sync-settings').get_attribute('open'):second.locator('#luki-sync-summary').click()
  second.locator('#luki-clinical-diagnostic').click();expect(second.locator('#luki-dialog pre')).to_be_visible()
  report=json.loads(second.locator('#luki-dialog pre').inner_text())
  assert 'Paziente esclusivamente sintetico' not in json.dumps(report)
  assert code not in json.dumps(report)
  assert before==second.evaluate('JSON.stringify(LukiStorage.readControl())')
  assert not any(m in ['POST','PUT','DELETE','PATCH'] for m in requests)
  if mode=='localStorage':
   assert report['interfaccia']['conteggi']['farmaci']==0
   assert report['copiaOnline']['compatibilita'][0]['conteggi']['farmaci']==1
   assert report['copiaOnline']['database'][0]['conteggi']['farmaci']==0
  else:assert report['interfaccia']['conteggi']['farmaci']==1 and report['copiaOnline']['database'][0]['conteggi']['farmaci']==1
  second.locator('#luki-dialog form button').click();second.locator('#luki-lock').click()
  second.locator('#luki-clinical-diagnostic').click();second.get_by_label('Chiave per verifica di sola lettura').fill(code);second.get_by_role('button',name='Verifica senza sincronizzare',exact=True).click();expect(second.locator('#luki-dialog pre')).to_be_visible()
  assert second.evaluate("LukiStorage.native.get.call(LukiStorage.nativeSession,'luki-tab-key:'+LUKI_CONFIG.app+':'+LUKI_CONFIG.user)") is None
  assert not any(m in ['POST','PUT','DELETE','PATCH'] for m in requests)
  print(json.dumps({'sourceMode':mode,'destination':actual,'diagnosticReadOnly':True,'sensitiveValuesExcluded':True,'lockedModeRemainsLocked':True}),flush=True)
  for c in contexts:c.close()
 b.close()
