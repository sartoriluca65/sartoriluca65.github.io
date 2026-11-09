import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import './build.mjs';import {packageAssets} from './package-assets.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath,['--test',path.join(dir,'worker.test.mjs'),path.join(dir,'services.test.mjs'),path.join(dir,'legacy-transfer.test.mjs'),path.join(dir,'html.test.mjs')],{stdio:'inherit'});
const requested=process.argv[2],configDir=path.join(dir,'../configs'),files=requested?[requested+'.json']:fs.readdirSync(configDir).filter(f=>f.endsWith('.json'));
for(const name of files){const cfg=JSON.parse(fs.readFileSync(path.join(configDir,name)));const assets=packageAssets(cfg,path.resolve(dir,'../..'));console.log(cfg.app+': '+Object.keys(assets.manifest).length+' asset verificati');}
