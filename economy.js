(function(W){
  "use strict";
  const {E,S,v,ic,esc,btn,iconBtn,itemPic,number,money,rate,time,tag,select,lab,input,fieldNum,optionsList,panelHead,empty,lead,row,submit,actions,forms,changes,views,calc,dialog,change,asInt,maybeNum,render}=W;
  const display=q=>E.finite(q.value)?money(q.value)+(q.estimated?" "+tag("추정","gold"):""):"가격 필요";
  function comparisonRows(c) {
    const rows = c.active.map(order => {
      const job = v.deliveryMode === "batch" ? c.p.jobs.get(order.key) : E.planOrder(order, c.map, S.data.inv);
      const cash = E.financial(E.revenue(order), job.roots, job.purchases, E.usedSupplies(job), c.quotes);
      const hour = job.totalSec > 0 && E.finite(cash.gain) ? cash.gain * 3600 / job.totalSec : null;
      return {order, job, cash, unit:E.unitPrice(order), gain:cash.gain, rate:cash.rate, hour};
    });
    const score = r => E.finite(r[v.sort]) ? r[v.sort] : -Infinity;
    return rows.sort((a,b) => score(b) - score(a)
      || (b.unit ?? -Infinity) - (a.unit ?? -Infinity)
      || a.order.item.localeCompare(b.order.item,"ko") || a.order.qty - b.order.qty);
  }
  function focus(c, rows) {
    const chosen = rows.find(r => r.order.key === v.focusOrder) || (v.deliveryMode === "offers" ? rows[0] : null);
    if (!chosen) return {...c, orders:c.active};
    return {...c, orders:[chosen.order], p:chosen.job, cash:chosen.cash, detailOrder:chosen.order};
  }
  function alternative(f){
    const s=S.data,orders=f.orders;
    const start=f.p.available || s.inv;
    const p=E.orderPlans(orders,f.map,start,(o,stock)=>{
      const job=f.p.jobs ? f.p.jobs.get(o.key) : f.p;
      const prepared={...o.prepared},staged=job.stages?.assigned||{};
      for(const [id,qty] of Object.entries(staged))prepared[id]=(prepared[id]||0)+qty;
      return E.partsAlternative({[o.item]:o.qty},f.map,stock,prepared,o===orders.at(-1)?s.alt:null);
    });
    const q=E.valueOf(p.roots,f.quotes.sell);
    return {p,q,cash:E.financial(q.value,p.roots,p.purchases,E.usedSupplies(p),f.quotes)};
  }
  function receiptBar(b,max){
    return `<div class="bar-row"><div class="bar-head"><span>${esc(b.name)} ${b.badge||""}</span><b>${E.finite(b.value)?(b.approx?"약 ":"")+money(b.value):esc(b.fallback||"가격 필요")}</b></div><div class="track ${E.finite(b.value)?"":"unknown"}"><i class="${b.color||""}" style="width:${E.finite(b.value)&&max>0?Math.max(0,Math.min(100,100*b.value/max)):0}%"></i></div><div class="bar-desc">${esc(b.desc)}</div></div>`;
  }
  function questBars(f){
    if(f.orders.length!==1)return [{name:"NPC 퀘스트 납품",value:null,fallback:"보상 미확인",desc:f.orders.length?"각 주문을 선택해 해당 수량의 사례를 확인하세요.":"주문을 선택하세요."}];
    const order=f.orders[0],cases=E.questCases(S.data.quests,order.item,order.qty);
    return cases.length?cases.map(q=>({name:"NPC 퀘스트 납품",value:q.amount,approx:q.approx,color:"gold",badge:tag("의뢰 사례","gold"),desc:q.item+" "+number(q.qty)+"개 · "+(q.date||"날짜 미기록")+" · 이번 의뢰 보상 미확인"})):[{name:"NPC 퀘스트 납품",value:null,fallback:"보상 미확인",desc:order.item+" "+number(order.qty)+"개와 수량이 일치하는 의뢰 사례가 없어요."}];
  }
  function comparePanel(f,alt,compact=false){
    const cash=f.cash,s=S.data, hasRoots=Boolean(f.orders.length);
    const directKnown=Object.keys(f.p.roots).every(id=>E.finite(s.prices[id]?.sell));
    const bars=[
      {name:"유저 주문 납품",value:hasRoots?cash.receipt:null,fallback:"납품액 미입력",desc:"주문서에 입력한 총 수령액"},
      {name:"NPC 상점 판매",value:hasRoots?cash.npc.value:null,color:"tan",badge:cash.npc.estimated?tag("추정","gold"):"",desc:directKnown?"완제품의 NPC 판매 단가 × 납품 수량":"완제품 판매가 미입력 · 하위 재료 판매가로 환산"},
      ...questBars(f).slice(0,compact?1:undefined),
      {name:"부품 판매 대안",value:hasRoots?alt.q.value:null,color:"tan",badge:alt.q.estimated?tag("추정","gold"):"",desc:"최종 조립에 쓰일 부품과 추가 제작분 판매"}
    ];
    const max=Math.max(0,...bars.map(b=>b.value||0));
    if(compact)return `<section class="panel compact-compare">${panelHead("chart","납품 비교",btn("자세히 보기","batchDetails","","link-btn"))}<div class="mini-bars">${bars.map(b=>receiptBar(b,max)).join("")}</div></section>`;
    const netRows=bars.map((b,i)=>{
      const costs=i===bars.length-1?alt.cash:cash;
      const net=E.finite(b.value)&&E.finite(costs.buy.value)?b.value-costs.buy.value:null;
      const gain=E.finite(net)&&E.finite(costs.held.value)?net-costs.held.value:null;
      const estimated=Boolean(b.approx||costs.buy.estimated||costs.held.estimated||(i===1&&cash.npc.estimated)||(i===bars.length-1&&alt.q.estimated));
      return `<tr><td>${esc(b.name)}${i>=2&&i<bars.length-1?" · 사례":""}${estimated&&E.finite(gain)?" "+tag("추정","gold"):""}</td><td class="num">${E.finite(net)?money(net):"산정 대기"}</td><td class="num">${E.finite(gain)?money(gain):"산정 대기"}</td></tr>`;
    }).join("");
    return `<section class="panel">${panelHead("chart","납품처별 수령액",btn("가격 입력","pricesNeeded","","btn tiny","edit"))}<div class="panel-body">${bars.map(b=>receiptBar(b,max)).join("")}<details class="detail-box space-top"><summary>납품처별 비용 차감 후 금액</summary><div class="tbl-wrap"><table><thead><tr><th>판매·납품처</th><th class="num">구매비 차감</th><th class="num">재고 가치까지 차감</th></tr></thead><tbody>${netRows}</tbody></table></div></details></div></section>`;
  }
  function financePanel(f){
    const c=f.cash;
    return `<section class="panel">${panelHead("wallet","비용과 이득")}<div class="panel-body">${row("납품 수령액",E.finite(c.receipt)?money(c.receipt):"납품액 미입력")}
      ${row("추가 재료 구매비",display(c.buy))}${row("구매비 차감 후 잔액",E.finite(c.net)?money(c.net):"산정 대기")}
      ${row("사용 재고·준비 재료의 NPC 판매 가치",display(c.held))}${row("재고 가치까지 차감한 이득",E.finite(c.gain)?money(c.gain):"산정 대기")}
      ${row("NPC 판매 대비 이득률",rate(c.rate)+(c.npc.estimated&&E.finite(c.rate)?" "+tag("추정","gold"):""))}
      ${c.buy.value===0?"":row("실제 구매비 기준 수익률",rate(c.cashRate)+(c.buy.estimated&&E.finite(c.cashRate)?" "+tag("추정","gold"):""))}
      <details class="detail-box space-top"><summary>계산 기준과 미포함 비용</summary><div class="help"><p>추가 구매비는 부족한 원재료에 NPC 구매가를 적용하고, 비어 있으면 유저 시세를 사용해요. 시세를 적용한 금액은 추정으로 표시해요.</p><p>NPC 판매 대비 이득률 = (납품 수령액 − NPC 비교 판매액) ÷ NPC 비교 판매액 × 100. 완제품 판매가를 우선하고, 없으면 재료별 NPC 판매 가치를 1회 생산량으로 나눠 환산해요.</p><p>실제 구매비 기준 수익률 = (납품 수령액 − 추가 구매비) ÷ 추가 구매비 × 100. 제작 잔여분은 이번 수익에서 제외해요.</p><p>연료·물·수리비·수수료 미포함. 거래소 판매 수수료 5%는 과거 기록이에요. 유저 구매 주문 납품의 자동 공제액은 0 C예요.</p></div></details>
      <p class="subtle space-top">연료 · 물 · 수리비 · 수수료 미포함</p></div></section>`;
  }
  function altPanel(f,alt){
    const parts=S.data.items.filter(i=>i.group==="기술 부품");
    const qty=S.data.alt.qty, c=alt.cash;
    let delta=E.finite(c.gain)&&E.finite(f.cash.gain)?c.gain-f.cash.gain:null;
    return `<section class="panel">${panelHead("layers","부품 추가 제작·판매")}<div class="panel-body form-stack"><p class="note">같은 재고로 최종 조립 직전의 부품을 NPC에 팔 때를 계산해요. 더 만들 수량을 넣으면 추가 구매비도 함께 바뀌어요.</p>
      <form class="form-grid" data-form="extraParts">${lab("추가 판매할 부품",select("item",parts.map(i=>i.id),S.data.alt.item))}${fieldNum("qty",qty,"추가 판매 수량 (개)",'min="0" required')}<div class="full form-actions">${submit("대안 계산")}</div></form>
      <details class="detail-box"><summary>판매할 품목 ${Object.keys(alt.p.roots).length}종</summary>${Object.entries(alt.p.roots).map(([id,q])=>row(id,E.sets(q))).join("")||'<p class="note">판매 품목이 없어요.</p>'}</details>
      <div>${row("대안 판매액",display(alt.q))}${row("대안의 추가 구매비",display(c.buy))}${row("대안의 사용 재고 가치",display(c.held))}${row("대안의 비용 차감 이득",E.finite(c.gain)?money(c.gain):"산정 대기")}${row("유저 납품과의 이득 차이",E.finite(delta)?(delta>0?"+":"")+money(delta):"산정 대기")}</div></div></section>`;
  }
  const sortOptions = [["gain","총 이득순"],["unit","개당 제안가순"],["rate","NPC 대비 이득률순"],["hour","제작 시간당 이득순"]];
  function ranking(rows) {
    const offers = v.deliveryMode === "offers";
    const title = offers ? "제안별 가격과 이득" : "납품 우선순위";
    const sort = select("rank",sortOptions,v.sort,'aria-label="우선순위 정렬" data-change="rank" class="sort-select"');
    if (!rows.length) return `<section class="panel">${panelHead("list",title)}${empty("선택된 주문이 없어요.","제작 계산에서 비교할 주문을 추가하세요.","order")}</section>`;

    const highest = new Map();
    const groupKey = o => JSON.stringify([o.item,o.qty]);
    if (offers) for (const {order,cash} of rows) {
      if (E.finite(cash.receipt)) highest.set(groupKey(order), Math.max(highest.get(groupKey(order)) || 0, cash.receipt));
    }
    let place = 0;
    const body = rows.map((entry,i) => {
      const {order,job,cash,hour,unit} = entry;
      const root = job.nodes.get(order.item);
      const supply = [];
      if (root.stock) supply.push("재고 "+number(root.stock)+"개");
      if (root.ready) supply.push("주문 준비분 "+number(root.ready)+"개");
      if (root.missing) supply.push((root.craft?"제작 필요 ":"구매 필요 ")+number(root.missing)+"개");
      const difference = offers && E.finite(cash.receipt) ? highest.get(groupKey(order)) - cash.receipt : 0;
      const gap = difference > 0 ? `<small>같은 수량 최고가보다 ${money(difference)} 낮음</small>` : "";
      const estimate = cash.buy.estimated || cash.held.estimated;
      const gain = E.finite(cash.gain) ? money(cash.gain)+(estimate?" · 추정":"") : (cash.receipt===null?"납품액 미입력":"가격 필요");
      const hourly = E.finite(hour) ? money(hour)+"/h" : root.stock+root.ready===order.qty ? "즉시 납품" : job.totalSec===0 ? "제작 없음" : "산정 대기";
      if (!i || entry[v.sort] !== rows[i-1][v.sort]) place = i+1;
      const rank = E.finite(entry[v.sort]) ? tag(String(place),place===1?"gold":"muted") : "—";
      return `<tr><td class="offer-rank">${rank}</td>
        <td class="offer-item"><div class="item-cell">${itemPic(order.item,"sm")}<div><b>${esc(order.item)} × ${number(order.qty)}개</b><small>${supply.join(" · ")}</small></div></div></td>
        <td class="num" data-label="개당 제안가">${E.finite(unit)?money(unit):"미입력"}</td>
        <td class="num" data-label="총 납품액">${E.finite(cash.receipt)?money(cash.receipt):"미입력"}${gap}</td>
        <td class="num offer-gain" data-label="비용 차감 이득">${gain}</td>
        <td class="num" data-label="NPC 판매 대비">${rate(cash.rate)}${cash.npc.estimated&&E.finite(cash.rate)?" · 추정":""}</td>
        <td class="num" data-label="제작 시간당 이득">${hourly}</td></tr>`;
    }).join("");
    return `<section class="panel">${panelHead("list",title,sort)}
      <div class="tbl-wrap"><table class="offer-table" aria-label="${title}"><thead><tr><th>순위</th><th>품목 · 수량</th><th class="num">개당 제안가</th><th class="num">총 납품액</th><th class="num">비용 차감 이득</th><th class="num">NPC 판매 대비</th><th class="num">제작 시간당 이득</th></tr></thead><tbody>${body}</tbody></table></div>
      <div class="tree-footer"><span class="subtle">이득은 납품액에서 추가 구매비와 사용한 재고의 NPC 판매 가치를 뺀 금액이에요. 시간당 이득은 순차 제작 시간 기준이에요.</span></div></section>`;
  }
  views.profit=()=>{
    const c = calc(), rows = comparisonRows(c), f = focus(c,rows);
    const offers = v.deliveryMode === "offers";
    const modes = [["offers","같은 재고로 제안 비교"],["batch","모든 주문 납품"]];
    const controls = modes.map(([id,label]) => `<button type="button" class="tab-btn${v.deliveryMode===id?" active":""}" aria-pressed="${v.deliveryMode===id}" data-a="deliveryMode" data-id="${id}">${label}</button>`).join("");
    const hint = offers ? "각 제안에 현재 재고 전량을 따로 적용해요. 주문에 표시한 준비분은 해당 주문에만 사용해요." : "주문을 입력한 순서대로 재고를 한 번씩 배정해요. 표를 정렬해도 재고 배정 순서는 유지돼요.";
    const top = lead("납품 비교","") + `<div class="delivery-modes"><div class="seg" role="group" aria-label="납품 계산 방식">${controls}</div><p class="note">${hint}</p></div>` + ranking(rows);
    if (!rows.length) return top;

    const options = c.active.map((o,i) => [o.key,(i+1)+". "+o.item+" × "+number(o.qty)+"개 · "+(E.finite(E.revenue(o))?money(E.revenue(o)):"납품액 미입력")]);
    if (!offers) options.unshift(["","선택한 주문 전체"]);
    const focusPicker = select("focus",options,f.detailOrder?.key||"", 'data-change="focusOrder" aria-label="납품 비교 대상"');
    const alt = alternative(f);
    return top + `<div class="delivery-detail"><h2>${offers?"제안 상세":"납품 상세"}</h2>${focusPicker}</div>
      <div class="split-panels"><div class="stack">${comparePanel(f,alt)}${altPanel(f,alt)}</div><div class="stack">${financePanel(f)}<section class="panel">${panelHead("book","NPC 의뢰 사례",btn("기록 관리","questTab","","link-btn","arrow"))}<div class="panel-body"><p class="note">품목과 수량이 일치하는 기록만 비교해요. 다른 수량의 보상과 반복 보상은 미확인으로 표시해요.</p></div></section></div></div>`;
  };
  actions.deliveryMode=id=>{
    if (id!==v.deliveryMode) {v.deliveryMode=id;v.focusOrder="";render();}
    document.querySelector('[data-a="deliveryMode"][aria-pressed="true"]')?.focus({preventScroll:true});
  };
  actions.batchDetails=()=>{v.deliveryMode="batch";v.focusOrder="";actions.nav("profit");};
  changes.rank=el=>{v.sort=el.value;render();document.querySelector('[data-change="rank"]')?.focus({preventScroll:true});};
  changes.focusOrder=el=>{v.focusOrder=el.value;render();document.querySelector('[data-change="focusOrder"]')?.focus({preventScroll:true});};
  forms.extraParts=d=>change(s=>{s.alt={item:d.get("item"),qty:asInt(d.get("qty"),"추가 수량")};},"부품 판매 대안을 계산했어요.");
  function localDate(){return new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Seoul"}).format(new Date());}
  actions.pricesNeeded=()=>{
    const c=calc(), f=v.page==="profit"?focus(c,comparisonRows(c)):{...c,orders:c.active};
    const alt=alternative(f);
    const ids=E.unique([...Object.keys(f.p.roots),...Object.keys(f.p.purchases),...Object.keys(E.usedSupplies(f.p)),...Object.keys(alt.p.roots),...f.cash.npc.missing,...alt.q.missing,...Object.keys(alt.p.purchases)]);
    if(!ids.length){W.navigate("data");return;}
    dialog("계산에 쓰이는 가격",`<form data-form="quickPrices" class="form-stack"><p class="note">게임에서 확인한 개당 금액을 입력하세요. NPC에서 사는 값과 NPC에 파는 값은 각각 저장해요. 빈칸은 미확인으로 둬요.</p><div class="tbl-wrap"><table><thead><tr><th>품목</th><th>NPC에서 구매</th><th>NPC에 판매</th><th>유저 시세</th></tr></thead><tbody>${ids.map((id,i)=>`<tr data-price-id="${esc(id)}"><td><div class="item-cell">${itemPic(id,"sm")}${esc(id)}</div></td>${["buy","sell","market"].map(k=>`<td>${input(k+i,S.data.prices[id]?.[k]??"","number",'min="0" step="any" placeholder="미확인" aria-label="'+esc(id+" "+k)+'"')}</td>`).join("")}</tr>`).join("")}</tbody></table></div><div class="form-actions">${submit("가격 저장")}</div></form>`,true);
  };
  forms.quickPrices=(d,form)=>change(s=>{
    [...form.querySelectorAll("[data-price-id]")].forEach((tr,i)=>{
      const id=tr.dataset.priceId,p=s.prices[id]||{};
      for(const k of ["buy","sell","market"]){
        const n=maybeNum(d.get(k+i),"가격");
        if((p[k]??null)===n)continue;
        p[k]=n;p[k+"Source"]=n===null?"":"사용자 게임 화면";p[k+"Checked"]=n===null?"":localDate();p[k+"Certainty"]=n===null?"미확인":(k==="market"?"추정":"확인");
      }
      s.prices[id]=p;
    });
  },"가격을 저장하고 다시 계산했어요.");
  W.compactComparison=()=>{const c=calc(),f={...c,orders:c.active};return comparePanel(f,alternative(f),true);};
  Object.assign(W,{localDate});
})(window.W);

