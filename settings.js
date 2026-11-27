(function(W){
  "use strict";
  const {E,S,v,ic,esc,btn,iconBtn,itemPic,number,money,time,tag,select,lab,input,fieldNum,optionsList,panelHead,empty,lead,source,row,submit,actions,forms,changes,views,calc,dialog,close,change,asInt,maybeNum,render,navigate,toast,localDate}=W;
  const priceLabels={buy:"NPC에서 구매",sell:"NPC에 판매",market:"유저 시세"};
  const qualityPrices=[["sellHigh","상급"],["sellTop","최상급"]];
  const qualityPriceText=p=>qualityPrices.filter(([key])=>E.finite(p[key]))
    .map(([key,label])=>label+" "+money(p[key])).join(" · ");
  const searchBox=(filter,keep,query,placeholder)=>`<label class="search-box">${ic("search")}<input type="search" aria-label="${esc(placeholder)}" data-filter="${filter}" data-keep="${keep}" value="${esc(query)}" placeholder="${esc(placeholder)}"></label>`;
  const match=(i,query)=>E.normalizeName([i.id,...(i.aliases||[])].join(" ")).includes(E.normalizeName(query));
  const searchData=i=>esc([i.id,...(i.aliases||[])].join(" "));
  function setStock(s,id,qty){
    let delta=Math.max(0,qty-(s.inv[id]||0));
    if(qty)s.inv[id]=qty;else delete s.inv[id];
    for(const order of s.orders){
      const prepared=Math.min(delta,order.prepared?.[id]||0);
      if(prepared){order.prepared[id]-=prepared;delta-=prepared;}
      for(const [key,q] of Object.entries(order.stageStock||{})){
        if(!delta||JSON.parse(key).at(-1)!==id)continue;
        const assigned=Math.min(delta,q);
        if(assigned===q)delete order.stageStock[key];else order.stageStock[key]-=assigned;
        delta-=assigned;
      }
    }
  }
  views.inv=()=>{
    const s=S.data,ready={};
    for(const order of s.orders){
      for(const [id,q] of Object.entries(order.prepared||{}))ready[id]=(ready[id]||0)+q;
      for(const [key,q] of Object.entries(order.stageStock||{})){
        const id=JSON.parse(key).at(-1);
        ready[id]=(ready[id]||0)+q;
      }
    }
    const rows=s.items.filter(i=>!v.invHeld||s.inv[i.id]||ready[i.id]);
    return lead("재고 관리","보유 수량을 입력하면 완제품부터 하위 재료까지 주문에 필요한 만큼 차감해요.")+
    `<section class="panel">${panelHead("box","내 재고",tag("보유 "+Object.values(s.inv).filter(Boolean).length+"종","green"))}<div class="table-toolbar">
    ${searchBox(".inv-row","inventoryFilter",v.inventoryFilter,"재고에서 품목 검색")}<label class="check-label"><input type="checkbox" class="switch" data-change="invHeld" ${v.invHeld?"checked":""}>보유·준비 품목만</label></div>
    <div class="tbl-wrap"><table><thead><tr><th>품목</th><th>분류</th><th>보유 수량 수정</th><th>세트 환산</th><th>주문 준비분</th></tr></thead><tbody>
    ${rows.map(i=>`<tr class="inv-row" data-search="${searchData(i)}" ${match(i,v.inventoryFilter)?"":"hidden"}><td><div class="item-cell">${itemPic(i.id,"sm")}<button class="tree-name" data-a="item" data-id="${esc(i.id)}">${esc(i.id)}</button></div></td><td>${esc(i.group)}</td><td><form class="inline-form" data-form="stock" data-id="${esc(i.id)}">${input("qty",s.inv[i.id]||0,"number",'min="0" required aria-label="'+esc(i.id)+' 보유 수량"')}<button type="submit" class="icon-btn" aria-label="${esc(i.id)} 재고 저장" title="저장">${ic("check")}</button></form></td><td>${E.sets(s.inv[i.id]||0)}</td><td>${ready[i.id]?E.sets(ready[i.id])+" "+btn("해제","clearPrepared",i.id,"link-btn"):"—"}</td></tr>`).join("")}</tbody></table></div><div class="empty" data-empty-for=".inv-row" ${rows.some(i=>match(i,v.inventoryFilter))?"hidden":""}>현재 조건에 맞는 재고 품목이 없어요.</div>
    <div class="tree-footer"><span class="subtle">계산은 재고를 예약해요. 저장한 보유량은 직접 수정할 때 바뀌며, 보유량을 늘리면 그만큼 준비분을 재고로 옮겨요.</span></div></section>`;
  };
  changes.invHeld=el=>{v.invHeld=el.checked;render();};
  forms.stock=(d,f)=>{const id=f.dataset.id;change(s=>setStock(s,id,asInt(d.get("qty"),"보유 수량")),id+" 재고를 저장했어요.");};
  actions.stockEdit=id=>dialog("보유 재고 수정",`<form data-form="stock" data-id="${esc(id)}" class="form-stack"><div class="item-cell">${itemPic(id)}<b>${esc(id)}</b></div>${fieldNum("qty",S.data.inv[id]||0,"보유 수량 (개)",'min="0" required')}<div class="form-actions">${submit("재고 저장")}</div></form>`);
  actions.clearPrepared=id=>change(s=>{
    for(const order of s.orders){
      if(order.prepared)delete order.prepared[id];
      for(const key of Object.keys(order.stageStock||{}))if(JSON.parse(key).at(-1)===id)delete order.stageStock[key];
    }
  },"주문 준비분을 해제했어요.");
  function itemsTable(){
    const s=S.data,rows=s.items.filter(i=>v.dataGroup==="전체"||i.group===v.dataGroup);
    return `<section class="panel">${panelHead("book","품목 도감",btn("품목 추가","newItem","","btn soft","add"))}
    <div class="table-toolbar">${searchBox(".catalog-row","dataFilter",v.dataFilter,"품목명·등급 검색")}${select("group",["전체",...S.groups],v.dataGroup,'data-change="dataGroup" aria-label="품목 분류"')}<span class="data-count" data-count-for=".catalog-row">${rows.filter(i=>match(i,v.dataFilter)).length}종</span></div><div class="tbl-wrap"><table><thead><tr><th>품목</th><th>제작 설비</th><th>1회 생산 / 시간</th><th class="num">NPC 구매가</th><th class="num">NPC 판매가</th><th class="num">유저 시세</th><th class="num">관리</th></tr></thead><tbody>${rows.map(i=>{
      const p=s.prices[i.id]||{},f=s.favorites.includes(i.id);
      return `<tr class="catalog-row" data-search="${searchData(i)}" ${match(i,v.dataFilter)?"":"hidden"}><td><div class="item-cell">${itemPic(i.id,"sm")}<div><button class="tree-name" data-a="item" data-id="${esc(i.id)}">${esc(i.id)}</button><div class="data-meta">${esc(i.group)}</div></div></div></td><td>${esc(i.station)}</td><td>${i.station==="직접 조달"?"—":number(i.out)+"개 / "+(i.sec===null?"미확인":time(i.sec))}</td>
      ${["buy","sell","market"].map(k=>`<td class="num"><button type="button" class="link-btn" data-a="priceEditor" data-id="${esc(i.id)}" aria-label="${esc(i.id+" "+priceLabels[k]+" 수정")}">${E.finite(p[k])?money(p[k]):"입력"}</button>${k==="sell"&&qualityPriceText(p)?`<div class="data-meta">${esc(qualityPriceText(p))}</div>`:""}</td>`).join("")}
      <td><div class="catalog-tools">${iconBtn(f?"즐겨찾기 해제":"즐겨찾기 추가","favorite",i.id,"star",f?"on":"")}${iconBtn("품목 설정","editItem",i.id,"edit")}</div></td></tr>`;
    }).join("")}</tbody></table></div><div class="empty" data-empty-for=".catalog-row" ${rows.some(i=>match(i,v.dataFilter))?"hidden":""}>검색 조건에 맞는 품목이 없어요.</div></section>`;
  }
  function questTable(){
    const quests=S.data.quests;
    return `<section class="panel">${panelHead("order","NPC 퀘스트 기록",btn("의뢰 사례 추가","questEdit","","btn soft","add"))}<div class="panel-body"><p class="note">기록마다 품목·수량·총 보상을 그대로 보관해요. 압력 탱크의 시작 보상은 근삿값이고, 시작 기록 3건의 날짜는 미기록이에요.</p></div>
    <div class="tbl-wrap"><table><thead><tr><th>의뢰 품목</th><th>수량</th><th class="num">해당 의뢰 총 보상</th><th>날짜</th><th>메모</th><th></th></tr></thead><tbody>${quests.map(q=>`<tr><td><div class="item-cell">${itemPic(q.item,"sm")}<b>${esc(q.item)}</b></div></td><td>${E.sets(q.qty)}</td><td class="num">${q.approx?"약 ":""}${money(q.amount)}</td><td>${esc(q.date||"미기록")}</td><td>${esc(q.note)}</td><td>${iconBtn("사례 수정","questEdit",q.key,"edit")}</td></tr>`).join("")}</tbody></table></div>${quests.length?"":empty("등록한 의뢰 사례가 없어요.")}</section>`;
  }
  function settingsOverview(){
    return `<div class="split-panels"><section class="panel">${panelHead("sliders","설비 조건")}<div class="panel-body form-stack"><div class="entry">${ic("factory")}<div class="grow"><b>가공대 · 자동 제작대</b><div class="subtle">라인 수, 입력 용량, 속도, 연속 작업 대기</div></div>${btn("설정","nav","auto","btn tiny")}</div><div class="entry">${ic("network")}<div class="grow"><b>기술대 제작</b><div class="subtle">기술대 종류, 슬롯, 연료, 레일과 수령량</div></div>${btn("라인 추가","stationEdit","","btn tiny")}${S.data.fleet.tech.map(g=>btn(g.name,"stationEdit",g.key,"btn tiny")).join("")}</div></div></section>
    <section class="panel">${panelHead("save","브라우저 저장·복원")}<div class="panel-body form-stack"><p class="note">품목과 출처, 가격, 재고, 주문, 설비, 즐겨찾기와 사용자 아이콘을 한 파일에 저장해요.</p><div class="head-actions">${btn("JSON 복원","restoreOpen","","btn","upload")}${btn("JSON 백업","backup","","btn primary","download")}</div></div></section></div>`;
  }
  views.data=()=>lead("데이터 설정","공식 도감을 바탕으로 시작하고, 직접 저장한 최신 게임 값을 계산에 우선 적용해요.")+
    `<div class="section-bar"><div class="seg">${W.tab("품목·레시피·가격","dataTab","items",v.dataTab==="items")}${W.tab("NPC 의뢰 사례","dataTab","quests",v.dataTab==="quests")}${W.tab("설비·백업","dataTab","setup",v.dataTab==="setup")}</div></div>${v.dataTab==="quests"?questTable():v.dataTab==="setup"?settingsOverview():itemsTable()}
    <details class="detail-box spaced"><summary>데이터와 이미지 출처</summary><div class="help"><p>기본 레시피 확인일 2026-11-25. 제작 가능한 기술 제품과 가공 재료를 수록했어요. NPC 기본 가격은 2026-11-27에 촬영한 상점 화면을 출처로 표시해요. 품질별 단가가 있는 품목의 납품 비교는 일반 판매가를 사용해요.</p><p>${Object.entries(rootSources()).map(([name,url])=>source(url,name)).join(" · ")}</p><p>${esc(window.MV_ICON_SOURCE)} · ${source("https://minevalley.kr/","제작 현장 사진 · 마인밸리")} · ${source("https://minevalley.kr/wiki/economy-npc-shops/","주민 상점 안내")}</p><p>기본 재료 그림은 Minecraft Java Edition 1.21.4 기본 텍스처(Mojang Studios)예요. 원목과 판자는 참나무를 쓰고, 1·2등급 물고기 재료 칸에는 각각 대표 물고기 그림을 사용해요.</p></div></details>`;
  function rootSources(){const s=window.MV_SEED.sources;return {"기술 완제품":s.products,"기술 부품":s.components,"기반 설비":s.facilities,"광물·제련":s.minerals};}
  actions.dataTab=id=>{v.dataTab=id;render();};changes.dataGroup=el=>{v.dataGroup=el.value;render();};
  actions.questTab=()=>{v.dataTab="quests";navigate("data");};
  const sizeControl=()=>'<p class="subtle">재료 이름은 등록 품목에서 골라 주세요. 새 원재료는 먼저 품목으로 추가할 수 있어요.</p>';
  function ingredient(id="",qty=1){return `<div class="recipe-line">${input("ingredient",id,"text",'list="ingredient-ids" aria-label="재료 이름" placeholder="재료 검색"')}${input("count",qty,"number",'min="1" step="1" aria-label="재료 비율"')}${iconBtn("재료 줄 삭제","removeIngredient","","close")}</div>`;}
  const editorTabs=(id,active)=>id&&calc().map.has(id)?`<div class="seg section-gap">${W.tab("레시피","editItem",id,active==="recipe")}${W.tab("가격","priceEditor",id,active==="prices")}${W.tab("아이콘","iconEditor",id,active==="icon")}</div>`:"";
  function recipeEditor(id){
    const old=calc().map.get(id),it=old||{id:"",group:"기술 부품",station:"기술대",out:1,sec:null,inputs:{},certainty:"미확인",source:"사용자 입력",checked:localDate(),note:""};
    const material=it.station!=="직접 조달";
    dialog(old?it.id+" 설정":"품목 추가",editorTabs(id,"recipe")+`<form data-form="recipe" data-id="${esc(id)}" class="form-stack"><div class="form-grid">
    ${lab("품목 이름",input("id",it.id,"text",'required maxlength="80" '+(old?"readonly":"")))}${lab("분류",select("group",S.groups,it.group))}${lab("제작 설비",select("station",S.stations,it.station,'data-change="recipeStation"'))}${lab("별칭 (쉼표로 구분)",input("aliases",(it.aliases||[]).join(", ")))}</div>
    <div id="recipe-craft" class="form-stack" ${material?"":"hidden"}><div class="three-cols">${fieldNum("out",it.out,"1회 생산량",'min="1" step="1"')}${fieldNum("sec",it.sec??"","1회 제작 시간 (초)",'min="0" step="any" placeholder="미확인"')}${fieldNum("water",it.water??"","1회 물 소모",'min="0" step="any" placeholder="미확인"')}</div>
    <div><div class="line-between"><h3>1회 제작 재료</h3>${btn("재료 추가","addIngredient","","btn tiny","add")}</div><div class="recipe-lines space-top">${Object.entries(it.inputs).map(([id,n])=>ingredient(id,n)).join("")||ingredient()}</div>${optionsList("ingredient-ids",S.data.items.filter(x=>x.id!==id))}${sizeControl()}</div></div>
    <div class="form-grid">${lab("레시피 출처",input("source",it.source||"","text",'placeholder="게임 화면 또는 위키 URL"'),"full")}${lab("확인일",input("checked",it.checked||"","date"))}${lab("확정 여부",select("certainty",S.states,it.certainty))}</div>
    ${lab("메모",input("note",it.note||""))}<div class="form-actions">${submit(old?"레시피 저장":"품목 추가")}</div></form>`,true);
  }
  actions.editItem=recipeEditor;actions.newItem=()=>recipeEditor("");
  changes.recipeStation=el=>{document.getElementById("recipe-craft").hidden=el.value==="직접 조달";};
  actions.addIngredient=()=>{document.querySelector(".recipe-lines").insertAdjacentHTML("beforeend",ingredient());};
  actions.removeIngredient=(_,el)=>el.closest(".recipe-line").remove();
  forms.recipe=(d,f)=>{
    const current=f.dataset.id, id=String(d.get("id")).trim(),mode=d.get("station"),prev=calc().map.get(current);
    if(!current&&S.data.items.some(i=>E.normalizeName(i.id)===E.normalizeName(id)))throw Error("같은 이름 또는 등급의 품목이 이미 있어요.");
    const inputs=Object.create(null);
    if(mode!=="직접 조달")for(const [i,name] of d.getAll("ingredient").entries()){
      if(!String(name).trim())continue;const part=E.resolveName(name,S.data.items);
      if(Object.hasOwn(inputs,part))throw Error("같은 재료는 한 줄에 합쳐 주세요 · "+part);
      inputs[part]=asInt(d.getAll("count")[i],"재료 수량",1);
    }
    const next={id,group:d.get("group"),station:mode,out:mode==="직접 조달"?1:asInt(d.get("out"),"생산량",1),sec:mode==="직접 조달"?null:maybeNum(d.get("sec"),"제작 시간"),inputs,aliases:String(d.get("aliases")).split(/[,，]/).map(x=>x.trim()).filter(Boolean),water:mode==="직접 조달"?null:maybeNum(d.get("water"),"물 소모"),source:String(d.get("source")).trim(),checked:d.get("checked"),certainty:d.get("certainty"),note:d.get("note")};
    const changed=prev&&(JSON.stringify(prev.inputs)!==JSON.stringify(next.inputs)||prev.out!==next.out||prev.sec!==next.sec||prev.station!==mode||(prev.water??null)!==next.water);
    if(changed&&next.source===prev.source&&/^https?:\/\/minevalley\.kr\//.test(next.source))next.source="사용자 수정 · 게임 화면";
    if(changed&&next.checked===prev.checked)next.checked=localDate();
    change(s=>{
      if(prev)s.items[s.items.findIndex(i=>i.id===id)]=next;else s.items.push(next);
      if(id===s.auto.item){const fallback=mode==="가공대"?next:s.items.find(i=>i.station==="가공대");if(fallback)s.auto={item:fallback.id,qty:s.auto.qty,inputs:null,out:null,loads:null};}
      if(mode!=="기술대"){if(s.techTasks)s.techTasks=s.techTasks.filter(t=>t.item!==id);s.fleet.tech.forEach(g=>g.targets=g.targets.filter(x=>x!==id));}
    },"품목 데이터를 저장했어요.");
  };
  actions.priceEditor=id=>{
    const p=S.data.prices[id]||{};
    dialog(id+" 설정",editorTabs(id,"prices")+`<form data-form="prices" data-id="${esc(id)}" class="form-stack">
    ${Object.keys(priceLabels).map(k=>`<section class="detail-box"><h3>${esc(priceLabels[k])} · 개당</h3><div class="form-grid space-top">${fieldNum(k,p[k]??"",k==="sell"?"일반·기본 단가 (C)":"단가 (C)",'min="0" step="any" placeholder="미확인"')}${lab("확정 여부",select(k+"Certainty",S.states,p[k+"Certainty"]||(k==="market"?"추정":"확인")))}${lab("출처",input(k+"Source",p[k+"Source"]||"","text",'placeholder="게임 화면, 거래 기록, URL"'))}${lab("확인일",input(k+"Checked",p[k+"Checked"]||"","date"))}</div>${k==="sell"?`<div class="form-grid space-top">${qualityPrices.map(([key,label])=>`<div>${fieldNum(key,p[key]??"",label+" 단가 (C)",'min="0" step="any" placeholder="미확인"')}${p[key+"Source"]?`<div class="note">${esc(p[key+"Source"])}</div>`:""}</div>`).join("")}</div>`:""}</section>`).join("")}
    <div class="form-actions">${submit("가격 저장")}</div></form>`,true);
  };
  forms.prices=(d,f)=>change(s=>{
    const id=f.dataset.id,p=s.prices[id]||{};
    for(const k of Object.keys(priceLabels)){
      const n=maybeNum(d.get(k),priceLabels[k]),previous=p[k]??null;
      p[k]=n;
      p[k+"Certainty"]=n===null?"미확인":d.get(k+"Certainty");
      p[k+"Source"]=String(d.get(k+"Source")).trim()||(n!==null?"사용자 입력":"");
      p[k+"Checked"]=d.get(k+"Checked")||(n!==null&&previous!==n?localDate():"");
    }
    for(const [key,label] of qualityPrices){
      const value=maybeNum(d.get(key),label+" NPC 판매가");
      if(value===(p[key]??null))continue;
      p[key]=value;
      p[key+"Certainty"]=value===null?"미확인":"확인";
      p[key+"Source"]=value===null?"":"사용자 입력";
      p[key+"Checked"]=value===null?"":localDate();
    }
    s.prices[id]=p;
  },"가격과 출처를 저장했어요.");
  actions.iconEditor=id=>dialog(id+" 설정",editorTabs(id,"icon")+`<form data-form="icon" data-id="${esc(id)}" class="form-stack"><div class="item-cell">${itemPic(id,"lg")}<div><b>${esc(id)}</b><p class="note">${S.data.icons[id]?"사용자 이미지":window.MV_ICONS[id]?"서버 리소스팩 이미지":window.MV_VANILLA_ICONS?.[id]?"마인크래프트 기본 텍스처":"품목 이니셜"}</p></div></div>${lab("아이템 아이콘 선택",'<input name="icon" type="file" accept="image/png,image/webp,image/jpeg" required>')}<p class="note">정사각형으로 자른 인벤토리 아이콘을 올려 주세요. 원본 비율을 유지해 브라우저에 저장해요.</p><div class="form-actions">${S.data.icons[id]?btn("기본 아이콘 사용","resetIcon",id):""}${submit("이미지 적용")}</div></form>`);
  forms.icon=async(d,f)=>{
    const file=d.get("icon"),id=f.dataset.id;
    if(!file?.size||!["image/png","image/webp","image/jpeg"].includes(file.type))throw Error("PNG, WebP, JPEG 파일을 골라 주세요.");
    const bitmap=await createImageBitmap(file),canvas=document.createElement("canvas");canvas.width=canvas.height=128;
    const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;const ratio=Math.min(128/bitmap.width,128/bitmap.height),w=bitmap.width*ratio,h=bitmap.height*ratio;
    ctx.drawImage(bitmap,(128-w)/2,(128-h)/2,w,h);bitmap.close();
    const url=canvas.toDataURL("image/png");change(s=>{s.icons[id]=url;},"아이콘을 저장했어요.");
  };
  actions.resetIcon=id=>change(s=>{delete s.icons[id];},"기본 아이콘으로 되돌렸어요.");
  actions.questEdit=key=>{
    const q=S.data.quests.find(x=>x.key===key)||{item:"",qty:1,amount:null,date:localDate(),note:"",approx:false};
    dialog(key?"의뢰 사례 수정":"NPC 의뢰 사례 추가",`<form data-form="quest" data-key="${esc(key)}" class="form-stack">${lab("품목",input("item",q.item,"text",'list="quest-items" required'))}${optionsList("quest-items",S.data.items)}<div class="form-grid">${fieldNum("qty",q.qty,"의뢰 수량 (개)",'min="1" required')}${lab("총 보상 (C)",input("amount",q.amount??"","text",'placeholder="예: 2539700" required'))}${lab("의뢰 날짜",input("date",q.date,"date"))}${lab("보상 정확도",select("approx",[["exact","기록 금액"],["approx","약 · 근삿값"]],q.approx?"approx":"exact"))}</div>
    ${lab("메모",`<textarea name="note" rows="2">${esc(q.note)}</textarea>`)}<div class="form-actions">${key?btn("사례 삭제","deleteQuest",key,"btn","trash"):""}${submit("사례 저장")}</div></form>`);
  };
  forms.quest=(d,f)=>{const amount=E.parseMoney(d.get("amount"));if(amount===null)throw Error("총 보상을 입력해 주세요.");
    const record={key:f.dataset.key||S.key(),item:E.resolveName(d.get("item"),S.data.items),qty:asInt(d.get("qty"),"수량",1),amount,date:d.get("date"),approx:d.get("approx")==="approx",note:String(d.get("note"))};
    change(s=>{const i=s.quests.findIndex(q=>q.key===record.key);if(i<0)s.quests.push(record);else s.quests[i]=record;},"의뢰 사례를 저장했어요.");
  };
  actions.deleteQuest=id=>change(s=>{s.quests=s.quests.filter(q=>q.key!==id);},"의뢰 사례를 삭제했어요.");
  actions.backup=()=>{
    const blob=new Blob([JSON.stringify(S.data,null,2)],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="마인밸리-공방-"+localDate()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast("JSON 백업 파일을 만들었어요.");
  };
  let pending=null;
  actions.restoreOpen=()=>{pending=null;dialog("JSON 백업 복원",`<form class="form-stack" data-form="readBackup">${lab("계산기 백업 파일",'<input name="file" type="file" accept=".json,application/json" required>')}<p class="note">내용을 확인한 뒤 기존 브라우저 데이터를 교체해요.</p><div class="form-actions">${submit("파일 확인")}</div></form>`);};
  forms.readBackup=async d=>{const f=d.get("file");if(!f?.size)throw Error("백업 파일을 골라 주세요.");let result;try{result=JSON.parse((await f.text()).replace(/^\uFEFF/,""));}catch{throw Error("JSON 파일을 읽을 수 없습니다. 백업 파일의 형식을 확인해 주세요.");}pending=S.check(result);
    dialog("백업 내용 확인",`<div class="form-stack"><p class="note">${esc(f.name)}의 데이터로 이 브라우저의 공방을 교체해요.</p><div>${row("품목",number(result.items.length)+"종")}${row("주문",number(result.orders.length)+"건")}${row("의뢰 기록",number(result.quests.length)+"건")}${row("보유 재고",number(Object.keys(result.inv).length)+"종")}</div><div class="form-actions">${btn("취소","close")}${btn("이 백업으로 복원","confirmRestore","","btn primary","upload")}</div></div>`);
  };
  actions.confirmRestore=()=>{if(!pending)return;S.restore(pending);pending=null;close();v.expanded.clear();v.dataGroup="전체";v.focusOrder="";render();toast("백업 데이터를 복원했어요.");};
})(window.W);

