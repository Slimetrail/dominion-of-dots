"use strict";
// ===== Dominion of Dots =====
const $=id=>document.getElementById(id);
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let R=Math.random;
const UT={ // cost & food per 10 men; per-dot battle stats
 P:{n:"Peasants",ic:"🧑‍🌾",cost:5,food:1,hp:8,atk:2,arm:0,sh:0,spd:24,mor:35,reach:6,v:1},
 S:{n:"Swordsmen",ic:"🗡️",cost:10,food:1,hp:12,atk:5,arm:.1,sh:0,spd:34,mor:60,reach:6,v:2},
 C:{n:"Scutum Swords",ic:"🛡️",cost:15,food:1,hp:16,atk:4.2,arm:.35,sh:.75,spd:22,mor:80,reach:6,v:2.7},
 K:{n:"Scutum Pikes",ic:"🔱",cost:15,food:1,hp:14,atk:3,arm:.25,sh:.6,spd:18,mor:75,reach:11,anti:5,v:2.5},
 H:{n:"Cavalry",ic:"🐎",cost:26,food:2,hp:20,atk:6,arm:.2,sh:.1,spd:62,mor:70,reach:7,chg:2.6,v:4},
 B:{n:"Short Bows",ic:"🏹",cost:12,food:1,hp:9,atk:1.5,arm:0,sh:0,spd:28,mor:45,reach:6,rng:130,rel:1.3,dmg:3.5,acc:.6,v:1.9},
 L:{n:"Longbows",ic:"🎯",cost:22,food:1,hp:9,atk:1.5,arm:.05,sh:0,spd:22,mor:55,reach:6,rng:240,rel:2.6,dmg:6,acc:.5,v:2.9}};
const TYPES="PSCKHBL".split("");
const COLORS=["#1d4ed8","#b91c1c","#15803d","#7e22ce","#c2410c","#0f766e"];
const PNAMES=["You","Crimson Duke","Verdant League","Violet Throne","Amber Khan","Teal Republic"];
const PERS=["aggressive","turtle","opportunist"];
const PERS_IC={aggressive:"🔥 Aggressive",turtle:"🐢 Turtle",opportunist:"🦊 Opportunist"};
const NEUT="#2b2f36";
const SYL1=["Oak","Raven","Stone","Ash","Wolf","Iron","Mill","Thorn","Elder","Frost","Gold","Marsh","Brook","Hawk","Red","Black","Silver","Fair","Grey","Wind","Salt","Fox","Elm","Bram"];
const SYL2=["vale","ford","hold","mere","wick","moor","fell","ton","haven","crag","field","march","gate","wood","stead","bury","holm","reach"];
const REGN=["Northmarch","Highcrown","Westmoor","Eastfen","Southreach","Kingsdale"];
const MW=390,MH=520,SC=2;
let G=null, MAP=null; // G=saveable state, MAP=geometry
const army0=()=>({P:0,S:0,C:0,K:0,H:0,B:0,L:0});
const men=a=>TYPES.reduce((s,k)=>s+(a[k]||0),0);
const pow=a=>TYPES.reduce((s,k)=>s+(a[k]||0)*UT[k].v,0);
const fmt=n=>n>=1000?(n/1000).toFixed(1)+"k":""+n;
const armyStr=a=>TYPES.filter(k=>a[k]>0).map(k=>UT[k].ic+a[k]).join(" ")||"empty";

// ---------- MAP GENERATION ----------
function genMap(seed){
 const r=rng(seed);const cols=6,rows=7,T=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  if((x==0||x==cols-1)&&(y==0||y==rows-1))continue;
  const px=(x+.5)/cols*MW+(r()-.5)*MW/cols*.55, py=(y+.5)/rows*MH+(r()-.5)*MH/rows*.55;
  const region=(x<3?0:1)+(y<2?0:y<5?2:4);
  T.push({x:px,y:py,region});
 }
 const W=MW*SC,H=MH*SC,id=new Int8Array(W*H),shade=new Float32Array(W*H);
 const ph=r()*6;
 for(let j=0;j<H;j++)for(let i=0;i<W;i++){
  const lx=i/SC,ly=j/SC;
  const wx=lx+6*Math.sin(ly/23+ph)+3*Math.sin(ly/7.3+lx/11),wy=ly+6*Math.sin(lx/19+ph*2)+3*Math.cos(lx/8.1);
  let best=1e9,bi=-1;for(let k=0;k<T.length;k++){const dx=T[k].x-wx,dy=T[k].y-wy,d=dx*dx+dy*dy;if(d<best){best=d;bi=k}}
  const ex=(lx/MW-.5)*2,ey=(ly/MH-.5)*2,e=Math.sqrt(ex*ex*.9+ey*ey*.85)+.07*Math.sin(Math.atan2(ey,ex)*5+ph)+.04*Math.sin(Math.atan2(ey,ex)*11);
  if(e>1.02||best>52*52)bi=-1;
  id[j*W+i]=bi;
  shade[j*W+i]=.9+.06*Math.sin(i*.05+Math.sin(j*.03)*3)+.05*Math.sin(j*.071+i*.013)+(r()-.5)*.05;
 }
 // adjacency
 const adj=T.map(()=>new Set());
 for(let j=0;j<H-1;j++)for(let i=0;i<W-1;i++){const a=id[j*W+i];if(a<0)continue;const b=id[j*W+i+1],c=id[(j+1)*W+i];
  if(b>=0&&b!=a){adj[a].add(b);adj[b].add(a)}if(c>=0&&c!=a){adj[a].add(c);adj[c].add(a)}}
 // ensure every territory has pixels & graph connected via sea lanes
 const sea=[];
 const comp=()=>{const c=T.map(()=>-1);let n=0;for(let s=0;s<T.length;s++){if(c[s]>=0)continue;const q=[s];c[s]=n;while(q.length){const u=q.pop();adj[u].forEach(v=>{if(c[v]<0){c[v]=n;q.push(v)}})}n++}return[c,n]};
 for(let it=0;it<20;it++){const[c,n]=comp();if(n<=1)break;let bd=1e9,ba=0,bb=0;
  for(let a=0;a<T.length;a++)for(let b=0;b<T.length;b++)if(c[a]==0&&c[b]!=0){const d=(T[a].x-T[b].x)**2+(T[a].y-T[b].y)**2;if(d<bd){bd=d;ba=a;bb=b}}
  adj[ba].add(bb);adj[bb].add(ba);sea.push([ba,bb])}
 // label positions = centroid of pixels
 const sx=T.map(()=>0),sy=T.map(()=>0),sn=T.map(()=>0);
 for(let j=0;j<H;j+=2)for(let i=0;i<W;i+=2){const a=id[j*W+i];if(a>=0){sx[a]+=i/SC;sy[a]+=j/SC;sn[a]++}}
 T.forEach((t,k)=>{if(sn[k]){t.cx=sx[k]/sn[k];t.cy=sy[k]/sn[k]}else{t.cx=t.x;t.cy=t.y}});
 // borders: 1 territory border, 2 region border, 3 coast
 const bd=new Uint8Array(W*H);
 for(let j=1;j<H-1;j++)for(let i=1;i<W-1;i++){const p=j*W+i,a=id[p];
  for(const q of [p+1,p-1,p+W,p-W]){const b=id[q];if(b!=a){let v;if(a<0||b<0)v=3;else v=T[a].region!=T[b].region?2:1;if(v>bd[p])bd[p]=v}}}
 // thicken region/coast
 const bd2=bd.slice();for(let j=1;j<H-1;j++)for(let i=1;i<W-1;i++){const p=j*W+i;if(!bd[p]){const m=Math.max(bd[p+1],bd[p-1],bd[p+W],bd[p-W]);if(m>=2)bd2[p]=m+2}}
 const nm=new Set();T.forEach((t,k)=>{let s;do{s=SYL1[Math.floor(r()*SYL1.length)]+SYL2[Math.floor(r()*SYL2.length)]}while(nm.has(s));nm.add(s);t.name=s;t.adj=[...adj[k]]});
 const regions=REGN.map((n,i)=>({name:n,ids:T.map((t,k)=>t.region==i?k:-1).filter(k=>k>=0)}));
 regions.forEach(g=>g.bonus=Math.max(2,Math.round(g.ids.length*0.7)));
 return{T,W,H,id,shade,bd:bd2,sea,regions};
}

