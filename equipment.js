(function(W){
  "use strict";
  const {E,S,v,ic,esc,btn,iconBtn,itemPic,number,time,tag,select,lab,input,fieldNum,optionsList,metric,panelHead,empty,lead,row,submit,actions,forms,changes,views,calc,dialog,change,close,render,navigate,asInt,maybeNum}=W;
  function autoData(){
    const s=S.data,a=s.auto,r=calc().map.get(a.item),p=s.fleet.process;
    const inputs=a.inputs||r.inputs,out=a.out||r.out;
    return {a,r,p,inputs,out,result:E.autoLoad(inputs,out,a.qty,p.capacity,p.lines,a.loads)};
  }
  function autoControls(d){
    const {a,r,p,inputs,out}=d;
    return `<section class="panel">${panelHead("sliders","목표와 설비 조건")}<div class="panel-body"><div class="machine-pair"><button type="button" class="item-cell" data-a="iconEditor" data-id="가공대" title="가공대 아이콘 설정">${itemPic("가공대","sm")}가공대</button>${ic("add")}<span class="item-cell">${itemPic("자동 제작대 "+E.TIERS[p.tier],"sm")}자동 제작대 ${E.TIERS[p.tier]}</span></div><form data-form="autoSettings" class="form-stack">
    <div class="field"><span>가공할 품목</span><button class="picked-slot" type="button" data-a="browseProcessing" aria-label="가공품 선택. 현재 ${esc(r.id)}">${itemPic(r.id)}<span>${esc(r.id)}</span>${ic("chev")}</button></div>
    <div class="form-grid">${fieldNum("qty",a.qty,"목표 수량 (개)",'min="1" required')}${fieldNum("out",out,"1회 생산량 (개)",'min="1" required')}</div>
    <p class="note">${W.source(r.source,"레시피 출처")}${r.note?" · "+esc(r.note):""}</p>
    <h3>1회분 재료 비율</h3><div class="form-grid">${Object.entries(inputs).map(([id,n],i)=>lab(id,input("ratio"+i,n,"number",'min="1" step="1" required'))).join("")}</div>
    <h3 class="subhead">라인 설정</h3><div class="form-grid">${lab("자동 제작대 등급",select("tier",E.TIERS.map((t,i)=>[i,"자동 제작대 "+t]),p.tier,'data-change="autoTier"'))}${fieldNum("lines",p.lines,"가공 라인 수",'min="1" max="128" required')}
    ${fieldNum("capacity",p.capacity,"라인당 입력 용량 (개)",'min="1" required')}${fieldNum("gap",p.gap,"다음 작업 대기 (초)",'min="0" step="any" required')}
    ${fieldNum("speed",p.speed,"가공 속도 (%)",'min="0.01" step="any" required')}${lab("주문 시간에 적용할 방식",select("mode",[["auto","자동 제작대 연결"],["manual","수동 가공대"]],p.automatic?"auto":"manual"))}</div>
    <p class="note">투입량은 자동 제작대 한 번 채움 기준이에요. 전체 주문의 시간에는 이 라인 수와 속도를 적용해요. 자동 모드에서는 연속 작업 사이의 대기 시간도 더해요.</p>
    <div class="form-actions">${submit("계산 적용")}</div></form></div></section>`;
  }
  function lineTable(d){
    const {r,p,inputs,result}=d;
    return `<section class="panel">${panelHead("factory","라인별 투입과 잔량",btn("투입량 조정","editLoads","","btn tiny","edit"))}
    <div class="tbl-wrap"><table><thead><tr><th>라인</th><th>재료별 투입 → 제작 후 잔량</th><th class="num">투입 기준 최대</th><th class="num">이번 생산</th></tr></thead><tbody>
    ${result.rows.map((line,i)=>`<tr><td><b>${i+1}호</b><div class="subtle">${number(line.occupied)}/${number(p.capacity)}개</div></td><td>${Object.keys(inputs).map(id=>`<div class="load-item">${itemPic(id,"sm")}<span>${esc(id)} <b>${number(line.load[id])}</b> → ${number(line.left[id])}개</span></div>`).join("")}</td><td class="num">${number(line.limit*d.out)}개</td><td class="num"><b>${number(line.made)}개</b><div class="subtle">${number(line.runs)}회</div></td></tr>`).join("")}
    </tbody></table></div><div class="tree-footer"><span class="subtle">용량은 개별 아이템 수 기준 · ${esc(r.id)} 1회당 재료 ${number(E.sum(Object.values(inputs)))}개</span></div></section>`;
  }
  views.auto=()=>{
    const d=autoData(),{p,r,result}=d,sec=E.finite(r.sec)?Math.max(0,...result.rows.map(l=>l.runs*r.sec*100/p.speed+Math.max(0,l.runs-1)*p.gap)):null;
    return lead("가공대 · 자동 제작대","가공 레시피의 비율에 맞춰 각 라인에 넣을 재료를 계산해요.")+
    `<section class="metrics">${metric("목표 수량",number(d.a.qty)+"<small>개</small>",esc(r.id),"order")}${metric("최대 생산량",number(result.max)+"<small>개</small>","전체 라인의 이론상 한 번 채움","factory","goldish")}${metric("이번 생산량",number(result.made)+"<small>개</small>",result.short?"추가 생산 필요 "+number(result.short)+"개":"목표 초과 잔여 "+number(result.surplus)+"개","box")}${metric("자동 라인 예상 시간",time(sec,true),"보충·수령 대기 제외","clock","blue")}</section>
    <div class="equip-grid"><div class="stack">${lineTable(d)}<section class="panel">${panelHead("layers","투입 합계")}<div class="panel-body">${Object.keys(d.inputs).map(id=>row(id,E.sets(E.sum(result.rows.map(l=>l.load[id]))))).join("")}${row("시설 물 소모",E.finite(r.water)?number(r.water*E.sum(result.rows.map(l=>l.runs)))+" 단위":"미확인")}</div></section></div><div>${autoControls(d)}</div></div>`;
  };
  actions.browseProcessing=(_,el)=>{
    const items=S.data.items.filter(item=>item.station==="가공대");
    const categories=[
      {id:"all",label:"전체",groups:[]},
      ...S.processingGroups.map(({group,label})=>({id:group,label,groups:[group]})),
      {id:"favorites",label:"즐겨찾기",groups:[]}
    ];
    const qty=Number(el.form.elements.namedItem("qty").value);
    W.openInventory({
      title:"가공품 인벤토리",items,categories,selected:S.data.auto.item,
      onSelect:id=>{
        const previous=S.data.auto;
        const target=E.positiveInt(qty)?qty:previous.qty;
        change(s=>{
          if(id!==previous.item)s.auto={item:id,qty:target,inputs:null,out:null,loads:null};
          else if(target!==previous.qty)s.auto={...previous,qty:target,loads:null};
        },"레시피를 불러왔어요.");
        document.querySelector('main [data-form="autoSettings"] [name="qty"]').focus();
      }
    });
  };
  changes.autoTier=el=>{const f=el.form,i=Number(el.value);f.elements.capacity.value=E.CAPS[i];f.elements.gap.value=E.GAPS[i];};
  forms.autoSettings=d=>{const {inputs}=autoData();change(s=>{
    const previous=s.fleet.process;
    s.fleet.process={tier:Number(d.get("tier")),capacity:asInt(d.get("capacity"),"입력 용량",1),lines:asInt(d.get("lines"),"라인 수",1),gap:maybeNum(d.get("gap"),"작업 대기"),speed:maybeNum(d.get("speed"),"가공 속도",0.01),automatic:d.get("mode")==="auto"};
    const ratios=Object.fromEntries(Object.keys(inputs).map((id,i)=>[id,asInt(d.get("ratio"+i),"재료 비율",1)]));
    const item=s.items.find(i=>i.id===s.auto.item),out=asInt(d.get("out"),"생산량",1),qty=asInt(d.get("qty"),"목표 수량",1);
    const changed=previous.capacity!==s.fleet.process.capacity||previous.lines!==s.fleet.process.lines||qty!==s.auto.qty||out!==(s.auto.out||item.out)||Object.keys(inputs).some(id=>ratios[id]!==inputs[id]);
    s.auto={item:item.id,qty,inputs:Object.keys(ratios).every(id=>item.inputs[id]===ratios[id])?null:ratios,out:out===item.out?null:out,loads:changed?null:s.auto.loads};
  },"라인별 투입량을 계산했어요.");};
  actions.editLoads=()=>{
    const {result,inputs,p}=autoData();
    dialog("실제 투입량 조정",`<form data-form="loads" class="form-stack"><p class="note">라인 하나의 투입 총량은 ${E.sets(p.capacity)}까지예요. 생산 후 남는 재료는 각 라인에 표시해요.</p>
      <div class="tbl-wrap"><table><thead><tr><th>라인</th>${Object.keys(inputs).map(id=>`<th>${esc(id)}</th>`).join("")}</tr></thead><tbody>${result.rows.map((r,i)=>`<tr><td>${i+1}호</td>${Object.keys(inputs).map((id,j)=>`<td>${input("l"+i+"r"+j,r.load[id],"number",'min="0" required aria-label="'+esc((i+1)+"호 "+id)+'"')}</td>`).join("")}</tr>`).join("")}</tbody></table></div><div class="form-actions">${btn("목표 비율로 재분배","resetLoads")}${submit("투입량 적용")}</div></form>`,true);
  };
  forms.loads=d=>{const {a,inputs,out,p,result}=autoData();const loads=result.rows.map((_,i)=>Object.fromEntries(Object.keys(inputs).map((id,j)=>[id,asInt(d.get("l"+i+"r"+j),"투입량")])));
    E.autoLoad(inputs,out,a.qty,p.capacity,p.lines,loads);change(s=>{s.auto.loads=loads;},"투입량과 잔량을 갱신했어요.");};
  actions.resetLoads=()=>change(s=>{s.auto.loads=null;},"목표 수량에 맞춰 재분배했어요.");
  actions.sendAuto=(id,el)=>{const n=calc().p.jobs.get(el.dataset.order).nodes.get(id);change(s=>{s.auto={item:id,qty:n.missing,inputs:null,out:null,loads:null};});navigate("auto");W.toast(id+" 부족분 "+number(n.missing)+"개를 불러왔어요.");};
  function techPlan(){
    const s=S.data,c=calc();
    if(s.techTasks===null)return {p:c.p,scheduled:c.whole,manual:false};
    const target=new Map();
    s.techTasks.forEach(t=>target.set(t.item,(target.get(t.item)||0)+t.qty));
    const nodes=new Map(),sequence=E.topology([...target.keys()],c.map).filter(id=>target.has(id));
    for(const [id,qty] of target){
      const it=c.map.get(id),runs=Math.ceil(qty/it.out);
      nodes.set(id,{id,need:qty,runs,rootRuns:runs,made:runs*it.out});
    }
    const p={nodes,sequence};
    return {p,scheduled:E.schedule(p,c.map,s.fleet),manual:true};
  }
  function groupCards(t){
    const f=S.data.fleet,e=t.scheduled, fuelSecs=E.FUEL[f.fuelItem]*f.fuelFactor/100;
    const receive=new Map();
    for(const id of t.p.sequence){
      const n=t.p.nodes.get(id);let left=n.rootRuns||0;
      for(const j of e.jobs.filter(j=>j.id===id&&j.station==="기술대")){
        const runs=Math.min(left,j.runs);left-=runs;
        receive.set(j.key,(receive.get(j.key)||0)+runs*calc().map.get(id).out);
      }
    }
    return `<section class="panel">${panelHead("network","기술대 라인",btn("라인 추가","stationEdit","","btn tiny","add"))}<div class="panel-body">
      ${f.tech.map(g=>{
        const devices=e.devices.filter(d=>d.station==="기술대"&&d.key===g.key),fuel=E.sum(devices.map(d=>d.fuel)),mats=E.sum(devices.map(d=>d.materials)),received=receive.get(g.key)||0;
        const refill=E.sum(devices.map(d=>Math.max(0,d.fuel-(g.fuelNow||0))));
        const fuelItems=E.sum(devices.map(d=>Math.ceil(Math.max(0,d.fuel-(g.fuelNow||0))/fuelSecs)));
        const storage=(val,unit)=>val==null?"미설정":number(val)+unit;
        return `<div class="line-card"><div class="line-between"><div class="item-cell">${itemPic(g.type)}<div><h3>${esc(g.name)}</h3><div class="subtle">${esc(g.type)} ${number(g.count)}대 · 대당 ${g.slots}슬롯 · 속도 ${number(g.speed,2)}%</div></div></div>${iconBtn("라인 조건 수정","stationEdit",g.key,"sliders")}</div><div class="tagline space-top">${tag(g.rail?"레일 연결":"수동 공급",g.rail?"green":"muted")}${tag(g.targets.length?"지정 품목 "+g.targets.length+"종":"모든 기술 품목")}</div>
        ${row("필요 연료 / 시작 연료 제외 보충",number(fuel)+"초 / "+number(refill)+"초")}
        ${row("보충용 "+f.fuelItem,number(fuelItems)+"개 <small>이상</small>")}
        ${row("수령용 기술대 저장량",g.receiver==null?"미설정":E.sets(g.receiver))}
        <details class="detail-box space-top"><summary>공급과 수령 상세</summary>
        ${row("기술대 자체 연료통 (1대)",storage(g.fuel,"초"))}${row("시작 연료 (1대)",number(g.fuelNow||0)+"초")}
        ${row("외부 재료통 / 연료통",storage(g.materialBin,"개")+" / "+storage(g.fuelBin,"초"))}
        ${row("필요 투입 재료 합계",E.sets(mats))}
        ${g.rail?row("재료 / 연료 이송 최소 횟수",(g.transferItems?number(Math.ceil(mats/g.transferItems))+"회":"미확인")+" / "+(g.transferFuel?number(Math.ceil(refill/g.transferFuel))+"회":"미확인")):row("재료·연료 공급","수동 투입")}
        ${g.rail?row("외부 통을 채울 최소 횟수",(g.materialBin?number(Math.ceil(mats/g.materialBin))+"회":"미확인")+" / "+(g.fuelBin?number(Math.ceil(refill/g.fuelBin))+"회":"미확인")):""}
        ${row("라인의 최종 목표 생산분",E.sets(received))}${row("최종 목표 수령 횟수",g.receiver?number(Math.ceil(received/g.receiver))+"회":"저장량 미설정")}
        <p class="subtle space-top">빈 수령함으로 시작하는 조건이에요. 중간재 이송·연료 초과분 폐기·수리로 인한 대기는 예상 시간에 미포함이에요.</p></details></div>`;
      }).join("")||empty("등록한 기술대가 없어요.","라인을 추가해 작업을 배정하세요.","network")}
      <div class="form-actions">${btn("연료 종류·효율","fuelSettings","","btn tiny","fuel")}</div></div></section>`;
  }
  function assignments(t){
    const scheduled=t.scheduled;
    const jobs=scheduled.jobs.filter(j=>j.station==="기술대").sort((a,b)=>a.start-b.start||a.end-b.end);
    return `<section class="panel">${panelHead("list","작업 배정표",tag(t.manual?"직접 배정":"주문 연동",t.manual?"gold":"green"))}<div class="panel-body">
    <div class="section-bar">${btn("현재 주문 연동","syncTasks","","btn tiny","layers")}${btn("작업 직접 추가","addTask","","btn tiny","add")}</div>
    ${t.manual?`<div class="entry-list section-gap">${S.data.techTasks.map((q,i)=>`<div class="entry">${itemPic(q.item,"sm")}<div class="grow">${esc(q.item)} · ${E.sets(q.qty)}</div>${iconBtn("직접 배정 해제","removeTask",String(i),"close")}</div>`).join("")}</div>`:""}
    <p class="note">${t.manual?"직접 배정량은 이미 재고를 뺀 목표예요. 목록에 없는 하위 부품은 준비된 것으로 계산해요.":"공통 재료를 합산한 주문 제작분을 배정해요. 선행 재료가 준비된 시점부터 각 기술대의 빈 슬롯을 사용해요."} 한 대에서 같은 품목은 한 슬롯에 배정해요.</p></div>
    ${scheduled.blocked.length?`<div class="warn">배정 대기 · ${scheduled.blocked.map(b=>esc(b.id)+" ("+esc(b.reason)+")").join(", ")}</div>`:""}
    ${jobs.length?`<div class="tbl-wrap"><table><thead><tr><th>품목</th><th>라인 / 슬롯</th><th class="num">제작 횟수</th><th class="num">시작 → 완료</th></tr></thead><tbody>${jobs.map(j=>`<tr><td><div class="item-cell">${itemPic(j.id,"sm")}<b>${esc(j.id)}</b></div></td><td>${esc(j.name)} · ${j.slot}번</td><td class="num">${number(j.runs)}회</td><td class="num">${time(j.start)} → ${time(j.end)}</td></tr>`).join("")}</tbody></table></div>`:empty("배정된 기술 작업이 없어요.","작업을 추가하거나 기술대의 허용 품목을 확인하세요.","network")}</section>`;
  }
  views.tech=()=>{
    const f=S.data.fleet,t=techPlan(),js=t.scheduled.jobs.filter(j=>j.station==="기술대");
    return lead("기술대 제작","기술대별 작업 슬롯과 속도에 맞춰 부품·완제품을 배정해요.")+
    `<section class="metrics">${metric("등록 기술대",number(E.sum(f.tech.map(g=>g.count)))+"<small>대</small>",f.tech.length+"개 라인 그룹","factory")}${metric("동시 작업 슬롯",number(E.sum(f.tech.map(g=>g.count*g.slots)))+"<small>개</small>","기술대별 슬롯 합계","network","goldish")}${metric("배정된 기술 제작",number(E.sum(js.map(j=>j.runs)))+"<small>회</small>",E.unique(js.map(j=>j.id)).length+"개 품목","hammer")}${metric("예상 완료 시간",time(t.scheduled.seconds,true),t.manual?"직접 배정 목록 기준":"가공 선행 작업 포함","clock","blue")}</section>
    <div class="equip-grid"><div>${assignments(t)}</div><div>${groupCards(t)}</div></div>`;
  };
  function taskAdd(s,id,qty){if(s.techTasks===null)s.techTasks=[];const task=s.techTasks.find(t=>t.item===id);if(task)task.qty+=qty;else s.techTasks.push({item:id,qty});}
  actions.sendTech=id=>{const n=calc().p.nodes.get(id);change(s=>{s.techTasks=[{item:id,qty:n.missing}];});navigate("tech");W.toast(id+" 부족분 "+number(n.missing)+"개를 배정했어요.");};
  actions.addTask=()=>dialog("기술 작업 직접 추가",`<form data-form="task" class="form-stack">${lab("기술 품목",input("item","","text",'list="task-items" required placeholder="품목 이름과 등급"'))}${optionsList("task-items",S.data.items.filter(i=>i.station==="기술대"))}${fieldNum("qty",1,"준비할 수량 (개)",'min="1" required')}<p class="note">주문 연동 중에 첫 작업을 추가하면 직접 배정 목록으로 전환해요.</p><div class="form-actions">${submit("작업 추가")}</div></form>`);
  forms.task=d=>{const id=E.resolveName(d.get("item"),S.data.items.filter(i=>i.station==="기술대"));change(s=>taskAdd(s,id,asInt(d.get("qty"),"수량",1)),"기술 작업을 추가했어요.");};
  actions.removeTask=id=>change(s=>{s.techTasks.splice(Number(id),1);});
  actions.syncTasks=()=>change(s=>{s.techTasks=null;},"현재 주문에서 배정 목록을 불러왔어요.");
  const initialGroup=()=>({key:S.key(),name:"새 라인",type:E.TYPES[0],count:1,slots:1,speed:100,targets:[],rail:true,fuel:1800,fuelNow:0,materialBin:512,fuelBin:3600,receiver:null,transferItems:32,transferFuel:300});
  actions.stationEdit=key=>{
    const g=key?S.data.fleet.tech.find(x=>x.key===key):initialGroup();
    const n=(field,label,min=1,extra="")=>fieldNum(field,g[field]??"",label,'min="'+min+'" step="1" '+extra);
    dialog(key?"기술대 라인 수정":"기술대 라인 추가",`<form class="form-stack" data-form="station" data-key="${esc(key)}"><div class="form-grid">
    ${lab("라인 이름",input("name",g.name,"text","required maxlength=60"))}${lab("기술대 종류",select("type",E.TYPES,g.type,'data-change="stationType"'))}
    ${n("count","기술대 대수",0,'max="128" required')}${n("slots","대당 동시 슬롯",1,'max="64" required')}${fieldNum("speed",g.speed,"속도 (%)",'min="0.01" step="any" required')}${lab("공급 방식",select("rail",[["yes","레일 연결"],["no","수동 공급"]],g.rail?"yes":"no"))}
    ${n("fuel","대당 연료 용량 (초)")}${n("fuelNow","대당 현재 연료 (초)",0)}${n("materialBin","외부 재료통 용량 (개)")}${n("fuelBin","외부 연료통 용량 (초)")}
    ${n("transferItems","1회 레일 재료 이송 한도 (개)")}${n("transferFuel","1회 레일 연료 이송 한도 (초)")}${n("receiver","수령용 기술대 저장량 (개)")}
    </div><p class="note">빈 용량은 미확인으로 저장해요. 수령용 저장량은 이 라인에만 적용해요. 기존 라인의 관찰값은 512개(8세트)예요.</p>
    <details class="detail-box"><summary>배정할 품목 선택 · ${g.targets.length?g.targets.length+"종":"전체 허용"}</summary><p class="note">선택한 품목만 이 라인에 배정해요. 모두 해제하면 전체를 허용해요.</p><div class="target-grid">${S.data.items.filter(i=>i.station==="기술대").map(i=>`<label class="check-label"><input type="checkbox" name="target" value="${esc(i.id)}" ${g.targets.includes(i.id)?"checked":""}>${esc(i.id)}</label>`).join("")}</div></details>
    <div class="form-actions">${key?btn("라인 삭제","deleteStation",key,"btn","trash"):""}${submit("라인 저장")}</div></form>`,true);
  };
  changes.stationType=el=>{el.form.elements.slots.value=E.SLOTS[E.TYPES.indexOf(el.value)];};
  forms.station=(d,form)=>{const optInt=(k,label)=>String(d.get(k)||"").trim()===""?null:asInt(d.get(k),label,1);
    const g={key:form.dataset.key||S.key(),name:String(d.get("name")).trim(),type:d.get("type"),count:asInt(d.get("count"),"대수"),slots:asInt(d.get("slots"),"슬롯",1),speed:maybeNum(d.get("speed"),"속도",0.01),rail:d.get("rail")==="yes",targets:d.getAll("target"),
      fuel:optInt("fuel","연료 용량"),fuelNow:d.get("fuelNow")?asInt(d.get("fuelNow"),"현재 연료"):0,materialBin:optInt("materialBin","재료통"),fuelBin:optInt("fuelBin","연료통"),receiver:optInt("receiver","수령 용량"),transferItems:optInt("transferItems","재료 이송량"),transferFuel:optInt("transferFuel","연료 이송량")};
    if(g.fuel!=null&&g.fuelNow>g.fuel)throw Error("현재 연료가 기술대 연료 용량을 초과했습니다.");
    change(s=>{const i=s.fleet.tech.findIndex(x=>x.key===g.key);if(i<0)s.fleet.tech.push(g);else s.fleet.tech[i]=g;},"라인 설정을 저장했어요.");};
  actions.deleteStation=key=>change(s=>{s.fleet.tech=s.fleet.tech.filter(g=>g.key!==key);},"기술대 라인을 삭제했어요.");
  actions.fuelSettings=()=>dialog("기술대 연료 설정",`<form data-form="fuel" class="form-stack">${lab("사용 연료",select("fuel",Object.entries(E.FUEL).map(([id,sec])=>[id,id+" · "+sec+"초/개"]),S.data.fleet.fuelItem))}${fieldNum("eff",S.data.fleet.fuelFactor,"연료 효율 (%)",'min="0.01" step="any" required')}<p class="note">작업 연료는 레시피의 기본 제작 시간(초)을 기준으로 계산해요. 효율은 연료 한 개로 충전하는 시간에 적용하며, 연료 비용은 이득 계산에 미포함이에요.</p><div class="form-actions">${submit()}</div></form>`);
  forms.fuel=d=>change(s=>{s.fleet.fuelItem=d.get("fuel");s.fleet.fuelFactor=maybeNum(d.get("eff"),"연료 효율",0.01);});
})(window.W);

