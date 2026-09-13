import re

# 1. Fix query_dev.js (Chart keys & Memo logic & Prev/Next rank)
with open('js/query_dev.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Chart keys fix
bad_chart_key = """            if (isAvg) {
                distSchool = currentExamData.schoolDistributionAvg ? currentExamData.schoolDistributionAvg.interval : {};
                distClass = currentExamData.classDistributionAvg ? currentExamData.classDistributionAvg.interval : {};
            } else {
                distSchool = currentExamData.schoolDistribution ? currentExamData.schoolDistribution[subj] : {};
                distClass = currentExamData.classDistribution ? currentExamData.classDistribution[subj] : {};
            }"""
good_chart_key = """            if (isAvg) {
                distSchool = currentExamData.schoolDistributionAvg ? currentExamData.schoolDistributionAvg.interval : {};
                distClass = currentExamData.distribution ? currentExamData.distribution["personalAverage"] : {};
            } else {
                distSchool = currentExamData.schoolDistribution ? currentExamData.schoolDistribution[subj] : {};
                distClass = currentExamData.distribution ? currentExamData.distribution[subj] : {};
            }"""
js = js.replace(bad_chart_key, good_chart_key)

# Memo JS fix (replace the textContent logic with input logic)
bad_memo_js = """        // 渲染備忘錄
        const memoDiv = document.getElementById('memoText');
        if (memoDiv) {
            memoDiv.textContent = currentStudent.memo ? currentStudent.memo : '目前沒有備忘錄。';
        }"""
good_memo_js = """        // 渲染備忘錄
        const memoInput = document.getElementById('memoInput');
        if (memoInput) {
            memoInput.value = currentStudent.memo || '';
        }"""
js = js.replace(bad_memo_js, good_memo_js)

# Add event listener for memo button if not exists
memo_listener = """    // 儲存備忘錄
    const saveMemoBtn = document.getElementById('saveMemoBtn');
    if (saveMemoBtn && !saveMemoBtn.hasAttribute('data-bound')) {
        saveMemoBtn.setAttribute('data-bound', 'true');
        saveMemoBtn.addEventListener('click', async () => {
            const btn = document.getElementById('saveMemoBtn');
            const text = document.getElementById('memoBtnText');
            btn.disabled = true;
            text.textContent = '儲存中...';
            try {
                // We grab idNumber directly from the input since it's still in the DOM
                const idNumber = document.getElementById('idNumber').value;
                const response = await fetch(CONFIG.API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'saveMemo',
                        seatNo: currentStudent.seatNo,
                        idNumber: idNumber,
                        memoText: document.getElementById('memoInput').value
                    })
                });
                const res = await response.json();
                if (res.status === 'success') {
                    text.textContent = '儲存成功！';
                    setTimeout(() => { text.textContent = '儲存備忘錄'; btn.disabled = false; }, 2000);
                } else {
                    alert('儲存失敗：' + res.message);
                    text.textContent = '儲存備忘錄'; btn.disabled = false;
                }
            } catch (e) {
                alert('儲存失敗，請檢查網路');
                text.textContent = '儲存備忘錄'; btn.disabled = false;
            }
        });
    }"""
js = js.replace("    // === Render Dashboard ===", memo_listener + "\n\n    // === Render Dashboard ===")

# Fix Rank display to include Prev/Next
bad_rank_js = """        const lpRank = currentStudent.rank || '-';
        const totalStudents = currentStudent.totalStudents || '-';
        document.getElementById('lpRank').textContent = `${lpRank} / ${totalStudents}`;"""
good_rank_js = """        const lpRank = currentStudent.rank || '-';
        const totalStudents = currentStudent.totalStudents || '-';
        document.getElementById('lpRank').textContent = `${lpRank} / ${totalStudents}`;
        const lpPrev = currentStudent.prevScore || '-';
        const lpNext = currentStudent.nextScore || '-';
        const prevEl = document.getElementById('lpPrev');
        const nextEl = document.getElementById('lpNext');
        if(prevEl) prevEl.textContent = lpPrev;
        if(nextEl) nextEl.textContent = lpNext;"""
js = js.replace(bad_rank_js, good_rank_js)


# Fix chart width and layout in JS
bad_chart_html_js = """                    chartHtml = `
                        <div class="flex items-end gap-[2px] h-20 pt-6 pb-4 w-full max-w-[250px] border-b border-gray-200">
                            ${barsHtml}
                        </div>
                    `;"""
good_chart_html_js = """                    chartHtml = `
                        <div class="flex items-end gap-1 md:gap-1.5 h-20 pt-6 pb-4 w-full min-w-[300px] border-b border-gray-200 overflow-x-auto scrollbar-hide pr-2">
                            ${barsHtml}
                        </div>
                    `;"""
js = js.replace(bad_chart_html_js, good_chart_html_js)

with open('js/query_dev.js', 'w', encoding='utf-8') as f:
    f.write(js)

# 2. Fix query_dev.html (Chart width & Memo HTML & Prev/Next rank)
with open('query_dev.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace memo block
bad_memo_html = """            <div id="memoText" class="border border-gray-200 rounded-lg bg-white/50 p-4 text-gray-700 text-sm flex-grow whitespace-pre-wrap">
                目前沒有備忘錄。
            </div>"""
good_memo_html = """            <div class="flex-grow flex flex-col gap-2">
                <textarea id="memoInput" class="w-full flex-grow border border-gray-200 rounded-lg bg-white/50 p-4 text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="在此輸入備忘錄或本週目標..."></textarea>
                <div class="flex justify-end">
                    <button id="saveMemoBtn" class="bg-[#5c6bc0] hover:bg-[#49559c] text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition">
                        <span id="memoBtnText">儲存備忘錄</span>
                    </button>
                </div>
            </div>"""
html = html.replace(bad_memo_html, good_memo_html)

# Add Prev/Next back
bad_rank_html = """                  <div class="flex flex-col justify-center">
                  <div class="text-emerald-800 text-sm font-bold mb-1">班級排名</div>
                  <div class="flex items-end gap-3 mb-1">
                      <div class="text-3xl md:text-4xl font-black text-gray-800 font-inter"><span id="lpRank">-</span></div>
                  </div>
                  
              </div>"""
good_rank_html = """                  <div class="flex flex-col justify-center">
                  <div class="text-emerald-800 text-sm font-bold mb-1">班級排名</div>
                  <div class="flex items-end gap-3 mb-1">
                      <div class="text-3xl md:text-4xl font-black text-gray-800 font-inter"><span id="lpRank">-</span></div>
                  </div>
                  <div class="flex gap-2 text-[10px] mt-1">
                      <span class="bg-white/80 px-1.5 py-0.5 rounded border border-emerald-100 text-gray-600">前一: <b class="text-gray-800" id="lpPrev">-</b></span>
                      <span class="bg-white/80 px-1.5 py-0.5 rounded border border-rose-100 text-gray-600">後一: <b class="text-rose-600" id="lpNext">-</b></span>
                  </div>
              </div>"""
html = html.replace(bad_rank_html, good_rank_html)

# Increment cache buster
html = html.replace('?v=13', '?v=14')

with open('query_dev.html', 'w', encoding='utf-8') as f:
    f.write(html)

