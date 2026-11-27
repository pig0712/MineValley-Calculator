// Run with: node tests/verify.cjs
const assert=require("node:assert/strict");
global.window=global;
let stored=null;
global.localStorage={getItem:()=>stored,setItem:(_,value)=>{stored=value;}};
require("../seed.js");require("../prices.js");require("../engine.js");require("../machines.js");require("../store.js");
const E=global.MV,S=global.MVStore,s=S.initial(),map=E.catalog(s.items);
let passed=0;
function test(label,fn){fn();passed++;console.log("✓ "+label);}
function order(item,qty,key="o",amount=null){return {key,item,qty,amount,basis:"total",active:true};}
function product(id,inputs={},out=1,sec=5,station="기술대"){return {id,inputs,out,sec,station:Object.keys(inputs).length?station:"직접 조달"};}
const sample=E.plan(s.orders,map);
test("공식 데이터의 참조와 순환을 검증한다",()=>{S.check(s);assert.equal(s.items.filter(i=>Object.keys(i.inputs).length).length,240);});
test("공식 가공 도감의 다섯 분류와 단위 수량을 검증한다",()=>{
  const counts=Object.fromEntries(S.processingGroups.map(({group,label})=>[label,s.items.filter(i=>i.station==="가공대"&&i.group===group).length]));
  assert.deepEqual(counts,{요리:41,제련:16,바리스타:29,보석:26,세공:46});
  assert.deepEqual(map.get("가든 블렌드").inputs,{"로즈마리 티":1,오이:1,"수박 조각":2,설탕:1});
  assert.deepEqual(map.get("프리즈마").inputs,{홍옥석:6,청옥석:6,녹옥석:6,황옥석:6,"네더라이트 주괴":4});
  const plan=E.plan([order("가든 블렌드",3)],map);
  assert.equal(plan.purchases.로즈마리,6);
  assert.equal(plan.purchases["수박 조각"],6);
  assert.equal(map.get("초심의 반지").water,60);
});
test("기존 백업에 새 가공품을 합치면서 사용자 데이터는 보존한다",()=>{
  const saved=S.initial();
  saved.items=saved.items.filter(item=>MV_SEED.items.some(base=>base.id===item.id));
  saved.items.find(item=>item.id==="정밀 판재").sec=17;
  saved.prices["정밀 판재"]={sell:950};
  saved.inv["정밀 판재"]=11;
  saved.auto.qty=320;
  S.restore(saved);
  assert.equal(S.data.items.length,s.items.length);
  assert.equal(S.data.items.find(item=>item.id==="정밀 판재").sec,17);
  assert.equal(S.data.prices["정밀 판재"].sell,950);
  assert.equal(S.data.inv["정밀 판재"],11);
  assert.equal(S.data.auto.qty,320);
  assert.equal(S.data.items.find(item=>item.id==="햄버거").group,"요리");
  S.restore(JSON.parse(stored));
  assert.equal(S.data.items.length,s.items.length);
});
test("상점 기록의 구매가·판매가·품질별 가격을 각각 반영한다",()=>{
  const count=key=>Object.values(s.prices).filter(p=>E.finite(p[key])).length;
  assert.deepEqual(["buy","sell","sellHigh","sellTop","market"].map(count),[56,189,92,92,1]);
  const {buy,sell}=s.prices["기초 합금"];
  assert.deepEqual([buy,sell],[5250,875]);
  const qualified=s.prices["오색 과일에이드"];
  assert.deepEqual([qualified.sell,qualified.sellHigh,qualified.sellTop],[29500,37000,44500]);
  assert.equal(s.prices["스프링클러 III"].market,4113333);
  assert.equal(s.prices["스프링클러 III"].sell,undefined);
  const job=E.orderPlans([order("스프링클러 III",15)],map,{});
  const alternative=E.partsAlternative(job.roots,map,{},{});
  const quotes=E.createQuotes(map,s.prices);
  assert.equal(E.valueOf(alternative.roots,quotes.sell).value,12580800);
  assert.equal(E.valueOf(job.purchases,quotes.buy).value,null);
});
test("기존 가격과 새 상점 단가를 방향별로 합치고 재설정을 보존한다",()=>{
  const saved=S.initial();
  delete saved.priceCatalogRevision;
  saved.items=saved.items.filter(item=>item.group!=="상점 물품");
  saved.prices={"기초 합금":{buy:5000,buySource:"사용자 기록",sell:null}};
  S.restore(saved);
  assert.equal(S.data.prices["기초 합금"].buy,5000);
  assert.equal(S.data.prices["기초 합금"].buySource,"사용자 기록");
  assert.equal(S.data.prices["기초 합금"].sell,875);
  assert.equal(S.data.prices["자스민 씨앗"].buy,825);
  S.update(state=>{state.prices["기초 합금"].sell=null;});
  S.restore(JSON.parse(stored));
  assert.equal(S.data.prices["기초 합금"].sell,null);
});
test("한글 오타·숫자 등급·유니코드 로마자·개당/총액을 읽는다",()=>{
  const a=E.parseLine("스프링쿨러 3 3개 600만",s.items);assert.deepEqual([a.item,a.qty,E.revenue(a)],["스프링클러 III",3,6000000]);
  const b=E.parseLine("스프링클러Ⅲ 3개 개당 200만C",s.items);assert.equal(E.revenue(b),6000000);
  assert.equal(E.parseLine("기초합금 3세트 + 8개 총 1억 2천만",s.items).qty,200);
  assert.equal(E.parseMoney("1억 2천만"),120000000);assert.throws(()=>E.parseLine("모터 -1개 4만",s.items));assert.throws(()=>E.parseLine("모터 0개 5만",s.items));
  assert.equal(E.parseMoney("1억 2천5백만"),125000000);assert.equal(E.parseMoney("1.5만"),15000);assert.throws(()=>E.parseMoney("1억2억"));
  assert.throws(()=>E.parseLine("모터 2개 개당 총 2만",s.items));assert.equal(E.parseLine("모터 50개",s.items).amount,null);
});
test("스프링클러 III 3개는 2회 제작·4개 완성·1개 잔여다",()=>{
  const n=sample.nodes.get("스프링클러 III");assert.deepEqual([n.runs,n.made,n.surplus],[2,4,1]);assert.equal(sample.finalSec,1200);assert.equal(sample.totalSec,35000);assert.equal(sample.allRuns,3426);
  assert.deepEqual({...sample.purchases},{"청금석":2304,"레드스톤":192,"금 주괴":1332,"조약돌":464,"철 주괴":792,"구리 주괴":4052});
});
test("수량 생략 시 등급을 품목에 남기고 명시한 수량과 금액 기준을 보존한다",()=>{
  const cases=[
    ["광물창고 4 5000만","광물 창고 IV",1,50000000,"total"],
    ["광물창고4","광물 창고 IV",1,null,"total"],
    ["광물 창고 Ⅳ 총 1억 2천만","광물 창고 IV",1,120000000,"total"],
    ["광물창고 4 개당 5000만","광물 창고 IV",1,50000000,"unit"],
    ["광물창고 4 2 5000만","광물 창고 IV",2,50000000,"total"],
    ["모터 50 개당 6만","모터",50,60000,"unit"],
    ["모터 50 235만","모터",50,2350000,"total"],
    ["열교환기 220만","열교환기",1,2200000,"total"],
    ["모터 1억 2천만","모터",1,120000000,"total"],
    ["모터 50개","모터",50,null,"total"]
  ];
  for(const [text,item,qty,amount,basis] of cases){
    const parsed=E.parseLine(text,s.items);
    assert.deepEqual([parsed.item,parsed.qty,parsed.amount,parsed.basis],[item,qty,amount,basis],text);
  }
  assert.throws(()=>E.parseLine("모터 0 300만",s.items));
  assert.throws(()=>E.parseLine("광물창고 4 - 5000만",s.items));
  assert.throws(()=>E.parseLine("광물창고 4 3.5개 5000만",s.items));
  assert.throws(()=>E.parseLine("광물창고 4 개당 총 5000만",s.items));
});
test("모터 두 제안은 같은 재고에서 각각 평가하고 동시 납품만 한 번 배정한다",()=>{
  const high={...E.parseLine("모터 50개 개당 6만",s.items),key:"A"};
  const low=order("모터",50,"B",2350000);
  const stock={모터:50},quotes=E.createQuotes(map,s.prices);
  const gain=o=>{
    const job=E.planOrder(o,map,stock);
    return E.financial(E.revenue(o),job.roots,job.purchases,E.usedSupplies(job),quotes).gain;
  };
  assert.deepEqual([E.unitPrice(high),E.unitPrice(low)],[60000,47000]);
  assert.deepEqual([gain(high),gain(low)],[1307000,657000]);
  assert.deepEqual([gain(low),gain(high)],[657000,1307000]);
  assert.equal(gain(high)-gain(low),650000);
  for(const pair of [[high,low],[low,high]]){
    const together=E.orderPlans(pair,map,stock);
    assert.equal(together.used.모터,50);
    assert.equal(together.jobs.get(pair[0].key).nodes.get("모터").stock,50);
    assert.equal(together.jobs.get(pair[1].key).nodes.get("모터").stock,0);
  }
  assert.equal(stock.모터,50);
});
test("완제품·중간재·원재료를 한 번씩 차감한다",()=>{
  const m=E.catalog([product("집",{부품:3},2),product("부품",{재료:2},4),product("재료")]);
  const inv={집:1,부품:1,재료:1},p=E.plan([order("집",3)],m,inv);
  assert.deepEqual([p.nodes.get("집").runs,p.nodes.get("부품").runs,p.nodes.get("부품").surplus,p.purchases.재료],[1,1,2,1]);
  assert.deepEqual(inv,{집:1,부품:1,재료:1});
  const ready=E.plan([order("집",3)],m,inv,{부품:2});assert.equal(ready.nodes.get("부품").runs,0);assert.equal(Object.keys(ready.purchases).length,0);
});
test("단계별 보유량은 같은 품목의 다른 분기와 주문에 중복 적용되지 않는다",()=>{
  const job=order("재배 알리미 III",5);
  const path=JSON.stringify([job.item,"토양 탐침","전기선"]);
  const otherPath=JSON.stringify([job.item,"회로 기판","전기선"]);
  job.stageStock={[path]:44};
  const result=E.orderPlans([job,{...job,key:"other",stageStock:{}}],map,{});
  const first=result.jobs.get(job.key),last=result.jobs.get("other");
  assert.equal(first.stages.byKey.get(path).missing,100);
  assert.equal(first.stages.byKey.get(otherPath).missing,192);
  assert.equal(first.nodes.get("전기선").need,528);
  assert.equal(first.nodes.get("전기선").missing,484);
  assert.equal(last.nodes.get("전기선").missing,528);
  assert.equal(E.usedSupplies(first)["전기선"],44);
  assert.equal(last.purchases.레드스톤-first.purchases.레드스톤,44);
  const saved=S.initial();
  saved.orders=[job];S.check(saved);
  saved.orders[0].stageStock={"invalid":1};
  assert.throws(()=>S.check(saved),/단계별 재료 경로/);
});
test("다른 깊이의 공통 수요를 모두 모아 한 번만 올림한다",()=>{
  const m=E.catalog([product("A",{C:1}),product("B",{D:1}),product("D",{C:1}),product("C",{철:3},4),product("철")]);
  const p=E.plan([order("A",1,"a"),order("B",1,"b"),order("C",1,"c")],m,{철:1});
  assert.equal(p.nodes.get("C").runs,1);assert.equal(p.purchases.철,2);assert.equal(p.nodes.get("C").surplus,1);
  assert.ok(Math.abs([...p.byOrder.values()].reduce((n,o)=>n+(o.purchases.철||0),0)-2)<1e-9);
  assert.equal(E.plan([{...order("B",99),active:false}],m).allRuns,0);
});
test("직접 NPC 판매가를 우선하고 구매비가 0이면 구매비 수익률은 비어 있다",()=>{
  const m=E.catalog([product("부품",{구리:3},2),product("구리")]);
  let q=E.createQuotes(m,{구리:{sell:10,sellCertainty:"확인",buy:12,buyCertainty:"확인"}});
  assert.deepEqual(q.sell("부품"),{value:15,estimated:true,missing:[]});assert.equal(E.financial(120,{부품:2},{},{부품:2},q).cashRate,null);
  q=E.createQuotes(m,{부품:{sell:20,sellCertainty:"확인"},구리:{sell:10,buy:12,buyCertainty:"확인",sellCertainty:"확인"}});
  const f=E.financial(120,{부품:2},{구리:2},{구리:1},q);
  assert.deepEqual([f.npc.value,f.buy.value,f.held.value,f.net,f.gain,f.rate,f.cashRate],[40,24,10,96,86,200,400]);
  const missing=E.financial(120,{부품:2},{구리:2},{},E.createQuotes(m,{}));assert.equal(missing.gain,null);assert.equal(missing.rate,null);
  const market=E.createQuotes(m,{구리:{market:15}});assert.deepEqual(market.buy("구리"),{value:15,estimated:true,missing:[]});
});
test("대체 부품을 더 만들 때 부족 구매 재료가 늘어난다",()=>{
  const m=E.catalog([product("완제품",{모터:1}),product("모터",{철:4}),product("철")]);
  const a=E.partsAlternative({완제품:2},m,{모터:1,철:1},{},{item:"모터",qty:2});
  assert.equal(a.roots.모터,4);assert.equal(a.purchases.철,11);
});
test("퀘스트는 품목과 수량이 일치하는 실제 사례만 반환한다",()=>{
  assert.equal(E.questCases(s.quests,"모터",50)[0].amount,2539700);
  assert.equal(E.questCases(s.quests,"압력 탱크",30)[0].approx,true);assert.equal(E.questCases(s.quests,"구리 관",1000)[0].amount,817700);
  assert.equal(E.questCases(s.quests,"모터",100).length,0);assert.equal(E.questCases(s.quests,"모터",1).length,0);
});
test("자동 제작대 용량·비율·두 라인·잔여·과투입을 검증한다",()=>{
  const a=E.autoLoad({A:2,B:1},2,7,6,2,null);
  assert.deepEqual([a.max,a.made,a.surplus,a.short],[8,8,1,0]);assert.deepEqual(a.rows.map(r=>r.load),[{A:4,B:2},{A:4,B:2}]);
  const b=E.autoLoad({A:2,B:1},2,3,2304,1,[{A:5,B:3}]);assert.deepEqual([b.max,b.made,b.loadedMax,b.rows[0].left],[1536,4,4,{A:1,B:1}]);
  const c=E.autoLoad({A:4,B:4},1,10,7,2);assert.equal(c.made,0);assert.equal(c.short,10);assert.throws(()=>E.autoLoad({A:1},1,1,2,1,[{A:3}]));
});
test("기술대는 대수·다른 목표의 슬롯·속도·배정을 반영한다",()=>{
  const m=E.catalog([product("A",{철:1},1,60),product("B",{철:1},1,60),product("철")]);
  const p=E.plan([order("A",4,"a"),order("B",4,"b")],m);
  const f=E.defaultFleet();f.tech[0].count=2;f.tech[0].slots=2;f.tech[0].speed=200;
  const r=E.schedule(p,m,f);assert.equal(r.seconds,60);assert.equal(r.jobs.length,4);assert.equal(r.fuel,480);
  f.tech[0].targets=["A"];assert.equal(E.schedule(p,m,f).seconds,null);
  f.tech[0].targets=[];f.tech[0].fuel=20;assert.equal(E.schedule(p,m,f).seconds,null);
  assert.equal(f.tech[0].receiver,512);assert.equal(f.process.capacity,2304);
});
test("선행 제작을 기다리고 자동 라인에만 연속 작업 간격을 적용한다",()=>{
  const m=E.catalog([product("가공",{철:1},1,5,"가공대"),product("목표",{가공:2},1,10),product("철")]);
  const p=E.plan([order("목표",1)],m),f=E.defaultFleet();f.process.gap=1;
  assert.equal(E.schedule(p,m,f).seconds,21);assert.equal(E.schedule(p,m,f,true).seconds,10);
  f.process.automatic=false;assert.equal(E.schedule(p,m,f).seconds,20);
});
test("세트 표시와 백업 유효성 검사를 검증한다",()=>{
  assert.equal(E.sets(200),"3세트 + 8개(200개)");
  const corrupt=structuredClone(s);corrupt.items[0].inputs={[corrupt.items[0].id]:1};assert.throws(()=>S.check(corrupt));
  const backup=JSON.parse(JSON.stringify(s));S.check(backup);assert.deepEqual(E.plan(backup.orders,E.catalog(backup.items)).purchases,sample.purchases);
});
console.log(passed+"개 검증 통과");

