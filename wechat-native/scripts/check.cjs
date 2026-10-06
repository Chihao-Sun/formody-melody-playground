const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),mini=path.join(root,'miniprogram');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
let bytes=0,checked=0;
for(const file of files(mini)){
  bytes+=fs.statSync(file).size;
  const text=/\.(js|json|wxml|wxss)$/.test(file)?fs.readFileSync(file,'utf8'):'';
  if(file.endsWith('.js')){
    cp.execFileSync(process.execPath,['--check',file]);
    for(const m of text.matchAll(/require\(['"]([^'"]+)['"]\)/g))if(!fs.existsSync(path.resolve(path.dirname(file),m[1])))throw new Error('Missing module '+m[1]);
    if(/\b(window|navigator|document|ResizeObserver|OffscreenCanvas)\s*[.(?]/.test(text))throw new Error('Browser global: '+file);
  }
  if(file.endsWith('.json'))JSON.parse(text);
  if(file.endsWith('.wxml')){
    const page=fs.readFileSync(file.replace('.wxml','.js'),'utf8');
    for(const m of text.matchAll(/(?:bind|catch)(?:tap|touchstart|touchmove|touchend|touchcancel)="([\w]+)"/g))if(!new RegExp('\\b'+m[1]+'\\s*\\(').test(page))throw new Error('Unbound handler '+m[1]);
    for(const m of text.matchAll(/src="(\/assets\/[^{}"]+)"/g))if(!fs.existsSync(path.join(mini,m[1])))throw new Error('Missing asset '+m[1]);
    if(/<web-view\b/.test(text))throw new Error('Native project must not embed gameplay in web-view');
  }
  checked++;
}
for(const p of JSON.parse(fs.readFileSync(path.join(mini,'app.json'))).pages)for(const ext of ['.js','.wxml','.wxss','.json'])if(!fs.existsSync(path.join(mini,p+ext)))throw new Error('Missing page file '+p+ext);
if(bytes>=2*1024*1024)throw new Error('Raw main-package source exceeds 2 MiB; measure final compiler package as well.');
console.log(JSON.stringify({files:checked,rawMiniProgramBytes:bytes,staticChecks:'passed',wechatCompiler:'not_run',deviceAcceptance:'not_run'},null,2));
