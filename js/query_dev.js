document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    
    // === State ===
    let currentStudent = null;
    let currentExamData = null;
    let chartMode = 'class'; // 'class' or 'school'

    // === Navigation ===
    window.navTo = function(viewId) {
        ['login', 'dashboard', 'exam', 'life'].forEach(id => {
            document.getElementById('view-' + id).classList.add('dev-hidden');
        });
        document.getElementById('view-' + viewId).classList.remove('dev-hidden');
    };

    // === Login Logic ===
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const seatNo = document.getElementById('seatNo').value.trim();
        const idNumber = document.getElementById('idNumber').value.trim();
        
        if (!seatNo || !idNumber) return;
        
        loginBtn.disabled = true;
        loginBtn.innerHTML = '登入中...';
        loginError.classList.add('dev-hidden');

        try {
            const response = await fetch(CONFIG.scriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'getStudentData',
                    seatNo: seatNo,
                    idNumber: idNumber
                })
            });

            const data = await response.json();
            
            if (data.status !== 'success') {
                throw new Error(data.message || '登入失敗，請檢查資料');
            }

            currentStudent = data;
            
            // Handle Feature Toggles
            const btnLife = document.getElementById('btn-life');
            const btnExam = document.getElementById('btn-exam');
            if (btnLife) btnLife.style.display = currentStudent.showLifePoints === false ? 'none' : 'flex';
            if (btnExam) btnExam.style.display = (currentStudent.showMajorExam === false || !currentStudent.availableExams || currentStudent.availableExams.length === 0) ? 'none' : 'flex';

            renderDashboard();
            navTo('dashboard');
            
        } catch (err) {
            loginError.textContent = err.message;
            loginError.classList.remove('dev-hidden');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '登入查詢';
        }
    });

    // === Render Dashboard ===
    function renderDashboard() {
        document.getElementById('studentName').textContent = currentStudent.name || '';
        document.getElementById('studentClass').textContent = currentStudent.className || '';
        document.getElementById('studentSeatNo').textContent = currentStudent.seatNo || '';

        // Setup Exam Select
        const examSelector = document.getElementById('examSelector');
        if (currentStudent.availableExams && currentStudent.availableExams.length > 0) {
            let options = '';
            currentStudent.availableExams.forEach(exam => {
                options += `<option value="${exam.examId}">${exam.examName}</option>`;
            });
            examSelector.innerHTML = options;
            examSelector.onchange = (e) => {
                const eid = e.target.value;
                const match = currentStudent.availableExams.find(x => x.examId === eid);
                if (match) {
                    currentExamData = match;
                    renderExamContent();
                }
            };
            currentExamData = currentStudent.availableExams[0];
            renderExamContent();
        }

        // Setup Chart Toggles
        document.getElementById('toggleChartClass').onclick = () => {
            chartMode = 'class';
            updateChartToggleUI();
            renderExamContent();
        };
        document.getElementById('toggleChartSchool').onclick = () => {
            chartMode = 'school';
            updateChartToggleUI();
            renderExamContent();
        };

        // Life Points
        renderLifePoints();
    }

    function updateChartToggleUI() {
        const btnC = document.getElementById('toggleChartClass');
        const btnS = document.getElementById('toggleChartSchool');
        if (chartMode === 'class') {
            btnC.className = "px-3 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-gray-800";
            btnS.className = "px-3 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-gray-800 bg-transparent";
            document.getElementById('chartTypeLabel').textContent = '班級';
            document.getElementById('avgHeaderTitle').textContent = '班平';
        } else {
            btnS.className = "px-3 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-gray-800";
            btnC.className = "px-3 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-gray-800 bg-transparent";
            document.getElementById('chartTypeLabel').textContent = '全校';
            document.getElementById('avgHeaderTitle').textContent = '校平';
        }
    }

    function formatScore(score) {
        if (score === undefined || score === null || score === '' || isNaN(score)) return '-';
        return Math.round(score * 100) / 100;
    }

    function renderExamContent() {
        if (!currentExamData) return;
        
        const summary = currentExamData.summary || {};
        document.getElementById('cardRank').textContent = summary.classRank || '-';
        document.getElementById('cardSchoolRank').textContent = summary.schoolRank || '-';
        document.getElementById('cardAvg').textContent = formatScore(summary.average);
        document.getElementById('cardTotal').textContent = formatScore(summary.totalScore);

        const tbody = document.getElementById('examTableBody');
        let html = '';

        const avgRow = currentExamData.subjects.find(s => s.subject === '總平均');
        if (avgRow) html += generateTableRow(avgRow, true);

        currentExamData.subjects.forEach(subj => {
            if (subj.subject !== '總平均') html += generateTableRow(subj, false);
        });

        tbody.innerHTML = html;
    }

    function generateTableRow(subj, isTotal) {
        const score = formatScore(subj.score);
        const avgScore = chartMode === 'class' ? formatScore(subj.classAverage) : formatScore(subj.schoolAverage);
        
        let rowClass = isTotal ? 'bg-orange-50/40' : 'hover:bg-gray-50/80 transition-colors';
        let subjClass = isTotal ? 'p-3 font-black text-gray-800' : 'p-3 font-bold text-gray-700';
        let scoreClass = isTotal ? 'p-3 text-center font-black text-[#c2516a] text-lg' : 'p-3 text-center font-bold text-[#c2516a]';
        let avgClass = isTotal ? 'p-3 text-center font-bold text-gray-600' : 'p-3 text-center font-bold text-gray-600';

        const distData = chartMode === 'class' ? subj.classDistribution : subj.schoolDistribution;
        let chartHtml = '<div class="text-xs text-gray-400">無資料</div>';
        
        if (distData && distData.length > 0) {
            const maxCount = Math.max(...distData);
            const numBins = distData.length; // Can be 10 or 19 depending on setting
            
            let barsHtml = '';
            for(let i=0; i<numBins; i++) {
                const count = distData[i] || 0;
                let pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                if (pct < 10 && pct > 0) pct = 10;
                
                // Estimate which bin the student falls into
                let isMyBin = false;
                const rawScore = Number(subj.score);
                if (!isNaN(rawScore)) {
                    // For 10 bins: width is 10 (100-90, 89-80, etc.)
                    // For 19 bins: maybe different logic? Standard formula:
                    // Bin size = 100 / numBins
                    // Since it depends on backend, we can approximate:
                    const binSize = 100 / numBins;
                    const expectedBinIndex = Math.floor((100 - rawScore) / binSize);
                    if (expectedBinIndex === i || (rawScore === 100 && i === 0)) {
                        isMyBin = true;
                    }
                }

                // Inline styles guarantee it works without Tailwind JIT
                const bgColor = isMyBin ? (chartMode === 'class' ? '#c2516a' : '#5c6bc0') : (count > 0 ? '#cbd5e1' : '#f1f5f9');
                const height = count > 0 ? `${pct}%` : '2px';
                
                barsHtml += `
                    <div class="flex-1 rounded-t-sm relative group flex items-end justify-center h-full" style="min-height:2px;">
                        <div class="w-full rounded-t-sm transition-all" style="height: ${height}; background-color: ${bgColor}; min-height: 2px;"></div>
                        <div class="absolute -top-5 text-[10px] whitespace-nowrap z-10 ${isMyBin ? 'block font-bold' : 'hidden group-hover:block text-gray-500'}" style="color: ${isMyBin ? bgColor : ''}">${count}</div>
                    </div>
                `;
            }

            chartHtml = `
                <div class="flex items-end gap-[1px] h-8 pt-4 w-full max-w-[200px]">
                    ${barsHtml}
                </div>
            `;
        }

        return `
            <tr class="${rowClass}">
                <td class="${subjClass}">${subj.subject}</td>
                <td class="${scoreClass}">${score}</td>
                <td class="${avgClass}">${avgScore}</td>
                <td class="p-3 align-middle">${chartHtml}</td>
            </tr>
        `;
    }

    function renderLifePoints() {
        const initPts = currentStudent.initialLifePoints || 0;
        document.getElementById('initialPoints').textContent = initPts;
        
        const lpData = currentStudent.grades['生活計點'] || {};
        let total = initPts;
        
        document.getElementById('totalLifePoints').textContent = total;

        const summary = currentStudent.lifePointsSummary;
        document.getElementById('lpRank').textContent = summary && summary.rank ? summary.rank : '-';
        document.getElementById('lpPrev').textContent = summary && summary.prevScore !== undefined ? summary.prevScore : '-';
        document.getElementById('lpNext').textContent = summary && summary.nextScore !== undefined ? summary.nextScore : '-';

        let html = '';
        const sortedWeeks = Object.keys(lpData).sort((a,b) => b - a);

        sortedWeeks.forEach(week => {
            const weekData = lpData[week];
            
            // Group records by Date inside this week
            const dailyGroups = {};
            weekData.records.forEach(rec => {
                total += rec.points;
                if(!dailyGroups[rec.date]) dailyGroups[rec.date] = [];
                dailyGroups[rec.date].push(rec);
            });
            document.getElementById('totalLifePoints').textContent = total; // update total

            const sortedDates = Object.keys(dailyGroups).sort((a,b) => new Date(b) - new Date(a));
            
            let dailyHtml = '';
            sortedDates.forEach(dateStr => {
                dailyHtml += `
                    <div class="bg-gray-100/50 px-4 py-2 border-y border-gray-100 font-bold text-gray-600 text-xs">
                        📅 ${dateStr}
                    </div>
                    <table class="w-full text-left text-sm">
                        <tbody class="divide-y divide-gray-50">
                `;
                dailyGroups[dateStr].forEach(rec => {
                    const ptsClass = rec.points > 0 ? 'text-green-600' : (rec.points < 0 ? 'text-red-600' : 'text-gray-500');
                    const ptsSign = rec.points > 0 ? '+' : '';
                    const rowClass = rec.points < 0 ? 'bg-red-50/30' : 'hover:bg-gray-50/50';
                    dailyHtml += `
                        <tr class="${rowClass}">
                            <td class="p-3 font-bold text-gray-700 w-2/3">${rec.reason} <span class="text-xs text-gray-400 font-normal ml-2">${rec.remarks||''}</span></td>
                            <td class="p-3 text-center font-black ${ptsClass}">${ptsSign}${rec.points}</td>
                        </tr>
                    `;
                });
                dailyHtml += `</tbody></table>`;
            });

            // Weekly Accordion Wrapper
            html += `
                <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-4">
                    <div class="bg-gray-50/80 px-5 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors" onclick="this.nextElementSibling.classList.toggle('dev-hidden')">
                        <span class="font-bold text-gray-700">第 ${week} 週 (${weekData.range})</span>
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    <div class=""> <!-- Initially expanded -->
                        ${dailyHtml}
                    </div>
                </div>
            `;
        });
        
        if (html === '') {
            html = '<div class="text-gray-500 text-center py-4 bg-white rounded-xl border border-dashed border-gray-200">目前沒有生活計點紀錄</div>';
        }
        
        document.getElementById('lifePointsList').innerHTML = html;
    }
});