// ---------- NEW GAME ----------
function newGame(nAI,seed){
 seed=seed||Math.floor(Math.random()*1e9);R=rng(seed+7);
 MAP=genMap(seed);const T=MAP.T,np=nAI+1;
 const pers=[];for(let i=0;i<nAI;i++)pers.push(PERS[i%3]);pers.sort(()=>R()-.5);
 G={v:1,seed,turn:1,cur:0,phase:"recruit",econDone:false,moves:0,log:[],over:false,marches:[],tired:[],
  players:Array.from({length:np},(_,i)=>({id:i,name:PNAMES[i],color:COLORS[i],ai:i>0,pers:i?pers[i-1]:"",gold:40,food:20,alive:true})),
  terrs:T.map((t,k)=>({owner:-1,army:army0(),gold:1+Math.floor(R()*3),food:1+Math.floor(R()*3),cap:-1}))};
 // capitals: farthest point sampling
 const caps=[];let first=Math.floor(R()*T.length);caps.push(first);
 while(caps.length<np){let bd=-1,bi=0;T.forEach((t,k)=>{if(caps.includes(k))return;const d=Math.min(...caps.map(c=>(T[c].x-t.x)**2+(T[c].y-t.y)**2));if(d>bd){bd=d;bi=k}});caps.push(bi)}
 caps.forEach((c,i)=>{const tr=G.terrs[c];tr.owner=i;tr.cap=i;tr.gold=5;tr.food=8;tr.army={P:30,S:10,C:20,K:10,H:0,B:10,L:0}});
 // grow 3 more each, round robin
 const per=Math.min(4,Math.floor(T.length/np));
 for(let round=1;round<per;round++)for(let i=0;i<np;i++){
  const own=G.terrs.map((t,k)=>t.owner==i?k:-1).filter(k=>k>=0);const cand=[];own.forEach(k=>T[k].adj.forEach(a=>{if(G.terrs[a].owner<0)cand.push(a)}));
  if(cand.length){const a=cand[Math.floor(R()*cand.length)];G.terrs[a].owner=i;G.terrs[a].army.P=10;G.terrs[a].army.B=R()<.5?10:0}}
 G.terrs.forEach(t=>{if(t.owner<0){t.army.P=10+10*Math.floor(R()*3);if(R()<.4)t.army.C=10;if(R()<.3)t.army.B=10}});
 R=Math.random;
 log("The campaign begins. "+(np-1)+" rivals stand against you.");
 startTurn();
}
const P=i=>G.players[i];
const ownerName=o=>o<0?"Neutral":P(o).name;
const ownerCol=o=>o<0?NEUT:P(o).color;
function log(s){G.log.unshift("T"+G.turn+": "+s);G.log.length=Math.min(G.log.length,40)}
function save(){try{localStorage.dod_save=JSON.stringify(G)}catch(e){}}
function toast(s,ms){const t=$("toast");t.textContent=s;t.style.opacity=1;clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.opacity=0,ms||2200)}
const sleep=ms=>new Promise(r=>setTimeout(r,window.__fast?0:ms));

// ---------- ECONOMY ----------
function econ(pi){
 const p=P(pi),own=G.terrs.filter(t=>t.owner==pi);
 let gold=own.reduce((s,t)=>s+t.gold,0),food=own.reduce((s,t)=>s+t.food,0);
 const regs=MAP.regions.filter(g=>g.ids.every(k=>G.terrs[k].owner==pi));
 gold+=regs.reduce((s,g)=>s+g.bonus,0);
 const hasCap=G.terrs.some(t=>t.cap==pi&&t.owner==pi);
 if(!hasCap){gold=Math.floor(gold*.4);food=Math.floor(food*.7)}
 const eat=a=>TYPES.reduce((q,k)=>q+a[k]*UT[k].food,0);const up=Math.ceil((own.reduce((s,t)=>s+eat(t.army),0)+(G.marches||[]).filter(m=>m.o==pi).reduce((s,m)=>s+eat(m.army),0))/10);
 return{gold,food,up,net:food-up,regs,hasCap};
}
function applyEcon(pi){
 const p=P(pi),e=econ(pi);p.gold+=e.gold;p.food+=e.net;let msg="";
 if(p.food<0){const frac=Math.min(.5,(-p.food)/Math.max(1,e.up)+.1);let lost=0;
  [...G.terrs.filter(t=>t.owner==pi),...G.marches.filter(m=>m.o==pi).map(m=>({army:m.army}))].forEach(t=>{TYPES.forEach(k=>{const d=Math.ceil(t.army[k]*frac/10)*10;const dd=Math.min(t.army[k],d);t.army[k]-=dd;lost+=dd})});
  p.food=0;msg="Starvation! "+lost+" men deserted.";log(p.name+": "+msg)}
 p.food=Math.min(p.food,60);return msg;
}

// ---------- MARCHES (one tile per turn) ----------
const isCav=a=>men(a)>0&&TYPES.every(k=>k=="H"||!a[k]);
const mSpeed=m=>isCav(m.army)?2:1;
function friendlyPath(pi,a,b){const prev={};prev[a]=-1;const q=[a];while(q.length){const u=q.shift();if(u==b)break;MAP.T[u].adj.forEach(v=>{if(prev[v]===undefined&&G.terrs[v].owner==pi){prev[v]=u;q.push(v)}})}
 if(prev[b]===undefined)return null;const p=[];for(let u=b;u!=-1;u=prev[u])p.unshift(u);return p}
function reachable(pi,a){return G.terrs.map((t,k)=>k).filter(k=>k!=a&&G.terrs[k].owner==pi&&friendlyPath(pi,a,k))}
function addArmy(t,a){TYPES.forEach(k=>t[k]+=a[k])}
function stepMarch(m){const n=mSpeed(m);m.last=G.turn+":"+G.cur;
 for(let i=0;i<n&&m.pos<m.path.length-1;i++){const nx=m.path[m.pos+1];
  if(G.terrs[nx].owner!=m.o){m.stop=true;log(ownerName(m.o)+"'s march was cut off at "+MAP.T[m.path[m.pos]].name);break}
  m.pos++}
 if(m.stop||m.pos>=m.path.length-1){const t=G.terrs[m.path[m.pos]];if(t.owner==m.o)addArmy(t.army,m.army);if(!G.tired.includes(m.path[m.pos]))G.tired.push(m.path[m.pos]);m.done=true}
 G.marches=G.marches.filter(x=>!x.done)}
function orderMarch(pi,a,b,s){const path=friendlyPath(pi,a,b);if(!path)return null;TYPES.forEach(k=>G.terrs[a].army[k]-=s[k]);
 const m={o:pi,army:s,path,pos:0};G.marches.push(m);stepMarch(m);return m}
function advanceMarches(pi){G.marches.filter(m=>m.o==pi&&m.last!=G.turn+":"+G.cur).forEach(stepMarch)}
const eta=m=>Math.ceil((m.path.length-1-m.pos)/mSpeed(m));
const marchesAt=(k,o)=>G.marches.filter(m=>m.path[m.pos]==k&&(o==null||m.o==o));

// ---------- MAP RENDER ----------
const mc=$("mapC"),mx=mc.getContext("2d");let mapImg=null,sel=-1,tgt=[],pulse=0;
function hex(c){return[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]}
function renderMapBase(){
 const{W,H,id,shade,bd,T}=MAP;const img=mx.createImageData(W,H),d=img.data;
 const cols=G.terrs.map(t=>hex(ownerCol(t.owner)));const par=[236,220,176],sea=[150,178,170];
 for(let p=0;p<W*H;p++){const a=id[p],s=shade[p];let r,g,b;
  if(a<0){r=sea[0]*s;g=sea[1]*s;b=sea[2]*s;const y=Math.floor(p/W),x=p%W;if(Math.sin(x*.09+Math.sin(y*.05)*4)>0.96){r+=18;g+=18;b+=18}}
  else{const c=cols[a],m=G.terrs[a].owner<0?.12:.42;r=(par[0]*(1-m)+c[0]*m)*s;g=(par[1]*(1-m)+c[1]*m)*s;b=(par[2]*(1-m)+c[2]*m)*s}
  const v=bd[p];if(v==1){r*=.62;g*=.55;b*=.5}else if(v>=2){r=r*.3+40;g=g*.25+28;b=b*.2+18;if(v==5||v==4){r=r*.6+60;g=g*.6+45;b=b*.6+30}}
  d[p*4]=r;d[p*4+1]=g;d[p*4+2]=b;d[p*4+3]=255}
 mapImg=img;
}
function sizeMap(){mc.width=MAP.W;mc.height=MAP.H;mc.style.height=(innerWidth*MH/MW)+"px"}
function drawCastle(x,y,c){mx.save();mx.translate(x,y);mx.fillStyle="#5b4a3a";mx.strokeStyle="#1f160e";mx.lineWidth=1.5;
 mx.beginPath();mx.rect(-12,-8,24,12);mx.fill();mx.stroke();for(const ox of[-12,-4,4]){mx.fillRect(ox,-12,8,5);mx.strokeRect(ox,-12,8,5)}
 mx.fillStyle=c;mx.fillRect(-1,-24,2,12);mx.beginPath();mx.moveTo(1,-24);mx.lineTo(10,-21);mx.lineTo(1,-18);mx.fill();mx.restore()}
