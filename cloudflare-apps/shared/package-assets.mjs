import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
import {transformNative} from './native-transform.mjs';
export function packageAssets(cfg,root){
 const manifest={},files={},out=fs.mkdtempSync(path.join(os.tmpdir(),'luki-assets-'));
 const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
 for(const name of tracked){
  const prefix=cfg.sourceBase?cfg.sourceBase.replace(/\/$/,'')+'/':'';if(prefix&&!name.startsWith(prefix))continue;const relative=name.slice(prefix.length);
  if(relative.split('/').some(x=>x.startsWith('.'))||/^(tools|tests|scripts|worker|cloudflare-apps|cloudflare-staging|node_modules)\//.test(relative)||/\.(md|sql)$/.test(relative))continue;
  if(!/\.(html|js|mjs|css|json|webmanifest|svg|png|jpg|jpeg|webp|ico|gif|wasm|gz|ttf|woff2|woff|txt)$/.test(relative))continue;
  // Mai includere archivi iniziali o backup nei pacchetti applicativi.
  if(/(^|\/)(?:data|archivio|backup|snapshot)(?:[.-].*)?\.json$/i.test(relative))continue;
  let bytes=fs.readFileSync(path.join(root,name));if(/\.(html|js|mjs)$/.test(relative))bytes=Buffer.from(transformNative(cfg.app,'/'+relative,bytes.toString('utf8')));
  if(bytes.length>25*1024*1024)throw Error('Asset troppo grande: '+relative);
  const hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,32),destination=path.join(out,hash);fs.writeFileSync(destination,bytes);manifest['/'+relative]={hash,size:bytes.length};files[hash]={path:destination,relative};
 }
 if(!manifest['/index.html'])throw Error('Entrata app assente');return {manifest,files};
}
