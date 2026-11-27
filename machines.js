(function (E) {
  "use strict";
  const TIERS = ["I", "II", "III", "IV"];
  const CAPS = [256,512,1024,2304], GAPS = [1,0.5,0.25,0.1];
  const TYPES = ["일반 기술대","증기 기술대","전기 기술대","마도공학 기술대"];
  const SLOTS = [1,2,3,3];
  const FUEL = {"석탄":80,"목탄":80,"석탄 블록":720,"원목":20,"판자":10};
  function defaultFleet() {
    return {
      process:{lines:1, tier:3, capacity:2304, gap:0.1, speed:100, automatic:true},
      tech:[{key:"main",name:"내 기존 라인",type:TYPES[0],count:1,slots:1,speed:100,targets:[],rail:true,fuel:1800,fuelNow:0,fuelBin:3600,materialBin:512,receiver:512,transferItems:32,transferFuel:300}],
      fuelItem:"석탄",fuelFactor:100
    };
  }
  // Find the earliest feasible finishing time without iterating once per batch.
  function distribute(runs, options) {
    if (!runs || !options.length) return options.map(() => 0);
    if (options.length === 1) return [runs];
    const zero = options.findIndex(o => o.duration === 0 && o.gap === 0 && o.start === Math.min(...options.map(x => x.start)));
    if (zero >= 0) return options.map((_,i) => i === zero ? runs : 0);
    function capacity(o,time) {
      if (time < o.start + o.duration - 1e-8) return 0;
      return o.duration+o.gap === 0 ? runs : Math.min(runs, Math.max(0,Math.floor((time-o.start+o.gap+1e-8)/(o.duration+o.gap))));
    }
    let low = Math.min(...options.map(o => o.start));
    let high = Math.min(...options.map(o => o.start + runs*o.duration + (runs-1)*o.gap));
    for (let n = 0; n < 60 && high-low > 1e-8; n++) {
      const mid = (low+high)/2;
      if (E.sum(options.map(o => capacity(o,mid))) >= runs) high=mid; else low=mid;
    }
    let left=runs;
    const counts=options.map(o => { const n=Math.min(left,capacity(o,high)); left-=n; return n; });
    if (left) {
      let best=0;
      options.forEach((o,i) => { if (o.start+(counts[i]+1)*o.duration+counts[i]*o.gap < options[best].start+(counts[best]+1)*options[best].duration+counts[best]*options[best].gap) best=i; });
      counts[best]+=left;
    }
    return counts;
  }
  function schedule(p, map, fleet, onlyFinal=false) {
    const process=fleet.process, devices=[], jobs=[], blocked=[], ends=new Map();
    const addDevice = (name, key, station, slots, speed, gap, allowed, settings) => {
      devices.push({name,key,station,speed,gap,allowed,settings,free:Array(slots).fill(0),ends:0,fuel:0,made:0,materials:0,runs:0});
    };
    for(let i=0;i<process.lines;i++) addDevice("가공 "+(i+1)+"호","proc"+i,"가공대",1,process.speed,process.automatic ? process.gap : 0,[],process);
    for(const group of fleet.tech) {
      for(let i=0;i<group.count;i++) addDevice(group.name+(group.count>1?" "+(i+1)+"호":""),group.key,"기술대",group.slots,group.speed,0,group.targets,group);
    }
    const remaining = new Set([...p.sequence].reverse().filter(id => (onlyFinal ? p.nodes.get(id).rootRuns : p.nodes.get(id).runs) > 0));
    while(remaining.size) {
      const available=[];
      for(const id of remaining) {
        const item=map.get(id), children=onlyFinal ? [] : Object.keys(item.inputs);
        if (children.some(c => remaining.has(c))) continue;
        const upstream=children.map(c => ends.get(c) ?? (ends.has(c) ? null : 0));
        available.push({id,item,ready:upstream.includes(null) ? null : Math.max(0,...upstream)});
      }
      if (!available.length) throw Error("설비 배정 중 순환 레시피를 발견했습니다.");
      available.sort((a,b) => (a.ready ?? Infinity)-(b.ready ?? Infinity) || (b.item.sec || 0)-(a.item.sec || 0));
      const {id,item,ready}=available[0], node=p.nodes.get(id);
      remaining.delete(id);
      const runs=onlyFinal ? node.rootRuns : node.runs, size=E.sum(Object.values(item.inputs));
      const eligible=devices.filter(d => d.station===item.station && (!d.allowed.length || d.allowed.includes(id)) &&
        (item.station!=="기술대" || d.settings.fuel==null || !E.finite(item.sec) || item.sec<=d.settings.fuel) &&
        (item.station!=="가공대" || !process.automatic || size<=process.capacity));
      let reason="";
      if (ready===null) reason="선행 재료 대기";
      else if (!E.finite(item.sec)) reason="제작 시간 미확인";
      else if (!eligible.length) reason="설비 배정·입력 용량·1회 연료 한도 확인";
      if (reason) { blocked.push({id,reason}); ends.set(id,null); continue; }
      const options=eligible.map(d => {
        // A machine can work on several distinct targets, with one slot per target.
        const at=Math.min(...d.free);
        return {d,slot:d.free.indexOf(at),start:Math.max(ready,at),duration:item.sec*100/d.speed,gap:d.gap};
      });
      const shares=distribute(runs,options);
      let end=0;
      shares.forEach((count,i) => {
        if (!count) return;
        const o=options[i], d=o.d;
        const finish=o.start+count*o.duration+(count-1)*o.gap;
        d.free[o.slot]=finish+o.gap; d.ends=Math.max(d.ends,finish);
        d.runs+=count; d.made+=count*item.out; d.materials+=count*size;
        if (d.station==="기술대") d.fuel+=count*item.sec;
        jobs.push({id,name:d.name,key:d.key,station:d.station,runs:count,made:count*item.out,start:o.start,end:finish,slot:o.slot+1});
        end=Math.max(end,finish);
      });
      ends.set(id,end);
    }
    return {jobs,devices,blocked,seconds:blocked.length ? null : Math.max(0,...devices.map(d => d.ends)),fuel:E.sum(devices.map(d=>d.fuel))};
  }
  function autoLoad(inputs, out, goal, capacity, lines, override) {
    const pairs=Object.entries(inputs), unit=E.sum(Object.values(inputs));
    if (!pairs.length || pairs.some(([,n])=>!E.positiveInt(n)) || ![out,goal,capacity,lines].every(E.positiveInt)) throw Error("목표·용량·라인·재료 비율은 양의 정수로 입력해 주세요.");
    const desired=Math.ceil(goal/out), capRuns=Math.floor(capacity/unit), possible=Math.min(desired,capRuns*lines);
    const rows=Array.from({length:lines},(_,i) => {
      const share=Math.floor(possible/lines)+Number(i < possible%lines);
      const load=Object.fromEntries(pairs.map(([id,n]) => [id,override?.[i]?.[id] ?? share*n]));
      if (Object.values(load).some(n=>!Number.isSafeInteger(n)||n<0)) throw Error("라인 투입량은 0 이상의 정수여야 합니다.");
      const occupied=E.sum(Object.values(load));
      if (occupied>capacity) throw Error((i+1)+"번 라인이 입력 용량을 "+(occupied-capacity)+"개 초과했습니다.");
      const limit=Math.min(...pairs.map(([id,n])=>Math.floor(load[id]/n)));
      return {load,occupied,limit,share,runs:Math.min(share,limit)};
    });
    let extra=desired-E.sum(rows.map(r=>r.runs));
    for (const row of rows) {
      const n=Math.min(extra,row.limit-row.runs);
      row.runs+=n; extra-=n;
      row.made=row.runs*out;
      row.left=Object.fromEntries(pairs.map(([id,ratio])=>[id,row.load[id]-row.runs*ratio]));
    }
    const made=E.sum(rows.map(r=>r.made));
    return {rows, max:capRuns*lines*out,loadedMax:E.sum(rows.map(r=>r.limit))*out,made,surplus:Math.max(0,made-goal),short:Math.max(0,goal-made),desired,capRuns};
  }
  Object.assign(E,{TIERS,CAPS,GAPS,TYPES,SLOTS,FUEL,defaultFleet,schedule,autoLoad});
})(typeof window!=="undefined" ? window.MV : require("./engine.js"));