function drawMap(){
 if(!mapImg)return;mx.putImageData(mapImg,0,0);mx.save();mx.scale(SC,SC);const T=MAP.T;
 // sea lanes
 mx.setLineDash([4,4]);mx.strokeStyle="#3b2a1a";mx.lineWidth=1.5;MAP.sea.forEach(([a,b])=>{mx.beginPath();mx.moveTo(T[a].cx,T[a].cy);mx.lineTo(T[b].cx,T[b].cy);mx.stroke()});mx.setLineDash([]);
 // region labels
 mx.font="italic bold 13px Georgia";mx.textAlign="center";mx.fillStyle="#3b2a1a55";
 MAP.regions.forEach(g=>{const x=g.ids.reduce((s,k)=>s+T[k].cx,0)/g.ids.length,y=g.ids.reduce((s,k)=>s+T[k].cy,0)/g.ids.length;mx.fillText(g.name.toUpperCase()+" +"+g.bonus,x,y+28)});
 // targets
 tgt.forEach(k=>{mx.strokeStyle="#ffd84a";mx.lineWidth=3+Math.sin(pulse)*1.5;mx.beginPath();mx.arc(T[k].cx,T[k].cy,17,0,7);mx.stroke();
  if(sel>=0){mx.strokeStyle="#ffd84a99";mx.lineWidth=2;mx.beginPath();mx.moveTo(T[sel].cx,T[sel].cy);mx.lineTo(T[k].cx,T[k].cy);mx.stroke()}});
 G.marches.forEach(m=>{const pts=m.path.slice(m.pos).map(k=>[T[k].cx,T[k].cy]);if(pts.length<2)return;const c=ownerCol(m.o);
  mx.strokeStyle=c;mx.lineWidth=3;mx.setLineDash([6,4]);mx.beginPath();pts.forEach(([x,y],i)=>i?mx.lineTo(x,y):mx.moveTo(x,y));mx.stroke();mx.setLineDash([]);
  const[ax,ay]=pts[pts.length-2],[bx,by]=pts[pts.length-1],an=Math.atan2(by-ay,bx-ax),hx=bx-Math.cos(an)*14,hy=by-Math.sin(an)*14;
  mx.fillStyle=c;mx.beginPath();mx.moveTo(hx,hy);mx.lineTo(hx-Math.cos(an-.5)*9,hy-Math.sin(an-.5)*9);mx.lineTo(hx-Math.cos(an+.5)*9,hy-Math.sin(an+.5)*9);mx.fill()});
 G.terrs.forEach((t,k)=>{const x=T[k].cx,y=T[k].cy;
  if(t.cap>=0)drawCastle(x,y-14,ownerCol(t.owner));
  mx.fillStyle=ownerCol(t.owner);mx.strokeStyle=k==sel?"#ffd84a":"#1f160e";mx.lineWidth=k==sel?3:1.5;
  mx.beginPath();mx.arc(x,y,11,0,7);mx.fill();mx.stroke();
  mx.fillStyle="#fff";mx.font="bold 9px system-ui";mx.textAlign="center";mx.textBaseline="middle";mx.fillText(fmt(men(t.army)),x,y+.5);
 });
 const seen={};G.marches.forEach(m=>{const k=m.path[m.pos],j=seen[k]=(seen[k]||0)+1,x=T[k].cx+13,y=T[k].cy-8+12*(j-1);
  mx.fillStyle="#fff8e6";mx.strokeStyle=ownerCol(m.o);mx.lineWidth=2;mx.beginPath();mx.rect(x-2,y-6,34,12);mx.fill();mx.stroke();
  mx.fillStyle="#2a1d12";mx.font="bold 8px system-ui";mx.textAlign="left";mx.textBaseline="middle";mx.fillText((isCav(m.army)?"🐎":"🚶")+fmt(men(m.army))+" "+eta(m)+"⏳",x,y+.5)});
 mx.restore();
}
setInterval(()=>{if(tgt.length&&!$("app").classList.contains("hidden")){pulse+=.5;drawMap()}},120);
function mapHit(ev){const r=mc.getBoundingClientRect();const lx=(ev.clientX-r.left)/r.width*MW,ly=(ev.clientY-r.top)/r.height*MH;
 const i=Math.floor(lx*SC),j=Math.floor(ly*SC);let a=MAP.id[j*MAP.W+i];
 // also near badges
 let bd=1e9,bi=-1;MAP.T.forEach((t,k)=>{const d=(t.cx-lx)**2+(t.cy-ly)**2;if(d<bd){bd=d;bi=k}});if(bd<20*20)a=bi;return a}
mc.addEventListener("click",ev=>{if(!G||G.over||G.cur!=0||busy)return;const a=mapHit(ev);if(a==null||a<0)return;onTap(a)});

// ---------- UI ----------
let busy=false,sendFrac=1;
function topBar(){const p=P(0),e=econ(0);$("pSw").style.background=p.color;
 $("tGold").textContent="💰"+p.gold+" (+"+e.gold+")";$("tFood").textContent="🌾"+p.food+" ("+(e.net>=0?"+":"")+e.net+")";
 $("tTurn").textContent=G.cur==0?"Turn "+G.turn+" · "+({recruit:"Recruit",attack:"Attack",fortify:"Fortify"})[G.phase]:P(G.cur).name+"…";}
function tInfo(k){const t=G.terrs[k],T=MAP.T[k];return `<b>${T.name}</b> <small>(${MAP.regions[T.region].name})</small> · <span style="color:${ownerCol(t.owner)}">${ownerName(t.owner)}</span>${t.cap>=0?" · 🏰 castle":""}<br>💰${t.gold} 🌾${t.food} · ${armyStr(t.army)}${marchesAt(k).map(m=>`<br>🚩 Marching (${ownerName(m.o)}): ${armyStr(m.army)} → ${MAP.T[m.path[m.path.length-1]].name}, ${eta(m)} turn(s)`).join("")}`}
const castles=pi=>G.terrs.map((t,k)=>t.owner==pi&&t.cap>=0?k:-1).filter(k=>k>=0);
const recruitSpots=pi=>{const c=castles(pi);return c.length?c:G.terrs.map((t,k)=>t.owner==pi?k:-1).filter(k=>k>=0)};
const costMult=pi=>castles(pi).length?1:1.5;
function panel(){
 topBar();renderMapBase();const pn=$("panel");let h="";
 if(G.cur!=0){pn.innerHTML=`<h3>${P(G.cur).name} is moving…</h3><div id="log">${G.log.slice(0,8).join("<br>")}</div>`;drawMap();return}
 const ph=G.phase;
 if(ph=="recruit"){
  const spots=recruitSpots(0);if(sel<0||!spots.includes(sel))sel=spots[0];
  const m=costMult(0);
  h+=`<h3>① Recruit${m>1?" <small>(no castle: +50% cost)</small>":""}</h3><div>Hire at: ${tInfo(sel)}</div><div class="row">`;
  TYPES.forEach(k=>{const c=Math.ceil(UT[k].cost*m);h+=`<button class="b sm" data-buy="${k}" ${P(0).gold<c?"disabled":""}>${UT[k].ic} +10 ${UT[k].n}<br><small>💰${c} · 🌾${UT[k].food}</small></button>`});
  h+=`</div><small>Tap a castle 🏰 on the map to hire there. Upkeep: each 10 men eat 🌾 per turn (cavalry 2). Starving armies desert!</small><div class="row"><button class="b g" id="nextB">Next: Attack ▶</button></div>`;
 }else if(ph=="attack"||ph=="fortify"){
  h+=ph=="attack"?`<h3>② Attack</h3>`:`<h3>③ Fortify / March <small>(${3-G.moves} orders left)</small></h3>`;
  if(sel>=0)h+=`<div>${tInfo(sel)}</div>`;
  h+=`<div>${sel<0?(ph=="attack"?"Tap one of your territories, then a glowing enemy to attack.":"Tap your territory, then any glowing friendly land to march there (1 land per turn)."):tgt.length?"Now tap a glowing target.":"No targets from here."}</div>`;
  h+=`<div class="row">Send: <button class="b sm ${sendFrac==1?"on":""}" data-f="1">All</button><button class="b sm ${sendFrac==.5?"on":""}" data-f=".5">Half</button><button class="b sm ${sendFrac==.75?"on":""}" data-f=".75">¾</button></div>`;
  h+=`<div class="row">${ph=="attack"?`<button class="b g" id="nextB">Next: Fortify ▶</button>`:`<button class="b r" id="endB">End turn ⏭</button>`}</div>`;
 }
 h+=`<div id="log">${G.log.slice(0,6).join("<br>")}</div>`;pn.innerHTML=h;
 pn.querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>{const k=b.dataset.buy,c=Math.ceil(UT[k].cost*costMult(0));if(P(0).gold<c)return;P(0).gold-=c;G.terrs[sel].army[k]+=10;save();panel()});
 pn.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{sendFrac=+b.dataset.f;panel()});
 const nb=$("nextB");if(nb)nb.onclick=()=>{G.phase=ph=="recruit"?"attack":"fortify";sel=-1;tgt=[];G.moves=0;save();panel()};
 const eb=$("endB");if(eb)eb.onclick=()=>{sel=-1;tgt=[];endTurn()};
 drawMap();
}
function onTap(a){
 const t=G.terrs[a],ph=G.phase;
 if(ph=="recruit"){if(recruitSpots(0).includes(a))sel=a;else toast(MAP.T[a].name+": "+ownerName(t.owner)+" · "+armyStr(t.army));panel();return}
 if(sel>=0&&tgt.includes(a)){ph=="attack"?attackSheet(sel,a):doMove(sel,a);return}
 if(t.owner==0&&men(t.army)>0){sel=a;tgt=G.tired.includes(a)?[]:ph=="attack"?MAP.T[a].adj.filter(b=>G.terrs[b].owner!=0):reachable(0,a);if(ph=="fortify"&&G.moves>=3)tgt=[];if(G.tired.includes(a))toast("These troops already moved this turn")}
 else if(t.owner==0){sel=a;tgt=[]}
 else{sel=-1;tgt=[];toast(MAP.T[a].name+" · "+ownerName(t.owner)+" · "+armyStr(t.army),2600)}
 panel();
}
function split(a,f){const s=army0();TYPES.forEach(k=>{s[k]=f>=1?a[k]:Math.round(a[k]*f/10)*10;if(f<1&&a[k]>0&&s[k]==0&&f>=.5)s[k]=Math.min(a[k],10)});return s}
function doMove(a,b){const s=split(G.terrs[a].army,sendFrac);if(!men(s))return;const m=orderMarch(0,a,b,s);G.moves++;
 log("You sent "+men(s)+" men toward "+MAP.T[b].name+(m.done?" (arrived)":" · ETA "+eta(m)+" turn(s)"));sel=-1;tgt=[];save();panel()}
