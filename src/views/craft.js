(function(W){
  "use strict";
  const {E,S,v,ic,esc,btn,iconBtn,itemPic,number,money,rate,time,tag,opt,select,lab,input,fieldNum,optionsList,metric,panelHead,empty,row,submit,actions,forms,changes,views,calc,toast,dialog,close,render,navigate,change,asInt}=W;
  const qtyText=n=>E.sets(n);
  const tab=(label,action,id,on)=>btn(label,action,id,"tab-btn"+(on?" active":""));
  function summary(){
    const {p,cash,whole,active}=calc();
    const title=active.length?esc(active[0].item)+" × "+number(active[0].qty)+"개"+(active.length>1?" 외 "+(active.length-1)+"건":""):"주문을 추가해 제작을 시작하세요.";
    const expected=E.finite(cash.receipt)?number(cash.receipt)+'<small>C</small>':'<span class="pending">금액 미입력</span>';
    const surplus=E.sum(active.map(o=>p.jobs.get(o.key).nodes.get(o.item).surplus));
    const assembly=E.sum([...p.nodes.values()].map(n=>n.rootRuns*calc().map.get(n.id).out));
    const rateText=E.finite(cash.rate)?esc(rate(cash.rate)):'<span class="pending">'+(cash.npc.value===0?"기준가 0 C":"산정 대기")+'</span>';
    return `<section class="hero"><div class="hero-inner"><div class="hero-line">${active.length===1&&active[0].demo?"예시 주문":("선택한 주문 "+active.length+"건")}</div><h1>제작 계산기</h1><p>${title}</p></div></section>
    <section class="metrics" aria-label="주문 계산 요약">
    ${metric("납품 예정액",expected,"선택한 주문 "+active.length+"건 합계","coins","goldish")}
    ${metric("NPC 판매 대비 이득률",rateText,cash.npc.missing.length?btn("비교 가격 입력","pricesNeeded","","link-btn","edit"):(cash.npc.estimated?"추정 가격 반영":"납품액과 NPC 판매액 비교"),"trend")}
    ${metric("최종 제작 횟수",number(p.finalRuns)+"<small>회</small>",number(assembly)+"개 완성 · "+number(surplus)+"개 남음","hammer","sand")}
    ${metric("예상 제작 시간",esc(time(whole.seconds,true)),whole.blocked.length?btn("설비 조건 확인","nav","data","link-btn","network"):"하위 재료 포함 · 설비 분배 적용","clock","blue")}</section>`;
  }
  function pickedSlotContents(id){
    return `${id?itemPic(id):ic("box")}<span>${id?esc(id):"인벤토리 열기"}</span>${ic("chev")}`;
  }
  function orderForm(edit){
    const type=edit?"pick":v.quick;
    const pickId=edit?.item||v.picked||"";
    if(type==="line")return `<form class="order-form" data-form="lines"><div class="seg">${tab("한 줄 입력","quick","line",true)}${tab("인벤토리에서 선택","quick","pick",false)}</div><label class="field"><span>주문 내용</span><textarea name="lines" required rows="2" placeholder="광물창고 4 5000만&#10;모터 50개 개당 6만"></textarea></label><p class="help">한 줄에 한 주문씩 입력하세요. 수량을 생략하면 1개예요. 금액은 기본 총액이며 개당 가격에는 ‘개당’을 붙여 주세요.</p><button class="btn primary wide-btn" type="submit">${ic("add")}주문 추가</button></form>`;
    return `<form class="${edit?"form-stack":"order-form"}" data-form="oneOrder" data-key="${esc(edit?.key||"")}">${edit?"":`<div class="seg">${tab("한 줄 입력","quick","line",false)}${tab("인벤토리에서 선택","quick","pick",true)}</div>`}
    <div class="field"><span>품목</span>${input("item",pickId,"hidden")}<button class="picked-slot" type="button" data-a="browse" ${pickId?`aria-label="품목 변경. 현재 ${esc(pickId)}"`:""}>${pickedSlotContents(pickId)}</button></div>
    <div class="form-grid">${fieldNum("qty",edit?.qty||1,"수량 (개)",'min="1" step="1" required')}${lab("금액 기준",select("basis",[["total","총액"],["unit","개당"]],edit?.basis||"total"))}</div>
    ${lab("납품액 (C)",input("amount",edit?.amount??"","text",'placeholder="예: 600만"'))}
    <button type="submit" class="btn primary wide-btn">${ic(edit?"check":"add")}${edit?"주문 수정":"주문 추가"}</button></form>`;
  }
  function orderCard(){
    const s=S.data;
    return `<section class="panel input-card">${panelHead("order","주문 입력")}${orderForm()}<div class="order-current"><div class="order-list-title"><b>주문 목록 ${tag(String(s.orders.length))}</b>${s.orders.length?btn("기록 저장","saveHistory","","link-btn","history"):""}</div>
    ${s.orders.map(o=>`<div class="order-entry ${o.active?"":"off"}"><input type="checkbox" data-change="orderActive" data-id="${esc(o.key)}" aria-label="${esc(o.item)} 주문 포함" ${o.active?"checked":""}>${itemPic(o.item)}<div class="order-body"><div class="order-name">${esc(o.item)} <small>× ${number(o.qty)}</small></div><div class="order-amt">${E.revenue(o)===null?"납품액 미입력":"총 "+money(E.revenue(o))+(o.qty>1?" · 개당 "+money(E.unitPrice(o)):"")} ${o.demo?tag("예시","gold"):""}</div></div><div class="order-controls">${iconBtn("주문 수정","editOrder",o.key,"edit")}${iconBtn("주문 삭제","deleteOrder",o.key,"trash")}</div></div>`).join("")||empty("아직 주문이 없어요.","품목과 수량을 입력해 주세요.","order")}
    ${s.orders.some(o=>o.demo)?'<p class="subtle" style="padding:0 17px 13px">첫 주문을 추가하면 예시 주문을 교체해요.</p>':""}
    ${!s.orders.length?`<div class="panel-body">${btn("예시 주문 열기","sample","","btn tiny")}</div>`:""}</div></section>`;
  }
  function timeCard(){
    const {p,final,whole}=calc();
    return `<section class="panel help-panel"><h3>${ic("clock")}제작 시간 상세</h3><div class="tbl-wrap"><table><thead><tr><th>범위</th><th class="num">순차</th><th class="num">설비 분배</th></tr></thead><tbody><tr><td>최종 조립</td><td class="num">${time(p.finalSec)}</td><td class="num">${time(final.seconds)}</td></tr><tr><td>하위 포함</td><td class="num">${time(p.totalSec)}</td><td class="num">${time(whole.seconds)}</td></tr></tbody></table></div><div class="note">주문 순서대로 제작하며 주문 안에서는 선행 부품이 준비되면 다음 단계를 시작해요. 설비 분배 시간은 보충·수령이 제때 이뤄지는 조건이에요.</div></section>`;
  }
  function transfer(id,order){
    const item=calc().map.get(id);
    if(item?.station==="가공대")return `<button class="flow-link" data-a="sendAuto" data-order="${esc(order.key)}" data-id="${esc(id)}">가공대</button>`;
    return "";
  }
  function initiallyOpen(path){
    if(v.treeMode==="all")return true;
    if(v.treeMode==="closed")return false;
    if(path.length===1)return true;
    const firstRoot=Object.keys(calc().p.roots)[0];
    return path.length===2&&path[0]===firstRoot&&path[1]===Object.keys(calc().map.get(firstRoot).inputs)[0];
  }
  function orderStages(order,job){
    job.stages||=E.stagePlan(order,calc().map,job.used);
    return job.stages;
  }
  function stageQuantity(order,stage){
    const {id,path,need,missing,editable}=stage;
    const parent=path.at(-2), label=(parent?parent+"에 필요한 ":"")+id+" 남은 수량 수정";
    const quantity=esc(qtyText(missing));
    const control=editable?`<button type="button" class="tree-qty stage-qty" data-a="editStage" data-order="${esc(order.key)}" data-id="${esc(stage.key)}" aria-label="${esc(label)}" title="남은 수량 수정">${quantity}${ic("edit")}</button>`
      :`<div class="tree-qty">${quantity}</div>`;
    return `<div class="stage-amount">${control}</div>${missing!==need?`<div class="tree-meta">필요 ${esc(qtyText(need))}</div>`:""}`;
  }
  function preparation(order,n){
    const {id,missing}=n,ready=Math.min(n.ready,order.prepared?.[id]||0);
    return `<label class="tiny-check" title="이 주문의 ${esc(id)} 준비 수량 반영"><input type="checkbox" aria-label="${esc(id)} 준비 완료" data-change="prepared" data-order="${esc(order.key)}" data-id="${esc(id)}" ${ready&&!missing?"checked":""} ${ready&&missing?"data-partial":""}>준비</label>`
      +(missing?transfer(id,order):"");
  }
  function tree(order,p){
    const {map}=calc(), {root}=orderStages(order,p);
    function renderNode(n,depth) {
      const {id,children}=n, item=map.get(id);
      if(depth&&v.onlyMissing&&!n.missing&&!n.ready&&!n.carry)return "";
      const key=JSON.stringify([order.key,...n.path]);
      const opened=v.expanded.has(key)?v.expanded.get(key):initiallyOpen(n.path);
      const meta=[depth?item.group:item.group+" 주문"];
      if(n.stock)meta.push("재고 "+qtyText(n.stock));
      if(n.ready>n.staged)meta.push("준비 "+qtyText(n.ready-n.staged));
      if(n.staged)meta.push("직접 보유 "+qtyText(n.staged));
      if(n.carry)meta.push("앞 단계 제작 잔여 "+qtyText(n.carry));
      const planned=n.runs?`<div class="tree-meta">${number(n.runs)}회 → ${qtyText(n.made)}${n.surplus?" · 잔여 "+qtyText(n.surplus):""}</div>`:"";
      let action;
      if(!depth)action=tag("주문","green");
      else if(!n.craft)action=tag(n.missing?"조달":"충족","muted");
      else if(n.need!==p.nodes.get(id).need)action=btn("합계","jobParts",order.key,"link-btn tree-total");
      else action=preparation(order,n);
      const line=`<div class="tree-row ${depth?"":"root"}"><div class="tree-left ${depth?"depth":""}" style="--depth:${depth}">${children.length?`<button class="toggle-tree" data-a="branch" data-id="${esc(key)}" aria-expanded="${Boolean(opened)}" aria-label="${esc(id)} 하위 재료 ${opened?"접기":"펼치기"}">${ic(opened?"down":"chev")}</button>`:'<span class="toggle-tree"></span>'}${itemPic(id)}<div><button class="tree-name" data-a="item" data-id="${esc(id)}">${esc(id)}</button><div class="tree-meta">${esc(meta.join(" · "))}</div></div></div><div>${stageQuantity(order,n)}${planned}</div><div class="tree-end">${action}</div></div>`;
      return line+(opened?children.map(child=>renderNode(child,depth+1)).join(""):"");
    }
    return renderNode(root,0);
  }
  function treeCard(){
    const {p,active}=calc();
    const groups=active.map((order,index)=>{
      const job=p.jobs.get(order.key);
      return `<section class="job-group" data-job="${esc(order.key)}"><div class="job-title"><div><small>주문 ${index+1}</small><h3>${esc(order.item)} <span>× ${number(order.qty)}개</span></h3></div>${btn("필요 중간재","jobParts",order.key,"btn tiny")}</div><div class="tree-header"><span>품목</span><span>이 단계 남은 수량</span><span>준비</span></div>${tree(order,job)}</section>`;
    }).join("");
    return `<section class="panel">${panelHead("tree","재료 체크리스트",btn(v.treeMode==="all"?"모두 접기":"모두 펼치기","expandAll","","link-btn"))}<div class="toolbar"><span class="subtle">수량을 눌러 수정 · 1세트 = 64개</span><label class="check-label"><input class="switch" type="checkbox" data-change="onlyMissing" ${v.onlyMissing?"checked":""}>부족분만</label></div>${groups||empty("계산할 주문을 선택해 주세요.","주문 목록에서 포함할 품목을 체크하세요.")}</section>`;
  }
  actions.jobParts=key=>{
    const order=S.data.orders.find(o=>o.key===key),job=calc().p.jobs.get(key);
    const parts=[...job.nodes.values()].filter(n=>n.craft&&n.need&&n.id!==order.item);
    const table=`<div class="tbl-wrap"><table><thead><tr><th>중간재</th><th>주문 총 필요</th><th>부족</th><th>준비</th></tr></thead><tbody>${parts.map(n=>`<tr><td><div class="item-cell">${itemPic(n.id,"sm")}${esc(n.id)}</div></td><td>${qtyText(n.need)}</td><td><b>${qtyText(n.missing)}</b></td><td><div class="tree-end">${preparation(order,n)}</div></td></tr>`).join("")}</tbody></table></div>`;
    dialog(order.item+" × "+number(order.qty)+"개 · 중간재 합계",parts.length?table:empty("필요한 중간재가 없어요.",""),true);
  };
  function materialSummary(title,itemLabel,nodes,columns,actionsHtml=""){
    const headers=columns.map(([,label])=>`<th>${label}</th>`).join("");
    const quantityCell=(field,qty)=>field==="missing"?`<td><b>${qtyText(qty)}</b></td>`:`<td>${qtyText(qty)}</td>`;
    const rows=nodes.map(n=>`<tr><td><div class="item-cell">${itemPic(n.id,"sm")}${esc(n.id)}</div></td>${columns.map(([field])=>quantityCell(field,n[field])).join("")}</tr>`).join("");
    const totals=columns.map(([field])=>quantityCell(field,E.sum(nodes.map(n=>n[field])))).join("");
    const table=`<div class="tbl-wrap"><table><thead><tr><th>${itemLabel}</th>${headers}</tr></thead><tbody>${rows}</tbody><tfoot><tr><th>총 ${nodes.length}종</th>${totals}</tr></tfoot></table></div>`;
    return `<section class="panel">${panelHead("layers",title,actionsHtml)}${nodes.length?table:empty("필요한 "+itemLabel+"이 없어요.","포함된 주문과 준비 수량을 반영했어요.")}</section>`;
  }
  function materialSummaries(){
    const {p,map}=calc(), needed=[...p.nodes.values()].filter(n=>n.need);
    const processed=needed.filter(n=>map.get(n.id).station==="가공대");
    const raw=needed.filter(n=>!n.craft);
    const need=["need","필요"], stock=["stock","재고 사용"], ready=["ready","준비 완료"], missing=["missing","부족"];
    return materialSummary("전체 필요 가공품","가공품",processed,[need,stock,ready,missing])
      +materialSummary("전체 원재료 합계","원재료",raw,raw.some(n=>n.ready)?[need,stock,ready,missing]:[need,stock,missing],btn("부족 목록 복사","copyMaterials","","btn tiny","copy"));
  }
  views.craft=()=>summary()+`<div class="craft-grid"><div class="stack">${W.compactComparison()}${treeCard()}${materialSummaries()}</div><div class="stack order-side">${orderCard()}${timeCard()}</div></div><div class="mobile-times">${timeCard()}</div>`;
  function addOrders(orders){
    change(s=>{if(s.orders.length&&s.orders.every(o=>o.demo)){s.orders=[];s.ready={};}s.orders.push(...orders.map(o=>({...o,key:S.key()})));S.remember(s);},orders.length+"건을 주문 목록에 반영했어요.");
  }
  actions.quick=id=>{if(id==="pick")actions.browse();else{v.quick=id;render();}};
  forms.lines=data=>{
    const lines=String(data.get("lines")).split(/\r?\n/).map((text,i)=>({text:text.trim(),i})).filter(l=>l.text);
    if(!lines.length)throw Error("주문을 한 줄 이상 입력해 주세요.");
    const orders=lines.map(({text,i})=>{try{return E.parseLine(text,S.data.items);}catch(err){throw Error((i+1)+"번째 줄 · "+err.message);}});
    addOrders(orders);
  };
  forms.oneOrder=(data,form)=>{
    if(!data.get("item")){actions.browse();return;}
    const order={item:E.resolveName(data.get("item"),S.data.items),qty:asInt(data.get("qty"),"수량",1),amount:E.parseMoney(data.get("amount")),basis:data.get("basis"),active:true};
    if(form.dataset.key)change(s=>{const o=s.orders.find(o=>o.key===form.dataset.key);if(o.item!==order.item){delete o.prepared;delete o.stageStock;}Object.assign(o,order,{active:o.active,demo:false});S.remember(s);},"주문을 수정했어요.");
    else addOrders([order]);
  };
  actions.editOrder=id=>dialog("주문 수정",orderForm(S.data.orders.find(o=>o.key===id)));
  actions.deleteOrder=id=>change(s=>{s.orders=s.orders.filter(o=>o.key!==id);if(!s.orders.length)s.ready={};S.remember(s);},"주문을 삭제했어요.");
  changes.orderActive=el=>change(s=>{s.orders.find(o=>o.key===el.dataset.id).active=el.checked;S.remember(s);});
  actions.sample=()=>change(s=>{s.orders=[S.demo()];s.ready={};});
  actions.treeView=id=>{v.tree=id;render();};
  actions.branch=(id,el)=>{v.expanded.set(id,el.getAttribute("aria-expanded")!=="true");render();};
  actions.expandAll=()=>{v.treeMode=v.treeMode==="all"?"closed":"all";v.expanded.clear();render();};
  changes.onlyMissing=el=>{v.onlyMissing=el.checked;render();};
  changes.prepared=el=>{
    const {id,order:key}=el.dataset,n=calc().p.jobs.get(key).nodes.get(id);
    const scrollArea=el.closest(".dialog-content"), scrollTop=scrollArea?.scrollTop;
    change(s=>{const o=s.orders.find(o=>o.key===key);o.prepared||={};
      if(el.checked)o.prepared[id]=n.need-n.stock;else delete o.prepared[id];
    },"이 주문의 준비 수량을 반영했어요.",!scrollArea);
    if(scrollArea){
      actions.jobParts(key);
      const replacement=[...document.querySelectorAll('#modal [data-change="prepared"]')].find(box=>box.dataset.id===id);
      replacement?.focus({preventScroll:true});
      document.querySelector("#modal .dialog-content").scrollTop=scrollTop;
    }
  };
  function getStage(orderKey,stageKey){
    const order=S.data.orders.find(o=>o.key===orderKey);
    const job=calc().p.jobs.get(orderKey);
    return orderStages(order,job).byKey.get(stageKey);
  }
  function closeStageEditor(form,focus=false){
    const button=form.parentElement.querySelector(".stage-qty");
    form.remove();
    button.hidden=false;
    if(focus)button.focus({preventScroll:true});
  }
  actions.editStage=(key,button)=>{
    const previous=document.querySelector(".stage-editor");
    if(previous)closeStageEditor(previous);
    const order=button.dataset.order, stage=getStage(order,key);
    button.hidden=true;
    button.insertAdjacentHTML("afterend",`<form class="stage-editor" data-form="stageQty" data-id="${esc(key)}" data-order="${esc(order)}">
      <input type="number" inputmode="numeric" name="qty" min="0" max="${stage.editable}" step="1" required value="${stage.missing}" aria-label="${esc(stage.id)} 남은 수량 (개)">
      <div class="stage-edit-tools">
        <button type="submit" class="icon-btn" title="수량 적용 (Enter)" aria-label="수량 적용">${ic("check")}</button>
        ${iconBtn("수량 수정 취소","cancelStage","","close")}
      </div>
    </form>`);
    const form=button.nextElementSibling;
    form.addEventListener("keydown",e=>{
      if(e.key==="Escape"){e.preventDefault();e.stopPropagation();closeStageEditor(form,true);}
    });
    form.elements.qty.focus();
    form.elements.qty.select();
  };
  actions.cancelStage=(_,el)=>closeStageEditor(el.form,true);
  forms.stageQty=(data,form)=>{
    const {id:key,order:orderKey}=form.dataset, stage=getStage(orderKey,key);
    const qty=asInt(data.get("qty"),"남은 수량");
    if(qty>stage.editable)throw Error("이 단계의 남은 수량은 "+number(stage.editable)+"개까지 입력할 수 있어요.");
    if(qty===stage.missing){closeStageEditor(form,true);return;}
    const held=stage.editable-qty;
    change(s=>{
      const order=s.orders.find(o=>o.key===orderKey);
      order.stageStock||={};
      if(held)order.stageStock[key]=held;else delete order.stageStock[key];
    },stage.id+" 남은 수량을 "+qtyText(qty)+"로 반영했어요.");
    [...document.querySelectorAll(".stage-qty")].find(button=>button.dataset.order===orderKey&&button.dataset.id===key)?.focus({preventScroll:true});
  };
  actions.copyMaterials=async()=>{
    const {p}=calc(), text=Object.entries(p.purchases).map(([id,qty])=>id+"  "+qtyText(qty)).join("\n")||"부족한 원재료 없음";
    try{await navigator.clipboard.writeText(text);toast("부족 원재료 목록을 복사했어요.");}
    catch{dialog("부족 원재료 목록 복사",`<label class="field"><span>선택한 내용을 복사하세요.</span><textarea id="copy-content" rows="9" readonly>${esc(text)}</textarea></label>`);document.getElementById("copy-content").select();try{if(document.execCommand("copy")){close();toast("부족 원재료 목록을 복사했어요.");}}catch{/* 사용자가 선택한 텍스트를 직접 복사할 수 있다. */}}
  };
  actions.saveHistory=()=>change(s=>S.remember(s),"최근 계산에 저장했어요.");
  actions.history=()=>{
    const list=S.data.history;
    dialog("최근 계산",`<p class="note section-gap">저장한 주문을 현재 재고와 가격으로 다시 계산해요.</p><div class="entry-list">${list.map(h=>`<div class="entry">${itemPic(h.orders[0]?.item||"","sm")}<div class="grow"><b>${esc(h.orders[0]?.item||"주문")} ${h.orders.length>1?"외 "+(h.orders.length-1)+"건":""}</b><div class="subtle">${esc(new Date(h.at).toLocaleString("ko-KR"))}</div></div>${btn("열기","loadHistory",h.key,"btn tiny")}</div>`).join("")||empty("저장된 계산이 없어요.","주문을 추가하거나 ‘기록 저장’을 누르면 여기에 남아요.","history")}</div>`);
  };
  actions.loadHistory=id=>{change(s=>{const h=s.history.find(h=>h.key===id);s.orders=structuredClone(h.orders);s.ready={};S.remember(s);},"계산을 다시 열었어요.");navigate("craft");};
  const orderCategories=[
    {id:"all",label:"전체",groups:[]},
    {id:"finished",label:"완제품",groups:["완제품","기반 설비"]},
    {id:"parts",label:"중간재",groups:["기술 부품","가공 재료"]},
    {id:"processing",label:"가공품",groups:S.processingGroups.map(({group})=>group)},
    {id:"raw",label:"원재료",groups:["원재료"]},
    {id:"supplies",label:"운영 물품",groups:["운영 물품"]},
    {id:"favorites",label:"즐겨찾기",groups:[]}
  ];
  let inventoryContext;
  function filterInventory(picker){
    const category=inventoryContext.categories.find(category=>category.id===picker.dataset.category);
    const query=E.normalizeName(picker.querySelector("input").value);
    let count=0;
    for(const slot of picker.querySelectorAll(".inventory-slot")){
      const inCategory=category.id==="all"||
        (category.id==="favorites"?slot.dataset.favorite==="yes":category.groups.includes(slot.dataset.group));
      slot.hidden=!inCategory||!E.normalizeName(slot.dataset.search).includes(query);
      if(!slot.hidden)count++;
    }
    picker.querySelector(".inventory-count").textContent=number(count)+"개 품목";
    picker.querySelector(".inventory-empty").hidden=count>0;
    picker.querySelector(".inventory-grid").scrollTop=0;
  }
  actions.pickerCategory=(id,el)=>{
    const picker=el.closest(".inventory-picker");
    picker.dataset.category=id;
    for(const tab of picker.querySelectorAll("[data-a=pickerCategory]"))tab.setAttribute("aria-pressed",String(tab===el));
    filterInventory(picker);
  };
  function openInventory({title,items,categories,selected,onSelect,onBack}){
    inventoryContext={categories,onSelect,onBack};
    const favorites=new Set(S.data.favorites);
    const tabs=categories.map(({id,label})=>`<button type="button" class="category-tab" data-a="pickerCategory" data-id="${esc(id)}" aria-pressed="${id==="all"}">${esc(label)}</button>`).join("");
    const slots=items.map(it=>`<button type="button" class="inventory-slot${selected===it.id?" is-selected":""}" data-a="chooseBrowseItem"
      data-id="${esc(it.id)}" data-group="${esc(it.group)}" data-favorite="${favorites.has(it.id)?"yes":"no"}"
      data-search="${esc([it.id,...(it.aliases||[])].join(" "))}" ${selected===it.id?'aria-label="'+esc(it.id)+' · 현재 선택"':""}>
      <span class="slot-well">${itemPic(it.id)}${favorites.has(it.id)?ic("star","slot-star"):""}</span>
      <span class="slot-name">${esc(it.id)}</span></button>`).join("");
    dialog(title,`<div class="inventory-picker" data-category="all">
      <div class="inventory-tools"><label class="search-box">${ic("search")}<input type="search" aria-label="품목 검색" placeholder="품목명, 별칭 또는 등급 검색"></label>
      <span class="inventory-count" aria-live="polite">${number(items.length)}개 품목</span></div>
      <div class="category-tabs" role="group" aria-label="품목 분류">${tabs}</div>
      <div class="inventory-grid">${slots}</div>
      <div class="empty inventory-empty" ${items.length?"hidden":""}>일치하는 품목이 없어요.</div>
    </div>`,true);
    const picker=document.querySelector(".inventory-picker"), search=picker.querySelector("input");
    search.addEventListener("input",()=>filterInventory(picker));
    if(matchMedia("(pointer:fine)").matches)search.focus();
    else document.querySelector("#modal .dialog-head button").focus();
  }
  actions.browse=()=>{
    const form=document.querySelector('#modal[open] form[data-form="oneOrder"]')||document.querySelector('main form[data-form="oneOrder"]');
    const draft=form?.dataset.key?{...Object.fromEntries(new FormData(form)),key:form.dataset.key}:null;
    const selected=form?.elements.namedItem("item").value||v.picked;
    const editOrder=(data,focus)=>{dialog("주문 수정",orderForm(data));document.querySelector(focus).focus();};
    openInventory({
      title:"품목 인벤토리",items:S.data.items,categories:orderCategories,selected,
      onSelect:id=>{if(draft)editOrder({...draft,item:id},"#modal [name=qty]");else actions.pickItem(id);},
      onBack:draft?()=>editOrder(draft,"#modal .picked-slot"):null
    });
  };
  actions.cancelPicker=()=>{
    const onBack=inventoryContext?.onBack;
    inventoryContext=null;
    if(!onBack)return false;
    onBack();
    return true;
  };
  actions.chooseBrowseItem=id=>{
    const onSelect=inventoryContext.onSelect;
    inventoryContext=null;
    onSelect(id);
  };
  actions.pickItem=id=>{
    v.picked=id;
    v.quick="pick";
    close();
    let form=document.querySelector('main form[data-form="oneOrder"]');
    if(!form){
      navigate("craft");
      form=document.querySelector('main form[data-form="oneOrder"]');
    }
    form.elements.namedItem("item").value=id;
    const slot=form.querySelector(".picked-slot");
    slot.innerHTML=pickedSlotContents(id);
    slot.setAttribute("aria-label","품목 변경. 현재 "+id);
    form.elements.namedItem("qty").focus();
  };
  actions.favorites=()=>{dialog("즐겨찾기",`<div class="entry-list">${S.data.favorites.map(id=>`<div class="entry">${itemPic(id)}<b class="grow">${esc(id)}</b>${btn("주문 입력","pickItem",id,"btn tiny")}${iconBtn("즐겨찾기 해제","unfavorite",id,"star","on")}</div>`).join("")||empty("즐겨찾는 품목이 없어요.","품목 상세 또는 데이터 설정에서 별을 눌러 추가하세요.","star")}</div>`);};
  actions.unfavorite=id=>{change(s=>{s.favorites=s.favorites.filter(x=>x!==id);});actions.favorites();};
  actions.favorite=id=>change(s=>{s.favorites=s.favorites.includes(id)?s.favorites.filter(x=>x!==id):[...s.favorites,id];},"즐겨찾기를 반영했어요.",false);
  actions.item=id=>{
    const it=calc().map.get(id),f=S.data.favorites.includes(id),p=S.data.prices[id]||{};
    dialog(id,`<div class="form-stack"><div class="line-between"><div class="item-cell">${itemPic(id,"lg")}<div><b>${esc(it.group)}</b><div class="note">${esc(it.station)}</div></div></div>${btn(f?"즐겨찾기 해제":"즐겨찾기","detailFav",id,"btn","star")}</div>
      <div>${row("1회 생산",it.station==="직접 조달"?"직접 조달":qtyText(it.out))}${it.station==="직접 조달"?"":row("1회 제작 시간",time(it.sec))}${row("보유 재고",qtyText(S.data.inv[id]||0))}${row("NPC에서 구입 / NPC에 판매",esc(E.finite(p.buy)?money(p.buy):"미입력")+" / "+esc(E.finite(p.sell)?money(p.sell):"미입력"))}</div>
      ${Object.keys(it.inputs).length?`<div><h3>1회분 재료</h3>${Object.entries(it.inputs).map(([id,q])=>row(id,qtyText(q))).join("")}</div>`:""}
      <div class="note">${W.source(it.source,"레시피 출처")} · ${esc(it.checked||"확인일 미입력")} · ${esc(it.certainty)}</div><div class="form-actions">${btn("재고 입력","stockEdit",id,"btn","box")}${btn("가격·레시피 수정","editItem",id,"btn","edit")}</div></div>`);
  };
  actions.detailFav=id=>{actions.favorite(id);actions.item(id);};
  Object.assign(W,{tab,orderCard,timeCard,openInventory});
})(window.W);

