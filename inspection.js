function refreshLastInspection() {
  const label = document.getElementById("lastInspectionTime");
  label.textContent = "讀取中…";
  google.script.run.withSuccessHandler(res => {
    if (!res || !res.success) { label.textContent = "讀取失敗，請重新整理"; return; }
    const rows = (res.records || []).slice().sort((a,b) => (b.date+" "+b.time).localeCompare(a.date+" "+a.time));
    label.textContent = rows.length ? rows[0].date+" "+rows[0].time+"（"+rows[0].shift+"）" : "尚無巡檢紀錄";
  }).withFailureHandler(() => { label.textContent = "尚未連接新版後端"; }).getRecordsForBoss();
}
window.addEventListener("load", refreshLastInspection);

