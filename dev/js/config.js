// 全域設定與常數
const CONFIG = {
  // Google Sheets 的 ID
  SHEET_ID: '1dtqdnPgVUWuCY-GmKwqK-ZYXXRCURIumiUAB2DFHoug',
  
  // Apps Script 部署後的 Web App URL (用於查詢系統 API)
  API_URL: 'https://script.google.com/macros/s/AKfycbxnqTcJtVUrw0VKsofP0pHw1aPk9ifqfQu6_kWmPLCspDhepOWvYRouhWXjpiP5Zbx8/exec',

  // 工作表名稱
  SHEETS: {
    ANNOUNCEMENT: '公告',
    ANNOUNCEMENTS: '公告',
    ALBUM: '相簿',
    GALLERY: '相簿',
    CAROUSEL: '輪播',
    INFO: '常用資訊',
    QUICK_LINKS: '常用資訊'
  },
  TICKER_INTERVAL: 4000,

  // 科目顯示名稱對照表（試算表欄位建議統一為「自然」，系統將依年級自動在網頁顯示分科備註）
  SUBJECT_DISPLAY_MAP: {
    '七': { '自然': '自然(生物)' },
    '八': { '自然': '自然(理化)' },
    '九': { '自然': '自然(理化/地科)' }
  }
};