function sheet(html){const m=document.createElement("div");m.className="modal";m.innerHTML=`<div class="sheet">${html}</div>`;document.body.appendChild(m);return m}
function attackSheet(a,b){
 const s=split(G.terrs[a].army,sendFrac),d0=G.terrs[b],d={...d0,army:{...d0.army}};if(d0.owner>=0)marchesAt(b,d0.owner).forEach(m=>addArmy(d.army,m.army));
 if(men(s)==0){toast("Nothing to send");return}
 const m=sheet(`<h2>⚔ Attack ${MAP.T[b].name}</h2><div>Your force: ${armyStr(s)} (${men(s)} men)</div><div>Defender: <b style="color:${ownerCol(d.owner)}">${ownerName(d.owner)}</b> ${armyStr(d.army)} (${men(d.army)})${men(d.army)==0?" <b>· undefended: walk in!</b>":""}${d.cap>=0?"<br>🏰 Castle walls! Defenders get cover.":""}</div>
 <div style="margin:6px 0">Odds (rough strength): <b>${(pow(s)/(pow(d.army)*(d.cap>=0?1.4:1)+.1)).toFixed(1)}×</b></div>
 <div class="row"><button class="b g" id="cmdB">🎯 Command battle</button><button class="b y" id="autoB">⚡ Auto-resolve</button><button class="b r" id="xB">Cancel</button></div>`);
 m.querySelector("#xB").onclick=()=>m.remove();
 const go=async auto=>{m.remove();busy=true;await attack(0,a,b,s,auto?"auto":"human");busy=false;sel=-1;tgt=[];if(!checkEnd()){save();panel()}};
 m.querySelector("#cmdB").onclick=()=>go(false);m.querySelector("#autoB").onclick=()=>go(true);
}

// ---------- ATTACK RESOLUTION ----------
async function attack(pi,a,b,s,mode){
 const src=G.terrs[a],dst=G.terrs[b],def=dst.owner;
 TYPES.forEach(k=>src.army[k]-=s[k]);
 if(def>=0){marchesAt(b,def).forEach(m=>{addArmy(dst.army,m.army);m.done=true;log(ownerName(def)+"'s marching column at "+MAP.T[b].name+" joins the fight")});G.marches=G.marches.filter(x=>!x.done)}
 let won,att,dfs;
 if(men(dst.army)==0){won=true;att=s;dfs=army0()}
 else{const Bt=await battle({att:{o:pi,a:s},def:{o:def,a:dst.army},walls:dst.cap>=0,mode,name:MAP.T[b].name});won=Bt.winner==Bt.attSide;att=Bt.surv[Bt.attSide];dfs=Bt.surv[1-Bt.attSide]}
 const nm=MAP.T[b].name;
 if(won){dst.army=att;dst.owner=pi;G.tired.push(b);
  let msg=P(pi).name+" took "+nm+(def>=0?" from "+ownerName(def):"");
  if(dst.cap>=0&&def>=0){const loot=Math.floor(P(def).gold/2);P(def).gold-=loot;P(pi).gold+=loot;msg+=" 🏰 and looted 💰"+loot;if(def==0||pi==0)toast("🏰 Castle "+nm+" fell! 💰"+loot+" looted",3000)}
  log(msg);
  if(def>=0&&!G.terrs.some(t=>t.owner==def)){P(def).alive=false;log("☠ "+ownerName(def)+" has been destroyed!");if(pi==0)toast("☠ "+ownerName(def)+" destroyed!",3000)}
 }else{dst.army=dfs;TYPES.forEach(k=>src.army[k]+=att[k]);log(P(pi).name+" failed to take "+nm+(def>=0?" from "+ownerName(def):""))}
 return won;
}
function checkEnd(){
 const mine=G.terrs.filter(t=>t.owner==0).length;
 if(mine==0){G.over=true;save();endScreen(false);return true}
 const rivals=G.players.filter(p=>p.ai&&p.alive).length;
 if(rivals==0||mine>=Math.ceil(G.terrs.length*.75)){G.over=true;save();endScreen(true);return true}
 return false}
function endScreen(win){localStorage.removeItem("dod_save");
 const m=sheet(`<h2>${win?"👑 Victory!":"💀 Defeat"}</h2><p>${win?"The realm kneels before you after "+G.turn+" turns.":"Your banners have fallen on turn "+G.turn+"."}</p><button class="b g big" id="againB">New campaign</button>`);
 m.id="endM";m.querySelector("#againB").onclick=()=>{m.remove();$("start").classList.remove("hidden");$("resB").classList.add("hidden")}}

// ---------- TURN FLOW ----------
async function startTurn(){
 const p=P(G.cur);
 if(!p.alive){return nextPlayer()}
 if(!G.econDone){G.tired=[];G.marches=G.marches||[]}
 if(!G.econDone){const msg=applyEcon(G.cur);G.econDone=true;if(msg&&G.cur==0)toast("🌾 "+msg,3000)}
 save();
 if(p.ai){panel();await sleep(250);await aiTurn(G.cur);if(G.over)return;advanceMarches(G.cur);nextPlayer()}
 else{G.phase=G.phase||"recruit";sel=-1;tgt=[];panel()}
}
function endTurn(){advanceMarches(0);G.phase="recruit";nextPlayer()}
function nextPlayer(){if(G.over)return;G.cur=(G.cur+1)%G.players.length;if(G.cur==0)G.turn++;G.econDone=false;G.phase="recruit";G.moves=0;save();startTurn()}

