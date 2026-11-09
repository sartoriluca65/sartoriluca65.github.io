"""Fixture locale: stessa barra nelle cinque app, nessun dato reale o login remoto."""
import os,tempfile,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
APPS=['cochi','autocontrol','pienosmart','stickers','diviso']
results=[]
with sync_playwright() as p:
 for engine in os.environ.get('TEST_ENGINES','chromium,firefox,webkit').split(','):
  for app in APPS:
   opts=dict(headless=True,viewport={'width':390,'height':844},extra_http_headers={'x-test-app':app,'x-test-user':'a'*64})
   if engine=='chromium':opts.update(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   context=getattr(p,engine).launch_persistent_context(tempfile.mkdtemp(prefix='luki-bar-'),**opts);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8770/');page.wait_for_function('window.LukiAppAdapter?.ready()');page.evaluate('()=>{for(const d of document.querySelectorAll("dialog[open]"))d.close()}')
   expect(page.locator('#luki-sync-summary')).to_be_visible();expect(page.locator('#luki-backup')).to_be_visible();expect(page.locator('#luki-updates')).to_be_visible();box=page.locator('#luki-cloud').bounding_box();assert box['width']<=392 and box['height']<105,(app,box)
   page.locator('#luki-backup').click();expect(page.locator('#luki-dialog')).to_be_visible();expect(page.locator('#luki-dialog')).to_contain_text('Esporta backup cifrato JSON');page.locator('#luki-dialog').get_by_role('button',name='Chiudi',exact=True).click()
   page.locator('#luki-updates').click();expect(page.locator('#luki-dialog')).to_contain_text('Versione:');page.locator('#luki-dialog').get_by_role('button',name='Controlla aggiornamenti',exact=True).click();expect(page.locator('#luki-dialog-status')).to_contain_text('versione è aggiornata');page.locator('#luki-dialog').get_by_role('button',name='Chiudi',exact=True).click()
   page.locator('#luki-sync-summary').click();expect(page.locator('#luki-unlock')).to_be_visible();expect(page.locator('#luki-history')).to_be_visible();expect(page.locator('#luki-now')).to_be_visible();page.keyboard.press('Escape');assert not page.locator('#luki-sync-settings').evaluate('(x)=>x.open')
   assert not errors,errors
   if os.environ.get('BAR_SCREENSHOT') and engine=='chromium' and app=='cochi':page.screenshot(path=os.environ['BAR_SCREENSHOT'],full_page=False)
   context.close();row={'app':app,'engine':engine,'flows':'compact mobile bar, sync menu, backup dialog, updates check, escape passed'};results.append(row);print(json.dumps(row),flush=True)
Path(__file__).with_name('bar-results.json').write_text(json.dumps(results,indent=2))
