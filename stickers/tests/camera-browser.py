import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).parent.parent
text=(root/'app.js').read_text()
code=text[text.index('// camera-controls-start'):text.index('// camera-controls-end')]
setup='''
let cameraStream=null,cameraGeneration=0,uploadMode='single';
const qs=s=>document.querySelector(s);const toast=()=>{};
function stopCamera(){cameraGeneration++;cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null;}
function closeModal(){stopCamera();document.body.innerHTML='';}
function setModal(html){document.body.innerHTML=html;qs('#modal-close').onclick=closeModal;}
let calls=[],stops=[],pending=false,resolvePending;
function streamFor(id){const s=new MediaStream(),track={stop:()=>stops.push(id),getSettings:()=>({deviceId:id})};s.getTracks=()=>[track];s.getVideoTracks=()=>[track];return s;}
Object.defineProperty(navigator,'mediaDevices',{value:{
getUserMedia:async c=>{calls.push(c);if(pending)return await new Promise(r=>resolvePending=r);return streamFor(c.video.deviceId?.exact||'iphone');},
enumerateDevices:async()=>[{kind:'videoinput',deviceId:'iphone',label:'iPhone Camera'},{kind:'videoinput',deviceId:'mac',label:'FaceTime HD Camera (Built-in)'}]}});
HTMLMediaElement.prototype.play=async function(){};
'''
async def run():
 async with async_playwright() as p:
  for engine in ['chromium','webkit']:
   browser=await getattr(p,engine).launch(**({'executable_path':'/usr/bin/chromium','args':['--no-sandbox']} if engine=='chromium' else {}))
   page=await browser.new_page()
   await page.route('https://camera.test/**',lambda route:route.fulfill(body='<html><body></body></html>',content_type='text/html'))
   await page.goto('https://camera.test/')
   await page.add_script_tag(content=setup+'\n'+code)
   await page.evaluate('openCameraCapture()')
   assert await page.evaluate("calls[0].video.facingMode===undefined&&calls[1].video.deviceId.exact==='mac'")
   assert await page.locator('#camera-select').input_value()=='mac'
   await page.select_option('#camera-select','iphone')
   await page.wait_for_function("!document.querySelector('#take-photo').disabled")
   assert await page.evaluate("calls.at(-1).video.deviceId.exact==='iphone'")
   await page.click('#rotate-camera');await page.click('#rotate-camera');await page.click('#mirror-camera')
   assert '180deg' in await page.locator('#live-camera').evaluate('(v)=>v.style.transform')
   assert await page.locator('#mirror-camera').get_attribute('aria-pressed')=='true'
   await page.click('#cancel-camera');assert await page.evaluate('cameraStream===null&&stops.length>=3')
   await page.evaluate("pending=true;window.opening=openCameraCapture();void 0")
   await page.wait_for_selector('#cancel-camera');await page.click('#cancel-camera')
   await page.evaluate("resolvePending(streamFor('late'));pending=false")
   await page.evaluate('window.opening');assert await page.evaluate("stops.includes('late')&&cameraStream===null")
   await browser.close();print(engine+': scelta integrata, cambio camera, rotazione, specchio, chiusura e richiesta tardiva OK')
asyncio.run(run())