// ---------- AI ----------
const MIX={aggressive:{S:3,C:2,H:3,P:1,B:1,K:1},turtle:{C:3,K:2,L:2,B:2,P:1},opportunist:{H:3,B:2,S:2,C:2,L:1}};
async function aiTurn(pi){
 const p=P(pi),T=MAP.T,pers=p.pers;
 const enemyAdj=k=>T[k].adj.filter(b=>G.terrs[b].owner!=pi);
 // recruit
 const spots=recruitSpots(pi);const cm=costMult(pi);
 const spot=spots.slice().sort((x,y)=>enemyAdj(y).reduce((s,b)=>s+pow(G.terrs[b].army),0)-enemyAdj(x).reduce((s,b)=>s+pow(G.terrs[b].army),0))[0];
 const mix=MIX[pers],keys=Object.keys(mix),wsum=keys.reduce((s,k)=>s+mix[k],0);
 for(let n=0;n<30;n++){const e=econ(pi);if(e.net<=1&&p.food<15)break;
  let x=R()*wsum,k=keys[0];for(const kk of keys){x-=mix[kk];if(x<=0){k=kk;break}}
  const c=Math.ceil(UT[k].cost*cm);if(p.gold<c+(pers=="turtle"?5:0)){if(p.gold<Math.ceil(5*cm))break;continue}
  p.gold-=c;G.terrs[spot].army[k]+=10}
 // attacks
 const maxA={aggressive:4,turtle:1,opportunist:3}[pers],thr={aggressive:1.25,turtle:2.2,opportunist:1.6}[pers];
 const leader=G.players.filter(q=>q.alive&&q.id!=pi).sort((x,y)=>G.terrs.filter(t=>t.owner==y.id).length-G.terrs.filter(t=>t.owner==x.id).length)[0];
 for(let n=0;n<maxA;n++){let best=null,bs=0;
  G.terrs.forEach((t,a)=>{if(t.owner!=pi||men(t.army)<20||G.tired.includes(a))return;const send=split(t.army,pers=="aggressive"?.85:.7);
   T[a].adj.forEach(b=>{const d=G.terrs[b];if(d.owner==pi)return;let r=pow(send)/(pow(d.army)*(d.cap>=0?1.5:1)+1);if(r<thr)return;
    let sc=r+d.gold*.3+(d.cap>=0?2:0);if(pers=="opportunist"&&d.owner>=0&&G.terrs.filter(q=>q.owner==d.owner).length<4)sc+=2;
    if(pers=="aggressive"&&leader&&d.owner==leader.id)sc+=1.5;if(d.owner<0)sc+=pers=="turtle"?1:.3;
    if(MAP.regions[T[b].region].ids.filter(k=>G.terrs[k].owner==pi).length>=MAP.regions[T[b].region].ids.length-1)sc+=2;
    if(sc>bs){bs=sc;best=[a,b,send]}})});
  if(!best)break;const[a,b,send]=best;const def=G.terrs[b].owner;
  let mode="auto";
  if(def==0){mode=await defendPrompt(pi,a,b,send);}
  await attack(pi,a,b,send,mode);panel();if(def==0&&checkEnd())return;await sleep(350)}
 // fortify: move interior armies toward the front
 const dist=G.terrs.map(()=>99);const q=[];G.terrs.forEach((t,k)=>{if(t.owner==pi&&enemyAdj(k).length){dist[k]=0;q.push(k)}});
 while(q.length){const u=q.shift();T[u].adj.forEach(v=>{if(G.terrs[v].owner==pi&&dist[v]>dist[u]+1){dist[v]=dist[u]+1;q.push(v)}})}
 let mv=0;G.terrs.forEach((t,k)=>{if(mv>=3||t.owner!=pi||dist[k]==0||dist[k]==99||men(t.army)==0)return;
  if(G.tired.includes(k))return;let dest=-1,bd=99;G.terrs.forEach((u,j)=>{if(u.owner==pi&&dist[j]==0){const p=friendlyPath(pi,k,j);if(p&&p.length<bd){bd=p.length;dest=j}}});if(dest<0)return;
  const keep=t.cap>=0?(pers=="turtle"?.5:.25):0;const s=split(t.army,1-keep);if(!men(s))return;orderMarch(pi,k,dest,s);window.__aiMarched=(window.__aiMarched||0)+1;mv++});
 save();
}
function defendPrompt(pi,a,b,send){return new Promise(res=>{const d=G.terrs[b];
 const m=sheet(`<h2>⚠ ${P(pi).name} attacks!</h2><div><span style="color:${P(pi).color}"><b>${P(pi).name}</b></span> (${PERS_IC[P(pi).pers]}) marches on <b>${MAP.T[b].name}</b>${d.cap>=0?" 🏰":""} from ${MAP.T[a].name}.</div>
 <div>Enemy: ${armyStr(send)} (${men(send)})</div><div>Your garrison: ${armyStr(d.army)} (${men(d.army)})</div>
 <div class="row"><button class="b g" id="dCmd">🛡 Command defense</button><button class="b y" id="dAuto">⚡ Auto-resolve</button></div>`);
 m.id="defM";sel=b;tgt=[a];drawMap();
 m.querySelector("#dCmd").onclick=()=>{m.remove();tgt=[];sel=-1;res("human")};m.querySelector("#dAuto").onclick=()=>{m.remove();tgt=[];sel=-1;res("auto")}})}

// ---------- BATTLE ENGINE ----------
const FW=400,FH=560;
const ZONE=[[410,550],[10,150]],FRONT=[430,130],WALLY=[395,165],EDGE=[575,-15];
function slots(n,form){const sp=7,o=[];
 if(form=="wings"){const h=Math.ceil(n/2);slots(h,"line").forEach(([x,y])=>o.push([x-75,y]));slots(n-h,"line").forEach(([x,y])=>o.push([x+75,y]));return o}
 if(form=="wedge"){let r=0,k=0;for(let i=0;i<n;i++){o.push([(k-r)*sp,r*sp]);k++;if(k>2*r){r++;k=0}}return o}
 let cols;if(form=="column")cols=Math.max(2,Math.ceil(Math.sqrt(n/3)));else if(form=="square")cols=Math.ceil(Math.sqrt(n));else cols=Math.min(16,Math.max(1,Math.ceil(Math.sqrt(n*6))));
 const rows=Math.ceil(n/cols);for(let i=0;i<n;i++){o.push([(i%cols-(cols-1)/2)*sp,(Math.floor(i/cols)-(form=="square"?(rows-1)/2:0))*sp])}return o}
function mkBattle(o){
 // o:{att:{o,a},def:{o,a},walls,mode,name}
 const humanDef=o.def.o==0&&o.mode=="human",attSide=humanDef?1:0;
 const sides=[];sides[attSide]=o.att;sides[1-attSide]=o.def;
 const maxMen=Math.max(men(o.att.a),men(o.def.a));const cap=o.mode=="human"?170:90;const scale=Math.max(1,Math.ceil(maxMen/cap));
 const B={t:0,dots:[],groups:[],arrows:[],sides,scale,attSide,defSide:1-attSide,walls:!!o.walls,human:o.mode=="human"?(humanDef?0:0):-1,over:false,winner:-1,name:o.name,fx:[]};
 sides.forEach((s,si)=>{TYPES.forEach(k=>{const m=s.a[k];if(!m)return;const n=Math.max(1,Math.round(m/scale));
  const g={side:si,type:k,n0:n,men0:m,form:"line",ax:200,ay:FRONT[si],cmd:"advance",mor:UT[k].mor,rout:false,id:B.groups.length,target:-1,fl:false,lastHit:-9};
  B.groups.push(g);for(let i=0;i<n;i++)B.dots.push({g:g.id,side:si,type:k,x:200,y:FRONT[si],hp:UT[k].hp,cd:R()*1,alive:true,esc:false,charged:false,i})})});
 B.groups.forEach(g=>{if(g.side!=B.human)deploy(B,g.side,B.walls&&g.side==B.defSide?"walls":"classic")});
 if(B.human>=0)deploy(B,0,"classic");
 snap(B);return B}
