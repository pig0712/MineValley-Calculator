(function(root) {
  "use strict";
  const E=root.MV,S=root.MVStore;
  const pageNames={craft:"제작 계산",profit:"납품 비교",auto:"가공대 · 자동 제작대",inv:"재고 관리",data:"데이터 설정"};
  const pageIcons={craft:"layers",profit:"chart",auto:"factory",inv:"box",data:"sliders"};
  const workshopHome="workshop";
  const tools=[
    {id:"craft",label:"제작",icon:"기계 부품"},
    {id:"profit",label:"납품",icon:"금 주괴"},
    {id:"auto",label:"가공대",icon:"가공대"},
    {id:"inv",label:"재고",icon:"상자 분류 장치 I"},
    {id:"data",label:"설정",icon:"회로 기판"}
  ];
  function pageFromLocation(){
    const id=location.hash.slice(1);
    return id===workshopHome||Object.hasOwn(pageNames,id)?id:"craft";
  }
  const v={page:"craft",tree:"tree",onlyMissing:true,expanded:new Map(),quick:"line",inventoryFilter:"",invHeld:false,dataFilter:"",dataGroup:"전체",dataTab:"items",deliveryMode:"offers",sort:"gain",selectedQuest:"",pendingTier:null};
  const paths={
    cube:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 5v9l9 5 9-5V8m-9 5v9"/>',
    layers:'<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    chart:'<path d="M4 4v16h16M8 16v-5m5 5V7m5 9v-8"/>',
    factory:'<path d="M3 20V9l6 3V8l6 3V4h4l2 16H3Zm4-4h2m3 0h2m3 0h1"/>',
    network:'<rect x="8" y="3" width="8" height="5" rx="1"/><path d="M12 8v4M5 16v-4h14v4"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/>',
    box:'<path d="m3 7 9-4 9 4v12l-9 3-9-3V7Zm0 0 9 4 9-4m-9 4v11m-4-17 9 4"/>',
    sliders:'<path d="M4 6h7m4 0h5M4 12h2m4 0h10M4 18h10m4 0h2"/><circle cx="13" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
    coins:'<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.6 2.7 3 6 3 1 0 2-.1 3-.4M3 11v4c0 1.6 2.7 3 6 3h1"/><ellipse cx="16" cy="13" rx="5" ry="2.5"/><path d="M11 13v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4"/>',
    trend:'<path d="m3 16 6-6 4 4 8-9m-6 0h6v6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
    hammer:'<path d="m4 19 9-9 2 2-9 9-2-2Zm7-13 4-3 6 6-3 3-3-3-2 1-3-3 1-1Z"/>',
    history:'<path d="M3 11a9 9 0 1 1 2 6M3 4v7h7m2-4v6l4 2"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    up:'<path d="M7 17 18 6M7 6h11v11"/>',chev:'<path d="m9 5 7 7-7 7"/>',down:'<path d="m5 9 7 7 7-7"/>',
    star:'<path d="m12 3 2.7 5.6 6.2.8-4.5 4.4 1.1 6.2-5.5-2.9-5.5 2.9 1.1-6.2-4.5-4.4 6.2-.8L12 3Z"/>',
    add:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',
    check:'<path d="m4 12 5 5L20 6"/>',list:'<path d="M9 6h12M9 12h12M9 18h12M3 6h1m-1 6h1m-1 6h1"/>',
    tree:'<rect x="3" y="3" width="5" height="5" rx="1"/><path d="M5 8v11h7m-7-7h7"/><rect x="12" y="10" width="8" height="4" rx="1"/><rect x="12" y="17" width="8" height="4" rx="1"/>',
    edit:'<path d="m4 16 12-12 4 4L8 20l-5 1 1-5Zm9-9 4 4"/>',
    trash:'<path d="M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    book:'<path d="M3 5c4-1 6-1 9 1 3-2 5-2 9-1v14c-4-1-6-1-9 1-3-2-5-2-9-1V5Zm9 1v14"/>',menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
    order:'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Zm4 5h6m-6 4h6"/>',filter:'<path d="M3 6h18m-15 6h12m-9 6h6"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',leaf:'<path d="M20 3c-11 0-17 4-15 12 7 4 14 0 15-12ZM3 21l11-12"/>',
    home:'<path d="m3 10 9-7 9 7M5 9v12h14V9m-9 12v-7h4v7"/>',save:'<path d="M3 3h15l3 3v15H3V3Zm4 0v6h10V3M7 21v-8h10v8"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    wallet:'<path d="M20 8V5H4v14h17V8H4m17 3h-6v5h6"/>',fuel:'<path d="M12 2c2 5-1 5 3 8 1-2 2-3 3-4 3 5 5 13-4 15C5 23 1 15 6 9c0 4 3 4 3 2 0-4 2-7 3-9Z"/>',
    pin:'<path d="m6 5 3 4-3 4 5 1 2 4 2-6 4-3-4-4-4-2-1 4-4-2Zm4 10-6 6"/>'
  };
  const ic=(name,cls="")=>`<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.cube}</svg>`;
  const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const btn=(label,act,id="",cls="btn",icon="")=>`<button type="button" class="${esc(cls)}" data-a="${esc(act)}" data-id="${esc(id)}">${icon?ic(icon):""}${esc(label)}</button>`;
  const iconBtn=(label,act,id,icon,cls="")=>`<button type="button" class="icon-btn ${esc(cls)}" title="${esc(label)}" aria-label="${esc(label)}" data-a="${esc(act)}" data-id="${esc(id)}">${ic(icon)}</button>`;
  function itemPic(id,cls="") {
    const path=S.data.icons[id]||root.MV_ICONS[id]||root.MV_VANILLA_ICONS?.[id];
    return `<span class="item-pic ${esc(cls)} ${path?"":"fallback"}">${path?`<img src="${esc(path)}" alt="" loading="lazy" draggable="false">`:esc(id.replace(/\s/g,"").slice(0,1))}</span>`;
  }
  const number=(v,d=0)=>Number(v).toLocaleString("ko-KR",{maximumFractionDigits:d});
  const money=v=>E.finite(v)?(Math.abs(v-Math.round(v*100)/100)>1e-7?"약 ":"")+number(v,2)+" C":"가격 필요";
  const rate=v=>E.finite(v)?(v>0?"+":"")+number(v,2)+"%":"산정 대기";
  function time(s,short=false) {
    if(!E.finite(s)) return "산정 대기";
    const n=Math.ceil(s),h=Math.floor(n/3600),m=Math.floor(n%3600/60),seconds=n%60;
    if(h&&short) return h+"시간"+(m?" "+m+"분":"");
    return [h?h+"시간":"",m?m+"분":"",seconds||(!h&&!m)?seconds+"초":""].filter(Boolean).join(" ");
  }
  const tag=(label,cls="")=>`<span class="tag ${esc(cls)}">${esc(label)}</span>`;
  const opt=(value,label,current)=>`<option value="${esc(value)}"${String(current)===String(value)?" selected":""}>${esc(label)}</option>`;
  const select=(name,options,current,extra="")=>`<select name="${esc(name)}" ${extra}>${options.map(o=>Array.isArray(o)?opt(o[0],o[1],current):opt(o,o,current)).join("")}</select>`;
  const lab=(name,control,cls="")=>`<label class="field ${cls}"><span>${esc(name)}</span>${control}</label>`;
  function input(name,value="",type="text",extra="") {return `<input type="${type}" name="${esc(name)}" value="${esc(value)}" ${extra}>`;}
  const fieldNum=(name,value,label,extra='min="0" step="1"')=>lab(label,input(name,value,"number",extra));
  const optionsList=(name,items)=>`<datalist id="${esc(name)}">${items.map(i=>`<option value="${esc(i.id||i)}"></option>`).join("")}</datalist>`;
  function metric(label,value,detail,icon,kind="",extra="") {return `<article class="metric ${kind}"><div class="metric-label"><span class="metric-icon">${ic(icon)}</span>${esc(label)}</div><strong class="metric-value">${value}</strong><div class="metric-detail">${detail}</div>${extra}</article>`;}
  const panelHead=(icon,title,right="")=>`<div class="panel-head"><h2>${ic(icon)}${esc(title)}</h2>${right}</div>`;
  const empty=(title,text="",icon="box")=>`<div class="empty">${ic(icon)}<b>${esc(title)}</b>${text?`<span>${esc(text)}</span>`:""}</div>`;
  const lead=(title,sub,right="")=>`<div class="page-lead"><div><h1>${esc(title)}</h1>${sub?`<p>${esc(sub)}</p>`:""}</div>${right}</div>`;
  const source=(url,label="공식 위키")=>/^https?:\/\//i.test(url||"")?`<a class="text-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ${ic("up")}</a>`:esc(url||"출처 미입력");
  const row=(name,content)=>`<div class="kv"><span>${esc(name)}</span><strong>${content}</strong></div>`;
  const submit=(name="저장")=>`<button type="submit" class="btn primary">${ic("check")}${esc(name)}</button>`;
  const actions={},forms={},changes={},views={};
  let calculation=null, revision=null, renderedPage="",toastTimer;
  function calc() {
    if(revision===S.data)return calculation;
    const s=S.data,map=E.catalog(s.items),p=E.orderPlans(s.orders,map,s.inv),quotes=E.createQuotes(map,s.prices);
    const cash=E.financial(E.combineRevenue(s.orders),p.roots,p.purchases,E.usedSupplies(p),quotes);
    function scheduleOrders(onlyFinal) {
      const schedules=[...p.jobs.values()].map(job=>E.schedule(job,map,s.fleet,onlyFinal));
      return {seconds:schedules.every(j=>E.finite(j.seconds))?E.sum(schedules.map(j=>j.seconds)):null,
        blocked:schedules.flatMap(j=>j.blocked)};
    }
    const whole=scheduleOrders(false),final=scheduleOrders(true);
    revision=s;
    calculation={map,p,quotes,cash,whole,final,active:s.orders.filter(o=>o.active)};
    return calculation;
  }
  function toast(msg,error=false) {
    const el=document.getElementById("toast");
    el.textContent=msg; el.className=error?"on error":"on"; clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>el.className="",error?6500:3000);
  }
  function dialog(title,html,wide=false) {
    const d=document.getElementById("modal");
    d.classList.toggle("wide",wide);
    document.getElementById("dialog-body").innerHTML=`<div class="dialog-head"><h2 id="dlg-title">${esc(title)}</h2>${iconBtn("닫기","close","","close")}</div><div class="dialog-content">${html}</div><p id="dlg-error" role="alert" hidden></p>`;
    if(!d.open)d.showModal();
    const scroll=d.querySelector(".dialog-content"); if(scroll)scroll.scrollTop=0;
  }
  function close(){const d=document.getElementById("modal");if(d.open)d.close();}
  function error(err) {
    const message=err.message||String(err), d=document.getElementById("modal"), line=document.getElementById("dlg-error");
    if(d.open&&line){line.textContent=message;line.hidden=false;}else toast(message,true);
  }
  function renderHotbar(){
    document.getElementById("hotbar").innerHTML=tools.map(({id,label,icon},index)=>`<a class="hot-slot" href="#${id}" data-a="windowNav" data-id="${id}" aria-controls="work-window" ${v.page===id?'aria-current="page"':""} aria-keyshortcuts="${index+1}" title="${pageNames[id]} (${index+1})"><kbd aria-hidden="true">${index+1}</kbd>${itemPic(icon)}<span>${label}</span></a>`).join("");
  }
  function keepCheckboxFocus(main){
    const focused=document.activeElement;
    if(!main.contains(focused)||focused.type!=="checkbox")return ()=>{};
    const {change,id,order}=focused.dataset;
    return ()=>{
      const replacement=[...main.querySelectorAll('input[type="checkbox"]')].find(el=>el.dataset.change===change&&el.dataset.id===id&&el.dataset.order===order);
      (replacement||main).focus({preventScroll:true});
    };
  }
  function render() {
    const s=S.data, open=v.page!==workshopHome, title=pageNames[v.page]||"마인밸리 공방";
    const main=document.getElementById("main"), restoreFocus=keepCheckboxFocus(main);
    document.title=open?title+" · 마인밸리 공방":title;
    document.getElementById("topbar").innerHTML=`<a class="world-brand" href="#workshop" data-a="windowNav" data-id="workshop"><span class="world-mark">${ic("cube")}</span><span>마인밸리 공방</span></a><div class="top-actions"><span class="save-indicator"><i></i>${s.rev?"브라우저에 저장됨":"브라우저 저장"}</span><a class="icon-btn world-btn" href="https://minevalley.kr/wiki/" target="_blank" rel="noopener noreferrer" aria-label="마인밸리 공식 위키" title="마인밸리 공식 위키">${ic("book")}</a>${iconBtn("즐겨찾기","favorites","","star","world-btn")}${btn("최근 계산","history","","btn top-history world-btn","history")}</div>`;
    document.getElementById("work-window").hidden=!open;
    document.getElementById("workshop-home").hidden=open;
    if(open){
      document.getElementById("window-bar").innerHTML=`<div id="window-title">${ic(pageIcons[v.page])}${esc(title)}</div><button type="button" class="icon-btn window-close" data-a="closeWindow" aria-label="${esc(title)} 창 닫기" title="창 닫기 (Esc)">${ic("close")}</button>`;
      main.innerHTML=(S.issue?`<div class="warn">${esc(S.issue)} ${btn("복원","restoreOpen")}</div>`:"")+views[v.page]();
      main.querySelectorAll("input[data-partial]").forEach(el=>{el.indeterminate=true;});
      restoreFocus();
    }else{
      main.replaceChildren();
      if(renderedPage!==v.page)document.getElementById("workshop-home").innerHTML=`<div class="workshop-sign">${itemPic("가공대")}<h1 id="workshop-title">마인밸리 공방</h1>${btn("제작 창 열기","nav","craft","btn primary","hammer")}</div>`;
    }
    renderHotbar();
    if(renderedPage!==v.page){window.scrollTo(0,0);renderedPage=v.page;}
  }
  function navigate(id) {
    if(id!==workshopHome&&!Object.hasOwn(pageNames,id))return;
    v.page=id;
    if(location.hash!=="#"+id)location.hash=id;
    render();
  }
  function openWindow(id) {
    close();
    if(v.page!==id)navigate(id);
    const target=id===workshopHome?document.querySelector("#workshop-home button"):document.getElementById("main");
    target.focus({preventScroll:true});
  }
  function closeWindow() {
    const key=v.page;
    navigate(workshopHome);
    document.querySelector(`#hotbar [data-id="${key}"]`)?.focus({preventScroll:true});
  }
  function change(fn,msg="",dismiss=true){S.update(fn);if(dismiss)close();render();if(msg)toast(msg);}
  function asInt(val,label,minimum=0){if(val==null||String(val).trim()==="")throw Error(label+"을 입력해 주세요.");const n=Number(val);if(!Number.isSafeInteger(n)||n<minimum)throw Error(label+"은 "+minimum+" 이상의 정수로 입력해 주세요.");return n;}
  function maybeNum(val,label,min=0){if(val==null||String(val).trim()==="")return null;const n=Number(val);if(!E.finite(n)||n<min)throw Error(label+"을 확인해 주세요.");return n;}
  function searchFilter(field,selector,extract="search") {
    const query=E.normalizeName(field.value);let count=0;
    document.querySelectorAll(selector).forEach(el=>{el.hidden=!E.normalizeName(el.dataset[extract]||"").includes(query);if(!el.hidden)count++;});
    document.querySelectorAll("[data-empty-for]").forEach(el=>{if(el.dataset.emptyFor===selector)el.hidden=count>0;});
    document.querySelectorAll("[data-count-for]").forEach(el=>{if(el.dataset.countFor===selector)el.textContent=count+"종";});
  }
  function dismissDialog(){
    if(!document.querySelector("#modal .inventory-picker")||!actions.cancelPicker?.())close();
  }
  actions.close=dismissDialog;
  actions.closeWindow=closeWindow;
  actions.windowNav=openWindow;
  actions.nav=openWindow;
  function run(fn){try{const result=fn();if(result&&typeof result.catch==="function")result.catch(error);}catch(err){error(err);}}
  document.addEventListener("click",e=>{const el=e.target.closest("[data-a]");if(!el||el.disabled||(el.matches("a")&&(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)))return;const fn=actions[el.dataset.a];if(fn){e.preventDefault();run(()=>fn(el.dataset.id||"",el));}});
  document.addEventListener("click",e=>{
    if(e.target.closest(".skip")){
      e.preventDefault();
      if(v.page===workshopHome)openWindow("craft");else document.getElementById("main").focus();
    }
  });
  document.addEventListener("submit",e=>{const f=e.target;if(!forms[f.dataset.form])return;e.preventDefault();run(()=>forms[f.dataset.form](new FormData(f),f));});
  document.addEventListener("change",e=>{const el=e.target;const fn=changes[el.dataset.change];if(fn)run(()=>fn(el));});
  document.addEventListener("input",e=>{const el=e.target;if(el.dataset.filter){searchFilter(el,el.dataset.filter);if(el.dataset.keep)v[el.dataset.keep]=el.value;}});
  window.addEventListener("hashchange",()=>{
    const id=pageFromLocation();
    if(v.page!==id){close();v.page=id;render();}
  });
  const modal=document.getElementById("modal");
  modal.addEventListener("cancel",e=>{e.preventDefault();dismissDialog();});
  modal.addEventListener("click",e=>{if(e.target===modal)dismissDialog();});
  document.addEventListener("keydown",e=>{
    if(e.defaultPrevented||e.isComposing||modal.open)return;
    if(e.key==="Escape"&&v.page!==workshopHome){
      e.preventDefault();
      closeWindow();
      return;
    }
    if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.target.closest("input,textarea,select,[contenteditable]"))return;
    const tool=/^[1-5]$/.test(e.key)?tools[Number(e.key)-1]:null;
    if(tool){e.preventDefault();openWindow(tool.id);}
  });
  window.addEventListener("storage",e=>{if(e.key===S.storageKey)run(()=>{if(S.sync()){close();render();toast("다른 창의 변경을 반영했어요.");}});});
  root.W={E,S,v,pageNames,pageFromLocation,ic,esc,btn,iconBtn,itemPic,number,money,rate,time,tag,opt,select,lab,input,fieldNum,optionsList,metric,panelHead,empty,lead,source,row,submit,actions,forms,changes,views,calc,toast,dialog,close,error,render,navigate,change,asInt,maybeNum,searchFilter};
})(window);

