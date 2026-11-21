import {puzzles} from './puzzles.js';
export class GameError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const need=(condition,message,status)=>{if(!condition)throw new GameError(message,status);};
export const randomToken=()=>crypto.randomUUID()+crypto.randomUUID();
export function newPlayer(name){name=String(name||'').trim();need(name.length>0&&name.length<=20,'Use a nickname of 1–20 characters.');return {id:crypto.randomUUID(),token:randomToken(),name,clue:'',pins:[],revealed:false,vote:false};}
export function createRoom(code,name){const p=newPlayer(name);return {code,players:[p],host:p.id,phase:'lobby',round:0,epoch:0,board:[],proposal:null,attempts:[],hints:[],history:[],events:[],processed:[],created:Date.now(),expires:Date.now()+86400000};}
function event(r,text){r.events.push(text);r.events=r.events.slice(-8);}
function deal(r){r.epoch++;r.phase='clue';r.proposal=null;r.attempts=[];r.hints=[];r.board=[...puzzles[r.round].words];for(let i=r.board.length-1;i>0;i--){const n=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[r.board[i],r.board[n]]=[r.board[n],r.board[i]];}r.players.forEach((p,i)=>Object.assign(p,{lens:(i+r.round)%r.players.length,clue:'',pins:[],revealed:false,vote:false}));event(r,'A new set of perspectives has been dealt.');}
export function getPlayer(r,token){const p=r.players.find(x=>x.token===token);need(p,'This player session is no longer in the room.',401);return p;}
export function joinRoom(r,name){need(r.phase==='lobby','This game has started. Join a new room or ask the host to return to the lobby.',409);need(r.players.length<4,'This room already has four players.',409);const p=newPlayer(name);need(!r.players.some(x=>x.name.toLowerCase()===p.name.toLowerCase()),'That nickname is taken. Try a different one.');r.players.push(p);if(!r.host)r.host=p.id;return p;}
export function act(r,token,a){const p=getPlayer(r,token);const host=p.id===r.host;const puzzle=puzzles[r.round];
  if(a.type==='leave'){need(r.phase==='lobby','Ask the host to return to the lobby before leaving.');r.players=r.players.filter(x=>x.id!==p.id);if(host)r.host=r.players[0]?.id||null;return;}
  if(a.type==='remove'){need(host&&r.phase==='lobby','Only the host can remove a player in the lobby.',403);need(a.player!==p.id,'Use Leave room to leave.');r.players=r.players.filter(x=>x.id!==a.player);return;}
  if(a.type==='lobby'){need(host,'Only the host can return to the lobby.',403);r.epoch++;r.phase='lobby';r.proposal=null;r.players.forEach(x=>{x.clue='';x.pins=[];});event(r,'Returned to the lobby. Current round will restart.');return;}
  if(a.type==='start'){need(host,'Only the host can start.',403);need(r.phase==='lobby'&&r.players.length>=2,'You need 2–4 players in the lobby.');deal(r);return;}
  need(a.epoch===r.epoch,'The round changed. Your screen has been refreshed; try again.',409);
  if(a.type==='next'){need(host,'Only the host can deal the next round.',403);need(['solved','revealed'].includes(r.phase),'Finish this round first.');need(r.round<puzzles.length-1,'This puzzle bank is complete. Start a new room to play again.');r.round++;deal(r);return;}
  need(['clue','discuss'].includes(r.phase),'This round is finished.');
  if(a.type==='clue'){
    const clue=String(a.clue||'').trim();need(clue.length>=1&&clue.length<=64,'Write a clue of 1–64 characters.');
    const pins=[...new Set(a.pins||[])];need(pins.length>=1&&pins.length<=3&&pins.every(x=>r.board.includes(x)),'Attach your clue to 1–3 board words.');
    p.clue=clue;p.pins=pins;r.proposal=null;r.players.forEach(x=>x.vote=false);
    if(r.players.every(x=>x.clue)){r.phase='discuss';event(r,p.name+' posted a clue. Everyone can now compare connections.');}return;
  }
  need(r.phase==='discuss','Everyone must post a clue first.');
  if(a.type==='reveal'){p.revealed=true;event(r,p.name+' shared their original evidence.');return;}
  if(a.type==='hint'){const used=r.players.map(x=>x.lens).concat(r.hints);const n=[0,1,2,3].find(x=>!used.includes(x));need(n!==undefined,'All four perspectives are already in play. Ask someone to share their evidence.');r.hints.push(n);event(r,p.name+' opened an extra perspective.');return;}
  if(a.type==='propose'){need(r.board.includes(a.word),'Choose a word from the board.');need(!r.attempts.includes(a.word),'That word was already checked.');need(!r.proposal,'Vote on the current proposal or withdraw it first.',409);r.proposal={word:a.word,by:p.id};r.players.forEach(x=>x.vote=x.id===p.id);event(r,p.name+' proposed '+a.word+'.');return;}
  if(a.type==='withdraw'){need(r.proposal,'There is no proposal.');r.proposal=null;r.players.forEach(x=>x.vote=false);event(r,p.name+' reopened the discussion.');return;}
  if(a.type==='vote'){need(r.proposal,'Select a proposed answer first.');p.vote=true;if(r.players.every(x=>x.vote)){const word=r.proposal.word;r.attempts.push(word);r.proposal=null;r.players.forEach(x=>x.vote=false);if(word===puzzle.answer){r.phase='solved';r.history.push({round:r.round,attempts:r.attempts.length,hints:r.hints.length,reveals:r.players.filter(x=>x.revealed).length});event(r,'Connection found!');}else event(r,word+' did not connect all the perspectives. Keep talking; there is no guess limit.');}return;}
  if(a.type==='giveup'){need(host,'Only the host can reveal the solution.',403);r.phase='revealed';event(r,'The host revealed the solution.');return;}
  throw new GameError('Unknown move.');
}
export function view(r,token,revision=0){const me=getPlayer(r,token);const finished=['solved','revealed'].includes(r.phase);const visible=r.phase!=='clue'&&r.phase!=='lobby';const puzzle=puzzles[r.round];return {
  code:r.code,revision,host:r.host,phase:r.phase,round:r.round+1,total:puzzles.length,epoch:r.epoch,expires:r.expires,
  me:{id:me.id,name:me.name,clue:me.clue,pins:me.pins,lens:r.phase==='lobby'?null:me.lens,evidence:r.phase==='lobby'?[]:puzzle.lenses[me.lens]},
  players:r.players.map(p=>({id:p.id,name:p.name,ready:!!p.clue,clue:visible?p.clue:'',pins:visible?p.pins:[],vote:p.vote,evidence:visible&&p.revealed?puzzle.lenses[p.lens]:null})),
  board:r.board,proposal:r.proposal,attempts:r.attempts,hints:r.hints.map(i=>({evidence:puzzle.lenses[i]})),canHint:r.players.length+r.hints.length<4,
  history:r.history,events:r.events,solution:finished?{answer:puzzle.answer,connections:puzzle.links.map((text,i)=>({evidence:puzzle.lenses[i],text}))}:null
};}
