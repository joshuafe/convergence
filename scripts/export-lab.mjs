import {readFile,writeFile} from 'node:fs/promises';
const [destination]=process.argv.slice(2);if(!destination)throw Error('Pass an absolute output HTML path.');
const [html,css,engine,app]=await Promise.all(['index.html','style.css','engine.js','app.js'].map(f=>readFile('web/lab/'+f,'utf8')));
const result=html.replace('<link rel="stylesheet" href="./style.css">','<style>'+css+'</style>').replace('<script type="module" src="./app.js"></script>','<script type="module">'+engine+'\n'+app.replace(/^import .+;\n/,'')+'</script>');
await writeFile(destination,result);console.log('Saved standalone solo game: '+destination);
