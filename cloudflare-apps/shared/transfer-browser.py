import uuid,json,tempfile,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
with sync_playwright() as p:
 for engine in os.environ.get('TEST_ENGINES','chromium').split(','):
  browser=getattr(p,engine).launch(headless=True,**({**({'executable_path':'/usr/bin/chromium'} if os.path.exists('/usr/bin/chromium') else {}),'args':['--no-sandbox']} if engine=='chromium' else {}))
  for app in ['stickers','diviso']:
   if not (Path(__file__).resolve().parent.parent/'configs'/(app+'.json')).exists():continue
   context=browser.new_context(extra_http_headers={'x-test-app':app,'x-test-user':uuid.uuid4().hex*2},accept_downloads=True)
   old=context.new_page();old.route('https://**/*',lambda r:r.abort());old.goto('http://127.0.0.1:8770/_test/migrate.html')
   old.evaluate("app=>{if(app==='stickers'){localStorage.setItem('ss-packs',JSON.stringify([{id:'p',name:'Pacchetto sintetico'}]));localStorage.setItem('ss-stickers',JSON.stringify([{id:'x',name:'Immagine sintetica',image:'data:image/png;base64,AA=='}]));}else localStorage.setItem('diviso-v2',JSON.stringify({people:[{id:'x',name:'Persona trasferita'}],expenses:[],groups:[]}));}",app)
   old.locator('#app').select_option(app);old.locator('#check').click();expect(old.locator('#save')).to_be_enabled()
   with old.expect_download() as d:old.locator('#save').click()
   text=Path(d.value.path()).read_text();assert json.loads(text)['app']==app
   page=context.new_page();page.route('https://**/*',lambda r:r.abort());page.goto('http://127.0.0.1:8770/');page.wait_for_function('window.LukiSyncTest&&LukiAppAdapter.ready()');page.evaluate("()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close()}")
   code=page.evaluate('LukiSyncTest.createRecovery()');page.evaluate('code=>LukiSyncTest.unlock(code)',code)
   page.on('dialog',lambda d:d.accept());page.evaluate("text=>LukiSyncTest.previewArchive(new File([text],'local-transfer.json'))",text)
   with page.expect_navigation(wait_until='load'):page.get_by_role('button',name='Conferma ripristino sul dispositivo',exact=True).click()
   page.wait_for_function('window.LukiSyncTest&&LukiAppAdapter.ready()');assert page.evaluate("app=>JSON.parse(localStorage.getItem(app==='stickers'?'ss-packs':'diviso-v2'))",app)
   assert old.evaluate("app=>localStorage.getItem(app==='stickers'?'ss-packs':'diviso-v2')",app)
   print(engine+' '+app+': esportazione locale, anteprima, ripristino e originale conservato PASS',flush=True);context.close()
  browser.close()
