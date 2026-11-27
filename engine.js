/* Browser and Node share the same calculation functions. Quantities are always items. */
(function (root) {
  "use strict";
  const finite = value => typeof value === "number" && Number.isFinite(value);
  const positiveInt = value => Number.isSafeInteger(value) && value > 0;
  const unique = values => [...new Set(values)];
  const sum = values => values.reduce((total, value) => total + value, 0);
  const has = (obj, key) => Object.hasOwn(obj, key);
  const dict = () => Object.create(null);
  function add(obj, key, value) { obj[key] = (obj[key] || 0) + value; }
  function catalog(items) { return new Map(items.map(item => [item.id, item])); }
  function sets(qty) {
    const n = Math.round(qty);
    if (n < 64) return n.toLocaleString("ko-KR") + "개";
    const rest = n % 64;
    return Math.floor(n / 64).toLocaleString("ko-KR") + "세트" + (rest ? " + " + rest + "개" : "") + "(" + n.toLocaleString("ko-KR") + "개)";
  }
  function normalizeName(text) {
    let name = String(text).normalize("NFKC").trim().toLowerCase()
      .replace(/[\s_·\-]/g, "").replace(/스프링(?:쿨러|컬러|클라|쿨라)/g, "스프링클러")
      .replace(/압력텡크/g, "압력탱크").replace(/고성능용광로/g, "고성능화로")
      .replace(/농작물창고/g, "농산물창고").replace(/구리파이프/g, "구리관");
    name = name.replace(/(?:등급|단계)?([1-4])(?:등급|단계|티어)?$/, (_, digit) => ["", "i", "ii", "iii", "iv"][Number(digit)]);
    return name;
  }
  function distance(a, b) {
    const grid = Array.from({ length:a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) grid[i][0] = i;
    for (let j = 0; j <= b.length; j++) grid[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        grid[i][j] = Math.min(grid[i-1][j]+1, grid[i][j-1]+1, grid[i-1][j-1]+Number(a[i-1] !== b[j-1]));
        if (i > 1 && j > 1 && a[i-1] === b[j-2] && a[i-2] === b[j-1]) grid[i][j] = Math.min(grid[i][j], grid[i-2][j-2]+1);
      }
    }
    return grid[a.length][b.length];
  }
  function exactItem(input, items) {
    return items.find(item => [item.id, ...(item.aliases || [])].some(name => normalizeName(name) === input));
  }
  function similarItem(input, items) {
    if (input.length < 3) return null;
    const tier = input.match(/(?:iv|iii|ii|i)$/)?.[0] || "";
    const near = items.filter(item => {
      const name = normalizeName(item.id);
      return (name.match(/(?:iv|iii|ii|i)$/)?.[0] || "") === tier && distance(name, input) === 1;
    });
    return near.length === 1 ? near[0] : null;
  }
  function resolveName(text, items) {
    const input = normalizeName(text);
    const item = exactItem(input, items) || similarItem(input, items);
    if (item) return item.id;
    throw Error("‘" + text.trim() + "’의 품목 이름과 등급을 확인해 주세요.");
  }
  function parseMoney(input) {
    const text = String(input).trim().replace(/(?:크레딧|[cC원])$/i, "").replace(/[\s,]/g, "");
    if (text === "") return null;
    const invalid=()=>{throw Error("금액은 600만 또는 6,000,000C처럼 입력해 주세요.");};
    if (!/^[\d.십백천만억조]+$/.test(text)) invalid();
    const units={조:1e12,억:1e8,만:1e4,천:1000,백:100,십:10};
    const blocks=text.split(/([조억만])/);
    let total=0,lastBlock=Infinity;
    for(let i=0;i<blocks.length;i+=2){
      const block=blocks[i],unit=units[blocks[i+1]]||1;
      if(unit>=lastBlock)invalid();
      lastBlock=unit;
      if(!block&&!blocks[i+1])continue;
      const parts=block.match(/(?:\d+(?:\.\d+)?)?[천백십]|\d+(?:\.\d+)?/g)||[];
      if(parts.join("")!==block)invalid();
      let subtotal=block?0:1,lastSmall=Infinity;
      for(const part of parts){
        const small=units[part.slice(-1)]||1;
        if(small>=lastSmall)invalid();
        lastSmall=small;
        subtotal+=small*(small===1?Number(part):Number(part.slice(0,-1)||1));
      }
      total+=subtotal*unit;
    }
    if (!Number.isSafeInteger(total) || total < 0) throw Error("금액은 0 이상의 정수 C로 입력해 주세요.");
    return total;
  }
  function orderWithoutCounter(text, items) {
    // A standalone digit may finish an item name (광물창고 4) or specify a count (모터 50).
    const boundaries = [...text.matchAll(/\s+(?=[\d십백천만억조]|낱개당|개당|단가|총|합계|전체|일괄)/g)].map(m => m.index);
    boundaries.push(text.length);
    const candidates = boundaries.reverse().map(end => ({
      name: normalizeName(text.slice(0, end)), tail: text.slice(end).trim()
    }));
    for (const lookup of [exactItem, similarItem]) {
      for (const {name, tail} of candidates) {
        const item = lookup(name, items);
        if (!item) continue;
        const counted = tail.match(/^(\d[\d,]*)\s+(?=\d|낱개당|개당|단가|총|합계|전체|일괄)(.+)$/);
        if (counted) return {id:item.id, qty:Number(counted[1].replaceAll(",", "")), rest:counted[2]};
        return {id:item.id, qty:1, rest:tail};
      }
    }
    throw Error("품목 이름과 등급을 확인해 주세요.");
  }
  function parseLine(line, items) {
    const text = String(line).normalize("NFKC").trim();
    if (/(?:^|[\s,|:/=@×])[-−]\s*\d/.test(text)) throw Error("수량과 금액은 음수를 입력할 수 없어요.");
    if (/[-−]\s*\d[\d,]*\s*(개|세트)|\d\.\d+\s*(개|세트)/.test(text)) throw Error("주문 수량은 1 이상의 정수로 입력해 주세요.");
    const match = text.match(/^(.+?)\s*[,|:/]?\s*(\d[\d,]*)\s*(세트|개(?!당))(?:\s*\+\s*(\d[\d,]*)\s*개)?\s*(.*)$/);
    const {id, qty, rest:priceText} = match ? {
      id:resolveName(match[1], items),
      qty:Number(match[2].replaceAll(",", "")) * (match[3] === "세트" ? 64 : 1) + Number((match[4] || "").replaceAll(",", "")),
      rest:match[5]
    } : orderWithoutCounter(text, items);
    if (!positiveInt(qty)) throw Error("주문 수량은 1개 이상이어야 합니다.");
    const rest = priceText.replace(/^[\s,|:/=@×x]+/, "").trim();
    const unit = /개당|단가|낱개당/.test(rest);
    if (unit && /총액|합계|전체|총/.test(rest)) throw Error("개당과 총액 중 한 가지만 지정해 주세요.");
    const amount = parseMoney(rest.replace(/낱개당|개당|단가|총액|합계|전체|일괄|총|[:=@]/g, ""));
    if (unit && amount !== null && !Number.isSafeInteger(qty * amount)) throw Error("금액이 너무 큽니다.");
    return {item:id, qty, amount, basis:unit ? "unit" : "total", active:true};
  }
  function topology(ids, map) {
    const seen = new Set(), visiting = new Set(), ordered = [];
    function visit(id) {
      if (visiting.has(id)) throw Error("레시피에 순환 참조가 있습니다 · " + id);
      if (seen.has(id)) return;
      const item = map.get(id);
      if (!item) throw Error("등록되지 않은 재료입니다 · " + id);
      visiting.add(id);
      for (const child of Object.keys(item.inputs)) visit(child);
      visiting.delete(id);
      seen.add(id);
      ordered.push(id);
    }
    ids.forEach(visit);
    return ordered.reverse();
  }
  function plan(orders, map, inventory = {}, prepared = {}) {
    const active = orders.filter(o => o.active !== false);
    const roots = dict(), demand = new Map(), totals = dict();
    function request(id, owner, qty) {
      if (!demand.has(id)) demand.set(id, dict());
      add(demand.get(id), owner, qty);
    }
    active.forEach(o => { add(roots, o.item, o.qty); add(totals,o.item,o.qty); request(o.item, o.key, o.qty); });
    const sequence = topology(Object.keys(roots), map);
    const nodes = new Map(), purchases = dict(), used = dict(), readyUsed = dict(), extras = dict();
    const byOrder = new Map(active.map(o => [o.key, {purchases:dict(), used:dict(), sec:0, knownTime:true}]));
    let finalRuns = 0, allRuns = 0, finalSec = 0, totalSec = 0, knownFinal = true, knownTotal = true;
    for (const id of sequence) {
      const item = map.get(id), owners = demand.get(id) || dict();
      const need = totals[id] || 0;
      if (!Number.isSafeInteger(need)) throw Error("정확하게 계산할 수 있는 재료 수량을 초과했습니다 · "+id);
      const stock = Math.min(need, inventory[id] || 0);
      const ready = Math.min(need - stock, prepared[id] || 0);
      const missing = need - stock - ready;
      const craft = Object.keys(item.inputs).length > 0;
      const runs = craft ? Math.ceil(missing / item.out) : 0, made = runs * item.out;
      if (!Number.isSafeInteger(made)) throw Error("정확하게 계산할 수 있는 생산량을 초과했습니다 · "+id);
      const surplus = craft ? made - missing : 0;
      const rootRuns = craft ? Math.ceil(Math.max(0, (roots[id] || 0) - stock - ready) / item.out) : 0;
      const seconds = runs === 0 ? 0 : finite(item.sec) ? runs * item.sec : null;
      nodes.set(id, {id, need, stock, ready, missing, craft, runs, made, surplus, rootRuns, seconds});
      if (stock) used[id] = stock;
      if (ready) readyUsed[id] = ready;
      if (surplus) extras[id] = surplus;
      if (!craft && missing) purchases[id] = missing;
      finalRuns += rootRuns;
      allRuns += runs;
      if (seconds === null) knownTotal = false; else totalSec += seconds;
      if (rootRuns && !finite(item.sec)) knownFinal = false; else finalSec += rootRuns * (item.sec || 0);
      if (!need) continue;
      for (const [child,ratio] of Object.entries(item.inputs)) if(runs) add(totals,child,runs*ratio);
      for (const [owner, qty] of Object.entries(owners)) {
        const share = qty / need, split = byOrder.get(owner);
        if (stock + ready) add(split.used, id, (stock + ready) * share);
        if (!craft && missing) add(split.purchases, id, missing * share);
        if (seconds === null) split.knownTime = false; else split.sec += seconds * share;
        for (const [child, ratio] of Object.entries(item.inputs)) if (runs) request(child, owner, ratio * runs * share);
      }
    }
    return {roots, sequence, nodes, purchases, used, readyUsed, extras, byOrder, finalRuns, allRuns, finalSec:knownFinal ? finalSec : null, totalSec:knownTotal ? totalSec : null};
  }
  function stagePlan(order,map,inventory) {
    const stock={...inventory}, ready={...order.prepared}, carry=dict();
    const used=dict(), readyUsed=dict(), assigned=dict(), byKey=new Map();
    function visit(id,required,parentPath) {
      if(!Number.isSafeInteger(required))throw Error("정확하게 계산할 수 있는 재료 수량을 초과했습니다 · "+id);
      const item=map.get(id), path=[...parentPath,id], key=JSON.stringify(path);
      let missing=required;
      function take(pool) {
        const qty=Math.min(missing,pool[id]||0);
        if(qty){pool[id]-=qty;missing-=qty;}
        return qty;
      }
      const held=take(stock), prepared=take(ready), carried=take(carry);
      const editable=missing, staged=Math.min(editable,order.stageStock?.[key]||0);
      missing-=staged;
      if(held)add(used,id,held);
      if(prepared||staged)add(readyUsed,id,prepared+staged);
      if(staged)add(assigned,id,staged);
      const inputs=Object.entries(item.inputs), craft=inputs.length>0;
      const runs=craft?Math.ceil(missing/item.out):0, made=runs*item.out;
      if(!Number.isSafeInteger(made))throw Error("정확하게 계산할 수 있는 생산량을 초과했습니다 · "+id);
      const surplus=runs?made-missing:0;
      if(surplus)add(carry,id,surplus);
      // A stage can use an earlier batch's leftover without sharing its earmarked stock.
      const children=runs?inputs.map(([child,ratio])=>visit(child,ratio*runs,path)):[];
      const node={id,key,path,need:required,missing,stock:held,ready:prepared+staged,carry:carried,staged,editable,craft,runs,made,surplus,children};
      byKey.set(key,node);
      return node;
    }
    const root=visit(order.item,order.qty,[]);
    return {root,byKey,used,readyUsed,assigned};
  }
  function planOrder(order,map,inventory) {
    if(!Object.keys(order.stageStock||{}).length)return plan([order],map,inventory,order.prepared);
    const stages=stagePlan(order,map,inventory);
    const result=plan([order],map,stages.used,stages.readyUsed);
    result.stages=stages;
    return result;
  }
  function orderPlans(orders,map,inventory,makePlan) {
    const total=plan([],map), stock={...inventory};
    total.jobs=new Map();
    for(const order of orders.filter(o=>o.active!==false)) {
      const job=makePlan ? makePlan(order,stock) : planOrder(order,map,stock);
      job.available={...stock};
      total.jobs.set(order.key,job);
      for(const [id,q] of Object.entries(job.used)) stock[id]-=q;
      for(const field of ["roots","purchases","used","readyUsed","extras"])
        for(const [id,q] of Object.entries(job[field])) add(total[field],id,q);
      for(const field of ["finalRuns","allRuns","finalSec","totalSec"])
        total[field]=total[field]===null||job[field]===null?null:total[field]+job[field];
      for(const [id,node] of job.nodes) {
        const previous=total.nodes.get(id);
        if(!previous) total.nodes.set(id,{...node});
        else for(const field of ["need","stock","ready","missing","runs","made","surplus","rootRuns","seconds"])
          previous[field]=previous[field]===null||node[field]===null?null:previous[field]+node[field];
      }
      for(const [key,split] of job.byOrder) total.byOrder.set(key,split);
    }
    total.sequence=topology(Object.keys(total.roots),map);
    return total;
  }
  function createQuotes(map, prices) {
    const cache = new Map();
    function sell(id) {
      if (cache.has(id)) return cache.get(id);
      const p = prices[id] || {}, item = map.get(id);
      let q;
      if (finite(p.sell)) q = {value:p.sell, estimated:p.sellCertainty !== "확인", missing:[]};
      else if (item && Object.keys(item.inputs).length) {
        const parts = Object.entries(item.inputs).map(([child,n]) => [sell(child),n]);
        const missing = unique(parts.flatMap(([x]) => x.missing));
        q = {value:missing.length ? null : sum(parts.map(([x,n]) => x.value * n)) / item.out, estimated:true, missing};
      } else q = {value:null, estimated:false, missing:[id]};
      cache.set(id, q);
      return q;
    }
    function buy(id) {
      const p = prices[id] || {};
      if (finite(p.buy)) return {value:p.buy, estimated:p.buyCertainty !== "확인", missing:[]};
      if (finite(p.market)) return {value:p.market, estimated:true, missing:[]};
      return {value:null, estimated:false, missing:[id]};
    }
    return {sell,buy};
  }
  function valueOf(lines, quote) {
    let known = 0, estimated = false;
    const missing = [];
    for (const [id,qty] of Object.entries(lines)) {
      if (qty <= 0) continue;
      const q = quote(id);
      if (!finite(q.value)) missing.push(...q.missing); else known += q.value * qty;
      estimated ||= q.estimated;
    }
    return {value:missing.length ? null : known, missing:unique(missing), estimated};
  }
  function revenue(order) { return finite(order.amount) ? order.amount * (order.basis === "unit" ? order.qty : 1) : null; }
  function unitPrice(order) {
    return finite(order.amount) ? (order.basis === "unit" ? order.amount : order.amount / order.qty) : null;
  }
  function combineRevenue(orders) {
    const values = orders.filter(o => o.active !== false).map(revenue);
    return values.every(finite) ? sum(values) : null;
  }
  function financial(receipt, roots, purchases, used, quotes) {
    const buy = valueOf(purchases, quotes.buy), held = valueOf(used, quotes.sell), npc = valueOf(roots, quotes.sell);
    const net = finite(receipt) && finite(buy.value) ? receipt - buy.value : null;
    const gain = finite(net) && finite(held.value) ? net - held.value : null;
    const npcDiff = finite(receipt) && finite(npc.value) ? receipt - npc.value : null;
    return {receipt,buy,held,npc,net,gain,npcDiff,rate:finite(npcDiff) && npc.value > 0 ? 100 * npcDiff / npc.value : null, cashRate:finite(net) && buy.value > 0 ? 100 * net / buy.value : null};
  }
  function usedSupplies(p) {
    const result = {...p.used};
    for (const [id,qty] of Object.entries(p.readyUsed)) add(result,id,qty);
    return result;
  }
  function partsAlternative(roots, map, inventory, prepared, extra) {
    const targets = dict();
    for (const [id,qty] of Object.entries(roots)) {
      const item = map.get(id), parts = Object.entries(item.inputs);
      if (!parts.length) { add(targets,id,qty); continue; }
      const held = Math.min(qty, (inventory[id] || 0) + (prepared[id] || 0));
      if (held) add(targets,id,held);
      const runs = Math.ceil((qty - held) / item.out);
      for (const [child,n] of parts) if (runs) add(targets,child,n*runs);
    }
    if (extra?.item && extra.qty > 0) add(targets,extra.item,extra.qty);
    return plan(Object.entries(targets).map(([item,qty],i) => ({key:"alt"+i,item,qty})),map,inventory,prepared);
  }
  function questCases(quests, item, qty) { return quests.filter(q => q.item === item && q.qty === qty); }
  const api = {finite, positiveInt, unique, sum, has, catalog, sets, normalizeName, resolveName, parseMoney, parseLine, topology, plan, stagePlan, planOrder, orderPlans, createQuotes, valueOf, revenue, unitPrice, combineRevenue, financial, usedSupplies, partsAlternative, questCases};
  root.MV = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