function sideGroups(B,s){return B.groups.filter(g=>g.side==s)}
function deploy(B,s,preset){const gs=sideGroups(B,s),Y=d=>s==0?FRONT[0]+d:FRONT[1]-d,X=x=>s==0?x:400-x;
 const front=gs.filter(g=>"SCK".includes(g.type)),P_=gs.find(g=>g.type=="P"),Bw=gs.find(g=>g.type=="B"),L=gs.find(g=>g.type=="L"),H=gs.find(g=>g.type=="H");
 front.sort((a,b)=>"CKS".indexOf(a.type)-"CKS".indexOf(b.type));
 const place=(g,x,d,form,cmd)=>{if(!g)return;g.ax=X(x);g.ay=Y(d);g.form=form;g.cmd=cmd};
 const fx=i=>front.length==1?200:110+i*(180/(front.length-1));
 if(preset=="classic"||preset=="walls"){const fc=preset=="walls"?"hold":"advance";front.forEach((g,i)=>place(g,fx(i),0,"line",fc));place(P_,200,32,"line",fc);place(Bw,140,65,"line","fire");place(L,260,85,"line","fire");place(H,40,20,"column",preset=="walls"?"hold":"flankL")}
 else if(preset=="hammer"){front.forEach((g,i)=>place(g,fx(i),0,"line","hold"));place(P_,200,30,"line","hold");place(Bw,150,60,"line","fire");place(L,250,80,"line","fire");place(H,200,95,"wings","flankR")}
 else if(preset=="turtle"){front.forEach((g,i)=>place(g,fx(i),10,"square","hold"));place(P_,200,40,"square","hold");place(Bw,140,75,"line","fire");place(L,260,90,"line","fire");place(H,200,110,"column","hold")}
 else if(preset=="spear"){const c=front.find(g=>g.type=="C")||front[0];front.forEach((g,i)=>place(g,g==c?200:(i%2?90:310),g==c?0:15,g==c?"wedge":"column","advance"));place(P_,200,45,"column","advance");place(Bw,130,70,"line","fire");place(L,270,85,"line","fire");place(H,360,15,"wedge","charge")}
 if(!front.length&&!P_&&!H&&B.attSide==s)gs.forEach(g=>g.cmd="advance");
 gs.forEach(g=>{const z=ZONE[s];g.ay=Math.max(z[0],Math.min(z[1],g.ay))});
}
function slotOf(B,d,g){if(!g._sl||g._slf!=g.form){g._sl=slots(g.n0,g.form);g._slf=g.form}const o=g._sl[d.i]||[0,0];return g.side==0?[g.ax+o[0],g.ay+o[1]]:[g.ax-o[0],g.ay-o[1]]}
function snap(B){B.dots.forEach(d=>{const[x,y]=slotOf(B,d,B.groups[d.g]);d.x=Math.max(3,Math.min(FW-3,x));d.y=y})}
function active(B,s){return B.dots.filter(d=>d.alive&&!d.esc&&d.side==s&&!B.groups[d.g].rout)}
function gCent(B,g){let x=0,y=0,n=0;B.dots.forEach(d=>{if(d.g==g.id&&d.alive&&!d.esc){x+=d.x;y+=d.y;n++}});return n?{x:x/n,y:y/n,n}:null}
function behindWall(B,d){if(!B.walls)return false;return B.defSide==1?d.y<WALLY[1]:d.y>WALLY[0]}
function step(B,dt){
 if(B.over)return;B.t+=dt;
 // grid
 const CS=40,gw=Math.ceil(FW/CS)+2,grid=new Map();const live=B.dots.filter(d=>d.alive&&!d.esc);
 live.forEach(d=>{const k=Math.floor(d.x/CS+1)+gw*Math.floor(d.y/CS+2);let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(d)});
 const near=(d,rad)=>{let best=null,bd=rad*rad;const cx=Math.floor(d.x/CS+1),cy=Math.floor(d.y/CS+2),rr=Math.ceil(rad/CS);
  for(let j=cy-rr;j<=cy+rr;j++)for(let i=cx-rr;i<=cx+rr;i++){const a=grid.get(i+gw*j);if(!a)continue;for(const e of a){if(e.side==d.side||!e.alive||B.groups[e.g].rout)continue;const q=(e.x-d.x)**2+(e.y-d.y)**2;if(q<bd){bd=q;best=e}}}return best};
 const cents=B.groups.map(g=>g.rout?null:gCent(B,g));
 const enemyAll=[[],[]];live.forEach(d=>{if(!B.groups[d.g].rout)enemyAll[1-d.side].push(d)});
 B.groups.forEach(g=>{const c=cents[g.id];if(!c)return;const u=UT[g.type];
  let tg=g.target>=0&&cents[g.target]&&!B.groups[g.target].rout?cents[g.target]:null;
  if(!tg){let bd=1e9;B.groups.forEach(h=>{const ch=cents[h.id];if(h.side==g.side||!ch)return;const q=(ch.x-c.x)**2+(ch.y-c.y)**2;if(q<bd){bd=q;tg=ch}})}
  if(!tg)return;
  const dx=tg.x-c.x,dy=tg.y-c.y,dl=Math.hypot(dx,dy)||1;g.fx=dx/dl;g.fy=dy/dl;
  const mv=(tx,ty,sp)=>{const ex=tx-g.ax,ey=ty-g.ay,l=Math.hypot(ex,ey);if(l<1)return true;const s=Math.min(l,sp*dt);g.ax+=ex/l*s;g.ay+=ey/l*s;return l<12};
  if(g.cmd=="advance"&&dl>(u.rng?u.rng*.8:18))mv(g.ax+g.fx*40,g.ay+g.fy*40,u.spd*.75);
  else if(g.cmd=="charge")mv(tg.x,tg.y,u.spd*1.05);
  else if(g.cmd=="flankL"||g.cmd=="flankR"){if(!g.fl){const ex=(g.cmd=="flankL")==(g.side==0)?25:375;const back=g.side==0?-1:1;
    if(mv(ex,tg.y+back*45,u.spd*.95))g.fl=true}else mv(tg.x,tg.y,u.spd)}
  else if(g.cmd=="fallback")mv(g.ax,g.side==0?540:20,u.spd*.6);
  g.ax=Math.max(10,Math.min(FW-10,g.ax));g.ay=Math.max(5,Math.min(FH-5,g.ay));
  if(B.t-g.lastHit>2)g.mor=Math.min(u.mor,g.mor+dt*1.5);
 });
 for(const d of live){if(!d.alive)continue;const g=B.groups[d.g],u=UT[d.type];d.cd-=dt;
  let tx,ty,sp=u.spd;
  if(g.rout){tx=d.x;ty=EDGE[d.side];sp*=1.1}
  else{const e=near(d,g.cmd=="hold"||g.cmd=="fire"?22:g.cmd=="fallback"?0.1:40);
   const ranged=!!u.rng;
   if(e&&(!ranged||Math.hypot(e.x-d.x,e.y-d.y)<18)){const l=Math.hypot(e.x-d.x,e.y-d.y);
    if(l<=u.reach){if(d.cd<=0){hit(B,d,e,true);d.cd=.9+R()*.3}tx=d.x;ty=d.y}else{tx=e.x;ty=e.y;if(g.cmd=="charge"||g.fl)sp*=1.15}}
   else{[tx,ty]=slotOf(B,d,g);
    if(ranged&&g.cmd!="fallback"&&g.cmd!="charge"&&d.cd<=0){const en=enemyAll[d.side];let t=null;
     if(g.target>=0){const cand=en.filter(x=>x.g==g.target);for(let i=0;i<6&&cand.length;i++){const c=cand[Math.floor(R()*cand.length)];if(Math.hypot(c.x-d.x,c.y-d.y)<u.rng){t=c;break}}}
     if(!t)for(let i=0;i<8&&en.length;i++){const c=en[Math.floor(R()*en.length)];if(Math.hypot(c.x-d.x,c.y-d.y)<u.rng){t=c;break}}
     if(t){const l=Math.hypot(t.x-d.x,t.y-d.y);B.arrows.push({x:d.x,y:d.y,tx:t.x+(R()-.5)*6,ty:t.y+(R()-.5)*6,t:0,T:l/220+.05,tgt:t,src:d});d.cd=u.rel*(.8+R()*.4)}}}
  }
  // move
  const ex=tx-d.x,ey=ty-d.y,l=Math.hypot(ex,ey);
  if(l>.5){let s=Math.min(l,sp*dt);if(B.walls&&d.side==B.attSide&&!g.rout){const ny=d.y+ey/l*s;const wy=WALLY[B.defSide==1?1:0];if((d.y-wy)*(ny-wy)<=0||Math.abs(ny-wy)<4){if(!(d.x>180&&d.x<220))s*=.22}}
   d.x+=ex/l*s;d.y+=ey/l*s}
  if(g.rout&&(d.y<-10||d.y>FH+10))d.esc=true;
 }
 // arrows
 B.arrows=B.arrows.filter(a=>{a.t+=dt;if(a.t<a.T)return true;const t=a.tgt;if(!t.alive||t.esc)return false;
  const u=UT[a.src.type],tu=UT[t.type];if(Math.hypot(t.x-a.tx,t.y-a.ty)>9||R()>u.acc)return false;
  const tg=B.groups[t.g];let front=1;if(tg.fx!=null){const vx=a.src.x-t.x,vy=a.src.y-t.y,vl=Math.hypot(vx,vy)||1;front=(vx*tg.fx+vy*tg.fy)/vl}
  let dm=u.dmg*(1-tu.sh*(front>.2?1:.3))*(1-tu.arm*.5)*(.7+R()*.6);if(t.side==B.defSide&&behindWall(B,t))dm*=.45;
  damage(B,t,dm,front<-.2?.5:.25,a.src);return false});
 // global morale
 B.groups.forEach(g=>{if(!g.rout&&g.mor<=0){g.rout=true;B.fx.push({x:cents[g.id]?cents[g.id].x:200,y:cents[g.id]?cents[g.id].y:280,t:B.t,s:"routs!"});B.groups.forEach(h=>{if(h.side==g.side&&h!=g)h.mor-=12})}});
 for(const s of[0,1]){if(active(B,s).length==0){B.over=true;B.winner=1-s}}
 if(!B.over&&B.t>=180){B.over=true;const pw=s=>active(B,s).reduce((q,d)=>q+UT[d.type].v,0);B.winner=pw(B.attSide)>pw(B.defSide)*1.25?B.attSide:B.defSide;B.timeout=true}
 if(B.over)finish(B);
}
function hit(B,a,d,melee){const ua=UT[a.type],ud=UT[d.type],tg=B.groups[d.g];
 let front=1;if(tg.fx!=null){const vx=a.x-d.x,vy=a.y-d.y,vl=Math.hypot(vx,vy)||1;front=(vx*tg.fx+vy*tg.fy)/vl}
 if(tg.form=="square"||(d.type=="K"&&a.type=="H"))front=Math.max(front,.4);
 const fm=front>.3?1:front>-.3?1.5:2.2;
 let dm=ua.atk*(1-ud.arm)*fm*(.6+R()*.8);
 if(a.type=="H"&&!a.charged){a.charged=true;dm*=(d.type=="K"&&front>.3)?.25:ua.chg}
 if(a.type=="K"&&d.type=="H")dm*=ua.anti;
 if(d.type=="K"&&a.type=="H"&&front>.3){a.hp-=4;if(a.hp<=0)damage(B,a,1,.3)} // braced pikes
 if(B.walls&&d.side==B.defSide&&behindWall(B,d)&&!behindWall(B,a))dm*=.6;
 damage(B,d,dm,fm>1?.9:.3,a)}
function damage(B,d,dm,mh,src){if(!d.alive)return;const g=B.groups[d.g];d.hp-=dm;g.mor-=dm/(UT[d.type].hp*g.n0)*100*mh*.8;g.lastHit=B.t;
 if(d.hp<=0){d.alive=false;g.mor-=100/g.n0*.6;B.fx.push({x:d.x,y:d.y,t:B.t,s:""})}}
function finish(B){
 B.surv=[0,1].map(s=>{const out=army0(),src=B.sides[s].a;TYPES.forEach(k=>{let c=B.dots.filter(d=>d.side==s&&d.type==k&&d.alive).length;if(s!=B.winner)c=Math.floor(c*.7);out[k]=Math.min(src[k]||0,Math.round(c*B.scale/10)*10||(c>0?Math.min(src[k],10):0))});return out});
 if(B.winner!=B.attSide){}else{} // loser defender dies on capture (handled by owner swap)
}
function autoBattle(o){const B=mkBattle(o);let n=0;while(!B.over&&n++<4000)step(B,.1);if(!B.over){B.over=true;B.winner=B.defSide;finish(B)}return B}

