// ======================================================
//  Google 試算表讀取工具
// ======================================================

async function fetchSheetData(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&headers=1`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
    if (!match) throw new Error('無法解析試算表資料');
    const json = JSON.parse(match[1]);
    if (json.status === 'error') throw new Error('試算表存取失敗，請確認已設為公開');
    return parseSheetRows(json.table);
  } catch (e) {
    console.warn(`讀取「${sheetName}」失敗：`, e.message);
    return [];
  }
}

function parseSheetRows(table) {
  if (!table || !table.rows) return [];
  const cols = table.cols.map(c => c.label || '');
  return table.rows
    .map(row => {
      const obj = {};
      (row.c || []).forEach((cell, i) => {
        const key = cols[i] || `col${i}`;
        obj[key] = cell ? (cell.f || cell.v || '') : '';
      });
      return obj;
    })
    .filter(row => Object.values(row).some(v => String(v).trim() !== ''));
}
