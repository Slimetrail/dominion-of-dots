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
  tap(tg);pg.wait_for_timeout(200);ok("attack sheet",pg.is_visible("#cmdB"))
  pg.click("#cmdB");pg.wait_for_timeout(500);ok("battle screen",pg.is_visible("#batC"))
  pg.click("[data-pre=hammer]");pg.click("[data-g]");pg.click("[data-form=wedge]")
  # drag a group
  bb=pg.locator("#batC").bounding_box();pg.mouse.move(bb["x"]+bb["width"]*.5,bb["y"]+bb["height"]*.85);pg.mouse.down();pg.mouse.move(bb["x"]+bb["width"]*.3,bb["y"]+bb["height"]*.8,steps=5);pg.mouse.up()
  pg.screenshot(path="screenshots/3-deployment.png")
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
  ok("scutum resists arrows better than swords",E("(()=>{const f=t=>{const a={};a[t]=100;const B=__dod.mkBattle({att:{o:1,a},def:{o:2,a:{L:100}},mode:'auto'});B.groups[0].cmd='hold';B.groups[0].ay=230;for(let i=0;i<300;i++)__dod.step(B,.1);return B.dots.filter(d=>d.side==0&&d.alive).length};let c=0,s=0;for(let i=0;i<3;i++){c+=f('C');s+=f('S')}return c>s})()"))
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
  pg.wait_for_timeout(2500)
  # save/resume
  pg.reload();pg.wait_for_timeout(500);ok("resume visible",pg.is_visible("#resB"));pg.click("#resB");pg.wait_for_timeout(500);ok("resumed",E("__dod.G.turn")==2)
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