// ---------- BATTLE UI ----------
const bc=$("batC"),bx=bc.getContext("2d");let CB=null,bSel=-1,bSpeed=1,bPause=false,bMode="deploy",bRes=null,grass=null;
function battle(o){
 if(o.mode!="human")return Promise.resolve(autoBattle(o));
 return new Promise(res=>{CB=mkBattle(o);window.__B=CB;bRes=res;bMode="deploy";bSel=sideGroups(CB,0)[0]?.id??-1;bPause=false;bSpeed=1;
  $("battle").classList.remove("hidden");sizeBattle();bPanel();requestAnimationFrame(bLoop)})}
function sizeBattle(){const dpr=Math.min(2,devicePixelRatio||1);const w=innerWidth;const h=Math.min(w*FH/FW,innerHeight-260);const cw=h*FW/FH;
 bc.style.width=cw+"px";bc.style.height=h+"px";bc.style.margin="0 auto";bc.width=cw*dpr;bc.height=h*dpr;
 grass=document.createElement("canvas");grass.width=FW*2;grass.height=FH*2;const g=grass.getContext("2d");g.scale(2,2);
 g.fillStyle="#7aa04a";g.fillRect(0,0,FW,FH);const r=rng(99);for(let i=0;i<260;i++){g.fillStyle=`rgba(${r()<.5?"60,90,30":"150,175,90"},${.06+r()*.08})`;g.beginPath();g.ellipse(r()*FW,r()*FH,5+r()*25,3+r()*12,r()*3,0,7);g.fill()}
 g.fillStyle="#00000014";g.fillRect(0,ZONE[1][0],FW,ZONE[1][1]-ZONE[1][0]);}
function bLoop(ts){if(!CB)return;const B=CB;
 if(bMode=="fight"&&!bPause&&!B.over){for(let i=0;i<bSpeed;i++){step(B,1/30);if(B.over)break}}
 drawBattle();if(B.over&&bMode=="fight"){bMode="done";resultSheet()}
 if(bMode=="fight"||bMode=="deploy")bTop();
 requestAnimationFrame(bLoop)}
function shape(c,t,x,y,col){c.fillStyle=col;c.beginPath();
 if(t=="C"){c.rect(x-2.6,y-2.6,5.2,5.2)}else if(t=="K"){c.moveTo(x,y-3.4);c.lineTo(x+3,y+2.4);c.lineTo(x-3,y+2.4);c.closePath()}
 else if(t=="H"){c.moveTo(x,y-4);c.lineTo(x+4,y);c.lineTo(x,y+4);c.lineTo(x-4,y);c.closePath()}
 else if(t=="P"){c.arc(x,y,1.8,0,7)}else c.arc(x,y,2.6,0,7);c.fill();if(col==NEUT){c.strokeStyle="#e8edf2";c.lineWidth=.9;c.stroke()}
 if(t=="B"||t=="L"){c.strokeStyle="#fff";c.lineWidth=t=="L"?1.4:.8;c.beginPath();c.arc(x,y,t=="L"?3.6:3,0,7);c.stroke()}
 if(t=="S"){c.strokeStyle="#000a";c.lineWidth=.8;c.beginPath();c.moveTo(x-2,y-2);c.lineTo(x+2,y+2);c.stroke()}}
function drawBattle(){const B=CB,c=bx,s=bc.width/FW;c.setTransform(1,0,0,1,0,0);c.drawImage(grass,0,0,bc.width,bc.height);c.setTransform(s,0,0,s,0,0);
 if(bMode=="deploy"){c.fillStyle="#ffffff22";c.fillRect(0,ZONE[0][0],FW,ZONE[0][1]-ZONE[0][0]);c.strokeStyle="#fff8";c.setLineDash([6,4]);c.strokeRect(1,ZONE[0][0],FW-2,ZONE[0][1]-ZONE[0][0]);c.setLineDash([])}
 if(B.walls){const wy=WALLY[B.defSide==1?1:0];c.fillStyle="#8a8174";c.strokeStyle="#3c352c";c.lineWidth=1;
  for(let x=0;x<FW;x+=10){if(x>=180&&x<220)continue;c.fillRect(x,wy-4,10,8);c.strokeRect(x,wy-4,10,8);c.fillRect(x+2,wy+(B.defSide==1?4:-8),5,4)}
  c.fillStyle="#5b3a1a";c.fillRect(182,wy-2,36,4)}
 const cols=B.sides.map(s=>ownerCol(s.o));
 B.dots.forEach(d=>{if(!d.alive||d.esc)return;const g=B.groups[d.g];shape(c,d.type,d.x,d.y,g.rout?"#ddd":cols[d.side])});
 c.strokeStyle="#fffc";c.lineWidth=.8;B.arrows.forEach(a=>{const f=a.t/a.T,x=a.x+(a.tx-a.x)*f,y=a.y+(a.ty-a.y)*f-Math.sin(f*Math.PI)*12,dx=(a.tx-a.x),dy=(a.ty-a.y),l=Math.hypot(dx,dy)||1;c.beginPath();c.moveTo(x,y);c.lineTo(x-dx/l*5,y-dy/l*5);c.stroke()});
 B.fx=B.fx.filter(f=>B.t-f.t<1.2);B.fx.forEach(f=>{if(f.s){c.fillStyle="#fff";c.font="bold 12px Georgia";c.textAlign="center";c.fillText("🏳 "+f.s,f.x,f.y-10-(B.t-f.t)*15)}else{c.fillStyle="#7a0000aa";c.beginPath();c.arc(f.x,f.y,1.5,0,7);c.fill()}});
 if(bSel>=0){const g=B.groups[bSel];const ct=gCent(B,g);if(ct){c.strokeStyle="#ffd84a";c.lineWidth=1.5;c.beginPath();let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;B.dots.forEach(d=>{if(d.g==g.id&&d.alive&&!d.esc){x0=Math.min(x0,d.x);x1=Math.max(x1,d.x);y0=Math.min(y0,d.y);y1=Math.max(y1,d.y)}});c.rect(x0-4,y0-4,x1-x0+8,y1-y0+8);c.stroke();
  if(g.target>=0){const tc=gCent(B,B.groups[g.target]);if(tc){c.setLineDash([4,3]);c.beginPath();c.moveTo(ct.x,ct.y);c.lineTo(tc.x,tc.y);c.stroke();c.setLineDash([])}}}}
}
function bTop(){const B=CB;const t=s=>{const a=active(B,s).length,n=B.dots.filter(d=>d.side==s).length;return`<span style="color:${ownerCol(B.sides[s].o)};background:#fff;border-radius:6px;padding:1px 4px">●</span> ${ownerName(B.sides[s].o).split(" ")[0]} <b>${fmt(a*B.scale)}</b> <span class="bar"><i style="width:${100*a/n}%;background:${ownerCol(B.sides[s].o)}"></i></span>`};
 const h=`${t(0)}<span class="sp"></span>${t(1)}<span style="margin-left:6px">⏳${Math.max(0,180-Math.floor(B.t))}</span>`;if($("bTop")._h!=h){$("bTop").innerHTML=h;$("bTop")._h=h}}
