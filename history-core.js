/* Pure record calculations, shared by the page and the validation script. */
(function(root) {
  const shifts = ['06:00','12:00','17:00','收尾'];
  const deadlines = [420,780,1080,1260];
  function normalize(value,status='') {
    const s=String(value??'').trim();
    if(s==='收尾')return s;
    const simple=s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if(simple){const label=simple[1].padStart(2,'0')+':'+simple[2];if(shifts.includes(label))return label;}
    // The original sheet converts time-only shift cells to 1899 Date values.
    // Prefer the saved assignment window, preserving the original shift.
    const windows=[['05:00-07:00','06:00'],['11:00-13:00','12:00'],['16:00-18:00','17:00']];
    const text=String(status).replace(/\s/g,'');
    for(const [window,label] of windows)if(text.includes(window))return label;
    let minutes=null;
    if(typeof value==='number' && value>=0 && value<1)minutes=Math.round(value*1440);
    else if(/GMT|1899|1900|T\d{2}:/i.test(s)){
      const parsed=new Date(s);
      if(!isNaN(parsed.getTime()))minutes=clock(parsed).minutes;
    }
    if(minutes!==null){
      const i=[360,720,1020].findIndex(target=>Math.abs(minutes-target)<=10);
      if(i>=0)return shifts[i];
    }
    // Preserve unrecognized values so the page can show them instead of dropping records.
    return s||'其他時段';
  }
  function normalizeRecord(r){return {...r,shift:normalize(r.shift,r.timeStatus)};}
  function clock(now = new Date()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x => [x.type,x.value]));
    return {date:p.year+'-'+p.month+'-'+p.day,minutes:Number(p.hour)*60+Number(p.minute),year:Number(p.year),month:Number(p.month),day:Number(p.day),hour:Number(p.hour),minute:Number(p.minute)};
  }
  function addDay(day,n) { return new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10); }
  function validDate(s) {return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s+'T12:00:00Z')) && addDay(s,0)===s;}
  function abnormal(r) {return ['noise','leak','pipe','waterLevel'].some(k=>String(r[k]||'').includes('異常'));}
  function pWater(r) {return /需補\s*P\s*水/.test(String(r.pWaterAlert||''));}
  function refilled(r) {return String(r.pWaterRefilled||'').includes('已補');}
  function expired(day,shift,now=new Date()) {const c=clock(now),i=shifts.indexOf(normalize(shift));return i>=0 && (day<c.date || (day===c.date && c.minutes>deadlines[i]));}
  function summarize(records,now=new Date()) {
    const c=clock(now),weekday=new Date(c.date+'T12:00:00Z').getUTCDay();
    const monday=addDay(c.date,-((weekday+6)%7));
    const days=records.map(r=>r.date).filter(validDate).sort();
    const start=days.length && days[0]<c.date ? (days[0]>monday?days[0]:monday) : c.date;
    const done=new Set(records.map(r=>r.date+'|'+normalize(r.shift,r.timeStatus)));
    const missing=[];
    for(let d=start;d<=c.date;d=addDay(d,1))shifts.forEach(s=>{
      // A completed 17:00 inspection means the workday ended around 17:00,
      // so a separate closing inspection is not required for that date.
      const closingCovered=s==='收尾'&&done.has(d+'|17:00');
      if(expired(d,s,now)&&!done.has(d+'|'+s)&&!closingCovered)missing.push({date:d,shift:s});
    });
    const valveCount=records.filter(r=>validDate(r.date)&&r.date>=monday&&r.date<=c.date&&String(r.doValveClean||'')==='是').length;
    return {abnormalCount:records.filter(abnormal).length,pWaterCount:records.filter(pWater).length,valveCount,missingCount:missing.length,missing,weekStart:monday,today:c.date};
  }
  function group(records) {
    const map=new Map();
    records.forEach(r=>{if(!validDate(r.date))return;if(!map.has(r.date))map.set(r.date,[]);map.get(r.date).push(normalizeRecord(r));});
    map.forEach(rows=>rows.sort((a,b)=>String(b.time||'').localeCompare(String(a.time||''))));
    return map;
  }
  function media(raw,label) {
    return String(raw||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).flatMap((line,i)=>{
      try {
        const url=new URL(line);
        if(url.protocol!=='https:' || !['drive.google.com','docs.google.com'].includes(url.hostname))return [];
        const match=url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
        const id=match?match[1]:url.searchParams.get('id');
        if(!id || !/^[a-zA-Z0-9_-]+$/.test(id))return [];
        const key=url.searchParams.get('resourcekey');
        const suffix=key?'&resourcekey='+encodeURIComponent(key):'';
        const isVideo=url.hash==='#video' || /\.(mp4|mov|webm)(?:$|[?#])/i.test(line);
        url.hash='';
        return [{label:label+(i?' #'+(i+1):''),isVideo,url:url.href,thumbnail:'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w400'+suffix,large:'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w2000'+suffix,preview:'https://drive.google.com/file/d/'+encodeURIComponent(id)+'/preview'+(key?'?resourcekey='+encodeURIComponent(key):'')}];
      } catch {return [];}
    });
  }
  const api={shifts,deadlines,normalize,normalizeRecord,clock,addDay,validDate,abnormal,pWater,refilled,expired,summarize,group,media};
  if(typeof module!=='undefined' && module.exports)module.exports=api;else root.WaterHistory=api;
})(typeof window!=='undefined'?window:this);
