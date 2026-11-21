import {createRoom,joinRoom,getPlayer,act,view,GameError} from './game.js';
const allowedOrigins=new Set(['https://joshuafe.github.io','https://convergence-family-table.joshuaf.chatgpt.site']);
function headers(req){const origin=req.headers.get('Origin');return {'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowedOrigins.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','X-Content-Type-Options':'nosniff'};}
const reply=(req,data,status=200)=>new Response(JSON.stringify(data),{status,headers:headers(req)});
export async function api(req,env){try{
  const url=new URL(req.url);if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)});
  if(url.pathname==='/api/health')return reply(req,{ok:!!env.DB,transport:'shared-d1-polling',pollMs:900});
  if(!env.DB)throw new GameError('The shared room service is unavailable. Please try again shortly.',503);
  if(req.method==='POST'&&Number(req.headers.get('Content-Length')||0)>8192)throw new GameError('Request is too large.',413);
  let body={};if(req.method==='POST'){const raw=await req.text();if(raw.length>8192)throw new GameError('Request is too large.',413);try{body=JSON.parse(raw);}catch{throw new GameError('Invalid request.');}}
  if(url.pathname==='/api/rooms'&&req.method==='POST'){
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let room;
    for(let i=0;i<8;i++){const nums=crypto.getRandomValues(new Uint32Array(6));const code=[...nums].map(x=>chars[x%chars.length]).join('');room=createRoom(code,body.name);try{await env.DB.prepare('INSERT INTO rooms (code,state,revision,expires) VALUES (?,?,0,?)').bind(code,JSON.stringify(room),room.expires).run();break;}catch(e){if(i===7)throw e;}}
    // Bounded expiry cleanup; requests always enforce the expiry even before deletion.
    await env.DB.prepare('DELETE FROM rooms WHERE code IN (SELECT code FROM rooms WHERE expires < ? LIMIT 20)').bind(Date.now()).run();
    return reply(req,{token:room.players[0].token,room:view(room,room.players[0].token)},201);
  }
  const match=url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{6})(?:\/(join|move))?$/);if(!match)throw new GameError('Page not found.',404);
  const code=match[1],operation=match[2];const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');
  for(let retry=0;retry<10;retry++){
    const row=await env.DB.prepare('SELECT state,revision,expires FROM rooms WHERE code = ?').bind(code).first();
    if(!row||row.expires<Date.now())throw new GameError('Room not found or expired. Check the code or create a new room.',404);
    const room=JSON.parse(row.state);
    if(req.method==='GET'&&!operation)return reply(req,{room:view(room,token,row.revision)});
    if(req.method!=='POST')throw new GameError('Method not allowed.',405);
    if(!['join','move'].includes(operation))throw new GameError('Unknown action.',404);
    const requestId=String(body.requestId||'');if(requestId.length<8||requestId.length>100)throw new GameError('A move needs a request ID.');
    const existing=room.processed.find(x=>x.id===requestId);
    if(existing){const sessionToken=operation==='join'?room.players.find(p=>p.id===existing.player)?.token:token;return reply(req,{...(operation==='join'?{token:sessionToken}:{}),room:view(room,sessionToken,row.revision)});}
    let player;if(operation==='join')player=joinRoom(room,body.name);else {player=getPlayer(room,token);act(room,token,body);}
    room.processed.push({id:requestId,player:player.id});room.processed=room.processed.slice(-80);
    const changed=await env.DB.prepare('UPDATE rooms SET state = ?, revision = revision + 1 WHERE code = ? AND revision = ?').bind(JSON.stringify(room),code,row.revision).run();
    if(changed.meta.changes===1){if(body.type==='leave')return reply(req,{left:true});return reply(req,{...(operation==='join'?{token:player.token}:{}),room:view(room,player.token,row.revision+1)});}
  }
  throw new GameError('The room is busy. Please try that move again.',409);
}catch(error){if(!(error instanceof GameError))console.error('Room service error',error);return reply(req,{error:error instanceof GameError?error.message:'The room service hit a problem. Please try again.'},error.status||500);}}
