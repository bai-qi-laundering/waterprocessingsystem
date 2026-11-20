/* Pure record calculations, shared by the page and the validation script. */
(function(root) {
  const shifts = ['06:00','12:00','17:00','收尾'];
  const deadlines = [420,780,1080,1260];
  const normalize = s => String(s || '').trim() === '6:00' ? '06:00' : String(s || '').trim();
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
    const done=new Set(records.map(r=>r.date+'|'+normalize(r.shift)));
    const missing=[];
    for(let d=start;d<=c.date;d=addDay(d,1))shifts.forEach(s=>{if(expired(d,s,now)&&!done.has(d+'|'+s))missing.push({date:d,shift:s});});
    return {abnormalCount:records.filter(abnormal).length,pWaterCount:records.filter(pWater).length,missingCount:missing.length,missing,weekStart:monday,today:c.date};
  }
  function group(records) {
    const map=new Map();
    records.forEach(r=>{if(!validDate(r.date))return;if(!map.has(r.date))map.set(r.date,[]);map.get(r.date).push({...r,shift:normalize(r.shift)});});
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
  const api={shifts,deadlines,normalize,clock,addDay,validDate,abnormal,pWater,refilled,expired,summarize,group,media};
  if(typeof module!=='undefined' && module.exports)module.exports=api;else root.WaterHistory=api;
})(typeof window!=='undefined'?window:this);
