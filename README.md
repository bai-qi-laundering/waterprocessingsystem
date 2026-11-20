# 百麒水處理巡檢

前端：GitHub Pages。後端：原 Apps Script 專案。資料與圖庫仍在原 Google 試算表及 Google Drive。

## 功能

- 巡檢首頁顯示上次巡檢時間，右上方進入歷史紀錄。
- 每天一張卡片，06:00、12:00、17:00、收尾四時段。
- 勾選由實際紀錄自動判定；同時段多筆皆保留。
- 逆止閥清潔紀錄顯示紅字；展開才讀取明細與 Drive 縮圖。
- 照片放大、Drive 影片預覽播放；未就緒的預覽可開啟原檔。
- 異常通報、需補 P 水警示為歷史紀錄筆數；本週遺漏只計已過截止時間的時段。

## 連接

`config.js` 設定原 Apps Script `/exec` 網址。後端必須使用已提供的新版 `Code.gs`，執行初始化後，在管理部署選擇「新版本」更新原部署。僅儲存程式不會更新正式網址。

新版後端內建 `?page=bridge` 連接介面，不需另建 Bridge.html。連接訊息只接受設定的 GitHub Pages origin 和本次連線識別碼。

前端無通知服務金鑰。手機推播尚需獨立完成轉送服務及手機綁定；本次前端發布不代表推播啟用。

## 部署

在儲存庫 Settings → Pages，Build and deployment 的 Source 選 GitHub Actions。`.github/workflows/pages.yml` 會先檢查語法與日期統計，再部署指定的前端檔案。

## 檢查

執行 `node scripts/check.cjs`，無外部套件。
