(() => {
  'use strict';
  const H=window.WaterHistory, el=id=>document.getElementById(id);
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let records=[],groups=new Map(),shown=14,mediaItems=[],loaded=false,request=0;
  function load() {
    const token=++request;
    el('refreshHistory').disabled=true;
    el('recordsContainer').innerHTML='<div class="empty-state">正在讀取巡檢紀錄…</div>';
    el('loadMore').hidden=true;
    google.script.run.withSuccessHandler(result=>{
      if(token!==request)return;
      el('refreshHistory').disabled=false;
      if(!result?.success){fail(result?.message||'無法取得巡檢紀錄');return;}
      records=(result.records||[]).map(H.normalizeRecord);
      groups=H.group(records);loaded=true;shown=14;
      updateSummary();render();
    }).withFailureHandler(error=>{if(token!==request)return;el('refreshHistory').disabled=false;fail(error.message);}).getRecordsForBoss();
  }
  function fail(message) {
    loaded=false;
    ['abnormalCount','pWaterCount','missingCount'].forEach(id=>el(id).textContent='—');
    el('recordsContainer').replaceChildren();
    const box=document.createElement('div');box.className='empty-state';box.textContent='無法讀取紀錄：'+message;
    el('recordsContainer').append(box);
  }
  function updateSummary() {
    const summary=H.summarize(records);
    el('abnormalCount').textContent=summary.abnormalCount;
    el('pWaterCount').textContent=summary.pWaterCount;
    el('missingCount').textContent=summary.missingCount;
    el('weekRange').textContent='已載入 '+records.length+' 筆巡檢紀錄。本週 '+summary.weekStart+' 至 '+summary.today+'；只計算已過截止時間的時段，同時段多筆只算完成一次。';
  }
  function matches(r,status) {
    if(status==='ISSUE')return H.abnormal(r)||H.pWater(r);
    if(status==='VALVE')return r.doValveClean==='是';
    if(status==='REFILLED')return H.refilled(r);
    return true;
  }
  function render() {
    if(!loaded)return;
    mediaItems=[];
    const date=el('filterDate').value,shift=el('filterShift').value,status=el('filterStatus').value;
    const dates=new Set(groups.keys()),summary=H.summarize(records);
    if(status==='ALL'&&!date) {
      summary.missing.forEach(x=>dates.add(x.date));
      dates.add(summary.today);
    }
    if(date)dates.add(date);
    const filteredDays=[...dates].filter(d=>!date||date===d).filter(d=>{
      if(status==='ALL')return true;
      return (groups.get(d)||[]).some(r=>(shift==='ALL'||r.shift===shift)&&matches(r,status));
    }).sort().reverse();
    el('recordsContainer').innerHTML=filteredDays.slice(0,shown).map(day=>{
      const label=new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',month:'numeric',day:'numeric',weekday:'short'}).format(new Date(day+'T12:00:00+08:00'));
      const dayShifts=[...H.shifts,...new Set((groups.get(day)||[]).map(r=>r.shift).filter(s=>!H.shifts.includes(s)))];
      const slots=dayShifts.filter(s=>shift==='ALL'||s===shift).map(s=>{
        const rows=(groups.get(day)||[]).filter(r=>r.shift===s);
        const visible=rows.filter(r=>matches(r,status));
        if(status!=='ALL'&&!visible.length)return '';
        const complete=rows.length>0,late=H.expired(day,s);
        const text=complete?(rows.length>1?rows.length+' 筆紀錄 · 點開查看':'已巡檢 · 點開查看'):late?'已過截止時間，尚無紀錄':'尚無紀錄';
        return '<details class="slot '+(complete?'complete':late?'overdue':'')+'" data-day="'+day+'" data-shift="'+escape(s)+'"><summary><span><span class="slot-name">'+escape(s)+'</span><span class="slot-sub">'+text+'</span>'+(rows.some(r=>r.doValveClean==='是')?'<span class="valve-note">逆止閥清潔紀錄</span>':'')+'</span><span class="slot-check" aria-label="'+(complete?'已有巡檢紀錄':'尚無巡檢紀錄')+'">'+(complete?'✓':'')+'</span></summary><div class="slot-body"></div></details>';
      }).join('');
      return '<section class="day-card"><h2><time datetime="'+day+'">'+day.slice(0,4)+' / '+escape(label)+'</time></h2>'+slots+'</section>';
    }).join('')||'<div class="empty-state">目前沒有符合條件的巡檢紀錄。</div>';
    el('loadMore').hidden=filteredDays.length<=shown;
    el('recordsContainer').querySelectorAll('details').forEach(details=>{
      details.addEventListener('toggle',()=>{
        if(!details.open||details.dataset.loaded)return;
        details.dataset.loaded='true';
        const rows=(groups.get(details.dataset.day)||[]).filter(r=>r.shift===details.dataset.shift&&matches(r,status));
        details.querySelector('.slot-body').innerHTML=rows.length?rows.map(renderRecord).join(''):'<p class="history-message">這個時段尚無巡檢紀錄。</p>';
        details.querySelectorAll('[data-media]').forEach(button=>button.addEventListener('click',()=>openMedia(mediaItems[Number(button.dataset.media)])));
        details.querySelectorAll('img').forEach(image=>image.addEventListener('error',()=>{
          image.hidden=true;image.parentElement.classList.add('thumbnail-unavailable');
          const note=document.createElement('span');note.textContent='縮圖尚未就緒，點此開啟檔案';image.parentElement.append(note);
        },{once:true}));
      });
    });
  }
  function renderRecord(r) {
    const fields=[['馬達異音',r.noise],['漏水檢查',r.leak],['加藥管膨脹',r.pipe],['桶內水位消耗',r.waterLevel],['加藥劑流數',r.chemicalFlowRate],['藥劑剩餘量',r.remainingAmount],['補 P 水警示',r.pWaterAlert],['補 P 水確認',r.pWaterRefilled||'未補水']];
    const media=[['藥劑剩餘量',r.remainingPhoto],['異常部位',r.abnormalPhoto],['逆止閥1 · 清潔前',r.v1BeforePhoto],['逆止閥1 · 清潔後',r.v1AfterPhoto],['逆止閥2 · 清潔前',r.v2BeforePhoto],['逆止閥2 · 清潔後',r.v2AfterPhoto],['人員簽名',r.signaturePhoto]].flatMap(([label,raw])=>H.media(raw,label));
    return '<article class="inspection-detail"><h3>巡檢時間 '+escape(r.time)+' · '+escape(r.timeStatus)+'</h3><dl class="record-fields">'+fields.map(([label,value])=>'<div class="'+(/異常|需補/.test(value||'')?'bad':'')+'"><dt>'+label+'</dt><dd>'+escape(value||'未填寫')+'</dd></div>').join('')+'</dl>'+(r.notes?'<p class="record-note">備註：'+escape(r.notes)+'</p>':'')+'<div class="media-grid">'+media.map(item=>{
      const index=mediaItems.push(item)-1;
      return '<button type="button" class="media-button" data-media="'+index+'" aria-label="'+escape((item.isVideo?'播放影片：':'放大照片：')+item.label)+'"><img loading="lazy" decoding="async" src="'+escape(item.thumbnail)+'" alt="'+escape(item.label)+'">'+(item.isVideo?'<span class="play-badge" aria-hidden="true">▶</span>':'')+'<span>'+escape(item.label)+(item.isVideo?' · 影片':'')+'</span></button>';
    }).join('')+'</div></article>';
  }
  function openMedia(item) {
    if(!item)return;
    const container=el('mediaContent');container.replaceChildren();el('originalMedia').href=item.url;
    if(item.isVideo){const video=document.createElement('iframe');video.src=item.preview;video.title=item.label;video.allow='autoplay; fullscreen';video.allowFullscreen=true;container.append(video);}
    else {const image=document.createElement('img');image.src=item.large;image.alt=item.label;image.addEventListener('error',()=>{image.replaceWith(Object.assign(document.createElement('p'),{textContent:'Google Drive 尚未提供預覽，請點上方連結查看原始檔案。'}));},{once:true});container.append(image);}
    el('mediaDialog').showModal();
  }
  el('closeMedia').addEventListener('click',()=>el('mediaDialog').close());
  el('mediaDialog').addEventListener('close',()=>el('mediaContent').replaceChildren());
  ['filterDate','filterShift','filterStatus'].forEach(id=>el(id).addEventListener('change',()=>{shown=14;render();}));
  el('clearFilters').addEventListener('click',()=>{el('filterDate').value='';el('filterShift').value='ALL';el('filterStatus').value='ALL';shown=14;render();});
  el('refreshHistory').addEventListener('click',load);
  el('loadMore').addEventListener('click',()=>{shown+=14;render();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&loaded)updateSummary();});
  load();
})();
