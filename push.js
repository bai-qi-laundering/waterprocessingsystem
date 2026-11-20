(() => {
 const button=document.getElementById('enablePush'),status=document.getElementById('pushStatus');
 if(!button||!status)return;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 if(ios&&!window.matchMedia('(display-mode: standalone)').matches&&!navigator.standalone){
   status.textContent='iPhone：請先從 Safari 分享選單加入主畫面，再從桌面圖示開啟通知。';return;
 }
 let ready=false;
 const timer=setTimeout(()=>{if(!ready)status.textContent='通知服務尚未就緒，請檢查網路後重新開啟。';},20000);
 window.OneSignalDeferred=window.OneSignalDeferred||[];
 window.OneSignalDeferred.push(async OneSignal=>{
  try{
   await OneSignal.init({
    appId:'a962be88-0128-4ce0-b058-c4b801424686',
    safari_web_id:'web.onesignal.auto.26f438e4-4907-4b0f-9fba-4ab15d3b5c3b',
    serviceWorkerPath:'/waterprocessingsystem/OneSignalSDKWorker.js',
    serviceWorkerParam:{scope:'/waterprocessingsystem/'},
    notifyButton:{enable:false},
    promptOptions:{slidedown:{prompts:[{type:'push',autoPrompt:false}]}}
   });
   ready=true;clearTimeout(timer);
   function update(){
    const subscribed=OneSignal.User.PushSubscription.optedIn;
    button.disabled=false;
    button.textContent=subscribed?'重新確認通知狀態':'開啟手機通知';
    status.textContent=subscribed?'此裝置已訂閱通知。自動巡檢提醒仍待後端發送設定完成。':'按下按鈕並允許通知，即可訂閱此裝置。';
   }
   button.addEventListener('click',async()=>{
    try{await OneSignal.User.PushSubscription.optIn();update();}
    catch(error){status.textContent='無法開啟通知，請確認手機的通知權限設定。';}
   });
   OneSignal.User.PushSubscription.addEventListener('change',update);
   update();
  }catch(error){clearTimeout(timer);status.textContent='通知設定尚未完成，請確認 OneSignal 網站網址設定後再試。';}
 });
})();
