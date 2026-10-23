import { getStore } from "@netlify/blobs";

const store = getStore("hotzone-rooms");
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const now = () => Date.now();
const makeId = () => crypto.randomUUID();
const makeCode = () => Array.from({length:6},()=>CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)]).join("");
const cleanRoom = (r) => {
  if (!r || now() - r.updatedAt > 3 * 60 * 60 * 1000) return null;
  return r;
};
const publicRoom = (r, includeSecret = false) => ({
  createdAt:r.createdAt, updatedAt:r.updatedAt, hostPlayerId:r.hostPlayerId,
  players:r.players.map(p=>({id:p.id})), leftCategory:r.leftCategory, rightCategory:r.rightCategory,
  ...(includeSecret ? {secretNumber:r.secretNumber} : {}), roundStarted:r.roundStarted, cluePlayerId:r.cluePlayerId,
  clue:r.clue, guesses:r.guesses, scores:r.scores, revealed:r.revealed
});
async function readRoom(code){const r=await store.get(code,{type:"json"});return cleanRoom(r)}
async function saveRoom(code,r){r.updatedAt=now();await store.setJSON(code,r)}
function fail(status,error){return new Response(JSON.stringify({ok:false,error}),{status,headers:{"Content-Type":"application/json"}})}
function ok(data){return new Response(JSON.stringify({ok:true,...data}),{headers:{"Content-Type":"application/json"}})}
export default async (req) => {
 if(req.method!=="POST") return fail(405,"Bitte POST verwenden.");
 let b; try{b=await req.json()}catch{return fail(400,"Ungültige Anfrage.")}
 const action=b.action;
 try{
  if(action==="create"){
   let code; do{code=makeCode()}while(await store.get(code));
   const pid=makeId(), token=makeId(), t=now();
   const room={createdAt:t,updatedAt:t,hostPlayerId:pid,hostToken:token,
    players:[{id:pid}],leftCategory:"Schlechtes Game",rightCategory:"Gutes Game",
    secretNumber:5,roundStarted:false,cluePlayerId:null,clue:null,guesses:[],scores:{[pid]:0},revealed:false};
   await saveRoom(code,room);
   return ok({roomCode:code,playerId:pid,hostToken:token,room:publicRoom(room,true)});
  }
  const code=String(b.roomCode||"").toUpperCase();
  if(!/^[A-Z0-9]{6}$/.test(code)) return fail(400,"Der Raumcode muss 6 Zeichen haben.");
  let room=await readRoom(code);
  if(!room){await store.delete(code);return fail(404,"Raum nicht gefunden oder abgelaufen. Bitte neuen Raum erstellen.")}
  if(action==="join"){
   const pid=makeId();room.players.push({id:pid});room.scores[pid]=0;await saveRoom(code,room);return ok({playerId:pid,room:publicRoom(room,false)});
  }
  if(action==="state") return ok({room:publicRoom(room, b.hostToken && b.hostToken===room.hostToken)});
  const host=b.hostToken&&b.hostToken===room.hostToken;
  const player=room.players.find(p=>p.id===b.playerId);
  if(!player)return fail(403,"Du bist diesem Raum nicht beigetreten. Bitte tritt erneut bei.");
  if(action==="settings"){
   if(!host)return fail(403,"Nur der Chef darf die Einstellungen ändern.");
   room.leftCategory=String(b.leftCategory||"Linke Seite").slice(0,60);
   room.rightCategory=String(b.rightCategory||"Rechte Seite").slice(0,60);
   room.secretNumber=Math.max(1,Math.min(10,Number(b.secretNumber)||5));
   await saveRoom(code,room);return ok({room:publicRoom(room,host)});
  }
  if(action==="startRound"){
   if(!host)return fail(403,"Nur der Chef darf eine Runde starten.");
   room.roundStarted=true;room.clue=null;room.guesses=[];room.revealed=false;
   room.cluePlayerId=room.players.length>1?room.players[1].id:room.hostPlayerId;
   await saveRoom(code,room);return ok({room:publicRoom(room,host)});
  }
  if(action==="clue"){
   if(!room.roundStarted)return fail(400,"Der Chef muss zuerst eine Runde starten.");
   if(b.playerId!==room.cluePlayerId)return fail(403,"Du bist in dieser Runde nicht der Hinweisgeber.");
   const clue=String(b.clue||"").trim().slice(0,100);if(!clue)return fail(400,"Schreibe zuerst einen Hinweis.");
   room.clue=clue;await saveRoom(code,room);return ok({room:publicRoom(room,host)});
  }
  if(action==="guess"){
   if(!room.clue)return fail(400,"Es gibt noch keinen Hinweis.");
   if(b.playerId===room.cluePlayerId)return fail(403,"Der Hinweisgeber darf nicht selbst raten.");
   if(room.guesses.some(g=>g.playerId===b.playerId))return fail(409,"Du hast schon geraten.");
   const guess=Math.max(1,Math.min(10,Number(b.guess)||1));
   const diff=Math.abs(guess-room.secretNumber),points=diff===0?3:diff===1?2:diff===2?1:0;
   room.guesses.push({playerId:b.playerId,guess,points});room.scores[b.playerId]=(room.scores[b.playerId]||0)+points;
   if(room.guesses.length>=Math.max(1,room.players.length-1))room.revealed=true;
   await saveRoom(code,room);return ok({room:publicRoom(room,host)});
  }
  return fail(400,"Unbekannte Aktion.");
 }catch(e){return fail(500,"Online-Fehler. Prüfe, ob die Netlify-Funktion veröffentlicht wurde.")}
};