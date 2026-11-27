(function (root) {
  "use strict";
  const E=root.MV, storageKey="minevalley.workshop.v1";
  const processingGroups=[
    {group:"요리",label:"요리"},
    {group:"가공 재료",label:"제련"},
    {group:"바리스타",label:"바리스타"},
    {group:"보석",label:"보석"},
    {group:"세공",label:"세공"}
  ];
  const groups=["완제품","기술 부품","기반 설비",...processingGroups.map(({group})=>group),"원재료","운영 물품","상점 물품"];
  const stations=["기술대","가공대","직접 조달"];
  const states=["확인","추정","미확인"];
  const priceFields=["buy","sell","sellHigh","sellTop","market"];
  const catalogAdditions=[...root.MV_PROCESSING_ITEMS,...root.MV_SHOP_ITEMS];
  const demo=()=>({key:"sample",item:"스프링클러 III",qty:3,amount:6000000,basis:"total",active:true,demo:true});
  function initial() {
    return {version:1,rev:0,items:structuredClone([...root.MV_SEED.items,...catalogAdditions]),prices:structuredClone(root.MV_PRICES),priceCatalogRevision:root.MV_PRICE_CATALOG_REVISION,
      orders:[demo()],inv:{},ready:{},favorites:[],icons:{},history:[],fleet:E.defaultFleet(),
      auto:{item:"정밀 판재",qty:200,inputs:null,out:null,loads:null},techTasks:null,alt:{item:"모터",qty:0},
      quests:[["모터",50,2539700,false],["압력 탱크",30,3100000,true],["구리 관",1000,817700,false]].map(([item,qty,amount,approx],i)=>({key:"quest"+i,item,qty,amount,approx,date:"",note:"사용자 제공 의뢰 사례"}))};
  }
  const fail=m=>{ throw Error(m); };
  const plain=v=>v && typeof v==="object" && !Array.isArray(v);
  const safeKey=k=>typeof k==="string" && k.trim()===k && k.length>0 && k.length<=100 && !["__proto__","prototype","constructor","toString","valueOf","hasOwnProperty"].includes(k) && !(k in Object.prototype);
  const nat=n=>Number.isSafeInteger(n) && n>=0;
  const nonneg=n=>E.finite(n)&&n>=0;
  function entries(obj,label) {
    if (!plain(obj)) fail(label+" 형식을 확인해 주세요.");
    const pairs=Object.entries(obj);
    if (pairs.some(([k])=>!safeKey(k))) fail(label+"에 사용할 수 없는 이름이 있습니다.");
    return pairs;
  }
  function check(s) {
    if (!plain(s)||s.version!==1||!Array.isArray(s.items)||!s.items.length) fail("마인밸리 계산기 v1 백업 파일을 선택해 주세요.");
    const map=E.catalog(s.items), known=id=>map.has(id);
    if (map.size!==s.items.length) fail("품목 이름이 중복됩니다.");
    for (const it of s.items) {
      if (!safeKey(it.id)||!groups.includes(it.group)||!stations.includes(it.station)||!E.positiveInt(it.out)||!(it.sec===null||nonneg(it.sec))||!states.includes(it.certainty)) fail("품목의 분류·제작 조건을 확인해 주세요 · "+(it.id||"이름 없음"));
      const parts=entries(it.inputs,"레시피");
      if(parts.some(([id,n])=>!known(id)||!E.positiveInt(n))) fail("등록된 재료와 양의 정수 비율이 필요합니다 · "+it.id);
      if((it.station==="직접 조달")!==(!parts.length)) fail("제작 품목에는 재료가 필요합니다 · "+it.id);
      if(it.water!=null && !nonneg(it.water)) fail("물 소모량을 확인해 주세요.");
      if(it.aliases!==undefined && (!Array.isArray(it.aliases)||it.aliases.some(a=>typeof a!=="string"))) fail("별칭 목록을 확인해 주세요.");
    }
    E.topology([...map.keys()],map);
    function quantities(obj) { if(entries(obj,"수량").some(([id,n])=>!known(id)||!nat(n))) fail("수량에는 등록 품목과 0 이상의 정수가 필요합니다."); }
    function orders(list) {
      if(!Array.isArray(list)||new Set(list.map(o=>o.key)).size!==list.length||list.some(o=>!safeKey(o.key)||!known(o.item)||!E.positiveInt(o.qty)||!["unit","total"].includes(o.basis)||!(o.amount===null||nat(o.amount))||typeof o.active!=="boolean"||(o.basis==="unit"&&o.amount!==null&&!nat(o.qty*o.amount)))) fail("주문의 품목·수량·금액을 확인해 주세요.");
      for(const order of list){
        if(order.prepared)quantities(order.prepared);
        if(order.stageStock==null)continue;
        if(!plain(order.stageStock))fail("단계별 보유 수량 형식을 확인해 주세요.");
        for(const [key,qty] of Object.entries(order.stageStock)){
          let path;
          try{path=JSON.parse(key);}catch{fail("단계별 재료 경로를 확인해 주세요.");}
          if(!Array.isArray(path)||path[0]!==order.item||path.length>map.size||path.some(id=>!known(id))||JSON.stringify(path)!==key||!nat(qty))
            fail("단계별 재료와 보유 수량을 확인해 주세요.");
        }
      }
    }
    quantities(s.inv); quantities(s.ready); orders(s.orders);
    if(Object.keys(s.ready).length) {
      const stock={...s.inv};
      for(const order of s.orders.filter(o=>o.active)) {
        const prepared=order.prepared||={};
        const combined={...prepared};
        for(const [id,q] of Object.entries(s.ready)) combined[id]=(combined[id]||0)+q;
        const job=E.plan([order],map,stock,combined);
        for(const [id,q] of Object.entries(job.used)) stock[id]-=q;
        for(const [id,q] of Object.entries(job.readyUsed)) {
          const assigned=Math.max(0,q-(prepared[id]||0));
          prepared[id]=(prepared[id]||0)+assigned;
          if(assigned) s.ready[id]-=assigned;
        }
      }
      for(const [id,q] of Object.entries(s.ready)) if(q>0) s.inv[id]=(s.inv[id]||0)+q;
      s.ready={};
    }
    E.orderPlans(s.orders,map,s.inv);
    if(!Array.isArray(s.favorites)||s.favorites.some(id=>!known(id))) fail("즐겨찾기 품목이 올바르지 않습니다.");
    for(const [id,p] of entries(s.prices,"가격")) {
      if(!known(id)||!plain(p)||priceFields.some(k=>p[k]!=null && !nonneg(p[k]))) fail("가격은 0 이상의 숫자로 입력해 주세요.");
      for(const k of priceFields) if(p[k+"Certainty"]!=null&&!states.includes(p[k+"Certainty"])) fail("가격 확인 상태를 선택해 주세요.");
    }
    if(!Array.isArray(s.quests)||new Set(s.quests.map(x=>x.key)).size!==s.quests.length||s.quests.some(q=>!safeKey(q.key)||!known(q.item)||!E.positiveInt(q.qty)||!nat(q.amount)||typeof q.approx!=="boolean"||typeof q.date!=="string"||typeof q.note!=="string")) fail("퀘스트 사례를 확인해 주세요.");
    if(!Array.isArray(s.history)) fail("최근 계산 목록이 올바르지 않습니다.");
    for(const h of s.history) {
      if(!safeKey(h.key)||typeof h.at!=="string"||!Number.isFinite(Date.parse(h.at))) fail("최근 계산 기록이 올바르지 않습니다.");
      orders(h.orders);
    }
    for(const [id,url] of entries(s.icons,"아이콘")) if((!known(id)&&id!=="가공대")||typeof url!=="string"||!/^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(url)) fail("사용자 아이콘은 PNG, WebP, JPEG 형식이 필요합니다.");
    const f=s.fleet,p=f?.process;
    if(!p||!E.positiveInt(p.lines)||p.lines>128||!Number.isInteger(p.tier)||p.tier<0||p.tier>3||!E.positiveInt(p.capacity)||!nonneg(p.gap)||!E.finite(p.speed)||p.speed<=0||typeof p.automatic!=="boolean") fail("가공 설비 설정을 확인해 주세요.");
    if(!Array.isArray(f.tech)||f.tech.length>128||new Set(f.tech.map(g=>g.key)).size!==f.tech.length||!Object.hasOwn(E.FUEL,f.fuelItem)||!E.finite(f.fuelFactor)||f.fuelFactor<=0) fail("기술대 설정을 확인해 주세요.");
    for(const g of f.tech) {
      if(!safeKey(g.key)||typeof g.name!=="string"||!g.name.trim()||!E.TYPES.includes(g.type)||!nat(g.count)||g.count>128||!E.positiveInt(g.slots)||g.slots>64||!E.finite(g.speed)||g.speed<=0||typeof g.rail!=="boolean"||!Array.isArray(g.targets)||g.targets.some(id=>!known(id))||["receiver","fuel","fuelBin","materialBin","transferItems","transferFuel"].some(k=>g[k]!=null&&!E.positiveInt(g[k]))) fail("기술대의 대수·슬롯·속도·저장량을 확인해 주세요.");
      if(g.fuelNow!=null&&(!nonneg(g.fuelNow)||(g.fuel!=null&&g.fuelNow>g.fuel))) fail("현재 연료와 기술대 연료 용량을 확인해 주세요.");
    }
    const a=s.auto;
    if(!a||!known(a.item)||map.get(a.item).station!=="가공대"||!E.positiveInt(a.qty)||!(a.out==null||E.positiveInt(a.out))) fail("가공대에서 제작 가능한 품목과 목표 수량을 확인해 주세요.");
    if(a.inputs!=null) { quantities(a.inputs); if(!Object.keys(a.inputs).length||Object.values(a.inputs).some(n=>n<1)) fail("레시피 비율은 1 이상이어야 합니다."); }
    if(a.loads!=null) {
      if(!Array.isArray(a.loads)||a.loads.length!==p.lines) fail("투입량과 라인 수를 확인해 주세요.");
      a.loads.forEach(quantities);
      E.autoLoad(a.inputs||map.get(a.item).inputs,a.out||map.get(a.item).out,a.qty,p.capacity,p.lines,a.loads);
    }
    if(s.techTasks!==null&&(!Array.isArray(s.techTasks)||s.techTasks.some(t=>!known(t.item)||!E.positiveInt(t.qty)))) fail("기술대 배정 목록을 확인해 주세요.");
    if(!s.alt||!known(s.alt.item)||!nat(s.alt.qty)) fail("대체 판매 수량을 확인해 주세요.");
    return s;
  }
  function key() { return root.crypto?.randomUUID?.() || "v"+Date.now().toString(36)+Math.random().toString(36).slice(2); }
  function remember(s) {
    if(!s.orders.length) return;
    const signature=list=>JSON.stringify(list.map(({item,qty,amount,basis,active})=>[item,qty,amount,basis,active]));
    const sig=signature(s.orders);
    s.history=s.history.filter(h=>signature(h.orders)!==sig);
    s.history.unshift({key:key(),at:new Date().toISOString(),orders:structuredClone(s.orders)});
    s.history=s.history.slice(0,20);
  }
  function readSaved(value) {
    if(Array.isArray(value?.items)){
      const existing=new Set(value.items.map(item=>item?.id));
      const additions=catalogAdditions.filter(item=>!existing.has(item.id));
      if(additions.length)value={...value,items:value.items.concat(structuredClone(additions))};
    }
    if(plain(value?.prices)&&value.priceCatalogRevision!==root.MV_PRICE_CATALOG_REVISION){
      const prices={...value.prices};
      for(const [id,defaults] of Object.entries(root.MV_PRICES)){
        const previous=prices[id];
        if(previous!==undefined&&!plain(previous))continue;
        const updated={...previous};
        for(const field of priceFields){
          if(updated[field]!=null||defaults[field]==null)continue;
          updated[field]=defaults[field];
          for(const suffix of ["Source","Checked","Certainty"])updated[field+suffix]=defaults[field+suffix];
        }
        prices[id]=updated;
      }
      value={...value,prices,priceCatalogRevision:root.MV_PRICE_CATALOG_REVISION};
    }
    return check(value);
  }
  let current, savedText, issue="";
  try { savedText=localStorage.getItem(storageKey); current=savedText ? readSaved(JSON.parse(savedText)) : initial(); }
  catch(err) { issue="저장한 데이터를 여는 중 문제가 생겼습니다. JSON 백업을 복원해 주세요. "+err.message; current=initial(); }
  function save(next,replace=false) {
    if(issue&&!replace) fail(issue);
    check(next);
    if(!replace && localStorage.getItem(storageKey)!==savedText) fail("다른 창에서 데이터가 갱신되었습니다. 새로고침 후 다시 입력해 주세요.");
    next.rev=(current.rev||0)+1;
    const data=JSON.stringify(next);
    try { localStorage.setItem(storageKey,data); } catch { fail("브라우저 저장 공간을 확인해 주세요. 현재 변경을 저장할 수 없습니다."); }
    savedText=data; current=next; issue="";
  }
  function update(fn) { const next=structuredClone(current); fn(next); save(next); }
  function restore(value) { save(readSaved(value),true); }
  function sync() { const text=localStorage.getItem(storageKey); if(text===savedText)return false; const next=text?readSaved(JSON.parse(text)):initial(); savedText=text; current=next; issue=""; return true; }
  root.MVStore={get data(){return current;},get issue(){return issue;},storageKey,groups,processingGroups,stations,states,demo,initial,key,check,remember,update,restore,sync};
})(window);
