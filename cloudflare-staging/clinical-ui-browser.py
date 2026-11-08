import json,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);results=[]
 for name,options in [('desktop',{'viewport':{'width':1440,'height':1000}}),('iphone',dict(p.devices['iPhone 13']))]:
  c=browser.new_context(extra_http_headers={'x-native':'1','x-test-stage':'live','x-test-app':'cartella-clinica','x-test-user':uuid.uuid4().hex*2},**options);page=c.new_page();page.set_default_timeout(10000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('https://**/*',lambda r:r.abort());page.goto('http://127.0.0.1:8766/');page.wait_for_function("window.LukiSyncTest&&typeof syncReady!=='undefined'&&syncReady&&document.getElementById('clinicalActiveProfile')")
  page.evaluate('''async()=>{data.paziente.nome='Anna';data.paziente.cognome='Test';const groups=[['Cardiologia',2],['Dentista',1],['Dermatologia',4],['Nefrologia',3]];data.documenti=groups.flatMap(([area,n])=>Array.from({length:n},(_,i)=>({id:'synthetic-'+area+'-'+i,nome:area==='Nefrologia'?(i===0?'Controllo 2026.pdf':'Esami nefrologici 26-'+(i+1)+'.pdf'):area+' controllo '+(i+1)+'.pdf',ramo:area,data:'data:application/pdf;base64,JVBERi0xLjQKJSBzeW50aGV0aWM=',nota:'Documento esclusivamente sintetico'})));window.pdfOpenCalls=[];window.openDocumentUrl=(url,name)=>pdfOpenCalls.push({url,name});repaint();await syncNow();CareExperience.refresh();}''')
  page.wait_for_function("document.getElementById('clinicalActiveProfile').textContent==='Anna Test'")
  assert 'Lukiapp' not in page.locator('body>header h1').inner_text() and 'Lukiapp' not in page.title()
  assert page.locator('#clinicalActiveProfile').inner_text()=='Anna Test'
  before=page.evaluate('JSON.stringify(data)')
  page.locator('[data-care-tab=cartella]:visible, .tab[data-tab=cartella]:visible').first.click()
  expect(page.locator('#careDocuments')).to_be_visible()
  assert page.locator('#careDocuments .care-document-group').count()==4
  assert page.locator('#careDocuments .care-document-group[open]').count()==0
  assert page.locator('#careDocuments .care-document-open:visible').count()==0
  assert page.locator('#careDocuments iframe,#careDocuments embed,#careDocuments object').count()==0
  assert page.evaluate('pdfOpenCalls.length')==0
  neph=page.locator('#careDocuments .care-document-group[data-area="Nefrologia"]');neph.locator(':scope>summary').click()
  assert neph.locator('.care-document-open:visible').count()==3
  neph.get_by_role('button',name='Apri Controllo 2026.pdf',exact=True).click()
  assert page.evaluate('pdfOpenCalls.length')==1
  assert page.evaluate('pdfOpenCalls[0].name')=='Controllo 2026.pdf'
  page.evaluate('CareExperience.refresh()');expect(neph).to_have_attribute('open','')
  page.locator('#careDocumentSearch').fill('Dermatologia');expect(page.locator('#careDocuments .care-document-group')).to_have_count(1)
  assert page.locator('#careDocuments .care-document-open:visible').count()==4
  page.locator('#careDocumentSearch').fill('');assert page.evaluate('JSON.stringify(data)')==before
  assert page.locator('#luki-sync-settings[open]').count()==0
  height=page.locator('#luki-cloud').bounding_box()['height'];assert height<=56,height
  assert not page.locator('#luki-unlock').is_visible()
  page.locator('#luki-sync-summary').click();expect(page.locator('#luki-unlock')).to_be_visible()
  page.locator('#luki-unlock').click();expect(page.locator('#luki-dialog')).to_be_visible()
  box=page.locator('#luki-dialog').bounding_box();vw=page.viewport_size['width'];assert box['x']>=0 and box['x']+box['width']<=vw+1,(box,vw)
  page.locator('#luki-dialog form button').click()
  if not page.locator('#luki-sync-settings').get_attribute('open'):page.locator('#luki-sync-summary').click()
  page.locator('#luki-lock').click();expect(page.locator('#luki-sync-brief')).to_have_text('Scollegato')
  page.locator('body>header h1').click();assert page.locator('#luki-sync-settings[open]').count()==0
  assert not errors,errors
  page.screenshot(path=str(Path(__file__).with_name('clinical-ui-'+name+'.png')),full_page=True)
  results.append({'profile':name,'syncControlHeight':height,'folders':4,'documents':10,'patientLabel':'synthetic verified','archiveUnchanged':True,'pdfOnlyOnClick':True,'passed':True});c.close()
 browser.close();print(json.dumps(results,indent=2));Path(__file__).with_name('clinical-ui-results.json').write_text(json.dumps(results,indent=2))
