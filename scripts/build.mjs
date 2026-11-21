import {readFile,mkdir,writeFile,cp} from 'node:fs/promises';
const assets={};for(const [f,type] of [['index.html','text/html; charset=utf-8'],['style.css','text/css; charset=utf-8'],['app.js','text/javascript; charset=utf-8']])assets['/'+f]={body:await readFile('web/'+f,'utf8'),type};
const parts=await Promise.all(['puzzles.js','game.js','api.js','index.js'].map(f=>readFile('worker/'+f,'utf8')));
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\n'+parts.map(s=>s.replace(/^import .+;\n/gm,'')).join('\n'));
await cp('.openai/hosting.json','dist/.openai/hosting.json');await mkdir('docs',{recursive:true});for(const f of ['index.html','style.css','app.js'])await cp('web/'+f,'docs/'+f);await writeFile('docs/.nojekyll','');console.log('Built self-contained Worker and GitHub Pages frontend.');
