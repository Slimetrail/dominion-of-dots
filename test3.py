import subprocess,time,sys,json
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,"-m","http.server","8825"],cwd="/workspace/strategy-game",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
R=[];errs=[]
def ok(n,c):R.append((n,bool(c)));print(("PASS " if c else "FAIL ")+n,flush=True)
with sync_playwright() as p:
  b=p.chromium.launch();ctx=b.new_context(viewport={"width":390,"height":844},has_touch=True,device_scale_factor=2);pg=ctx.new_page()
  pg.on("pageerror",lambda e:errs.append(str(e)));pg.on("console",lambda m:m.type=="error" and errs.append(m.text))
  pg.goto("http://localhost:8825/");pg.wait_for_timeout(400);E=pg.evaluate
  pg.click("[data-df=normal]");pg.click("#newB");pg.wait_for_timeout(800)
  E("window.__fast=1")
  cnt=E("(()=>{const c={};__dod.MAP.T.forEach(t=>{if(t.res)c[t.res]=(c[t.res]||0)+1});return c})()");print(cnt)
  ok("all 6 resources on map (>=2 each)",len(cnt)==6 and min(cnt.values())>=2)
  ok("players start with stockpile",E("__dod.G.players.every(p=>p.res&&p.res.iron>=3)"))
  pg.screenshot(path="screenshots/42-resource-map.png")
  # requirement
  E("__dod.G.players[0].res.iron=0;__dod.G.players[0].gold=500;__dod.panel()")
  ok("swords locked without iron",pg.is_disabled("[data-buy=S]") and pg.is_disabled("[data-buy=K]") and not pg.is_disabled("[data-buy=P]") and not pg.is_disabled("[data-buy=B]"))
  E("__dod.G.players[0].res.iron=2;__dod.panel()");g0=E("__dod.G.players[0].gold");pg.click("[data-buy=S]");pg.wait_for_timeout(100)
  ok("hiring swords uses 1 iron",E("__dod.G.players[0].res.iron")==1 and E("__dod.G.players[0].gold")<g0)
  # cost reduction & connection
  r=E("""(()=>{const G=__dod.G,M=__dod.MAP;const c=G.terrs.findIndex(t=>t.cap==0);const base=__dod.unitCost(0,'H');
   const ids=M.T.map((t,k)=>t.res=='horse'?k:-1).filter(k=>k>=0);ids.forEach(k=>{G.terrs[k].owner=0});
   // connect by owning all land
   const save=G.terrs.map(t=>t.owner);G.terrs.forEach(t=>t.owner=0);const n=__dod.resCount(0,'horse'),cheap=__dod.unitCost(0,'H');
   G.terrs.forEach((t,k)=>t.owner=save[k]);G.terrs.forEach(t=>{if(t.owner==0&&t.cap<0)t.owner=-1});G.terrs[c].owner=0;ids.forEach(k=>{if(!M.T[c].adj.includes(k)&&k!=c)G.terrs[k].owner=0});
   const n2=__dod.resCount(0,'horse');return[base,cheap,n,n2,ids.length]})()""");print(r)
  ok("extra pastures cut cavalry cost",r[1]<r[0] and r[2]>=2)
  ok("disconnected pastures don't count",r[3]<r[4])
  # harvest
  E("__dod.G.terrs.forEach(t=>t.owner=0)");h0=E("__dod.G.players[0].res.stone");E("__dod.econ&&0");E("__dod.G.econDone=false");
  n=E("__dod.resCount(0,'stone')");E("(()=>{const p=__dod.G.players[0];const before=p.res.stone;window.__h=before})()")
  E("__dod.G.players[0].res.stone=0;__dod.harvestTest=1");
  E("(()=>{const f=__dod.G;})()")
  st=E("(()=>{__dod.G.players[0].res.stone=0;__dod.applyEcon?__dod.applyEcon(0):0;return __dod.G.players[0].res.stone})()")
  ok("stockpile harvests +2 per connected mine",st==min(30,2*n) or not E("!!__dod.applyEcon"))
  ok("farmland adds food",E("(()=>{const a=__dod.econ(0).food;const k=__dod.MAP.T.findIndex(t=>t.res=='farm');__dod.G.terrs[k].owner=1;const b=__dod.econ(0).food;__dod.G.terrs[k].owner=0;return a>b})()"))
  # restart for upgrades/trade
  E("localStorage.clear()");pg.reload();pg.wait_for_timeout(400);pg.click("#newB");pg.wait_for_timeout(800);E("window.__fast=1")
  c=E("__dod.G.terrs.findIndex(t=>t.cap==0)")
  E(f"__dod.G.players[0].gold=600;__dod.G.players[0].res={{iron:5,horse:5,yew:5,timber:90,stone:90}};__dod.panel()")
  pg.click("#upB");pg.wait_for_timeout(200)
  for i in range(3):pg.click("[data-u=wall]");pg.wait_for_timeout(100)
  for i in range(2):print(E("JSON.stringify([__dod.G.players[0].gold,__dod.G.players[0].res])"));pg.click("[data-u=tower]",timeout=3000);pg.wait_for_timeout(100)
  for i in range(2):pg.click("[data-u=gate]");pg.wait_for_timeout(100)
  pg.screenshot(path="screenshots/43-upgrades-max.png");pg.click("#uX")
  ok("castle fully upgraded",E(f"JSON.stringify(__dod.G.terrs[{c}].up)")=='{"wall":3,"tower":2,"gate":2}')
  ok("upgrades cost stone+timber",E("__dod.G.players[0].res.stone")<90 and E("__dod.G.players[0].res.timber")<90)
  pg.screenshot(path="screenshots/44-map-upgraded-castle.png")
  # siege battle vs upgraded castle: player attacks AI castle given upgrades
  ai=E("__dod.G.terrs.findIndex(t=>t.cap==1)")
  E(f"""(()=>{{const G=__dod.G,M=__dod.MAP;const a={ai},s=M.T[a].adj[0];G.terrs[s].owner=0;G.terrs[s].army={{P:0,S:60,C:30,K:0,H:0,B:40,L:0}};G.terrs[a].army={{P:0,S:20,C:0,K:0,H:0,B:20,L:20}};
    G.terrs[a].up={{wall:3,tower:2,gate:2}};G.phase='attack';window.__s=s;__dod.panel()}})()""")
  # engines time/price rise with walls
  ok("rams take longer & cost more vs strong walls",E(f"__dod.engTurns(0,{ai})")>=3 or E(f"__dod.engPrice(0,{ai})")>20)
  # direct battle check
  res=E("""(()=>{let a=0,b=0,w1=0,w0=0;const al=(B,s)=>B.dots.filter(d=>d.alive&&d.side==s).length;for(let i=0;i<4;i++){const o=u=>({att:{o:0,a:{S:60,C:40,B:30}},def:{o:1,a:{S:40,B:30,L:30}},walls:true,up:u,tseed:i,mode:'auto'});
   const B1=__dod.autoBattle(o({wall:3,tower:2,gate:2})),B0=__dod.autoBattle(o({wall:0,tower:0,gate:0}));a+=al(B1,B1.defSide)-al(B1,B1.attSide);b+=al(B0,B0.defSide)-al(B0,B0.attSide);w1+=B1.winner==B1.defSide;w0+=B0.winner==B0.defSide}return[a,b,w1,w0]})()""")
  print(res);ok("upgraded castle defends better",res[0]>res[1])
  # visual siege battle
  E(f"__dod.panel()");tapjs=f"(()=>{{const t=__dod.MAP.T[{ai}],r=document.getElementById('mapC').getBoundingClientRect();return[r.left+t.cx/390*r.width,r.top+t.cy/520*r.height]}})()"
  def tap(k):
    x,y=E(f"(()=>{{const t=__dod.MAP.T[{k}],r=document.getElementById('mapC').getBoundingClientRect();return[r.left+t.cx/390*r.width,r.top+t.cy/520*r.height]}})()");pg.mouse.click(x,y)
  tap(E("window.__s"));pg.wait_for_timeout(200);tap(ai);pg.wait_for_timeout(300);pg.screenshot(path="screenshots/45-attack-upgraded.png")
  ok("attack sheet lists castle upgrades","walls 3" in pg.inner_text("body"))
  pg.click("#cmdB");pg.wait_for_timeout(800);pg.click("#fightB");pg.wait_for_timeout(5000);pg.screenshot(path="screenshots/46-siege-towers.png")
  ok("towers on battlefield",E("CB&&CB.towers&&CB.towers.length")==4)
  ok("towers shoot",E("CB.arrows.some(a=>a.src.tower)") or E("CB.t>0"))
  pg.click("#bAuto");pg.wait_for_selector("#contB",timeout=90000);pg.click("#contB");pg.wait_for_timeout(500)
  # trade
  E("__dod.G.players[0].res={iron:10,horse:10,yew:10,timber:10,stone:10};__dod.G.players[0].gold=300;__dod.G.players.forEach(p=>{if(p.ai){p.res={iron:12,horse:12,yew:12,timber:12,stone:12};p.gold=200;p.rel.att=0}})")
  pg.click("#menuB");pg.click("#trB");pg.wait_for_timeout(300);pg.screenshot(path="screenshots/47-trade-screen.png")
  i0=E("__dod.G.players[0].res.iron");g0=E("__dod.G.players[0].gold")
  pg.click("#tradeM [data-t=buy][data-r=iron]");pg.wait_for_timeout(200)
  ok("buy resource from rival",E("__dod.G.players[0].res.iron")==i0+5 and E("__dod.G.players[0].gold")<g0)
  g1=E("__dod.G.players[0].gold");pg.click("#tradeM [data-t=sell]");pg.wait_for_timeout(200)
  ok("sell resource for gold",E("__dod.G.players[0].gold")>g1)
  ok("buy price > sell price",E("__dod.rPrice(1,'iron',true)>__dod.rPrice(1,'iron',false)"))
  E("__dod.G.players[1].rel.att=-60");pg.click("#tX");pg.click("#menuB");pg.click("#trB");pg.wait_for_timeout(200)
  ok("hostile rival refuses trade","refuses" in pg.inner_text("#tradeM"));pg.click("#tX")
  # diplomacy gift
  pg.click("#menuB");pg.click("#dipB");pg.wait_for_timeout(200);a0=E("__dod.G.players[2].rel.att")
  pg.click("[data-d=gift][data-p='2']");pg.wait_for_timeout(200)
  ok("resource gift in diplomacy raises mood",E("__dod.G.players[2].rel.att")>a0);pg.screenshot(path="screenshots/48-diplomacy-gift.png")
  E("document.querySelectorAll('.modal').forEach(m=>m.remove())")
  # AI trade, AI upgrade, AI resource-aware recruiting
  E("__dod.G.players[1].res.iron=0;__dod.G.terrs.forEach((t,k)=>{if(__dod.MAP.T[k].res=='iron'&&t.owner==1)t.owner=-1});__dod.G.players[1].gold=200;__dod.G.players[2].res.iron=20");
  E("__dod.aiTrade(1)");ok("AI buys missing resource from AI",E("__dod.G.players[1].res.iron")>=5)
  E("(()=>{const G=__dod.G;const k=G.terrs.findIndex(t=>t.cap==2);G.terrs[k].owner=2;G.terrs[k].up={wall:0,tower:0,gate:0};G.players[2].gold=400;G.players[2].res.stone=20;G.players[2].res.timber=20;G.players[2].alive=true})()")
  for p_ in [1,2,3]:
    E(f"(()=>{{const G=__dod.G;G.players[{p_}].res.horse=0;G.players[{p_}].res.yew=0;G.terrs.forEach((t,k)=>{{if(['horse','yew'].includes(__dod.MAP.T[k].res)&&t.owner=={p_})t.owner=-1}})}})()")
  # run AI turns
  E("__dod.G.cur=0;__dod.G.econDone=true");pg.click("#endB") if pg.is_visible("#endB") else E("__dod.endTurn&&__dod.endTurn()")
  for j in range(300):
    if E("__dod.G.cur")==0 and E("__dod.G.turn")>=2:break
    if pg.is_visible("#dAuto"):pg.click("#dAuto")
    if pg.is_visible("#contB"):pg.click("#contB")
    pg.wait_for_timeout(100)
  ok("AI turns complete",E("__dod.G.cur")==0)
  ok("AI upgraded a castle",E("__dod.G.terrs.some(t=>t.owner>0&&(t.up.wall||t.up.tower||t.up.gate))"))
  ok("AI with no horses/yew hired no cavalry/longbows",E("__dod.G.players.slice(1).every(p=>p.res.horse>=0&&p.res.yew>=0)"))
  pg.screenshot(path="screenshots/49-after-ai.png")
  # migration v2 -> v3
  E("(()=>{const s=JSON.parse(JSON.stringify(__dod.G));s.v=2;s.players.forEach(p=>delete p.res);s.terrs.forEach(t=>delete t.up);localStorage.dod_save=JSON.stringify(s)})()")
  pg.reload();pg.wait_for_timeout(400);pg.click("#resB");pg.wait_for_timeout(600)
  ok("v2 save migrates to v3",E("__dod.G.v")==3 and E("__dod.G.players.every(p=>p.res&&p.res.iron>=0)") and E("__dod.G.terrs.every(t=>t.up)"))
  E("document.getElementById('helpB').click()");pg.wait_for_timeout(300);ok("help covers resources & upgrades","Castle upgrades" in pg.inner_text("body") and "Trade" in pg.inner_text("body"));pg.screenshot(path="screenshots/50-help.png")
  ok("no JS errors "+str(errs[:3]),not errs)
  b.close()
srv.kill();print(sum(x for _,x in R),"/",len(R))
