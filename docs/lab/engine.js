// A bounded, deterministic toy language. The lab partner receives observations,
// never the hidden key. All feedback comes from this shared scene interpreter.
export const OBJECTS=['bird','star','box'];
export const NAMES={bird:'Bird',star:'Star',box:'Box'};
export const MEANINGS={above:{label:'Place above',short:'ABOVE',clue:'lookout',description:'Move one token directly above the other.'},inside:{label:'Put inside',short:'INSIDE',clue:'pocket',description:'Put Bird or Star inside Box.'},swap:{label:'Swap places',short:'SWAP',clue:'trading places',description:'Exchange two outside tokens. Box carries its contents.'},beside:{label:'Place to the right',short:'RIGHT OF',clue:'next-door neighbour',description:'Move one token directly to the right of the other.'}};
const SYMBOL_SETS=[['◇','ϟ','⌁'],['⊙','⋈','⌇'],['⌑','⊕','⋒'],['⋄','≋','⟐']];
export const CASES=[
 {title:'A place to nest',subtitle:'Discover what the symbols do.',ops:['above','inside','swap'],order:'first',humanOp:'swap',partnerOp:'inside',intro:'Two observations. Two different perspectives. Build a message that gives Bird a home and Star a lookout.',goalText:'Bird inside Box. Star directly above Box.'},
 {title:'Who moves whom?',subtitle:'A new dialect changes the order.',ops:['above','inside','swap'],order:'second',humanOp:'above',partnerOp:'swap',intro:'Your old translations have been cleared. The same message structure may behave differently in this dialect.',goalText:'Box on the landing pad. Star inside Box. Bird directly above Box.'},
 {title:'The moving house',subtitle:'Use the language to plan a construction.',ops:['above','inside','beside'],order:'first',humanOp:'beside',partnerOp:'inside',intro:'This dialect has a different action. Box carries anything inside it when it moves. The order of your steps matters.',goalText:'Box on the landing pad. Bird inside Box. Star directly above Box.'}
];
export const copy=x=>JSON.parse(JSON.stringify(x));
export function rng(seed){let x=Number(seed)>>>0;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function shuffled(a,random){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function canonical(scene){return OBJECTS.map(id=>{const p=scene[id];return id+':'+(p.in?'in-'+p.in:p.x+','+p.y);}).join('|');}
function fail(scene,code,text){return {ok:false,scene:copy(scene),code,text};}
export function applyMeaning(scene,actor,meaning,target){
 const next=copy(scene),a=next[actor],b=next[target];
 if(!a||!b||actor===target)return fail(scene,'same-token','Choose two different tokens.');
 if(meaning==='inside'){
   if(actor==='box'||target!=='box')return fail(scene,'does-not-fit','Only Bird or Star can fit inside Box.');
   a.in='box';return {ok:true,scene:next,text:NAMES[actor]+' is now inside Box.'};
 }
 if(meaning==='swap'){
   if(a.in||b.in)return fail(scene,'inside-swap','A token inside Box cannot be swapped. Move it outside first.');
   [a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];
   return {ok:true,scene:next,text:NAMES[actor]+' and '+NAMES[target]+' swapped places.'+(actor==='box'||target==='box'?' Box carried its contents.':'')};
 }
 if(!['above','beside'].includes(meaning))return fail(scene,'unknown-rule','That action is not in this dialect.');
 if(b.in)return fail(scene,'hidden-anchor','The reference token is inside Box. Bring it outside to use it as a landmark.');
 const x=b.x+(meaning==='beside'?1:0),y=b.y-(meaning==='above'?1:0);
 if(x<0||x>2||y<0||y>2)return fail(scene,'edge','That instruction would move a token beyond the edge of the board.');
 if(OBJECTS.some(id=>id!==actor&&!next[id].in&&next[id].x===x&&next[id].y===y))return fail(scene,'occupied','That space is occupied. Rearrange the scene and try again.');
 a.in=null;a.x=x;a.y=y;
 return {ok:true,scene:next,text:NAMES[actor]+' moved '+(meaning==='above'?'above':'to the right of')+' '+NAMES[target]+'.'+(actor==='box'?' Box carried its contents.':'')};
}
export function interpret(scene,message,key){
 if(!message||!key.mapping[message.glyph])return fail(scene,'unknown-symbol','Choose a symbol for the message.');
 return applyMeaning(scene,key.order==='first'?message.first:message.second,key.mapping[message.glyph],key.order==='first'?message.second:message.first);
}
export function outcome(result){return result.ok?'ok:'+canonical(result.scene):'error:'+result.code;}
function permutations(a){return a.length===0?[[]]:a.flatMap((x,i)=>permutations(a.filter((_,j)=>j!==i)).map(rest=>[x,...rest]));}
export function allKeys(glyphs,ops){return permutations(ops).flatMap(ops=>['first','second'].map(order=>({order,mapping:Object.fromEntries(glyphs.map((g,i)=>[g,ops[i]]))})));}
export function candidates(glyphs,ops,observations){return allKeys(glyphs,ops).filter(k=>observations.every(o=>outcome(interpret(o.before,o.message,k))===o.result));}
export function messages(glyphs){return glyphs.flatMap(glyph=>OBJECTS.flatMap(first=>OBJECTS.filter(second=>second!==first).map(second=>({first,glyph,second}))));}
export function goalChecks(scene,goals){return goals.map(g=>{
 let ok=false;
 if(g.type==='inside')ok=scene[g.actor].in===g.target;
 if(g.type==='above')ok=!scene[g.actor].in&&!scene[g.target].in&&scene[g.actor].x===scene[g.target].x&&scene[g.actor].y===scene[g.target].y-1;
 if(g.type==='at')ok=!scene[g.actor].in&&scene[g.actor].x===g.x&&scene[g.actor].y===g.y;
 return {...g,ok};
});}
export const isSolved=(scene,goals)=>goalChecks(scene,goals).every(g=>g.ok);
export function findPlan(scene,goals,key,glyphs,maxDepth=5){
 if(isSolved(scene,goals))return [];
 const queue=[{scene:copy(scene),steps:[]}],seen=new Set([canonical(scene)]),possible=messages(glyphs);
 for(let i=0;i<queue.length;i++){
   const item=queue[i];if(item.steps.length>=maxDepth)continue;
   for(const message of possible){const result=interpret(item.scene,message,key);if(!result.ok)continue;const signature=canonical(result.scene);if(seen.has(signature))continue;seen.add(signature);const steps=[...item.steps,message];if(isSolved(result.scene,goals))return steps;queue.push({scene:result.scene,steps});}
 }
 return null;
}
function observation(key,op,glyphs,random){
 const scenes=[
  {bird:{x:0,y:2,in:null},star:{x:2,y:2,in:null},box:{x:1,y:1,in:null}},
  {bird:{x:2,y:2,in:null},star:{x:0,y:2,in:null},box:{x:1,y:1,in:null}},
  {bird:{x:0,y:2,in:null},star:{x:2,y:1,in:null},box:{x:0,y:1,in:null}}
 ];
 const glyph=glyphs.find(g=>key.mapping[g]===op),options=[];
 for(const before of scenes)for(const message of messages([glyph])){const r=interpret(before,message,key);if(r.ok&&canonical(r.scene)!==canonical(before))options.push({before:copy(before),message,result:outcome(r),after:r.scene});}
 if(!options.length)throw Error('No witness for '+op);
 return copy(options[Math.floor(random()*options.length)]);
}
export function makeMission(caseIndex=0,seed=20261122,remix=false){
 const spec=CASES[caseIndex],random=rng(seed),glyphs=remix?shuffled(SYMBOL_SETS[Math.floor(random()*SYMBOL_SETS.length)],random):SYMBOL_SETS[caseIndex],assigned=shuffled(spec.ops,random);
 const key={order:remix?(random()<.5?'first':'second'):spec.order,mapping:Object.fromEntries(glyphs.map((g,i)=>[g,assigned[i]]))};
 let start={bird:{x:0,y:2,in:null},star:{x:2,y:2,in:null},box:{x:1,y:1,in:null}},pad=null;
 let goals=[{type:'inside',actor:'bird',target:'box',label:'Bird is inside Box'},{type:'above',actor:'star',target:'box',label:'Star is directly above Box'}];
 if(caseIndex===0&&remix&&random()<.5){[start.bird,start.star]=[start.star,start.bird];}
 if(caseIndex===1){pad={...start.star};goals=[{type:'at',actor:'box',x:pad.x,y:pad.y,label:'Box is on the landing pad'},{type:'inside',actor:'star',target:'box',label:'Star is inside Box'},{type:'above',actor:'bird',target:'box',label:'Bird is directly above Box'}];}
 if(caseIndex===2){start={bird:{x:1,y:2,in:null},star:{x:1,y:1,in:null},box:{x:0,y:1,in:null}};pad={x:2,y:1};goals=[{type:'at',actor:'box',x:2,y:1,label:'Box is on the landing pad'},{type:'inside',actor:'bird',target:'box',label:'Bird is inside Box'},{type:'above',actor:'star',target:'box',label:'Star is directly above Box'}];}
 const human=observation(key,spec.humanOp,glyphs,random),partner=observation(key,spec.partnerOp,glyphs,random);
 return {caseIndex,seed,remix,title:spec.title,subtitle:spec.subtitle,intro:spec.intro,goalText:spec.goalText,glyphs,ops:spec.ops,key,start,goals,pad,human,partner};
}
// This helper's signature deliberately excludes the mission key and human note.
export function partnerState(glyphs,ops,ownObservation,publicObservations=[]){
 const possible=candidates(glyphs,ops,[ownObservation,...publicObservations]);
 const known={};for(const glyph of glyphs){const options=[...new Set(possible.map(k=>k.mapping[glyph]))];known[glyph]=options.length===1?options[0]:null;}
 const orders=[...new Set(possible.map(k=>k.order))];
 return {possible,known,order:orders.length===1?orders[0]:null};
}
export function suggestExperiment(scene,glyphs,possible){
 if(possible.length<=1)return null;
 let best=null;
 for(const message of messages(glyphs)){
  const buckets=new Map();let valid=0;
  for(const key of possible){const r=interpret(scene,message,key),o=outcome(r);buckets.set(o,(buckets.get(o)||0)+1);if(r.ok)valid++;}
  if(buckets.size<2)continue;
  const entropy=-[...buckets.values()].reduce((sum,n)=>sum+(n/possible.length)*Math.log2(n/possible.length),0);
  const score=entropy+valid/possible.length*.12;
  if(!best||score>best.score)best={message,score,outcomes:buckets.size};
 }
 return best;
}
export function observationFrom(before,message,key){const r=interpret(before,message,key);return {before:copy(before),message:copy(message),result:outcome(r),after:copy(r.scene),ok:r.ok,text:r.text};}
