// ======================================================
//  首頁邏輯
// ======================================================

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadTicker(),
    loadCarousel(),
    loadQuickLinks(),
    loadRecentAnnouncements(),
  ]);
});

// ── 公告跑馬燈 ──
let tickerIndex = 0;
let tickerData = [];
let tickerTimer = null;

async function loadTicker() {
  tickerData = await fetchSheetData(CONFIG.SHEETS.ANNOUNCEMENTS);
  if (!tickerData.length) return;
  renderTicker();
  tickerTimer = setInterval(() => moveTicker(1), CONFIG.TICKER_INTERVAL);
}

function renderTicker() {
  const track = document.getElementById('ticker-track');
  const itemH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ticker-h')) || 38;
  if (!track) return;
  track.innerHTML = tickerData.slice(0, CONFIG.TICKER_COUNT).map(row => {
    const tagClass = row['重要程度'] === '緊急' ? 'tag-urgent' : row['重要程度'] === '資訊' ? 'tag-info' : 'tag-normal';
    const label = row['重要程度'] || '公告';
    return `<div class="ticker-item" onclick="location.href='announcement.html'">
      <span class="tag ${tagClass}">${label}</span>
      <span>${row['標題'] || ''}</span>
    </div>`;
  }).join('');
}

function moveTicker(dir) {
  const data = tickerData.slice(0, CONFIG.TICKER_COUNT);
  if (!data.length) return;
  tickerIndex = (tickerIndex + dir + data.length) % data.length;
  const itemH = 38;
  const track = document.getElementById('ticker-track');
  if (track) track.style.transform = `translateY(-${tickerIndex * itemH}px)`;
}

window.tickerUp   = () => { clearInterval(tickerTimer); moveTicker(-1); tickerTimer = setInterval(() => moveTicker(1), CONFIG.TICKER_INTERVAL); };
window.tickerDown = () => { clearInterval(tickerTimer); moveTicker(1);  tickerTimer = setInterval(() => moveTicker(1), CONFIG.TICKER_INTERVAL); };

// ── 輪播 ──
let slideIndex = 0;
let slideData = [];
let slideTimer = null;

async function loadCarousel() {
  slideData = await fetchSheetData(CONFIG.SHEETS.CAROUSEL);
  const container = document.getElementById('hero-carousel');
  if (!container) return;

  if (!slideData.length) {
    // 預設佔位幻燈片
    slideData = [{ '圖片連結': '', '標題': CONFIG.CLASS_NAME, '說明文字': '歡迎來到班級網站！', '連結目標': '' }];
  }

  const slidesEl = document.getElementById('hero-slides');
  if (!slidesEl) return;

  slidesEl.innerHTML = slideData.map(row => {
    const bg = row['圖片連結'] ? `background-image:url('${row['圖片連結']}')` : '';
    const link = row['連結目標'] ? `<a class="hero-btn" href="${row['連結目標']}" target="_blank">查看更多 →</a>` : '';
    return `<div class="hero-slide" style="${bg}">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <h2>${row['標題'] || ''}</h2>
        <p>${row['說明文字'] || ''}</p>
        ${link}
      </div>
    </div>`;
  }).join('');

  renderDots();
  slideTimer = setInterval(() => moveSlide(1), CONFIG.CAROUSEL_INTERVAL);
}

function renderDots() {
  const dotsEl = document.getElementById('hero-dots');
  if (!dotsEl) return;
  dotsEl.innerHTML = slideData.map((_, i) =>
    `<button class="hero-dot ${i === 0 ? 'active' : ''}" onclick="goSlide(${i})"></button>`
  ).join('');
}

function moveSlide(dir) {
  slideIndex = (slideIndex + dir + slideData.length) % slideData.length;
  applySlide();
}

function goSlide(i) {
  slideIndex = i;
  clearInterval(slideTimer);
  slideTimer = setInterval(() => moveSlide(1), CONFIG.CAROUSEL_INTERVAL);
  applySlide();
}

function applySlide() {
  const slidesEl = document.getElementById('hero-slides');
  if (slidesEl) slidesEl.style.transform = `translateX(-${slideIndex * 100}%)`;
  document.querySelectorAll('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === slideIndex));
}

window.prevSlide = () => { clearInterval(slideTimer); moveSlide(-1); slideTimer = setInterval(() => moveSlide(1), CONFIG.CAROUSEL_INTERVAL); };
window.nextSlide = () => { clearInterval(slideTimer); moveSlide(1);  slideTimer = setInterval(() => moveSlide(1), CONFIG.CAROUSEL_INTERVAL); };
window.goSlide = goSlide;

// ── 常用資訊 ──
async function loadQuickLinks() {
  const data = await fetchSheetData(CONFIG.SHEETS.QUICK_LINKS);
  const bar = document.getElementById('quick-links-bar');
  if (!bar) return;
  if (!data.length) { bar.style.display = 'none'; return; }
  bar.innerHTML = data.map(row => {
    const icon = row['圖示'] || '🔗';
    const url  = row['連結'] || '#';
    return `<a class="quick-link-item" href="${url}" target="_blank">${icon} ${row['名稱'] || ''}</a>`;
  }).join('');
}

// ── 最新公告（首頁顯示3則）──
async function loadRecentAnnouncements() {
  const data = await fetchSheetData(CONFIG.SHEETS.ANNOUNCEMENTS);
  const container = document.getElementById('recent-announcements');
  if (!container) return;
  if (!data.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>目前沒有公告</p></div>';
    return;
  }
  container.innerHTML = data.slice(0, 3).map(row => {
    const tagClass = row['重要程度'] === '緊急' ? 'tag-urgent' : row['重要程度'] === '資訊' ? 'tag-info' : 'tag-normal';
    return `<div class="card">
      <div class="card-header">
        <span class="tag ${tagClass}">${row['重要程度'] || '公告'}</span>
        <span class="card-date">${row['日期'] || ''}</span>
      </div>
      <div class="card-title">${row['標題'] || ''}</div>
    </div>`;
  }).join('');
}