const CMDS=[["advance","⬆ Advance"],["hold","✋ Hold"],["charge","⚡ Charge"],["flankL","↖ Flank L"],["flankR","↗ Flank R"],["fire","🏹 Fire at will"],["fallback","⬇ Fall back"]];
const FORMS=[["line","▬ Line"],["wedge","▲ Wedge"],["column","▮ Column"],["square","■ Square"],["wings","⫴ Wings"]];
function bPanel(){const B=CB,pn=$("bPanel");const gs=sideGroups(B,0);let h=`<div class="row">`;
 gs.forEach(g=>{const n=B.dots.filter(d=>d.g==g.id&&d.alive&&!d.esc).length;h+=`<button class="chip ${g.id==bSel?"on":""}" data-g="${g.id}">${UT[g.type].ic} ${fmt(n*B.scale)}${g.rout?" 🏳":""}<i class="mor" style="width:${Math.max(0,100*g.mor/UT[g.type].mor)}%;background:${g.mor<20?"#b91c1c":"#2f6b3a"}"></i></button>`});
 h+=`<button class="chip ${bSel==-2?"on":""}" data-g="-2">ALL</button></div>`;
 const g=bSel>=0?B.groups[bSel]:null;
 if(bMode=="deploy"){
  h+=`<div style="font-size:13px">${g?`<b>${UT[g.type].n}</b> · ${g.form} · orders: ${g.cmd}. `:""}Drag on the field to place the selected group. ${B.walls?"🏰 Castle walls on the field!":""}</div>`;
  h+=`<div class="row">${FORMS.map(([k,n])=>`<button class="b sm ${g&&g.form==k?"on":""}" data-form="${k}">${n}</button>`).join("")}</div>`;
  h+=`<div class="row">${CMDS.map(([k,n])=>`<button class="b sm ${g&&g.cmd==k?"on":""}" data-cmd="${k}">${n}</button>`).join("")}</div>`;
  h+=`<div class="row">Presets: <button class="b sm" data-pre="classic">Classic</button><button class="b sm" data-pre="hammer">Hammer & Anvil</button><button class="b sm" data-pre="turtle">Turtle</button><button class="b sm" data-pre="spear">Spearhead</button></div>`;
  h+=`<div class="row"><button class="b g" id="fightB">⚔ Fight!</button><button class="b y" id="bAuto">⚡ Auto-resolve</button></div>`;
 }else{
  h+=`<div class="row">${CMDS.map(([k,n])=>`<button class="b sm ${g&&g.cmd==k?"on":""}" data-cmd="${k}">${n}</button>`).join("")}</div>`;
  h+=`<div style="font-size:13px">Tip: select a group, then tap an enemy group to target it.</div>`;
  h+=`<div class="row"><button class="b" id="pauseB">${bPause?"▶ Resume":"⏸ Pause"}</button><button class="b" id="spdB">⏩ ×${bSpeed}</button><button class="b y" id="bAuto">⚡ Auto-finish</button></div>`;
 }
 pn.innerHTML=h;
 pn.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{bSel=+b.dataset.g;bPanel()});
 const sel=()=>bSel==-2?gs:bSel>=0?[B.groups[bSel]]:[];
 pn.querySelectorAll("[data-form]").forEach(b=>b.onclick=()=>{sel().forEach(g=>g.form=b.dataset.form);snap(B);bPanel()});
 pn.querySelectorAll("[data-cmd]").forEach(b=>b.onclick=()=>{sel().forEach(g=>{g.cmd=b.dataset.cmd;g.fl=false;if(g.cmd!="fire"&&g.cmd!="charge")g.target=-1});bPanel()});
 pn.querySelectorAll("[data-pre]").forEach(b=>b.onclick=()=>{deploy(B,0,b.dataset.pre);snap(B);bPanel()});
 const f=$("fightB");if(f)f.onclick=()=>{bMode="fight";bPanel()};
 const pa=$("pauseB");if(pa)pa.onclick=()=>{bPause=!bPause;bPanel()};
 const sp=$("spdB");if(sp)sp.onclick=()=>{bSpeed=bSpeed==1?2:bSpeed==2?4:1;bPanel()};
 $("bAuto").onclick=()=>{B.groups.forEach(g=>{if(g.side==0&&bMode=="deploy"){}});bMode="fight";let n=0;while(!B.over&&n++<8000)step(B,.1)};
}
setInterval(()=>{if(CB&&bMode=="fight")bPanel()},700);
function bPt(ev){const r=bc.getBoundingClientRect();return[(ev.clientX-r.left)/r.width*FW,(ev.clientY-r.top)/r.height*FH]}
let drag=null;
bc.addEventListener("pointerdown",ev=>{if(!CB)return;const[x,y]=bPt(ev);const B=CB;
 let bd=1e9,bg=null;B.dots.forEach(d=>{if(!d.alive||d.esc)return;const q=(d.x-x)**2+(d.y-y)**2;if(q<bd){bd=q;bg=d}});
 if(bMode=="deploy"){if(bg&&bd<225&&bg.side==0){bSel=bg.g;bPanel()}if(bSel>=0){const g=B.groups[bSel];drag={g,ox:g.ax-x,oy:g.ay-y,moved:false};if(!(bg&&bd<225&&bg.g==bSel)){drag.ox=0;drag.oy=0;moveG(g,x,y)}}}
 else if(bMode=="fight"&&bg&&bd<400){if(bg.side==0){bSel=bg.g;bPanel()}else if(bSel>=0||bSel==-2){(bSel==-2?sideGroups(B,0):[B.groups[bSel]]).forEach(g=>{g.target=bg.g;g.cmd=UT[g.type].rng?"fire":"charge";g.fl=false});toast("🎯 Target set");bPanel()}}});
function moveG(g,x,y){const z=ZONE[0];g.ax=Math.max(15,Math.min(FW-15,x));g.ay=Math.max(z[0],Math.min(z[1],y));snap(CB)}
bc.addEventListener("pointermove",ev=>{if(!drag||bMode!="deploy")return;const[x,y]=bPt(ev);moveG(drag.g,x+drag.ox,y+drag.oy)});
addEventListener("pointerup",()=>drag=null);
function resultSheet(){const B=CB;const me=B.sides.findIndex(s=>s.o==0);const won=B.winner==me;
 const row=s=>`<tr><td style="color:${ownerCol(B.sides[s].o)}"><b>${ownerName(B.sides[s].o)}</b></td><td>${men(B.sides[s].a)}</td><td>${men(B.surv[s])}</td></tr>`;
 const m=sheet(`<h2>${won?"🏆 Victory at "+B.name+"!":"💀 Defeat at "+B.name}</h2><table><tr><th></th><th>Before</th><th>Survivors</th></tr>${row(0)}${row(1)}</table>
 <p style="margin:6px 0">${B.timeout?"⏳ Time ran out; the field went to the stronger army. ":""}${me==B.attSide?(won?"The territory is yours.":"Your survivors fall back."):(won?"You held the line!":"The territory is lost.")}</p><button class="b g big" id="contB">Continue</button>`);
 m.id="resM";m.querySelector("#contB").onclick=()=>{m.remove();$("battle").classList.add("hidden");const r=bRes;CB=null;bRes=null;r(B)}}

// ---------- START SCREEN ----------
let nAI=3;
function startUI(){const rv=$("rivals");rv.innerHTML=[2,3,4,5].map(n=>`<button class="b sm ${n==nAI?"on":""}" data-n="${n}">${n}</button>`).join("");
 rv.querySelectorAll("button").forEach(b=>b.onclick=()=>{nAI=+b.dataset.n;startUI()});
 $("resB").classList.toggle("hidden",!localStorage.dod_save)}
$("newB").onclick=()=>{$("start").classList.add("hidden");newGame(nAI);sizeMap();renderMapBase();panel()};
$("resB").onclick=()=>{try{G=JSON.parse(localStorage.dod_save);MAP=genMap(G.seed);$("start").classList.add("hidden");sizeMap();renderMapBase();
 if(G.cur!=0){G.econDone=true;startTurn()}else panel()}catch(e){toast("Save could not be loaded");}};
$("helpB").onclick=()=>{const m=sheet(`<h2>📜 How to play</h2><p><b>Each turn:</b> ① Recruit at your castles 🏰 with gold, ② Attack neighbors, ③ Fortify / March (3 orders), then rivals move.</p>
<p><b>Movement:</b> armies move <b>one territory per turn</b> 🚶 (cavalry-only columns 🐎 move 2). Ordering troops to a distant friendly land creates a marching column (dashed arrow + ⏳ turns left); it takes its first step at once, then one step each time you end your turn. You can only attack lands next to where troops stand, so new recruits must march to the front. Troops that conquered or arrived this turn rest until next turn. If an enemy takes a land on the path, the column halts; if an enemy attacks the land a column is on, it joins the defense.</p>
<p><b>Economy:</b> territories give 💰 gold and 🌾 food. Owning a whole region adds its bonus. Every 10 men eat 🌾1 per turn (cavalry 2). If food runs out, men desert. Lose your home castle and income drops sharply; capture a rival castle to loot half their treasury and recruit there.</p>
<p><b>Battles:</b> place groups in your zone, pick formations and orders, then Fight. ${TYPES.map(k=>UT[k].ic+" "+UT[k].n).join(", ")}.</p>
<p>🛡 Scutum shields stop most arrows. 🔱 Pikes wreck cavalry from the front. 🐎 Cavalry charge hard and love flanks. 🎯 Longbows outrange short bows; 🏹 short bows shoot faster. Hits on the side ×1.5, rear ×2.2, and shatter morale. Broken groups rout 🏳.</p>
<button class="b g" id="okH">Got it</button>`);m.querySelector("#okH").onclick=()=>m.remove()};
$("menuB").onclick=()=>{const m=sheet(`<h2>☰ Menu</h2><div>${G.players.map(p=>{const n=G.terrs.filter(t=>t.owner==p.id).length;return`<div style="color:${p.color}"><b>${p.name}</b> ${p.ai?PERS_IC[p.pers]:""} · ${p.alive?n+" lands · 💰"+p.gold:"☠ destroyed"}</div>`}).join("")}</div>
<p><b>Regions:</b><br>${MAP.regions.map(g=>{const o=new Set(g.ids.map(k=>G.terrs[k].owner));return g.name+" +"+g.bonus+"💰"+(o.size==1&&[...o][0]>=0?" ("+ownerName([...o][0])+")":"")}).join("<br>")}</p>
<div class="row"><button class="b" id="mClose">Close</button><button class="b r" id="mQuit">Quit to title</button></div>`);
 m.querySelector("#mClose").onclick=()=>m.remove();m.querySelector("#mQuit").onclick=()=>{m.remove();save();$("start").classList.remove("hidden");startUI()}};
addEventListener("resize",()=>{if(MAP){sizeMap();drawMap()}if(CB)sizeBattle()});
startUI();
window.__dod={get G(){return G},get MAP(){return MAP},panel,autoBattle,econ,attack,checkEnd,startTurn,mkBattle,step};
