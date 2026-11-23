import {readFile,mkdir,writeFile,cp,readdir} from 'node:fs/promises';
const assets={};
async function collect(dir=''){for(const item of await readdir('web/'+dir,{withFileTypes:true})){const file=dir+item.name;if(item.isDirectory())await collect(file+'/');else{const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8';assets['/'+file]={body:await readFile('web/'+file,'utf8'),type};}}}
await collect();
const parts=await Promise.all(['puzzles.js','game.js','api.js','index.js'].map(f=>readFile('worker/'+f,'utf8')));
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\n'+parts.map(s=>s.replace(/^import .+;\n/gm,'')).join('\n'));
// Video lives on Pages so the Worker bundle stays small and serves text assets only.
await cp('.openai/hosting.json','dist/.openai/hosting.json');await cp('web','docs',{recursive:true});await cp('media','docs/media',{recursive:true});await writeFile('docs/.nojekyll','');console.log('Built self-contained Worker and GitHub Pages frontend, including the solo Translation Lab and walkthrough.');
