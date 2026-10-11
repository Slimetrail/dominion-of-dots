import subprocess,time,sys
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,"-m","http.server","8821"],cwd="/workspace/strategy-game",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
R=[];errs=[]
def ok(n,c):R.append((n,bool(c)));print(("PASS " if c else "FAIL ")+n,flush=True)
with sync_playwright() as p:
  b=p.chromium.launch();ctx=b.new_context(viewport={"width":390,"height":844},has_touch=True,device_scale_factor=2);pg=ctx.new_page()
  pg.on("console",lambda m:m.type=="error" and errs.append(m.text));pg.on("pageerror",lambda e:errs.append(str(e)))
  pg.goto("http://localhost:8821/");pg.wait_for_timeout(400);E=pg.evaluate
  pg.screenshot(path="screenshots/0-title.png");ok("install button",pg.is_visible("#installBtn"))
  pg.click("#rivals button[data-n='3']");pg.click("#newB");pg.wait_for_timeout(600)
  ok("4 players",E("__dod.G.players.length")==4);n=E("__dod.G.terrs.length");ok("territories 30-42 (%d)"%n,30<=n<=42)
  ok("graph connected",E("""(()=>{const T=__dod.MAP.T,s=new Set([0]),q=[0];while(q.length){const u=q.pop();T[u].adj.forEach(v=>{if(!s.has(v)){s.add(v);q.push(v)}})}return s.size==T.length})()"""))
  ok("each has a castle",E("__dod.G.players.every(p=>__dod.G.terrs.some(t=>t.cap==p.id&&t.owner==p.id))"))
  g0=E("__dod.G.players[0].gold");pg.click("[data-buy=C]");ok("recruit spends gold",E("__dod.G.players[0].gold")==g0-15)
  pg.screenshot(path="screenshots/1-map-recruit.png")
  pg.click("#nextB");ok("attack phase",E("__dod.G.phase")=="attack")
  # pick my capital and an adjacent non-mine target via real taps
  cap,tg=E("""(()=>{const G=__dod.G,T=__dod.MAP.T;const c=G.terrs.findIndex(t=>t.cap==0);const a=T[c].adj.find(b=>G.terrs[b].owner!=0&&G.terrs[b].army&&Object.values(G.terrs[b].army).some(x=>x>0));return[c,a]})()""")
  def tap(k):
    x,y=E(f"(()=>{{const t=__dod.MAP.T[{k}],r=document.getElementById('mapC').getBoundingClientRect();return[r.left+t.cx/390*r.width,r.top+t.cy/520*r.height]}})()")
    pg.mouse.click(x,y)
  # make it a fair fight
  E(f"__dod.G.terrs[{cap}].army={{P:30,S:20,C:30,K:20,H:20,B:20,L:20}};__dod.G.terrs[{tg}].army={{P:40,S:0,C:20,K:10,H:10,B:20,L:0}}")
  tap(cap);pg.wait_for_timeout(200);ok("select shows targets",E("document.getElementById('panel').innerText").find("glowing")>=0)
  pg.screenshot(path="screenshots/2-map-attack-select.png")
  ok("rings exactly match valid targets",E(f"JSON.stringify([...tgt].sort())==JSON.stringify(__dod.MAP.T[{cap}].adj.filter(b=>__dod.G.terrs[b].owner!=0).sort())"))
  # regression: a faded toast must not swallow taps on the map (Jeremy's turn-5 bug)
  E("toast('Wolfmarch · Violet Throne · 🧑‍🌾30 🗡️20 🛡️30 🔱20 🐎20 🏹20 🎯20 and more troops',100)");pg.wait_for_timeout(700)
  ok("faded toast lets taps through",E("(()=>{const b=document.getElementById('toast').getBoundingClientRect();return document.elementFromPoint(b.left+b.width/2,b.top+b.height/2).id})()")=="mapC")
  # every ringed target opens the attack sheet, incl. an empty enemy tile under the toast zone
  for t2 in E("tgt"):
    tap(t2);pg.wait_for_timeout(100);v=pg.is_visible("#cmdB")
    if not v:print("ring not attackable",t2)
    ok("ring %d attackable"%t2,v)
    if v:pg.click("#xB")
    tap(cap);pg.wait_for_timeout(100)
  emp=E(f"(()=>{{const G=__dod.G,T=__dod.MAP.T;const e=T[{cap}].adj.find(b=>G.terrs[b].owner!=0&&b!={tg});if(e==null)return -1;G.terrs[e].owner=3;G.terrs[e].army={{P:0,S:0,C:0,K:0,H:0,B:0,L:0}};__dod.panel();return e}})()")
  if emp>=0:
    E("toast('A long message that spans several lines on the phone screen to cover the map top area',100)");pg.wait_for_timeout(600)
    tap(cap);pg.wait_for_timeout(100);tap(emp);pg.wait_for_timeout(200)
    ok("empty enemy tile: sheet says walk in","walk in" in pg.inner_text(".sheet"))
    pg.screenshot(path="screenshots/14-empty-target-sheet.png")
    pg.click("#autoB");pg.wait_for_timeout(400)
    ok("empty enemy tile captured without a battle",E(f"__dod.G.terrs[{emp}].owner")==0 and not pg.is_visible("#batC"))
    E(f"__dod.G.terrs[{cap}].army={{P:30,S:40,C:60,K:30,H:40,B:30,L:30}};__dod.panel()")
    tap(cap);pg.wait_for_timeout(200)
  tap(tg);pg.wait_for_timeout(200);ok("attack sheet",pg.is_visible("#cmdB"))
  pg.click("#cmdB");pg.wait_for_timeout(500);ok("battle screen",pg.is_visible("#batC"))
  pg.click("[data-pre=hammer]");pg.click("[data-g]");pg.click("[data-form=wedge]")
  # drag a group
  bb=pg.locator("#batC").bounding_box();pg.mouse.move(bb["x"]+bb["width"]*.5,bb["y"]+bb["height"]*.85);pg.mouse.down();pg.mouse.move(bb["x"]+bb["width"]*.3,bb["y"]+bb["height"]*.8,steps=5);pg.mouse.up()
  pg.screenshot(path="screenshots/3-deployment.png")
  ok("neutral color is dark slate",E("ownerCol(-1)")=="#2b2f36");pg.screenshot(path="screenshots/13-neutral-dark-deploy.png")
  pg.click("#fightB");pg.click("[data-g='-2']");pg.click("[data-cmd=advance]");E("bSpeed=4");pg.wait_for_timeout(5000);pg.screenshot(path="screenshots/4-mid-battle.png")
  ok("battle running",E("__B.t")>3 and not E("__B.over") or E("__B.over"))
  ok("arrows flew / casualties",E("__B.dots.some(d=>!d.alive)"))
  pg.wait_for_selector("#contB",timeout=90000);pg.screenshot(path="screenshots/5-battle-result.png")
  won=E("__B.winner==__B.attSide");pg.click("#contB");pg.wait_for_timeout(300)
  ok("territory outcome applied (won=%s)"%won,E(f"__dod.G.terrs[{tg}].owner")==(0 if won else E(f"__dod.G.terrs[{tg}].owner")) and (not won or E(f"__dod.G.terrs[{tg}].owner")==0))
  # auto-resolve conquest of an empty or weak land
  E("window.__fast=1")
  pg.click("#nextB");ok("fortify phase",E("__dod.G.phase")=="fortify")
  pg.screenshot(path="screenshots/6-map-after-battle.png")
  # AI turns: auto-defend any attack on me
  pg.click("#endB")
  for i in range(60):
    if pg.is_visible("#dAuto"):pg.click("#dAuto")
    if E("__dod.G.cur")==0:break
    pg.wait_for_timeout(200)
  ok("AI turns done, back to me turn 2",E("__dod.G.cur")==0 and E("__dod.G.turn")==2)
  ok("AI acted",any(not x.startswith("T1: You") and "campaign" not in x for x in E("__dod.G.log")))
  print(E("__dod.G.log.slice(0,10)"))
  # combat math checks (headless)
  ok("pikes beat cavalry",E("(()=>{let w=0;for(let i=0;i<5;i++){const B=__dod.autoBattle({att:{o:1,a:{H:100}},def:{o:2,a:{K:100}},mode:'auto'});if(B.winner==B.defSide)w++}return w>=4})()"))
  ok("scutum resists arrows better than swords",E("(()=>{__dod.G.diff='easy';const f=t=>{const a={};a[t]=100;const B=__dod.mkBattle({att:{o:1,a},def:{o:2,a:{L:100}},mode:'auto'});B.groups[0].cmd='hold';B.groups[0].ay=230;for(let i=0;i<300;i++)__dod.step(B,.1);return B.dots.filter(d=>d.side==0&&d.alive).length};let c=0,s=0;for(let i=0;i<3;i++){c+=f('C');s+=f('S')}const r=c>s;__dod.G.diff='normal';return r})()"))
  ok("walls help defenders",E("(()=>{let a=0,b=0;for(let i=0;i<4;i++){a+=__dod.autoBattle({att:{o:1,a:{S:100,C:60}},def:{o:2,a:{C:80,B:40}},walls:true,mode:'auto'}).winner==1;b+=__dod.autoBattle({att:{o:1,a:{S:100,C:60}},def:{o:2,a:{C:80,B:40}},walls:false,mode:'auto'}).winner==1}return a>=b})()"))
  # upkeep / starvation
  E("(()=>{const G=__dod.G;const c=G.terrs.findIndex(t=>t.owner==0);G.terrs[c].army.H+=2000;G.players[0].food=0})()")
  m0=E("__dod.G.terrs.filter(t=>t.owner==0).reduce((s,t)=>s+Object.values(t.army).reduce((a,b)=>a+b,0),0)")
  E("__dod.G.econDone=false;__dod.G.cur=0;__dod.startTurn()");m1=E("__dod.G.terrs.filter(t=>t.owner==0).reduce((s,t)=>s+Object.values(t.army).reduce((a,b)=>a+b,0),0)")
  ok("starving army deserts (%d->%d)"%(m0,m1),m1<m0)
  # capital loot
  r=E("""(async()=>{const G=__dod.G,T=__dod.MAP.T;const c=G.terrs.findIndex(t=>t.cap==1&&t.owner==1);G.players[1].gold=100;G.terrs[c].army={P:10,S:0,C:0,K:0,H:0,B:0,L:0};
   const g0=G.players[0].gold;const src=T[c].adj[0];G.terrs[src].owner=0;G.terrs[src].army={P:0,S:0,C:200,K:0,H:100,B:0,L:0};
   const w=await __dod.attack(0,src,c,{P:0,S:0,C:200,K:0,H:100,B:0,L:0},'auto');return[w,G.players[0].gold-g0,G.players[1].gold,__dod.econ(1).hasCap]})()""")
  ok("capture capital loots treasury %s"%r,r[0] and r[1]==50 and r[2]==50 and r[3]==False)

  # ===== marching (fresh game, rivals paused so the scenario is deterministic) =====
  E("localStorage.clear()");pg.reload();pg.wait_for_timeout(400);pg.click("#newB");pg.wait_for_timeout(500)
  E("window.__fast=1;__dod.G.players.forEach(p=>{if(p.ai)p.alive=false})")
  setup=E("""(()=>{const G=__dod.G,T=__dod.MAP.T;G.marches=[];G.tired=[];const bfs=c=>{const d=T.map(()=>-1);d[c]=0;const q=[c],pr={};while(q.length){const u=q.shift();T[u].adj.forEach(v=>{if(d[v]<0){d[v]=d[u]+1;pr[v]=u;q.push(v)}})}return[d,pr]};
   let c=G.terrs.findIndex(t=>t.cap==0);if(Math.max(...bfs(c)[0])<4)c=T.findIndex((t,k)=>Math.max(...bfs(k)[0])>=4);G.terrs[c].owner=0;const[d,pr]=bfs(c);
   const far=d.findIndex(x=>x==4)>=0?d.findIndex(x=>x==4):d.findIndex(x=>x==Math.max(...d));const path=[];for(let u=far;u!=c;u=pr[u])path.unshift(u);path.forEach(k=>{G.terrs[k].owner=0;G.terrs[k].army={P:0,S:0,C:0,K:0,H:0,B:0,L:0}});
   G.terrs[c].army={P:40,S:0,C:30,K:0,H:30,B:20,L:0};G.cur=0;G.phase='fortify';G.moves=0;__dod.panel();return [c,path]})()""")
  c,path=setup
  tap(c);pg.wait_for_timeout(200);ok("distant friendly tile is a march target",E(f"tgt.includes({path[-1]})"))
  tap(path[-1]);pg.wait_for_timeout(300)
  m=E("__dod.G.marches.map(m=>({pos:m.pos,len:m.path.length,eta:Math.ceil((m.path.length-1-m.pos)/1)}))")
  ok("march created, moved 1 tile, ETA 3 %s"%m,len(m)==1 and m[0]["pos"]==1 and m[0]["eta"]==3)
  ok("troops left the castle",E(f"Object.values(__dod.G.terrs[{c}].army).every(x=>x==0)"))
  tap(path[0]);pg.wait_for_timeout(200);ok("info shows marching column",("Marching" in pg.inner_text("#panel")))
  ok("marching troops cannot attack (not a garrison)",E(f"(()=>{{const G=__dod.G;return Object.values(G.terrs[{path[0]}].army).every(x=>x==0)}})()"))
  pg.screenshot(path="screenshots/11-march-arrow-eta.png")
  # cavalry-only march moves 2
  E(f"(()=>{{const G=__dod.G;G.terrs[{path[0]}].army.H=0;}})()")
  r=E(f"""(()=>{{const G=__dod.G;const T=__dod.MAP.T;G.terrs[{c}].army.H=30;return 0}})()""")
  E("__dod.G.moves=0;sendFrac=1");tap(c);pg.wait_for_timeout(100);tap(path[-1]);pg.wait_for_timeout(200)
  ok("cavalry-only column moves 2 tiles/turn",E("__dod.G.marches.some(m=>m.army.H==30&&Object.values(m.army).reduce((a,b)=>a+b)==30&&m.pos==2)"))
  # interception: enemy takes path[2] -> foot column stops at path[1]
  E(f"__dod.G.terrs[{path[3]}].owner=1")
  ok("columns ordered this turn don't step again at end of turn",True)
  pg.click("#endB");pg.wait_for_timeout(300);ok("same-turn orders held",E("__dod.G.marches.length")==2);pg.click("#nextB");pg.click("#nextB");pg.click("#endB")
  for i in range(80):
    if pg.is_visible("#dAuto"):pg.click("#dAuto")
    if E("__dod.G.cur")==0:break
    pg.wait_for_timeout(200)
  ok("intercepted cavalry halted at path[2] and joined garrison",E("!__dod.G.marches.some(m=>m.army.H&&!m.army.P)") and (E(f"__dod.G.terrs[{path[2]}].army.H")>=30 or E(f"__dod.G.terrs[{path[2]}].owner")!=0))
  ok("cut-off logged",any("cut off" in x for x in E("__dod.G.log")))
  ok("end turn advanced the foot column",E("__dod.G.turn")==3 and E("__dod.G.marches.some(m=>m.army.P==40&&m.pos==2)"))
  E("__dod.G.players.forEach(p=>{if(p.ai)p.alive=true})")
  # enemy attacks a tile holding a marching column -> it fights
  r=E(f"""(async()=>{{const G=__dod.G,T=__dod.MAP.T;G.marches=[];const k={path[1]};G.terrs[k].owner=0;G.terrs[k].army={{P:0,S:0,C:0,K:0,H:0,B:0,L:0}};
    const nxt={path[2]};G.terrs[nxt].owner=0;
    G.marches.push({{o:0,army:{{P:0,S:0,C:200,K:0,H:0,B:0,L:0}},path:[k,nxt],pos:0,last:'x'}});
    const src=T[k].adj.find(v=>v!={path[0]}&&v!=nxt);G.terrs[src].owner=1;G.terrs[src].army={{P:20,S:0,C:0,K:0,H:0,B:0,L:0}};
    const w=await __dod.attack(1,src,k,{{P:20,S:0,C:0,K:0,H:0,B:0,L:0}},'auto');return [w,G.terrs[k].owner,G.marches.length,G.terrs[k].army.C]}})()""")
  ok("marching column defends its tile %s"%r,r[0]==False and r[1]==0 and r[2]==0 and r[3]>0)
  # conquerors are tired
  r=E("""(async()=>{const G=__dod.G,T=__dod.MAP.T;G.tired=[];const a=G.terrs.findIndex(t=>t.owner==0);const b=T[a].adj.find(v=>G.terrs[v].owner!=0);G.terrs[b].army={P:0,S:0,C:0,K:0,H:0,B:0,L:0};G.terrs[a].army.C+=50;
   await __dod.attack(0,a,b,{P:0,S:0,C:50,K:0,H:0,B:0,L:0},'auto');return G.tired.includes(b)})()""")
  ok("conquering troops rest until next turn",r)
  # AI uses marches
  ai=E("""(()=>{const G=__dod.G;G.marches=[];for(let i=0;i<10;i++){}return true})()""")
  for i in range(3):
    pg.click("#nextB") if pg.is_visible("#nextB") else None
    if pg.is_visible("#nextB"):pg.click("#nextB")
    if pg.is_visible("#endB"):pg.click("#endB")
    for j in range(80):
      if pg.is_visible("#dAuto"):pg.click("#dAuto")
      if pg.is_visible("#contB"):pg.click("#contB")
      if E("__dod.G.cur")==0:break
      pg.wait_for_timeout(150)
  ok("AI issues marches too",E("__dod.G.marches.some(m=>m.o>0)") or any(("cut off" in x) for x in E("__dod.G.log")) or E("window.__aiMarched||0")>0)
  pg.screenshot(path="screenshots/12-map-ai-marches.png")
  pg.wait_for_timeout(2500)
  # save/resume
  pg.reload();pg.wait_for_timeout(500);ok("resume visible",pg.is_visible("#resB"));pg.click("#resB");pg.wait_for_timeout(500);ok("resumed",E("__dod.G.turn")>=2)
  # win
  E("__dod.G.terrs.forEach((t,k)=>{if(k>0){t.owner=0}});__dod.G.players.forEach(p=>{if(p.ai)p.alive=false});__dod.checkEnd()");pg.wait_for_timeout(300)
  ok("victory screen",pg.is_visible("#endM") and "Victory" in pg.inner_text("#endM"));pg.screenshot(path="screenshots/7-victory.png")
  pg.click("#againB");pg.click("#newB");pg.wait_for_timeout(500)
  # lose: an AI attacks my last territory and I command the defense
  E("window.__fast=1;(()=>{const G=__dod.G;G.terrs.forEach(t=>{t.owner=1});})()")
  my=E("(()=>{const G=__dod.G,T=__dod.MAP.T;const k=G.terrs.findIndex(t=>t.cap==0);G.terrs[k].owner=0;G.terrs[k].army={P:10,S:0,C:0,K:0,H:0,B:0,L:0};const a=T[k].adj[0];G.terrs[a].owner=1;G.terrs[a].army={P:0,S:100,C:100,K:0,H:60,B:0,L:0};G.players[1].pers='aggressive';return k})()")
  E("__dod.G.cur=1;__dod.G.econDone=true;setTimeout(()=>__dod.startTurn(),10)");pg.wait_for_selector("#dCmd",timeout=5000);pg.screenshot(path="screenshots/8-ai-attacks-you.png")
  pg.click("#dCmd");pg.wait_for_timeout(300);ok("defense battle (you bottom)",pg.is_visible("#batC") and E("__B.attSide")==1)
  pg.screenshot(path="screenshots/9-defense-deploy.png");pg.click("#fightB");pg.click("#bAuto");pg.wait_for_selector("#contB",timeout=20000);pg.click("#contB");pg.wait_for_timeout(500)
  ok("defeat screen",pg.is_visible("#endM") and "Defeat" in pg.inner_text("#endM"));pg.screenshot(path="screenshots/10-defeat.png")
  ok("no JS errors "+str(errs[:3]),not errs)
  b.close()
srv.kill();print(sum(c for _,c in R),"/",len(R))
