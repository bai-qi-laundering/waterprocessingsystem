/* Apps Script iframe bridge: no no-cors writes or automatic upload retries. */
(() => {
  if (window.google?.script?.run) return;
  const pending = new Map();
  const channel = crypto.randomUUID();
  let peer = null, peerOrigin = null, frame, readyResolve, readyReject;
  const ready = new Promise((resolve,reject) => { readyResolve=resolve; readyReject=reject; });
  // A missing bridge is reported to the UI, not treated as an empty history.
  ready.catch(() => {});
  function status(text, bad=false) {
    const el=document.getElementById("connectionStatus");
    if(el){el.textContent=text;el.classList.toggle("connection-error",bad);}
  }
  window.addEventListener("message",event => {
    const data=event.data;
    if (!data || data.channel!==channel || !/^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(event.origin)) return;
    if(data.type==="water-ready" && !peer){
      peer=event.source;peerOrigin=event.origin;clearTimeout(connectTimer);
      status("已連接巡檢資料");readyResolve();return;
    }
    if(event.source!==peer || event.origin!==peerOrigin || data.type!=="water-response") return;
    const task=pending.get(data.id);if(!task)return;
    clearTimeout(task.timer);pending.delete(data.id);
    if(data.error)task.reject(new Error(data.error));else task.resolve(data.result);
  });
  const connectTimer=setTimeout(() => {
    const error=new Error("尚未連接巡檢資料。請確認 Apps Script 已更新 Code.gs 並部署新版本，再重新整理。");
    status(error.message,true);readyReject(error);
  },60000);
  function mount(){
    frame=document.createElement("iframe");frame.hidden=true;frame.title="巡檢資料連線";
    const url=new URL(window.WATER_CONFIG.backendUrl);
    url.searchParams.set("page","bridge");url.searchParams.set("channel",channel);
    frame.src=url.href;document.body.appendChild(frame);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
  async function call(method,args){
    await ready;
    const id=crypto.randomUUID();
    return new Promise((resolve,reject) => {
      const timer=setTimeout(() => {pending.delete(id);reject(new Error(
        method==="submitInspection" ? "未收到儲存結果，請先到歷史紀錄確認是否已儲存，再決定是否重送。" : "連線逾時，請重新整理後再試。"
      ));},360000);
      pending.set(id,{resolve,reject,timer});
      peer.postMessage({type:"water-request",channel,id,method,args},peerOrigin);
    });
  }
  function runner(success,failure){
    return new Proxy({}, {get(_,name){
      if(name==="withSuccessHandler")return fn=>runner(fn,failure);
      if(name==="withFailureHandler")return fn=>runner(success,fn);
      if(!["getRecordsForBoss","getHistoryData","uploadValveMediaFile","submitInspection"].includes(name))return undefined;
      return (...args)=>call(name,args).then(value=>{if(success)success(value);},error=>{if(failure)failure(error);else console.error(error);});
    }});
  }
  window.google={script:{run:runner()}};
})();

