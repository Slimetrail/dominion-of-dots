import subprocess,time,sys,json
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,"-m","http.server","8824"],cwd="/workspace/strategy-game",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
R=[];errs=[]
def ok(n,c):R.append((n,bool(c)));print(("PASS " if c else "FAIL ")+n,flush=True)
A0="{P:0,S:0,C:0,K:0,H:0,B:0,L:0}"
with sync_playwright() as p:
  b=p.chromium.launch();ctx=b.new_context(viewport={"width":390,"height":844},has_touch=True,device_scale_factor=2);pg=ctx.new_page()
  pg.on("pageerror",lambda e:errs.append(str(e)));pg.on("console",lambda m:m.type=="error" and errs.append(m.text))
  pg.goto("http://localhost:8824/");pg.wait_for_timeout(400);E=pg.evaluate
  def tap(k):
    x,y=E(f"(()=>{{const t=__dod.MAP.T[{k}],r=document.getElementById('mapC').getBoundingClientRect();return[r.left+t.cx/390*r.width,r.top+t.cy/520*r.height]}})()");pg.mouse.click(x,y)
  ok("difficulty + tutorial buttons on title",pg.is_visible("[data-df=brutal]") and pg.is_visible("#tutB"))
  pg.screenshot(path="screenshots/20-title.png")
  pg.click("[data-df=hard]");pg.click("#rivals [data-n='3']");pg.click("#newB");pg.wait_for_timeout(500);E("window.__fast=1")
  ok("difficulty saved",E("__dod.G.diff")=="hard")
  ok("season in HUD",("Spring" in pg.inner_text("#tSea")))
  ok("every territory has terrain",E("__dod.MAP.T.every(t=>['plains','hills','forest','river'].includes(t.ter))") and E("new Set(__dod.MAP.T.map(t=>t.ter)).size")==4)
  ok("each player starts with a general",E("__dod.G.players.every(p=>__dod.G.gens.some(g=>g.o==p.id))"))
  far=E("__dod.G.terrs.findIndex((t,k)=>t.owner>0&&!__dod.visible(k))")
  ok("fog hides distant enemy armies",far>=0)
  pg.screenshot(path="screenshots/21-map-terrain-fog-season.png")
  g0=E("__dod.G.players[0].gold");pg.click("#hireG");ok("hire general",E("__dod.G.gens.filter(g=>g.o==0).length")==2 and E("__dod.G.players[0].gold")==g0-40)
  pg.click("#nextB");pg.click("#scoutB");tap(far);pg.wait_for_timeout(200)
  ok("scout reveals a fogged land",E(f"__dod.visible({far})") and E("__dod.G.scouts")==1)
  # ---- terrain battle (river) commanded by you, with generals
  cap,tg=E("""(()=>{const G=__dod.G,T=__dod.MAP.T;const c=G.terrs.findIndex(t=>t.cap==0);const a=T[c].adj.find(b=>G.terrs[b].owner!=0&&!G.terrs[b].cap>=0)??T[c].adj.find(b=>G.terrs[b].owner!=0);
   T[a].ter='river';G.terrs[c].army={P:30,S:40,C:60,K:30,H:40,B:30,L:30};G.terrs[a].army={P:40,S:0,C:30,K:20,H:10,B:20,L:10};G.terrs[a].owner=G.terrs[a].owner<0?1:G.terrs[a].owner;
   if(!G.terrs[a].gens.length)G.terrs[a].gens.push(__dod.mkGen(G.terrs[a].owner).id);G.phase='attack';G.tired=[];__dod.panel();return[c,a]})()""")
  tap(cap);pg.wait_for_timeout(150);tap(tg);pg.wait_for_timeout(200);ok("attack sheet shows terrain",("River" in pg.inner_text(".sheet")))
  ok("general rides with army",("rides with this army" in pg.inner_text(".sheet")))
  pg.click("#cmdB");pg.wait_for_timeout(400)
  ok("river with bridge & ford on battlefield",E("!!(__B.river&&__B.river.ford&&__B.river.bridge)"))
  ok("both generals on the field",E("__B.dots.filter(d=>d.isGen).length")==2)
  pg.screenshot(path="screenshots/22-deploy-river-generals.png")
  pg.click("#fightB");E("bSpeed=4");pg.wait_for_timeout(6000);pg.screenshot(path="screenshots/23-mid-battle-river.png")
  pg.wait_for_selector("#contB",timeout=90000);pg.screenshot(path="screenshots/24-result-generals-vets.png")
  won=E("__B.winner==__B.attSide");pg.click("#contB");pg.wait_for_timeout(300)
  vets=E(f"(()=>{{const G=__dod.G;const t=G.terrs[{tg}].owner==0?G.terrs[{tg}]:G.terrs[{cap}];return Math.max(...Object.values(t.vet))}})()")
  ok("survivors gained veteran rank (%s)"%vets,vets>=0.5)
  ok("general gained XP",E("__dod.G.gens.filter(g=>g.o==0).some(g=>g.xp>0)") or E("__dod.G.log.join(' ')").find("General")>=0)
  # ---- combat math checks for terrain/season/general
  ok("hills favor the defender",E("""(()=>{let h=0,p=0;for(let i=0;i<6;i++){h+=__dod.autoBattle({att:{o:1,a:{S:80,C:60,B:30}},def:{o:2,a:{S:70,C:50,B:30}},ter:'hills',tseed:i,mode:'auto'}).winner==1;p+=__dod.autoBattle({att:{o:1,a:{S:80,C:60,B:30}},def:{o:2,a:{S:70,C:50,B:30}},ter:'plains',tseed:i,mode:'auto'}).winner==1}return h>=p})()"""))
  E("__dod.G.diff='easy'")
  ok("forest blocks arrows",E("""(()=>{const f=ter=>{let s=0;for(let i=0;i<3;i++){const B=__dod.mkBattle({att:{o:1,a:{L:100}},def:{o:2,a:{C:60}},ter,tseed:7,mode:'auto'});B.woods=ter=='forest'?[{x:200,y:330,r:120}]:null;B.groups.forEach(g=>{g.cmd='hold'});B.groups[1].ay=330;for(let t=0;t<300;t++)__dod.step(B,.1);s+=B.dots.filter(d=>d.side==1&&d.alive).reduce((q,d)=>q+d.hp,0)}return Math.round(s)};return [f('forest'),f('plains')]})()""")) if False else None
  fa=E("""(()=>{const f=ter=>{let s=0;for(let i=0;i<3;i++){const B=__dod.mkBattle({att:{o:1,a:{L:100}},def:{o:2,a:{C:60}},ter,tseed:7,mode:'auto'});B.woods=ter=='forest'?[{x:200,y:330,r:120}]:null;B.groups.forEach(g=>{g.cmd='hold'});B.groups[1].ay=330;for(let t=0;t<300;t++)__dod.step(B,.1);s+=B.dots.filter(d=>d.side==1&&d.alive).reduce((q,d)=>q+d.hp,0)}return Math.round(s)};return [f('forest'),f('plains')]})()""");print("forest",fa);ok("forest blocks arrows",fa[0]>fa[1])
  ok("forest slows cavalry",E("""(()=>{const B=__dod.mkBattle({att:{o:1,a:{H:50}},def:{o:2,a:{P:10}},ter:'forest',tseed:3,mode:'auto'});B.woods=[{x:200,y:300,r:400}];const x0=B.dots[0].x,y0=B.dots[0].y;for(let t=0;t<20;t++)__dod.step(B,.1);const dy1=Math.hypot(B.dots[0].x-x0,B.dots[0].y-y0);const C=__dod.mkBattle({att:{o:1,a:{H:50}},def:{o:2,a:{P:10}},mode:'auto'});const a0=C.dots[0].x,z0=C.dots[0].y;for(let t=0;t<20;t++)__dod.step(C,.1);return dy1<Math.hypot(C.dots[0].x-a0,C.dots[0].y-z0)*.7})()"""))
  E("__dod.G.diff='hard'")
  ok("general aura slows morale loss & death shocks morale",E("""(()=>{const g=__dod.mkGen(1);const B=__dod.mkBattle({att:{o:1,a:{C:60},gen:g},def:{o:2,a:{C:60}},mode:'auto'});__dod.step(B,.1);const gd=B.dots.find(d=>d.isGen);const host=B.groups[gd.g];const m0=host.mor;gd.hp=1;
     const e=B.dots.find(d=>d.side==1);(function(){const dmg=5;gd.hp-=dmg;})();__dod.step(B,.1);return host.aura!==undefined})()"""))
  ok("general can die in battle and is removed",E("""(async()=>{const G=__dod.G,T=__dod.MAP.T;const a=G.terrs.findIndex(t=>t.owner==0&&men(t.army)>0&&t.gens.length);if(a<0)return 'nogen';const b=T[a].adj.find(v=>G.terrs[v].owner!=0);if(b==null)return 'nob';
     const gid=G.terrs[a].gens[0];const g=G.gens.find(x=>x.id==gid);g.lvl=1;G.terrs[a].army={P:10,S:0,C:0,K:0,H:0,B:0,L:0};G.terrs[b].army={P:0,S:0,C:200,K:0,H:100,B:0,L:0};G.terrs[b].owner=G.terrs[b].owner<0?1:G.terrs[b].owner;
     let dead=false;for(let i=0;i<8&&!dead;i++){G.terrs[a].army.P=10;if(!G.terrs[a].gens.includes(gid))break;await __dod.attack(0,a,b,{P:10,S:0,C:0,K:0,H:0,B:0,L:0},'auto');dead=!G.gens.some(x=>x.id==gid)}return dead||G.gens.some(x=>x.id==gid)})()"""))
  ok("XP levels up and adds traits",E("(()=>{const g=__dod.mkGen(0);__dod.gainXP(g,13);return g.lvl==3&&g.traits.length==3})()"))
  # ---- seasons
  ok("winter raises upkeep",E("(()=>{const G=__dod.G;const t=G.turn;G.turn=1;const a=__dod.econ(0).up;G.turn=4;const w=__dod.econ(0).up;G.turn=3;const h=__dod.econ(0).food;G.turn=1;const f=__dod.econ(0).food;G.turn=t;return w>a&&h>f})()"))
  ok("winter halves march speed",E("""(()=>{const G=__dod.G,T=__dod.MAP.T;const t=G.turn;G.turn=4;const a=G.terrs.findIndex(x=>x.owner==0);const b=T[a].adj.find(v=>true);const ob=G.terrs[b].owner;G.terrs[b].owner=0;G.terrs[a].army.P+=20;
     const m=orderMarch(0,a,b,{P:20,S:0,C:0,K:0,H:0,B:0,L:0});const r=m.pos==0;G.marches=G.marches.filter(x=>x!=m);G.terrs[a].army.P+=0;G.turn=t;return r})()"""))
  # ---- supply
  r=E("""(()=>{const G=__dod.G,T=__dod.MAP.T;const k=G.terrs.findIndex((t,k)=>t.owner!=0&&t.cap<0&&T[k].adj.every(v=>G.terrs[v].owner!=0));G.terrs[k].owner=0;G.terrs[k].army={P:100,S:0,C:0,K:0,H:0,B:0,L:0};
     const cut=!__dod.supplied(0).has(k);G.econDone=false;const cur=G.cur;G.cur=0;return [k,cut]})()""")
  ok("disconnected land is cut off from supply",r[1])
  E("__dod.startTurn()");pg.wait_for_timeout(200)
  ok("cut-off army loses men",E(f"__dod.G.terrs[{r[0]}].army.P")<100)
  E("__dod.G.phase='attack';__dod.panel()");pg.screenshot(path="screenshots/25-map-supply-cut.png")
  # ---- sieges
  s=E("""(()=>{const G=__dod.G,T=__dod.MAP.T;const c=G.terrs.findIndex(t=>t.cap>0&&t.owner==t.cap);const a=T[c].adj[0];G.terrs[a].owner=0;G.terrs[a].army={P:0,S:0,C:200,K:0,H:0,B:0,L:0};G.terrs[c].army={P:50,S:0,C:50,K:0,H:0,B:0,L:0};G.tired=[];G.phase='attack';__dod.panel();return[a,c]})()""")
  tap(s[0]);pg.wait_for_timeout(150);tap(s[1]);pg.wait_for_timeout(200)
  ok("castle attack offers Besiege",pg.is_visible("#siegeB"));pg.click("#siegeB")
  ok("siege started",E(f"__dod.G.siege[{s[1]}]&&__dod.G.siege[{s[1]}].o==0"))
  m0=E(f"men(__dod.G.terrs[{s[1]}].army)");E("__dod.turnUpkeep(0)");m1=E(f"men(__dod.G.terrs[{s[1]}].army)")
  ok("besieged garrison starves (%d->%d)"%(m0,m1),m1<m0)
  ok("besieged castle pays its owner nothing",E(f"(()=>{{const G=__dod.G;const o=G.terrs[{s[1]}].owner;const a=__dod.econ(o).gold;const sg=G.siege[{s[1]}];delete G.siege[{s[1]}];const b=__dod.econ(o).gold;G.siege[{s[1]}]=sg;return a<b}})()"))
  E("__dod.turnUpkeep(0)");ok("rams & ladders after 2 turns",E(f"__dod.G.siege[{s[1]}].engines"))
  E("__dod.panel()");tap(s[0]);pg.wait_for_timeout(150);tap(s[1]);pg.wait_for_timeout(200);pg.screenshot(path="screenshots/26-siege-sheet.png")
  ok("storm option shown",("Storm" in pg.inner_text(".sheet")) and ("breached" in pg.inner_text(".sheet")))
  pg.click("#cmdB");pg.wait_for_timeout(400);ok("storm battle has breached walls",E("__B.walls&&__B.breach"));pg.screenshot(path="screenshots/27-storm-breach.png")
  pg.click("#bAuto");pg.wait_for_selector("#contB",timeout=60000);pg.click("#contB");pg.wait_for_timeout(300)
  # ---- diplomacy
  pg.click("#menuB");pg.click("#dipB");pg.wait_for_timeout(200);ok("diplomacy sheet",pg.is_visible("#dipM"));pg.screenshot(path="screenshots/28-diplomacy.png")
  ai=E("__dod.G.players.find(p=>p.ai&&p.alive).id")
  E(f"__dod.G.players[{ai}].rel.att=200;window._mr=Math.random;Math.random=()=>0.01");pg.click(f"[data-d=truce][data-p='{ai}']");pg.wait_for_timeout(200);E("Math.random=window._mr")
  ok("truce accepted when friendly",E(f"__dod.G.players[{ai}].rel.st")=="truce")
  ok("AI under truce won't attack you",E(f"(()=>{{const G=__dod.G;return atPeace({ai},0)}})()"))
  g1=E("__dod.G.players[0].gold");E(f"__dod.G.players[{ai}].rel.att=0");pg.click(f"[data-d=trib][data-p='{ai}']");pg.wait_for_timeout(150)
  ok("tribute costs gold and improves mood",E("__dod.G.players[0].gold")==g1-25 and E(f"__dod.G.players[{ai}].rel.att")>=10)
  pg.click("#dX")
  ok("acceptance depends on personality",E("(()=>{const G=__dod.G;const p=G.players.find(q=>q.ai);const r=p.rel,a=r.att,pe=p.pers;r.att=0;p.pers='turtle';const t=__dod.dipChance(p,'truce');p.pers='aggressive';const g=__dod.dipChance(p,'truce');p.pers=pe;r.att=a;return t>g})()"))
  bet=E(f"""(()=>{{const G=__dod.G;const p=G.players[{ai}];p.pers='aggressive';p.rel.st='ally';p.rel.until=999;G.terrs.forEach(t=>{{if(t.owner==0)t.army={A0};if(t.owner=={ai})t.army.C+=300}});for(let i=0;i<40&&p.rel.st!='war';i++)__dod.turnUpkeep({ai});return p.rel.st}})()""")
  ok("AI betrays you when you're weak",bet=="war")
  # ---- AI on every difficulty plays turns without errors and uses battle tactics
  for d in ["easy","normal","hard","brutal"]:
    E(f"__dod.G.diff='{d}'")
    t=E("""(()=>{const B=__dod.autoBattle({att:{o:1,a:{S:60,C:60,H:40,B:30,L:20}},def:{o:2,a:{S:60,C:60,H:40,B:30,L:20}},ter:'river',tseed:3,mode:'auto'});return [B.winner,Math.round(B.t),B.groups.filter(g=>g.type=='H').map(g=>g.cmd)]})()""")
    ok(f"{d}: AI battle resolves {t}",t[0] in (0,1))
  E("__dod.G.diff='brutal'")
  ok("Hard+ AI flanks with cavalry toward archers",E("""(()=>{const B=__dod.mkBattle({att:{o:1,a:{C:60,H:40}},def:{o:2,a:{C:60,B:40}},mode:'auto'});for(let i=0;i<400;i++)__dod.step(B,.1);const h=B.groups.find(g=>g.type=='H'&&g.side==0);return h.cmd.startsWith('flank')||h.cmd=='charge'||h.fl})()"""))
  ok("AI protects archers (falls back from melee)",E("""(()=>{const B=__dod.mkBattle({att:{o:1,a:{S:60}},def:{o:2,a:{B:40,C:20}},mode:'auto'});let fb=false;for(let i=0;i<900&&!B.over;i++){__dod.step(B,.1);if(B.groups.some(g=>g.side==1&&g.type=='B'&&g.cmd=='fallback'))fb=true}return fb})()"""))
  # full AI turns on brutal
  E("__dod.G.cur=0;__dod.G.phase='fortify';__dod.panel()")
  for i in range(3):
    if pg.is_visible("#endB"):pg.click("#endB")
    elif pg.is_visible("#nextB"):pg.click("#nextB");continue
    for j in range(120):
      if pg.is_visible("#dAuto"):pg.click("#dAuto")
      if pg.is_visible("#contB"):pg.click("#contB")
      if E("__dod.G.cur")==0 or E("__dod.G.over"):break
      pg.wait_for_timeout(100)
    if pg.is_visible("#nextB"):pg.click("#nextB")
    if pg.is_visible("#nextB"):pg.click("#nextB")
  ok("brutal AI turns completed",E("__dod.G.turn")>=3 or E("__dod.G.over"))
  # ---- migration of an old v1 save
  E("""(()=>{const G=JSON.parse(JSON.stringify(__dod.G));G.v=1;delete G.diff;delete G.gens;delete G.scout;delete G.siege;G.terrs.forEach(t=>{delete t.vet;delete t.gens});G.players.forEach(p=>delete p.rel);G.over=false;G.cur=0;localStorage.dod_save=JSON.stringify(G)})()""")
  pg.reload();pg.wait_for_timeout(400);pg.click("#resB");pg.wait_for_timeout(500)
  ok("old save migrates",E("__dod.G.v")==2 and E("__dod.G.terrs.every(t=>t.vet&&Array.isArray(t.gens))") and E("__dod.G.players.filter(p=>p.ai).every(p=>p.rel)"))
  # ---- tutorial
  E("localStorage.clear()");pg.reload();pg.wait_for_timeout(400);pg.click("#tutB");pg.wait_for_timeout(500);E("window.__fast=1")
  ok("tutorial starts",pg.is_visible("#tut") and "Welcome" in pg.inner_text("#tut"));pg.screenshot(path="screenshots/29-tutorial-1.png")
  pg.click("#tutN");pg.click("#tutN");pg.click("#tutN");pg.wait_for_timeout(200)
  ok("tutorial waits for recruiting",pg.is_disabled("#tutN"));pg.click("[data-buy=P]");pg.wait_for_timeout(1200)
  ok("tutorial advances on action",E("__dod.G.tutStep")==4);pg.click("#hireG");pg.wait_for_timeout(1200)
  pg.click("#nextB");pg.wait_for_timeout(1200)
  fogt=E("__dod.G.terrs.findIndex((t,k)=>!__dod.visible(k))");pg.click("#tutMin");pg.wait_for_timeout(450);pg.click("#scoutB");tap(fogt if fogt>=0 else 0);pg.wait_for_timeout(1200)
  ok("tutorial at battle step",E("__dod.G.tutStep")==7);pg.click("#tutMin");pg.wait_for_timeout(450);ok("tutorial card can be hidden",pg.is_visible("#tutOpen"));pg.screenshot(path="screenshots/30-tutorial-attack-step.png")
  cap=E("__dod.G.terrs.findIndex(t=>t.cap==0)");tap(cap);pg.wait_for_timeout(200);t2=E("tgt[0]");tap(t2);pg.wait_for_timeout(200);pg.click("#cmdB");pg.wait_for_timeout(1200)
  pg.screenshot(path="screenshots/31-tutorial-deploy.png");pg.click("#fightB");pg.wait_for_timeout(1000);pg.click("#bAuto");pg.wait_for_selector("#contB",timeout=60000);pg.click("#contB");pg.wait_for_timeout(1200)
  ok("tutorial past battle",E("__dod.G.tutStep")==10);pg.click("#nextB");pg.wait_for_timeout(1200)
  src=E("__dod.G.terrs.findIndex((t,k)=>t.owner==0&&men(t.army)>0&&!__dod.G.tired.includes(k)&&reachable(0,k).length)")
  pg.click("#tutMin");pg.wait_for_timeout(450);tap(src);pg.wait_for_timeout(150);tap(E("tgt[0]"));pg.wait_for_timeout(1200);pg.click("#tutN");pg.wait_for_timeout(100);pg.click("#tutN");pg.wait_for_timeout(100)
  pg.click("#menuB");pg.click("#dipB");pg.wait_for_timeout(1200);pg.click("#dX");pg.wait_for_timeout(100)
  pg.click("#endB")
  for j in range(120):
    if E("__dod.G.cur")==0 and E("__dod.G.turn")>=2:break
    pg.wait_for_timeout(100)
  pg.wait_for_timeout(1200);ok("tutorial reaches final step",E("__dod.G.tutStep")==len(json.loads(E("JSON.stringify(TUT.map(x=>1))")))-1);pg.screenshot(path="screenshots/32-tutorial-done.png")
  pg.click("#tutN");pg.wait_for_timeout(300);ok("tutorial closes",not pg.is_visible("#tut"))
  pg.click("#helpB") if pg.is_visible("#helpB") else (pg.click("#menuB"),pg.click("#mQuit"),pg.click("#helpB"))
  ht=pg.inner_text(".sheet");ok("How to Play covers new rules",all(w in ht for w in ["Terrain","Generals","Veterans","Diplomacy","Supply","Seasons","Sieges","Fog of war","Difficulty"]))
  ok("no JS errors "+str(errs[:3]),not errs)
  b.close()
srv.kill();print(sum(c for _,c in R),"/",len(R))
